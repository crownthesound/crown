import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import {
  Crown,
  Clock,
  Trophy,
  Play,
  Share2,
  Gift,
  X,
  Loader2,
  Home,
  Award,
  Info,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  Link as LinkIcon,
  Settings,
  User,
  UserPlus,
} from "lucide-react";
import { Auth } from "../components/Auth";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { Helmet } from "react-helmet";
import { Footer } from "../components/Footer";
import { TikTokSettingsModal } from "../components/TikTokSettingsModal";
import { ContestJoinModal } from "../components/ContestJoinModal";
import { ViewSubmissionModal } from "../components/ViewSubmissionModal";
import { useTikTokConnection } from "../hooks/useTikTokConnection";
import { useAuthRedirect } from "../hooks/useAuthRedirect";
import { supabase as supa } from "../lib/supabase";
import { 
  calculateContestStatus, 
  getStatusLabel, 
  getStatusColor,
  formatTimeRemaining,
  getTimeRemaining 
} from "../lib/contestUtils";

interface Participant {
  id: string;
  username: string;
  full_name: string;
  rank: number;
  previousRank?: number;
  views: number;
  video_url?: string | null;  // Our stored video URL from Supabase
  url?: string;             // Original TikTok URL
  thumbnail?: string;
  title?: string;
  embed_code?: string | null;
  tiktok_video_id?: string | null;
}

interface ContestDetails {
  id: string;
  name: string;
  description: string;
  cover_image?: string;
  start_date: string;
  end_date: string;
  prize_tier: "monetary" | "non-monetary";
  prize_per_winner: number;
  num_winners: number;
  status: "draft" | "active" | "completed" | "hidden";
  calculatedStatus?: 'draft' | 'active' | 'ended' | 'archived';
  resources: Array<{
    title: string;
    description?: string;
    url: string;
  }>;
  prize_titles: Array<{
    title: string;
  }>;
  top_participants?: Participant[];
}

