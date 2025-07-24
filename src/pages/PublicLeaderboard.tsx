import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Crown,
  Medal,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  Trophy,
  Link as LinkIcon,
  Plus,
  X,
  Loader2,
  Play,
  Share2,
  Globe,
  Gift,
  Home,
  Settings,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  MessageCircle,
  Share,
  Users,
  Calendar,
  Music,
  Award,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  ExternalLink,
  Zap,
  Target,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  RefreshCw,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { ContestJoinModal } from "../components/ContestJoinModal";
import { TikTokSettingsModal } from "../components/TikTokSettingsModal";
import { ViewSubmissionModal } from "../components/ViewSubmissionModal";
import { MobileVideoModal } from "../components/MobileVideoModal";
import { useTikTokConnection } from "../hooks/useTikTokConnection";
import { useAuthRedirect } from "../hooks/useAuthRedirect";
import { ContestCountdown } from "../components/ContestCountdown";
import {
  calculateContestStatus,
  getStatusLabel,
  getStatusColor,
} from "../lib/contestUtils";

interface Participant {
  rank: number;
  username: string;
  full_name: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  previousRank?: number;
  video_id: string;
  video_title: string;
  video_url: string;
  thumbnail: string;
  submission_date: string;
  tiktok_username?: string;
  tiktok_display_name?: string;
  tiktok_account_name?: string;
  avatar_url?: string;
}

interface ContestDetails {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  prize_tier?: string;
  prize_per_winner: number;
  prize_titles: { rank: number; title: string }[];
  music_category: string;
  cover_image?: string;
  num_winners: number;
  total_prize?: number;
  guidelines?: string;
  rules?: string;
  hashtags?: string[];
  submission_deadline?: string;
  max_participants?: number;
}

interface VideoData {
  id: string;
  title: string;
  url: string;
  video_url?: string | null;
  thumbnail: string;
  username: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  avatar_url?: string | null;
  tiktok_display_name?: string | null;
  rank?: number | null;
}

