import React, { useEffect, useState, useCallback } from "react";
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
  Users,
  Calendar,
  Music,
  Award,
  Sparkles,
  Eye,
  Heart,
  MessageCircle,
  Share,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Settings,
  UserPlus,
  ExternalLink,
  Info,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { ContestJoinModal } from "../components/ContestJoinModal";
import { TikTokSettingsModal } from "../components/TikTokSettingsModal";
import { ViewSubmissionModal } from "../components/ViewSubmissionModal";
import { MobileVideoModal } from "../components/MobileVideoModal";
import { ContestMap } from "../components/ContestMap";
import { useTikTokConnection } from "../hooks/useTikTokConnection";
import { useAuthRedirect } from "../hooks/useAuthRedirect";
import useEmblaCarousel from "embla-carousel-react";
import { 
  calculateContestStatus, 
  getStatusLabel, 
  getStatusColor,
  formatTimeRemaining,
  getTimeRemaining 
} from "../lib/contestUtils";
import { ContestCountdown } from "../components/ContestCountdown";

interface Participant {
  rank: number;
  username: string;
  full_name: string;
  email: string;
  tiktok_username: string;
  tiktok_display_name: string;
  tiktok_account_name: string;
  tiktok_account_id: string;
  video_id: string;
  video_title: string;
  video_url: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  submission_date: string;
  avatar_url?: string;
  video_type?: string;
  embed_code?: string;
  tiktok_video_id?: string;
}