const mockParticipants: Participant[] = [
  {
    id: "1",
    rank: 1,
    username: "baeb__8",
    full_name: "Mukonazwothe Khabubu",
    views: 1200000,
    previousRank: 2,
    video_url: "https://example.com/video1",
  },
  {
    id: "2",
    rank: 2,
    username: "lordmust",
    full_name: "Lordmust Sadulloev",
    views: 850000,
    previousRank: 1,
    video_url: "https://example.com/video2",
  },
  {
    id: "3",
    rank: 3,
    username: "glen_versoza",
    full_name: "Glen Versoza",
    views: 620000,
    previousRank: 3,
    video_url: "https://example.com/video3",
  },
  {
    id: "4",
    rank: 4,
    username: "dance_queen",
    full_name: "Sarah Johnson",
    views: 450000,
    previousRank: 5,
    video_url: "https://example.com/video4",
  },
  {
    id: "5",
    rank: 5,
    username: "beatmaster",
    full_name: "James Wilson",
    views: 380000,
    previousRank: 4,
    video_url: "https://example.com/video5",
  },
  {
    id: "6",
    rank: 6,
    username: "rhythm_master",
    full_name: "Michael Chen",
    views: 320000,
    previousRank: 7,
    video_url: "https://example.com/video6",
  },
  {
    id: "7",
    rank: 7,
    username: "melody_queen",
    full_name: "Emma Thompson",
    views: 280000,
    previousRank: 6,
    video_url: "https://example.com/video7",
  },
  {
    id: "8",
    rank: 8,
    username: "groove_guru",
    full_name: "David Martinez",
    views: 250000,
    previousRank: 8,
    video_url: "https://example.com/video8",
  },
  {
    id: "9",
    rank: 9,
    username: "beat_breaker",
    full_name: "Sophie Anderson",
    views: 220000,
    previousRank: 10,
    video_url: "https://example.com/video9",
  },
  {
    id: "10",
    rank: 10,
    username: "music_maverick",
    full_name: "Ryan O'Connor",
    views: 200000,
    previousRank: 9,
    video_url: "https://example.com/video10",
  },
  {
    id: "11",
    rank: 11,
    username: "vibes_master",
    full_name: "Aisha Patel",
    views: 180000,
    previousRank: 12,
    video_url: "https://example.com/video11",
  },
  {
    id: "12",
    rank: 12,
    username: "sound_wave",
    full_name: "Lucas Kim",
    views: 160000,
    previousRank: 11,
    video_url: "https://example.com/video12",
  },
  {
    id: "13",
    rank: 13,
    username: "harmony_hub",
    full_name: "Isabella Garcia",
    views: 140000,
    previousRank: 13,
    video_url: "https://example.com/video13",
  },
  {
    id: "14",
    rank: 14,
    username: "tempo_king",
    full_name: "Marcus Lee",
    views: 120000,
    previousRank: 15,
    video_url: "https://example.com/video14",
  },
  {
    id: "15",
    rank: 15,
    username: "beat_flow",
    full_name: "Nina Rodriguez",
    views: 100000,
    previousRank: 14,
    video_url: "https://example.com/video15",
  },
];

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function PublicLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contest, setContest] = useState<ContestDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [selectedPrize, setSelectedPrize] = useState<{
    rank: number;
    prize: string | number;
  } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showTikTokSettings, setShowTikTokSettings] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [viewVideo, setViewVideo] = useState<any>(null);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [hasAutoOpenedModal, setHasAutoOpenedModal] = useState(false);

  const { refreshConnection } = useTikTokConnection();
  const { redirectToAuth, hasRedirectUrl, hasRedirectAction, getRedirectAction, clearRedirectUrl } = useAuthRedirect();
  const queryClient = useQueryClient();


  // Fetch contest details
  const {
    data: contestData,
    isLoading: contestLoading,
    error: contestError,
  } = useQuery({
    queryKey: ["contest", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id as string)
        .single();
      if (error || !data) {
        throw new Error("Contest not found or unavailable");
      }
      return data;
    },
  });

  // Fetch leaderboard participants
  const { data: leaderboardResp, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["leaderboard-public", id],
    enabled: !!id,
    refetchInterval: 30000,
    queryFn: async () => {
      const res = await fetch(
        `${backendUrl}/api/v1/contests/${id}/leaderboard?limit=200`
      );
      if (!res.ok) throw new Error("Failed to load leaderboard");
      return res.json();
    },
  });

  useEffect(() => {
    if (contestData) {
      const contestWithStatus = {
        ...contestData,
        calculatedStatus: calculateContestStatus(contestData)
      } as unknown as ContestDetails;
      setContest(contestWithStatus);
    }
  }, [contestData]);

  useEffect(() => {
    if (
      leaderboardResp &&
      leaderboardResp.data &&
      leaderboardResp.data.leaderboard
    ) {
      setParticipants(leaderboardResp.data.leaderboard);
    }
  }, [leaderboardResp]);

  useEffect(() => {
    setLoading(contestLoading || leaderboardLoading);
    if (contestError) {
      setFetchError((contestError as Error).message);
    }
  }, [contestLoading, leaderboardLoading, contestError]);

  useEffect(() => {
    if (contest?.end_date) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const endDate = new Date(contest.end_date).getTime();
        const distance = endDate - now;

        if (distance < 0) {
          setTimeLeft("Contest Ended");
          clearInterval(timer);
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          const minutes = Math.floor(
            (distance % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          const isMobile = window.innerWidth < 640;
          if (isMobile) {
            setTimeLeft(`${days}d ${hours}h`);
          } else {
            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
          }
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [contest?.end_date]);

  // Fetch current user's submission
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!session || !id) return;

      const { data, error } = await supa
        .from("contest_links")
        .select("*")
        .eq("contest_id", id as string)
        .eq("created_by", session.user.id)
        .eq("is_contest_submission", true)
        .single();

      if (!error) {
        setUserSubmission(data);
      } else {
        setUserSubmission(null);
      }
    };
    fetchSubmission();
  }, [session, id, leaderboardResp]);

  // Auto-open ContestJoinModal after authentication redirect
  useEffect(() => {
    if (session && contest && !userSubmission && contest.calculatedStatus === 'active' && !hasAutoOpenedModal) {
      // Check for action parameter in URL (fallback for older implementation)
      const urlParams = new URLSearchParams(window.location.search);
      const urlAction = urlParams.get('action');
      
      // Get action from redirect system (preferred method)
      const redirectAction = getRedirectAction();
      
      // Be more restrictive - only trigger if there's BOTH a redirect URL AND action
      // This prevents triggering on normal page visits
      const shouldOpenModal = (hasRedirectUrl && hasRedirectAction) || urlAction === 'join';
      const actionToCheck = redirectAction || urlAction;
      
      console.log('🔍 Auto-modal check:', {
        hasSession: !!session,
        hasContest: !!contest,
        hasUserSubmission: !!userSubmission,
        contestStatus: contest.calculatedStatus,
        hasRedirectUrl,
        hasRedirectAction,
        urlAction,
        redirectAction,
        shouldOpenModal,
        actionToCheck,
        hasAutoOpenedModal
      });
      
      if (shouldOpenModal && actionToCheck === 'join') {
        console.log('🎯 Opening join modal automatically');
        
        // IMPORTANT: Clear redirect data IMMEDIATELY to prevent repeated triggers
        clearRedirectUrl();
        
        // Set flag to prevent repeated auto-opens
        setHasAutoOpenedModal(true);
        
        // Clean up the action parameter from URL if present
        if (urlAction === 'join') {
          urlParams.delete('action');
          const newUrl = urlParams.toString() 
            ? `${window.location.pathname}?${urlParams.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
        
        // Open the modal
        setShowJoinModal(true);
        
        // Show success toast for smoother UX
        toast.success('Welcome! Let\'s get you set up to join this contest.', {
          duration: 4000,
          icon: '🎉',
        });
      }
    }
  }, [session, hasRedirectUrl, hasRedirectAction, getRedirectAction, contest, userSubmission, clearRedirectUrl, hasAutoOpenedModal]);

  // Fallback mechanism - DISABLED to prevent annoying popup
  // TODO: Re-enable after fixing the main auto-modal logic
  /*
  useEffect(() => {
    if (session && contest && !userSubmission && !showJoinModal && contest.calculatedStatus === 'active') {
      const redirectAction = getRedirectAction();
      const urlParams = new URLSearchParams(window.location.search);
      const urlAction = urlParams.get('action');
      
      // If we have an action but modal didn't open, open it directly
      if (redirectAction === 'join' || urlAction === 'join') {
        const timer = setTimeout(() => {
          if (!showJoinModal) {
            console.log('🔄 Fallback: Opening join modal directly');
            setShowJoinModal(true);
            clearRedirectUrl(); // Clear to prevent repeated opens
            
            // Clean up the action parameter from URL if present
            if (urlAction === 'join') {
              urlParams.delete('action');
              const newUrl = urlParams.toString() 
                ? `${window.location.pathname}?${urlParams.toString()}`
                : window.location.pathname;
              window.history.replaceState({}, '', newUrl);
            }
            
            toast.success('Welcome! Let\'s get you set up to join this contest.', {
              duration: 4000,
              icon: '🎉',
            });
          }
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [session, contest, userSubmission, showJoinModal, getRedirectAction, clearRedirectUrl]);
  */

  const handleShare = async () => {
    try {
      await navigator.share({
        title: contest?.name || "Contest Details",
        text: contest?.description || "Check out this contest!",
        url: window.location.href,
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handlePlayVideo = (video: Participant) => {
    setViewVideo(video);
  };

  const handleJoinCompetition = () => {
    // Check if contest has ended
    if (contest?.calculatedStatus === 'ended') {
      toast.error('This contest has ended and is no longer accepting participants.');
      return;
    }

    if (!session) {
      // Show loading toast to indicate authentication is starting
      toast.loading('Redirecting to sign in...', { duration: 2000 });
      
      // Use the improved redirect system with action context
      redirectToAuth("/signin", { action: 'join' });
      return;
    }

    // Always show the ContestJoinModal - it handles TikTok connection internally
    setShowJoinModal(true);
  };

  const handleContestJoined = () => {
    setShowJoinModal(false);
    toast.success("Successfully joined contest!");
    // refetch leaderboard after join
    queryClient.invalidateQueries({ queryKey: ["leaderboard-public", id] });
    // refresh user submission
    setTimeout(async () => {
      if (session && id) {
        const { data } = await supa
          .from("contest_links")
          .select("*")
          .eq("contest_id", id as string)
          .eq("created_by", session.user.id)
          .eq("is_contest_submission", true)
          .single();
        setUserSubmission(data);
      }
    }, 500);
  };

  // TikTokSettingsModal handles its own success/failure states
  // No need for handleTikTokConnected function

  const getRankIcon = (rank: number, isWinner: boolean) => {
    if (!isWinner) {
      return null;
    }

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
    if (!previousRank) return <Minus className="h-4 w-4 text-gray-400" />;

    if (currentRank < previousRank) {
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    } else if (currentRank > previousRank) {
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getRankColor = (rank: number) => {
    const colors = {
      1: "text-yellow-400",
      2: "text-gray-400",
      3: "text-amber-600",
    };
    return colors[rank as keyof typeof colors] || "text-white";
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

  const getStatusBadge = () => {
    if (!contest) return null;

    const calculatedStatus = contest.calculatedStatus || 'draft';
    const statusColors = {
      active: "bg-green-100 text-green-800 border-green-200",
      ended: "bg-red-100 text-red-800 border-red-200",
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      archived: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };

    const statusText = {
      active: "Active",
      ended: "Ended",
      draft: "Draft",
      archived: "Archived",
    };

    return (
      <div
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          statusColors[calculatedStatus as keyof typeof statusColors]
        }`}
      >
        {statusText[calculatedStatus as keyof typeof statusText]}
      </div>
    );
  };

  if (loading || contestLoading || leaderboardLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-white/60" />
          <p className="mt-2 text-white/60">Loading contest...</p>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-4">
        <div className="max-w-md mx-auto">
          <Auth isSignUp={isSignUp} setIsSignUp={setIsSignUp} />
          <button
            onClick={() => setShowAuth(false)}
            className="mt-4 w-full text-center text-white/60 hover:text-white"
          >
            Back to Leaderboard
          </button>
        </div>
      </div>
    );
  }

  if (fetchError || !contest) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-4">
            {fetchError || "Contest not found"}
          </h2>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{contest?.name || "Contest"} | Crown</title>
        <meta
          name="description"
          content={
            contest?.description ||
            "Join Crown music leaderboard competitions. Get noticed, get rewarded."
          }
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={`${contest?.name || "Contest"} | Crown`}
        />
        <meta
          property="og:description"
          content={
            contest?.description ||
            "Join Crown music leaderboard competitions. Get noticed, get rewarded."
          }
        />
        {contest?.cover_image && (
          <meta property="og:image" content={contest.cover_image} />
        )}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${contest?.name || "Contest"} | Crown`}
        />
        <meta
          name="twitter:description"
          content={
            contest?.description ||
            "Join Crown music leaderboard competitions. Get noticed, get rewarded."
          }
        />
        {contest?.cover_image && (
          <meta name="twitter:image" content={contest.cover_image} />
        )}
      </Helmet>

      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex flex-col">
        {/* Contest Header */}
        <div className="relative">
          {/* Logo */}
          <div className="absolute top-0 left-0 right-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Link to="/" className="flex items-center gap-3">
                <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg" />
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg">
                  Crown
                </span>
              </Link>
            </div>
          </div>

          {contest?.cover_image ? (
            <div className="relative h-[50vh] sm:h-[60vh] lg:h-[65vh] w-full">
              <img
                src={contest.cover_image}
                alt={contest.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Title and Controls - Updated for better mobile display */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="space-y-2">
                        <h1 className="text-xl xs:text-2xl sm:text-4xl font-black text-white drop-shadow-sm line-clamp-2">
                          {contest?.name}
                        </h1>
                        {getStatusBadge()}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden xs:flex items-center gap-2 text-sm text-white/90 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                          <Clock className="h-4 w-4" />
                          <span>{timeLeft}</span>
                        </div>
                        {/* Mobile Timer */}
                        <div className="xs:hidden flex items-center gap-1.5 text-xs text-white/90 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
                          <Clock className="h-3 w-3" />
                          <span>{timeLeft}</span>
                        </div>
                        <button
                          onClick={handleShare}
                          className="p-2 rounded-full bg-black/30 hover:bg-black/40 text-white/90 backdrop-blur-sm transition-colors"
                          title="Share contest"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Fallback header when no cover image
            <div className="relative bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-b border-white/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
                <div className="flex flex-col gap-4 sm:gap-6">
                  <div className="flex items-start sm:items-center justify-between gap-4">
                    <div className="space-y-3">
                      <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-black text-white line-clamp-2">
                        {contest?.name}
                      </h1>
                      {getStatusBadge()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden xs:flex items-center gap-2 text-sm text-white/90 bg-white/10 px-3 py-2 rounded-full backdrop-blur-sm">
                        <Clock className="h-4 w-4" />
                        <span>{timeLeft}</span>
                      </div>
                      {/* Mobile Timer */}
                      <div className="xs:hidden flex items-center gap-1.5 text-xs text-white/90 bg-white/10 px-2 py-1.5 rounded-full backdrop-blur-sm">
                        <Clock className="h-3 w-3" />
                        <span>{timeLeft}</span>
                      </div>
                      <button
                        onClick={handleShare}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 backdrop-blur-sm transition-colors"
                        title="Share contest"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-32">
          {/* Contest Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  About this Contest
                </h3>
                <p
                  className={`text-white/80 leading-relaxed ${
                    !showFullDescription && "line-clamp-3"
                  }`}
                >
                  {contest.description}
                </p>
                {contest.description.length > 150 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-white hover:text-white/90 text-sm mt-2 font-medium"
                  >
                    {showFullDescription ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resources Section */}
          {contest.resources && contest.resources.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="h-4 w-4 text-white" />
                <h2 className="text-lg font-semibold text-white">
                  Helpful Resources
                </h2>
              </div>

              <div className="grid gap-2">
                {contest.resources.map((resource, index) => (
                  <div
                    key={index}
                    className="group bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">
                          {resource.title}
                        </h3>
                        {resource.description && (
                          <p className="text-xs text-white/60 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                      </div>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1 -m-1 rounded-full text-white/60 hover:text-white transition-colors"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prize Distribution */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-white" />
                <h2 className="text-lg font-semibold text-white">
                  {contest.prize_tier === "monetary" ? "Prize Pool" : "Prizes"}
                </h2>
              </div>
              <div className="text-sm text-white/60">
                {contest.prize_titles.length} Winners
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {contest.prize_titles.map((prize, index) => (
                <button
                  key={index}
                  onClick={() =>
                    setSelectedPrize({
                      rank: index + 1,
                      prize:
                        contest.prize_tier === "monetary"
                          ? contest.prize_per_winner * (1 - index * 0.2)
                          : prize.title,
                    })
                  }
                  className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {getRankIcon(index + 1, true)}
                    <span
                      className={`text-xs font-medium ${getRankColor(
                        index + 1
                      )}`}
                    >
                      {index + 1}
                      {index === 0
                        ? "st"
                        : index === 1
                        ? "nd"
                        : index === 2
                        ? "rd"
                        : "th"}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-white leading-tight line-clamp-2">
                    {contest.prize_tier === "monetary"
                      ? `$${formatNumber(
                          contest.prize_per_winner * (1 - index * 0.2)
                        )}`
                      : prize.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                Current Rankings
              </h2>
            </div>

            {/* Mobile View */}
            <div className="sm:hidden divide-y divide-white/10">
              {participants.map((participant) => (
                <div key={participant.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 text-center font-medium ${getRankColor(
                            participant.rank
                          )}`}
                        >
                          #{participant.rank}
                        </div>
                        {getRankIcon(
                          participant.rank,
                          participant.rank <= (contest.num_winners || 3)
                        )}
                        {getRankChangeIcon(
                          participant.rank,
                          participant.previousRank
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {participant.username}
                        </div>
                        <div className="text-xs text-white/60">
                          {formatNumber(participant.views)} views
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePlayVideo(participant)}
                      className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                      title="Play video"
                    >
                      <Play className="h-4 w-4 text-white/60 hover:text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-10 gap-4 px-6 py-3 bg-white/5 text-sm font-medium text-white/60">
                <div className="col-span-1">Rank</div>
                <div className="col-span-6">Participant</div>
                <div className="col-span-2 text-right">Views</div>
                <div className="col-span-1 text-center">Play</div>
              </div>

              <div className="divide-y divide-white/10">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="grid grid-cols-10 gap-4 px-6 py-4 items-center hover:bg-white/5"
                  >
                    <div className="col-span-1 flex items-center gap-2">
                      {getRankIcon(
                        participant.rank,
                        participant.rank <= (contest.num_winners || 3)
                      )}
                      <span
                        className={`text-sm font-medium ${getRankColor(
                          participant.rank
                        )}`}
                      >
                        #{participant.rank}
                      </span>
                      {getRankChangeIcon(
                        participant.rank,
                        participant.previousRank
                      )}
                    </div>
                    <div className="col-span-6 flex items-center gap-3">
                      {participant.thumbnail && (
                        <img
                          src={participant.thumbnail}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-white">
                          {participant.username}
                        </div>
                        <div className="text-sm text-white/60 line-clamp-1">
                          {participant.title || ""}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-right font-medium text-white">
                      {formatNumber(participant.views)}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => handlePlayVideo(participant)}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors group"
                        title="Play video"
                      >
                        <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Join Competition Button */}
        {contest.status === "active" && (
          <div className="fixed bottom-0 left-0 right-0 py-2 px-4 bg-black/95 backdrop-blur-lg border-t border-white/10">
            <div className="max-w-6xl mx-auto">
              {session ? (
                <div className="flex justify-center">
                  <div className="flex gap-4 w-full max-w-md">
                    {userSubmission && (
                      <div className="flex gap-3 w-full">
                        <div className="flex-1">
                          <button
                            onClick={() =>
                              navigate(`/contest-management/${id}`)
                            }
                            className="w-full px-3 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Settings className="h-4 w-4" />
                            <span>Manage</span>
                          </button>
                        </div>
                        <div className="flex-1">
                          <button
                            onClick={() => navigate(`/share/${id}`)}
                            className="w-full px-3 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Share2 className="h-4 w-4" />
                            <span>Share</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <button
                    onClick={handleJoinCompetition}
                    disabled={contest?.calculatedStatus === 'ended'}
                    className={`w-full font-medium py-3 rounded-lg transition-colors ${
                      contest?.calculatedStatus === 'ended'
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
                  >
                    {contest?.calculatedStatus === 'ended' ? 'Contest Ended' : 'Sign up to Join Contest'}
                  </button>
                </div>
              )}
            </div>
            {session && !userSubmission && (
              <div className="max-w-6xl mx-auto mt-2 flex justify-center">
                <button
                  onClick={handleJoinCompetition}
                  disabled={contest?.calculatedStatus === 'ended'}
                  className={`w-full max-w-md font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    contest?.calculatedStatus === 'ended'
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  {contest?.calculatedStatus === 'ended' ? 'Contest Ended' : 'Join Contest'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Prize Modal */}
        {selectedPrize && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#1A1A1A] rounded-xl border border-white/10 shadow-xl max-w-sm w-full">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getRankIcon(selectedPrize.rank, true)}
                  <h3 className="text-lg font-semibold text-white">
                    {selectedPrize.rank}
                    {selectedPrize.rank === 1
                      ? "st"
                      : selectedPrize.rank === 2
                      ? "nd"
                      : selectedPrize.rank === 3
                      ? "rd"
                      : "th"}{" "}
                    Place
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPrize(null)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>
              </div>
              <div className="p-4">
                <div className="text-center">
                  {contest.prize_tier === "monetary" ? (
                    <>
                      <div className="text-2xl font-bold text-white">
                        ${formatNumber(selectedPrize.prize as number)}
                      </div>
                      <p className="text-sm text-white/60 mt-1">Cash Prize</p>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-white">
                        {selectedPrize.prize}
                      </div>
                      <p className="text-sm text-white/60 mt-1">
                        Achievement Title
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-white/10 bg-white/5">
                <button
                  onClick={() => setSelectedPrize(null)}
                  className="w-full bg-white text-black py-2 rounded-lg hover:bg-white/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <TikTokSettingsModal
          isOpen={showTikTokModal}
          onClose={() => setShowTikTokModal(false)}
        />

        <TikTokSettingsModal
          isOpen={showTikTokSettings}
          onClose={() => setShowTikTokSettings(false)}
        />

        {contest && (
          <ContestJoinModal
            isOpen={showJoinModal}
            onClose={() => setShowJoinModal(false)}
            contest={contest as any}
            onSuccess={handleContestJoined}
          />
        )}

        {viewVideo && (
          <ViewSubmissionModal
            isOpen={!!viewVideo}
            onClose={() => setViewVideo(null)}
            video={viewVideo}
          />
        )}

        <Footer className="pb-32" />
      </div>
    </>
  );
}