export function PublicLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contest, setContest] = useState<ContestDetails | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showTikTokSettings, setShowTikTokSettings] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isUserParticipating, setIsUserParticipating] = useState(false);
  const [featuredVideos, setFeaturedVideos] = useState<VideoData[]>([]);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [sortBy, setSortBy] = useState<"views" | "likes" | "recent">("views");
  const [filterBy, setFilterBy] = useState<"all" | "top10" | "recent">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showContestInfo, setShowContestInfo] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const { isConnected: isTikTokConnected } = useTikTokConnection();
  const { redirectToAuth } = useAuthRedirect();

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  useEffect(() => {
    if (id) {
      fetchContestDetails();
      fetchParticipants();
      fetchFeaturedVideos();
      checkUserParticipation();
    }
  }, [id, session]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const startAutoRefresh = () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }

      autoRefreshRef.current = setInterval(() => {
        fetchParticipants(true); // Silent refresh
      }, 30000); // Refresh every 30 seconds
    };

    startAutoRefresh();

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefreshEnabled, id]);

  const fetchContestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();

      if (error) throw error;
      setContest(data as unknown as ContestDetails);
    } catch (error) {
      console.error("Error fetching contest details:", error);
      toast.error("Failed to load contest details");
      setContest(null);
    }
  };

  const fetchParticipants = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      // Try to fetch from backend API first
      if (backendUrl) {
        try {
          const response = await fetch(
            `${backendUrl}/api/v1/contests/${id}/leaderboard?limit=200`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.data?.leaderboard) {
              const formattedParticipants = data.data.leaderboard.map(
                (participant: any, index: number) => ({
                  rank: index + 1,
                  username: participant.tiktok_username || participant.username,
                  full_name: participant.full_name || participant.username,
                  views: participant.views || 0,
                  likes: participant.likes || 0,
                  comments: participant.comments || 0,
                  shares: participant.shares || 0,
                  previousRank: participant.previousRank || index + 1,
                  video_id: participant.video_id,
                  video_title: participant.video_title,
                  video_url: participant.video_url,
                  thumbnail: participant.thumbnail,
                  submission_date: participant.submission_date,
                  tiktok_username: participant.tiktok_username,
                  tiktok_display_name: participant.tiktok_display_name,
                  tiktok_account_name: participant.tiktok_account_name,
                  avatar_url: participant.avatar_url,
                })
              );

              setParticipants(formattedParticipants);
              setLastRefresh(new Date());

              // Find user's rank if they're participating
              if (session && userSubmission) {
                const userEntry = formattedParticipants.find(
                  (p: any) => p.video_id === userSubmission.id
                );
                setUserRank(userEntry?.rank || null);
              }

              if (!silent) setLoading(false);
              if (silent) setRefreshing(false);
              return;
            }
          }
        } catch (error) {
          console.warn("Backend API not available, falling back to Supabase");
        }
      }

      // Fallback to Supabase view
      const { data, error } = await supabase
        .from("contest_leaderboards")
        .select("*")
        .eq("contest_id", id)
        .order("views", { ascending: false });

      if (error) throw error;

      const formattedParticipants = (data || []).map((participant, index) => ({
        rank: index + 1,
        username: participant.tiktok_username || participant.email || "Unknown",
        full_name: participant.full_name || participant.tiktok_username || "Unknown",
        views: participant.views || 0,
        likes: participant.likes || 0,
        comments: participant.comments || 0,
        shares: participant.shares || 0,
        video_id: participant.video_id || "",
        video_title: participant.video_title || "",
        video_url: participant.video_url || "",
        thumbnail: participant.thumbnail || "",
        submission_date: participant.submission_date || "",
        tiktok_username: participant.tiktok_username,
        tiktok_display_name: participant.tiktok_display_name,
        tiktok_account_name: participant.tiktok_account_name,
      }));

      setParticipants(formattedParticipants);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching participants:", error);
      if (!silent) {
        toast.error("Failed to load leaderboard");
      }
    } finally {
      if (!silent) setLoading(false);
      if (silent) setRefreshing(false);
    }
  };

  const fetchFeaturedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("video_links")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      const formattedVideos: VideoData[] = (data || []).map((video) => ({
        id: video.id,
        title: video.title,
        url: video.url,
        video_url: video.video_url,
        thumbnail: video.thumbnail,
        username: video.username,
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        shares: video.shares,
      }));

      setFeaturedVideos(formattedVideos);
    } catch (error) {
      console.error("Error fetching featured videos:", error);
    }
  };

  const checkUserParticipation = async () => {
    if (!session) return;

    try {
      // Check if user has submitted to this contest
      const { data: submission, error } = await supabase
        .from("contest_links")
        .select("*")
        .eq("contest_id", id)
        .eq("created_by", session.user.id)
        .eq("is_contest_submission", true)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (submission) {
        setUserSubmission(submission);
        setIsUserParticipating(true);

        // Find user's rank
        const userEntry = participants.find(
          (p) => p.video_id === submission.id
        );
        setUserRank(userEntry?.rank || null);
      }
    } catch (error) {
      console.error("Error checking user participation:", error);
    }
  };

  const handleJoinContest = () => {
    if (!session) {
      redirectToAuth("/signin");
      return;
    }

    if (!isTikTokConnected) {
      setShowTikTokModal(true);
      return;
    }

    setShowJoinModal(true);
  };

  const handleContestJoined = () => {
    setShowJoinModal(false);
    setIsUserParticipating(true);
    checkUserParticipation();
    fetchParticipants();
    toast.success("Successfully joined contest!");
  };

  const handleVideoClick = (participant: Participant) => {
    const videoData: VideoData = {
      id: participant.video_id,
      title: participant.video_title,
      url: `https://www.tiktok.com/@${participant.username}/video/${participant.video_id}`,
      video_url: participant.video_url,
      thumbnail: participant.thumbnail,
      username: participant.tiktok_username || participant.username,
      views: participant.views,
      likes: participant.likes,
      comments: participant.comments,
      shares: participant.shares,
      avatar_url: participant.avatar_url,
      tiktok_display_name: participant.tiktok_display_name,
      rank: participant.rank,
    };

    setSelectedVideo(videoData);

    // Check if mobile device
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setShowMobileModal(true);
    } else {
      setShowViewModal(true);
    }
  };

  const handleFeaturedVideoClick = (video: VideoData) => {
    setSelectedVideo(video);

    // Check if mobile device
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setShowMobileModal(true);
    } else {
      setShowViewModal(true);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: contest?.name || "Contest Leaderboard",
        text: contest?.description || "Check out this contest leaderboard!",
        url: window.location.href,
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchParticipants(true);
    await fetchFeaturedVideos();
    toast.success("Leaderboard refreshed!");
  };

  const getRankIcon = (rank: number) => {
    const colors = {
      1: "text-yellow-400",
      2: "text-gray-400",
      3: "text-amber-600",
      4: "text-blue-400",
      5: "text-green-400",
    };

    const color = colors[rank as keyof typeof colors] || "text-slate-400";

    if (rank === 1) {
      return (
        <div className="relative">
          <Crown className={`h-5 w-5 sm:h-6 sm:w-6 ${color}`} />
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
        </div>
      );
    }

    return (
      <div className="relative">
        <Crown className={`h-5 w-5 sm:h-6 sm:w-6 ${color}`} />
      </div>
    );
  };

  const getRankChangeIcon = (currentRank: number, previousRank?: number) => {
    if (!previousRank) return <Minus className="h-3 w-3 text-white/40" />;

    if (currentRank < previousRank) {
      return <ArrowUp className="h-3 w-3 text-green-500" />;
    } else if (currentRank > previousRank) {
      return <ArrowDown className="h-3 w-3 text-red-500" />;
    }
    return <Minus className="h-3 w-3 text-white/40" />;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    const rounded = Math.round(value * 100) / 100;
    if (rounded >= 1000) {
      return formatNumber(rounded);
    }
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  const getRankColor = (rank: number) => {
    const colors = {
      1: "text-yellow-400",
      2: "text-gray-400",
      3: "text-amber-600",
    };
    return colors[rank as keyof typeof colors] || "text-white/60";
  };

  const formatRank = (rank: number) => {
    const suffixes = ["st", "nd", "rd"];
    return `${rank}${suffixes[rank - 1] || "th"}`;
  };

  const getFilteredAndSortedParticipants = () => {
    let filtered = [...participants];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.video_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    switch (filterBy) {
      case "top10":
        filtered = filtered.slice(0, 10);
        break;
      case "recent":
        filtered = filtered
          .sort(
            (a, b) =>
              new Date(b.submission_date).getTime() -
              new Date(a.submission_date).getTime()
          )
          .slice(0, 20);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case "likes":
        filtered.sort((a, b) => b.likes - a.likes);
        break;
      case "recent":
        filtered.sort(
          (a, b) =>
            new Date(b.submission_date).getTime() -
            new Date(a.submission_date).getTime()
        );
        break;
      case "views":
      default:
        filtered.sort((a, b) => b.views - a.views);
        break;
    }

    return filtered;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-2 border-t-white animate-spin"></div>
          </div>
          <p className="mt-6 text-white/60 font-light tracking-wider">
            LOADING
          </p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Contest not found
          </h2>
          <p className="text-white/60 mb-6">
            This contest may have ended or been removed.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    );
  }

  const contestStatus = calculateContestStatus(contest);
  const isContestActive = contestStatus === "active";
  const isContestEnded = contestStatus === "ended";

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Crown
            </span>
          </Link>
          {session && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTikTokSettings(true)}
                className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white text-sm sm:text-base"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">TikTok</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contest Header */}
      <div className="relative bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="relative px-4 py-8 sm:px-6 lg:px-8">
            {contest.cover_image && (
              <div className="absolute inset-0 overflow-hidden opacity-30">
                <img
                  src={contest.cover_image}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />
              </div>
            )}

            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
                      {contest.name}
                    </h1>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        contestStatus
                      )}`}
                    >
                      {getStatusLabel(contestStatus)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm">
                    <ContestCountdown contest={contest} />
                    <span>•</span>
                    <span>{contest.music_category}</span>
                    <span>•</span>
                    <span>{participants.length} participants</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                    title="Refresh leaderboard"
                  >
                    <RefreshCw
                      className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Share contest"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowContestInfo(!showContestInfo)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Contest information"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* User Status */}
              {session && (
                <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  {isUserParticipating ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <div>
                          <p className="text-white font-medium">
                            You're participating!
                          </p>
                          <p className="text-white/60 text-sm">
                            {userRank
                              ? `Current rank: #${userRank}`
                              : "Rank updating..."}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/contest-management/${contest.id}`}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Manage
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserPlus className="h-5 w-5 text-blue-400" />
                        <div>
                          <p className="text-white font-medium">
                            Join this contest
                          </p>
                          <p className="text-white/60 text-sm">
                            Submit your video to compete
                          </p>
                        </div>
                      </div>
                      {isContestActive && (
                        <button
                          onClick={handleJoinContest}
                          className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/90 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <Trophy className="h-4 w-4" />
                          Join Contest
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Contest ended message for non-participants */}
              {!session && isContestEnded && (
                <div className="mt-4 p-4 bg-red-500/10 backdrop-blur-sm rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-red-400 font-medium">Contest Ended</p>
                      <p className="text-red-300/80 text-sm">
                        This contest is no longer accepting new participants.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Contest Information - Collapsible */}
        {showContestInfo && (
          <div className="mb-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-400" />
                Contest Information
              </h2>

              {/* About Contest */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-3">About this Contest</h3>
                <p className="text-white/80 leading-relaxed">{contest.description}</p>
              </div>

              {/* Prize Distribution */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Prize Distribution
                  </h3>
                  <span className="text-sm text-white/60">
                    {contest.prize_titles.length} Winners
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {contest.prize_titles
                    .slice(0, contest.num_winners || contest.prize_titles.length)
                    .map((prize, index) => (
                      <div
                        key={index}
                        className={`
                          p-4 rounded-lg border transition-all hover:scale-105
                          ${
                            index === 0
                              ? "bg-yellow-500/10 border-yellow-500/30"
                              : index === 1
                              ? "bg-gray-400/10 border-gray-400/30"
                              : index === 2
                              ? "bg-amber-600/10 border-amber-600/30"
                              : "bg-white/5 border-white/10"
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getRankIcon(index + 1)}
                          <span
                            className={`text-sm font-medium ${getRankColor(
                              index + 1
                            )}`}
                          >
                            {formatRank(index + 1)}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-white">
                          {contest.prize_tier === "monetary"
                            ? `$${formatCurrency(
                                contest.prize_per_winner * (1 - index * 0.2)
                              )}`
                            : prize.title}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Controls */}
        <div className="mb-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filterBy}
                onChange={(e) =>
                  setFilterBy(e.target.value as "all" | "top10" | "recent")
                }
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="all">All Participants</option>
                <option value="top10">Top 10</option>
                <option value="recent">Recent Submissions</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "views" | "likes" | "recent")
                }
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="views">Sort by Views</option>
                <option value="likes">Sort by Likes</option>
                <option value="recent">Sort by Recent</option>
              </select>
            </div>
          </div>

          {/* Auto-refresh toggle */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="w-4 h-4 rounded border border-white/20 bg-white/10 text-white focus:ring-2 focus:ring-white/20"
              />
              <label htmlFor="autoRefresh" className="text-white/80 text-sm">
                Auto-refresh every 30 seconds
              </label>
            </div>
            {lastRefresh && (
              <p className="text-white/40 text-xs">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Leaderboard
              </h2>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Users className="h-4 w-4" />
                <span>{getFilteredAndSortedParticipants().length} shown</span>
              </div>
            </div>
          </div>

          {/* Mobile View */}
          <div className="block sm:hidden divide-y divide-white/10">
            {getFilteredAndSortedParticipants().map((participant) => (
              <div key={participant.video_id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${getRankColor(participant.rank)}`}>
                      #{participant.rank}
                    </span>
                    {getRankIcon(participant.rank)}
                    {getRankChangeIcon(participant.rank, participant.previousRank)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {participant.avatar_url ? (
                        <img
                          src={participant.avatar_url}
                          alt={`${participant.username} profile`}
                          className="w-8 h-8 rounded-full object-cover border border-white/20"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border border-white/20">
                          <span className="text-white text-xs font-medium">
                            {participant.tiktok_display_name?.charAt(0) ||
                              participant.username?.charAt(0) ||
                              "U"}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">
                          {participant.tiktok_display_name || participant.username}
                        </div>
                        <div className="text-sm text-white/60 truncate">
                          @{participant.username}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-white/60">
                      <span>{formatNumber(participant.views)} views</span>
                      <span>{formatNumber(participant.likes)} likes</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVideoClick(participant)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <Play className="h-5 w-5 text-white/60" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Likes
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {getFilteredAndSortedParticipants().map((participant) => (
                  <tr
                    key={participant.video_id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {getRankIcon(participant.rank)}
                        <span
                          className={`font-bold ${getRankColor(participant.rank)}`}
                        >
                          #{participant.rank}
                        </span>
                        {getRankChangeIcon(
                          participant.rank,
                          participant.previousRank
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {participant.avatar_url ? (
                          <img
                            src={participant.avatar_url}
                            alt={`${participant.username} profile`}
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border border-white/20">
                            <span className="text-white text-sm font-medium">
                              {participant.tiktok_display_name?.charAt(0) ||
                                participant.username?.charAt(0) ||
                                "U"}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">
                            {participant.tiktok_display_name || participant.username}
                          </div>
                          <div className="text-sm text-white/60">
                            @{participant.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-white">
                        {formatNumber(participant.views)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-white">
                        {formatNumber(participant.likes)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleVideoClick(participant)}
                        className="p-2 rounded-full hover:bg-white/10 inline-flex items-center justify-center transition-colors"
                      >
                        <Play className="h-5 w-5 text-white/60" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {getFilteredAndSortedParticipants().length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No participants found
              </h3>
              <p className="text-white/60">
                {searchTerm
                  ? "Try adjusting your search or filters"
                  : "Be the first to join this contest!"}
              </p>
            </div>
          )}
        </div>

        {/* Featured Submissions */}
        <div className="mt-8 sm:mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-400" />
              Featured Submissions
            </h2>
            {featuredVideos.length > 6 && (
              <button
                onClick={() => setShowAllVideos(!showAllVideos)}
                className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                <span>{showAllVideos ? "Show Less" : "Show All"}</span>
                {showAllVideos ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {(showAllVideos ? featuredVideos : featuredVideos.slice(0, 6)).map(
              (video) => (
                <div
                  key={video.id}
                  className="group bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  onClick={() => handleFeaturedVideoClick(video)}
                >
                  <div className="relative aspect-video">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="h-6 w-6 text-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-sm font-medium text-white line-clamp-1 mb-1">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <span>@{video.username}</span>
                        {video.views !== null && (
                          <>
                            <span>•</span>
                            <span>{formatNumber(video.views)} views</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Call to Action for Non-Participants */}
        {!session && isContestActive && (
          <div className="mt-12 bg-white/5 backdrop-blur-sm rounded-xl p-8 text-center border border-white/10">
            <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Want to compete?
            </h3>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              Join this contest and showcase your talent to win amazing prizes!
            </p>
            <button
              onClick={() => redirectToAuth("/signup")}
              className="bg-white text-black px-8 py-3 rounded-lg hover:bg-white/90 transition-colors transform hover:scale-105 duration-200 font-medium"
            >
              Create Account to Join
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <TikTokSettingsModal
        isOpen={showTikTokModal}
        onClose={() => setShowTikTokModal(false)}
      />

      <TikTokSettingsModal
        isOpen={showTikTokSettings}
        onClose={() => setShowTikTokSettings(false)}
      />

      <ContestJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        contest={contest}
        onSuccess={handleContestJoined}
      />

      <ViewSubmissionModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        video={selectedVideo}
      />

      <MobileVideoModal
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
        video={selectedVideo}
      />
    </div>
  );
}