interface Contest {
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
  prize_amounts?: number[];
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
  const [contest, setContest] = useState<Contest | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showMobileVideoModal, setShowMobileVideoModal] = useState(false);
  const [viewVideo, setViewVideo] = useState<Participant | null>(null);
  const [selectedPrize, setSelectedPrize] = useState<{
    rank: number;
    prize: string | number;
  } | null>(null);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [showTikTokSettings, setShowTikTokSettings] = useState(false);
  const [contestVideos, setContestVideos] = useState<VideoData[]>([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
    dragFree: false,
  });
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const { isConnected: isTikTokConnected, refreshConnection } =
    useTikTokConnection();
  const { redirectToAuth } = useAuthRedirect();

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi]
  );
  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedVideoIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (id) {
      fetchContestDetails();
      fetchParticipants();
      fetchContestVideos();
    }
  }, [id]);

  useEffect(() => {
    if (session && contest) {
      fetchUserSubmission();
    }
  }, [session, contest]);

  const fetchContestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id as string)
        .single();

      if (error) throw error;
      setContest(data as Contest);
    } catch (error) {
      console.error("Error fetching contest details:", error);
      toast.error("Failed to load contest details");
      setContest(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
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
              setParticipants(data.data.leaderboard);
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

      // Transform the data to match expected format
      const transformedData = (data || []).map((item, index) => ({
        rank: index + 1,
        username: item.tiktok_username || "Unknown",
        full_name: item.full_name || item.tiktok_display_name || "Unknown",
        email: item.email || "",
        tiktok_username: item.tiktok_username || "",
        tiktok_display_name: item.tiktok_display_name || "",
        tiktok_account_name: item.tiktok_account_name || "",
        tiktok_account_id: item.tiktok_account_id || "",
        video_id: item.video_id || "",
        video_title: item.video_title || "",
        video_url: item.video_url || "",
        thumbnail: item.thumbnail || "",
        views: item.views || 0,
        likes: item.likes || 0,
        comments: item.comments || 0,
        shares: item.shares || 0,
        submission_date: item.submission_date || "",
      }));

      setParticipants(transformedData);
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error("Failed to load leaderboard");
    }
  };

  const fetchContestVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("contest_links")
        .select("*")
        .eq("contest_id", id)
        .eq("is_contest_submission", true)
        .eq("active", true)
        .order("views", { ascending: false })
        .limit(20);

      if (error) throw error;

      const videosWithRank = (data || []).map((video, index) => ({
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
        avatar_url: null,
        tiktok_display_name: null,
        rank: index + 1,
      }));

      setContestVideos(videosWithRank);
    } catch (error) {
      console.error("Error fetching contest videos:", error);
    }
  };

  const fetchUserSubmission = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from("contest_links")
        .select("*")
        .eq("contest_id", id)
        .eq("created_by", session.user.id)
        .eq("is_contest_submission", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setUserSubmission(data);

        // Find user's rank in participants
        const userRankData = participants.find(
          (p) => p.video_id === data.id
        );
        if (userRankData) {
          setUserRank(userRankData.rank);
        }
      }
    } catch (error) {
      console.error("Error fetching user submission:", error);
    }
  };

  const handleJoinContest = () => {
    if (!session) {
      // Store current URL for redirect after authentication
      localStorage.setItem("auth_return_url", window.location.pathname);
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
    fetchUserSubmission();
    fetchParticipants();
    toast.success("Successfully joined contest!");
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: contest?.name || "Contest Leaderboard",
        text: contest?.description || "Check out this contest!",
        url: window.location.href,
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleViewVideo = (participant: Participant) => {
    const videoData: VideoData = {
      id: participant.video_id,
      title: participant.video_title,
      url: participant.video_url || "",
      video_url: participant.video_url,
      thumbnail: participant.thumbnail,
      username: participant.tiktok_username || participant.username,
      views: participant.views,
      likes: participant.likes,
      comments: participant.comments,
      shares: participant.shares,
      avatar_url: participant.avatar_url || null,
      tiktok_display_name: participant.tiktok_display_name || null,
      rank: participant.rank,
    };

    // Check if mobile device
    const isMobile = window.innerWidth < 768;

    if (isMobile && videoData.video_url) {
      setViewVideo(videoData as any);
      setShowMobileVideoModal(true);
    } else {
      setViewVideo(videoData as any);
      setShowViewModal(true);
    }
  };

  const handleCarouselVideoClick = (video: VideoData) => {
    // Check if mobile device
    const isMobile = window.innerWidth < 768;

    if (isMobile && video.video_url) {
      setViewVideo(video as any);
      setShowMobileVideoModal(true);
    } else {
      setViewVideo(video as any);
      setShowViewModal(true);
    }
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
    if (!previousRank) return <Minus className="h-4 w-4 text-white/40" />;

    if (currentRank < previousRank) {
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    } else if (currentRank > previousRank) {
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-white/40" />;
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

  const toggleMute = () => {
    setIsMuted(!isMuted);

    // Handle muting for TikTok videos
    const tiktokIframe = document.querySelector(
      'iframe[src*="tiktok.com"]'
    ) as HTMLIFrameElement;
    if (tiktokIframe) {
      tiktokIframe.contentWindow?.postMessage(
        JSON.stringify({
          action: isMuted ? "unmute" : "mute",
        }),
        "*"
      );
    }

    // Handle muting for uploaded videos
    const videoElement = document.querySelector("video") as HTMLVideoElement;
    if (videoElement) {
      videoElement.muted = !isMuted;
    }
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
          <h2 className="text-2xl font-bold text-white mb-4">
            Contest not found
          </h2>
          <p className="text-white/60 mb-6">
            This contest may have ended or been removed.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    );
  }

  const contestStatus = calculateContestStatus(contest);
  const timeRemaining = getTimeRemaining(contest);

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
          {session ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTikTokSettings(true)}
                className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white text-sm sm:text-base"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">TikTok</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => redirectToAuth("/signin")}
                className="px-3 sm:px-6 py-2 text-white hover:bg-white/5 rounded-xl transition-colors whitespace-nowrap text-sm sm:text-base"
              >
                Login
              </button>
              <button
                onClick={() => redirectToAuth("/signup")}
                className="bg-white text-[#1A1A1A] px-3 sm:px-6 py-2 rounded-xl hover:bg-white/90 transition-colors transform hover:scale-105 duration-200 text-sm sm:text-base font-medium"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Contest Header */}
          <div className="relative overflow-hidden mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
            {contest.cover_image && (
              <div className="absolute inset-0">
                <img
                  src={contest.cover_image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="relative p-6 sm:p-8 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">
                      {contest.name}
                    </h1>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(contestStatus)}`}>
                      {getStatusLabel(contestStatus)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm sm:text-base">
                    <div className="flex items-center gap-1.5">
                      <Music className="h-4 w-4" />
                      <span>{contest.music_category}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{participants.length} participants</span>
                    </div>
                <div className="flex items-center gap-3">
                </div>
              </div>
            </div>
          </div>

          {/* Prize Distribution */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden mb-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/10 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-400/20 rounded-lg">
                    <Trophy className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Contest Details</h2>
                    <p className="text-white/60 text-sm sm:text-base">Prize distribution and contest information</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full">
                  <span className="text-white/80 text-sm font-medium">
                    {contest.num_winners} Winners
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Contest Information - Takes 2/3 width on large screens */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">About this Contest</h3>
                    <p className="text-white/80 leading-relaxed">{contest.description}</p>
                  </div>

                  {/* Contest Meta Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Music className="h-4 w-4 text-blue-400" />
                        <span className="text-white/60 text-sm font-medium">Category</span>
                      </div>
                      <p className="text-white font-medium">{contest.music_category}</p>
                    </div>

                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${
                          contestStatus === 'active' ? 'bg-green-400 animate-pulse' :
                          contestStatus === 'ended' ? 'bg-red-400' :
                          'bg-gray-400'
                        }`}></div>
                        <span className="text-white/60 text-sm font-medium">Status</span>
                      </div>
                      <p className="text-white font-medium capitalize">{getStatusLabel(contestStatus)}</p>
                    </div>
                  </div>
                </div>

                {/* Prize Distribution - Takes 1/3 width on large screens */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Prize Distribution</h3>
                  <div className="space-y-3">
                    {contest.prize_titles
                      .slice(0, contest.num_winners || contest.prize_titles.length)
                      .map((prize, index) => {
                        const rank = index + 1;
                        const isTopThree = rank <= 3;
                        
                        let gradientClass = "bg-white/5 border-white/10";
                        if (rank === 1) gradientClass = "bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border-yellow-400/30";
                        else if (rank === 2) gradientClass = "bg-gradient-to-r from-gray-300/20 to-gray-500/20 border-gray-300/30";
                        else if (rank === 3) gradientClass = "bg-gradient-to-r from-amber-600/20 to-amber-800/20 border-amber-600/30";

                        return (
                          <button
                            key={index}
                            onClick={() =>
                              setSelectedPrize({
                                rank: rank,
                                prize:
                                  contest.prize_tier === "monetary"
                                    ? (contest.prize_amounts?.[index] || contest.prize_per_winner * (1 - index * 0.2))
                                    : prize.title,
                              })
                            }
                            className={`w-full p-4 rounded-lg border transition-all duration-300 hover:scale-105 ${gradientClass}`}
                          >
                            <div className="flex items-center gap-3">
                              {getRankIcon(rank)}
                              <div className="flex-1 text-left">
                                <div className={`text-sm font-medium ${getRankColor(rank)}`}>
                                  {formatRank(rank)} Place
                                </div>
                                <div className="text-white font-semibold">
                                  {contest.prize_tier === "monetary"
                                    ? `$${formatNumber(
                                        contest.prize_amounts?.[index] || contest.prize_per_winner * (1 - index * 0.2)
                                      )}`
                                    : prize.title}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contest Submissions Carousel */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">
                Contest Submissions
              </h2>
              <p className="text-white/60 text-sm sm:text-base">
                Watch the top entries competing for the crown
              </p>
            </div>

            {contestVideos.length > 0 ? (
              <div className="relative max-w-7xl mx-auto w-full">
                <div className="overflow-hidden w-full" ref={emblaRef}>
                  <div className="flex">
                    {contestVideos.map((video, index) => {
                      const isSelected = index === selectedVideoIndex;
                      const scale = isSelected ? 1 : 0.85;
                      const opacity = isSelected ? 1 : 0.3;

                      return (
                        <div
                          key={video.id}
                          className="flex-[0_0_100%] min-w-0 px-2 md:flex-[0_0_33.333%] lg:flex-[0_0_25%] flex items-center justify-center"
                        >
                          <div
                            className="relative transition-all duration-300 ease-out group will-change-transform cursor-pointer"
                            style={{
                              transform: `scale(${scale})`,
                              opacity,
                              width: "280px",
                              maxWidth: "100%",
                            }}
                            onClick={() => handleCarouselVideoClick(video)}
                          >
                            <div
                              className="relative bg-black rounded-2xl overflow-hidden"
                              style={{ aspectRatio: "9/16" }}
                            >
                              {/* Thumbnail */}
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                                  isSelected ? "opacity-50" : "opacity-100"
                                }`}
                                loading={isSelected ? "eager" : "lazy"}
                              />

                              {/* Video Content for Selected */}
                              {isSelected && video.video_url && (
                                <div className="absolute inset-0">
                                  <video
                                    src={video.video_url}
                                    className="w-full h-full object-cover rounded-2xl"
                                    autoPlay
                                    loop
                                    muted={isMuted}
                                    playsInline
                                    controls={false}
                                  />
                                </div>
                              )}

                              {/* Gradient Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                              {/* Rank Badge */}
                              {video.rank && (
                                <div className="absolute top-4 left-4">
                                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    video.rank === 1 ? 'bg-yellow-400/80 text-yellow-900' :
                                    video.rank === 2 ? 'bg-gray-300/80 text-gray-900' :
                                    video.rank === 3 ? 'bg-amber-600/80 text-amber-100' :
                                    'bg-white/20 text-white'
                                  }`}>
                                    #{video.rank}
                                  </div>
                                </div>
                              )}

                              {/* Video Info */}
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <div className="space-y-1">
                                  <h3 className="text-sm sm:text-base font-medium text-white line-clamp-1">
                                    {video.title}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs sm:text-sm text-white/60">
                                    <span>@{video.username}</span>
                                    <span>•</span>
                                    <span>{formatNumber(video.views || 0)} views</span>
                                  </div>
                                </div>
                              </div>

                              {/* Mute Button */}
                              {isSelected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMute();
                                  }}
                                  className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors"
                                >
                                  {isMuted ? (
                                    <VolumeX className="h-4 w-4" />
                                  ) : (
                                    <Volume2 className="h-4 w-4" />
                                  )}
                                </button>
                              )}

                              {/* Play Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                  <Play className="h-8 w-8 text-white ml-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Arrows */}
                {contestVideos.length > 1 && (
                  <>
                    <button
                      onClick={scrollPrev}
                      className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-30"
                    >
                      <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>

                    <button
                      onClick={scrollNext}
                      className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-30"
                    >
                      <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <Play className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No submissions yet
                </h3>
                <p className="text-white/60">
                  Be the first to submit your entry!
                </p>
              </div>
            )}
          </div>

          {/* Current Rankings */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  Current Rankings
                </h2>
                <div className="text-sm text-white/60">
                  {participants.length} participants
                </div>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No participants yet
                </h3>
                <p className="text-white/60">
                  Be the first to join this contest!
                </p>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="block sm:hidden divide-y divide-white/10">
                  {participants.map((participant) => (
                    <div key={participant.video_id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${getRankColor(
                                participant.rank
                              )}`}
                            >
                              #{participant.rank}
                            </span>
                            {getRankIcon(participant.rank)}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              @{participant.tiktok_username || participant.username}
                            </div>
                            <div className="text-sm text-white/60">
                              {formatNumber(participant.views)} views
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewVideo(participant)}
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
                          Engagement
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {participants.map((participant) => (
                        <tr
                          key={participant.video_id}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {getRankIcon(participant.rank)}
                              <span
                                className={`font-medium ${getRankColor(
                                  participant.rank
                                )}`}
                              >
                                #{participant.rank}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {participant.avatar_url ? (
                                <img
                                  src={participant.avatar_url}
                                  alt={`${participant.tiktok_username} profile`}
                                  className="w-10 h-10 rounded-full object-cover border border-white/10"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border border-white/10">
                                  <span className="text-white text-sm font-medium">
                                    {(
                                      participant.tiktok_display_name ||
                                      participant.tiktok_username ||
                                      participant.username
                                    )
                                      ?.charAt(0)
                                      ?.toUpperCase() || "U"}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white">
                                  {participant.tiktok_display_name ||
                                    participant.full_name ||
                                    participant.tiktok_username ||
                                    participant.username}
                                </div>
                                <div className="text-sm text-white/60">
                                  @
                                  {participant.tiktok_username ||
                                    participant.username}
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
                            <div className="flex items-center justify-end gap-4 text-sm text-white/60">
                              <div className="flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                <span>{formatNumber(participant.likes)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-4 w-4" />
                                <span>{formatNumber(participant.comments)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleViewVideo(participant)}
                              className="p-2 rounded-full hover:bg-white/10 inline-flex items-center justify-center transition-colors group"
                            >
                              <Play className="h-5 w-5 text-white/60 group-hover:text-white" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* User Status Card */}
          {session && userSubmission && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Your Entry Status
                  </h3>
                  <div className="flex items-center gap-4 text-white/80">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span>
                        Rank: {userRank ? `#${userRank}` : "Not ranked"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-400" />
                      <span>{formatNumber(userSubmission.views || 0)} views</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/contest-management/${id}`)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Manage Entry
                  </button>
                  <Link
                    to={`/share/${id}`}
                    className="px-4 py-2 bg-white hover:bg-white/90 text-black rounded-lg transition-colors text-sm font-medium"
                  >
                    Share Entry
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="relative p-0">
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
            video={viewVideo}
          />

          <MobileVideoModal
            isOpen={showMobileVideoModal}
            onClose={() => setShowMobileVideoModal(false)}
            video={viewVideo}
          />

          {/* Prize Modal */}
          {selectedPrize && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getRankIcon(selectedPrize.rank)}
                    <h3 className="text-lg font-semibold text-white">
                      {formatRank(selectedPrize.rank)} Place
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedPrize(null)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-white/60" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="text-center">
                    {contest.prize_tier === "monetary" ? (
                      <>
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          ${formatNumber(selectedPrize.prize as number)}
                        </div>
                        <p className="text-white/60">Cash Prize</p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-blue-400 mb-2">
                          {selectedPrize.prize}
                        </div>
                        <p className="text-white/60">Achievement Title</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}