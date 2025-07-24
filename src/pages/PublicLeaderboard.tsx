import { useEffect, useState } from "react";
import {
  useParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import {
  Crown,
  Clock,
  Trophy,
  Play,
  Share2,
  X,
  Loader2,
  Home,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  Link as LinkIcon,
  Settings,
  UserPlus,
  VolumeX,
  Volume2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Auth } from "../components/Auth";
import { useAuth } from "../contexts/AuthContext";
import { ContestCountdown } from "../components/ContestCountdown";
import useEmblaCarousel from 'embla-carousel-react';
import {
  calculateContestStatus,
  getStatusLabel,
} from "../lib/contestUtils";
import toast from "react-hot-toast";
import { Helmet } from "react-helmet";
import { Footer } from "../components/Footer";
import { TikTokSettingsModal } from "../components/TikTokSettingsModal";
import { ContestJoinModal } from "../components/ContestJoinModal";
import { ViewSubmissionModal } from "../components/ViewSubmissionModal";
import { MobileVideoModal } from "../components/MobileVideoModal";
import { useAuthRedirect } from "../hooks/useAuthRedirect";
import { supabase as supa } from "../lib/supabase";

interface Participant {
  id: string;
  username: string;
  full_name: string;
  rank: number;
  previousRank?: number;
  views: number;
  video_url?: string | null; // Our stored video URL from Supabase
  url?: string; // Original TikTok URL
  thumbnail?: string;
  title?: string;
  embed_code?: string | null;
  tiktok_video_id?: string | null;
  avatar_url?: string | null; // TikTok profile avatar
  tiktok_display_name?: string | null; // TikTok display name
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
  calculatedStatus?: "draft" | "active" | "ended" | "archived";
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

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function PublicLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contest, setContest] = useState<ContestDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [selectedPrize, setSelectedPrize] = useState<{
    rank: number;
    prize: string | number;
  } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showTikTokSettings, setShowTikTokSettings] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [viewVideo, setViewVideo] = useState<any>(null);
  const [mobileVideo, setMobileVideo] = useState<any>(null);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [hasAutoOpenedModal, setHasAutoOpenedModal] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false
  });
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [coverLoaded, setCoverLoaded] = useState<{[key: string]: boolean}>({});
  const [videoLoaded, setVideoLoaded] = useState<{[key: string]: boolean}>({});
  const [isMuted, setIsMuted] = useState(true);

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  const {
    redirectToAuth,
    hasRedirectUrl,
    hasRedirectAction,
    getRedirectAction,
    clearRedirectUrl,
  } = useAuthRedirect();
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
        calculatedStatus: calculateContestStatus(contestData),
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
      // Debug logging to check if video_url and avatar_url are being received
      console.group("📊 Leaderboard Data Debug");
      console.log("Leaderboard response:", leaderboardResp.data.leaderboard);
      console.log(
        "First participant video_url:",
        leaderboardResp.data.leaderboard[0]?.video_url
      );
      console.log(
        "First participant avatar_url:",
        leaderboardResp.data.leaderboard[0]?.avatar_url
      );
      console.log(
        "First participant tiktok_display_name:",
        leaderboardResp.data.leaderboard[0]?.tiktok_display_name
      );
      console.log(
        "Participants with video_url:",
        leaderboardResp.data.leaderboard.filter((p: any) => p.video_url).length
      );
      console.log(
        "Participants with avatar_url:",
        leaderboardResp.data.leaderboard.filter((p: any) => p.avatar_url).length
      );
      console.groupEnd();

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
            if (days > 0) {
              setTimeLeft(`${days}d ${hours}h`);
            } else {
              setTimeLeft(`${hours}h ${minutes}m`);
            }
          } else {
            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
          }
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [contest?.end_date]);

  useEffect(() => {
    fetchContestData();
  }, [id]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedVideoIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi]);

  const fetchContestData = async () => {
    try {
      const { data: contestData, error: contestError } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id as string)
        .single();

      if (contestError || !contestData) {
        setFetchError("Contest not found or unavailable");
        setLoading(false);
        return;
      }

      const contestWithStatus = {
        ...contestData,
        calculatedStatus: calculateContestStatus(contestData),
      } as unknown as ContestDetails;

      setContest(contestWithStatus);

      // Fetch leaderboard
      const res = await fetch(
        `${backendUrl}/api/v1/contests/${id}/leaderboard?limit=200`
      );
      if (res.ok) {
        const leaderboardData = await res.json();
        if (leaderboardData.data?.leaderboard) {
          setParticipants(leaderboardData.data.leaderboard);
        }
      }
    } catch (error) {
      console.error("Error fetching contest data:", error);
      setFetchError("Failed to load contest data");
    } finally {
      setLoading(false);
    }
  };

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
    if (
      session &&
      contest &&
      !userSubmission &&
      contest.calculatedStatus === "active" &&
      !hasAutoOpenedModal
    ) {
      // Check for action parameter in URL (fallback for older implementation)
      const urlParams = new URLSearchParams(window.location.search);
      const urlAction = urlParams.get("action");

      // Get action from redirect system (preferred method)
      const redirectAction = getRedirectAction();

      // Be more restrictive - only trigger if there's BOTH a redirect URL AND action
      // This prevents triggering on normal page visits
      const shouldOpenModal =
        (hasRedirectUrl && hasRedirectAction) || urlAction === "join";
      const actionToCheck = redirectAction || urlAction;

      console.log("🔍 Auto-modal check:", {
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
        hasAutoOpenedModal,
      });

      if (shouldOpenModal && actionToCheck === "join") {
        console.log("🎯 Opening join modal automatically");

        // IMPORTANT: Clear redirect data IMMEDIATELY to prevent repeated triggers
        clearRedirectUrl();

        // Set flag to prevent repeated auto-opens
        setHasAutoOpenedModal(true);

        // Clean up the action parameter from URL if present
        if (urlAction === "join") {
          urlParams.delete("action");
          const newUrl = urlParams.toString()
            ? `${window.location.pathname}?${urlParams.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }

        // Open the modal
        setShowJoinModal(true);

        // Show success toast for smoother UX
        toast.success("Welcome! Let's get you set up to join this contest.", {
          duration: 4000,
          icon: "🎉",
        });
      }
    }
  }, [
    session,
    hasRedirectUrl,
    hasRedirectAction,
    getRedirectAction,
    contest,
    userSubmission,
    clearRedirectUrl,
    hasAutoOpenedModal,
  ]);

  // Handle video URL parameters for direct video access
  useEffect(() => {
    const videoId = searchParams.get("video");
    if (videoId && participants.length > 0 && !viewVideo && !mobileVideo) {
      const videoParticipant = participants.find((p) => p.id === videoId);
      if (videoParticipant) {
        const isMobile = window.innerWidth < 768;
        if (isMobile && videoParticipant.video_url) {
          setMobileVideo(videoParticipant);
        } else {
          setViewVideo(videoParticipant);
        }
      }
    }
  }, [searchParams, participants, viewVideo, mobileVideo]);

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
    // Update URL with video parameter for shareable links
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("video", video.id);
    setSearchParams(newSearchParams);

    // Check if we're on mobile and have a stored video
    const isMobile = window.innerWidth < 768;

    if (isMobile && video.video_url) {
      // Mobile with stored video: Show full-screen modal directly
      setMobileVideo(video);
    } else {
      // Desktop or TikTok iframe: Show regular modal with stats
      setViewVideo(video);
    }
  };

  const handleJoinCompetition = () => {
    // Check if contest has ended
    if (contest?.calculatedStatus === "ended") {
      toast.error(
        "This contest has ended and is no longer accepting participants."
      );
      return;
    }

    if (!session) {
      // Show loading toast to indicate authentication is starting
      toast.loading("Redirecting to sign in...", { duration: 2000 });

      // Use the improved redirect system with action context
      redirectToAuth("/signin", { action: "join" });
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

  const handleCoverLoad = (videoId: string) => {
    setCoverLoaded(prev => ({
      ...prev,
      [videoId]: true
    }));
  };

  const handleVideoLoad = (videoId: string) => {
    setVideoLoaded(prev => ({
      ...prev,
      [videoId]: true
    }));
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    // Handle muting for TikTok videos
    const tiktokIframe = document.querySelector('iframe[src*="tiktok.com"]') as HTMLIFrameElement;
    if (tiktokIframe) {
      tiktokIframe.contentWindow?.postMessage(
        JSON.stringify({
          action: isMuted ? 'unmute' : 'mute'
        }),
        '*'
      );
    }

    // Handle muting for uploaded videos
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement) {
      videoElement.muted = !isMuted;
    }
  };

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

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

    const calculatedStatus = contest.calculatedStatus || "draft";
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
        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium border min-h-[24px] ${
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
          <h1 className="text-2xl font-bold text-white mb-4">Contest Not Found</h1>
          <p className="text-white/60 mb-6">{fetchError || "This contest doesn't exist or is no longer available."}</p>
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

      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
        {/* Contest Header */}
        <div className="relative">
          {/* Logo */}
          <div className="absolute top-0 left-0 right-0 z-10">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
              <Link to="/" className="flex items-center gap-2 sm:gap-3">
                <Crown className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white drop-shadow-lg" />
                <span className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-lg">
                  Crown
                </span>
              </Link>
            </div>
          </div>

          {contest?.cover_image ? (
            <div className="relative h-[30vh] sm:h-[45vh] lg:h-[55vh] w-full">
              <img
                src={contest.cover_image}
                alt={contest.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Title and Controls - Updated for better mobile display */}
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6">
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col gap-2 sm:gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-2">
                        <h1 className="text-lg xs:text-xl sm:text-3xl lg:text-4xl font-black text-white drop-shadow-sm line-clamp-2 pr-2">
                          {contest?.name}
                        </h1>
                        {getStatusBadge()}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/90 bg-black/40 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full backdrop-blur-sm">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="font-medium">{timeLeft}</span>
                        </div>
                        <button
                          onClick={handleShare}
                          className="p-2 sm:p-2 rounded-full bg-black/40 hover:bg-black/50 text-white/90 backdrop-blur-sm transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                          title="Share contest"
                        >
                          <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-6 sm:pb-8">
                <div className="flex flex-col gap-3 sm:gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="space-y-2 sm:space-y-3">
                      <h1 className="text-xl xs:text-2xl sm:text-4xl lg:text-5xl font-black text-white line-clamp-2 pr-2">
                        {contest?.name}
                      </h1>
                      {getStatusBadge()}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/90 bg-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full backdrop-blur-sm">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="font-medium">{timeLeft}</span>
                      </div>
                      <button
                        onClick={handleShare}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 backdrop-blur-sm transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Share contest"
                      >
                        <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-6 space-y-3 sm:space-y-6 pb-20 sm:pb-32">
          {/* Contest Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3 sm:p-6">
            <div className="space-y-2 sm:space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                  About this Contest
                </h3>
                <div className="max-h-[25vh] sm:max-h-none overflow-y-auto">
                  <p
                    className={`text-sm sm:text-base text-white/80 leading-relaxed ${
                      !showFullDescription && "line-clamp-4 sm:line-clamp-3"
                    }`}
                  >
                    {contest.description}
                  </p>
                </div>
                {contest.description.length > 150 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-white hover:text-white/90 text-sm mt-2 font-medium min-h-[44px] flex items-center"
                  >
                    {showFullDescription ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resources Section */}
          {contest.resources && contest.resources.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-2 sm:mb-4">
                <LinkIcon className="h-4 w-4 text-white" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Helpful Resources
                </h2>
              </div>

              <div className="max-h-[25vh] sm:max-h-none overflow-y-auto">
                <div className="grid gap-2 sm:gap-3">
                  {contest.resources.map((resource, index) => (
                    <div
                      key={index}
                      className="group bg-white/5 rounded-lg p-2.5 sm:p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-medium text-white line-clamp-1 mb-1">
                            {resource.title}
                          </h3>
                          {resource.description && (
                            <p className="text-xs sm:text-sm text-white/60 line-clamp-1 sm:line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                        </div>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-2 rounded-full text-white/60 hover:text-white transition-colors hover:bg-white/10 min-w-[40px] min-h-[40px] flex items-center justify-center"
                        >
                          <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Prize Distribution */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  {contest.prize_tier === "monetary" ? "Prize Pool" : "Prizes"}
                </h2>
              </div>
              <div className="text-xs sm:text-sm text-white/60">
                {contest.prize_titles.length} Winners
              </div>
            </div>

            <div className="max-h-[30vh] sm:max-h-none overflow-y-auto">
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
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
                    className="p-3 rounded-lg border snap-center flex-shrink-0 w-[280px] bg-black/20 border-white/10 transition-all hover:bg-white/5"
                  >
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1.5 mb-0.5 sm:mb-1.5">
                      {getRankIcon(index + 1, true)}
                      <span
                        className={`text-xs sm:text-sm font-medium ${getRankColor(
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
                    <div className="text-sm font-medium leading-tight text-white text-center">
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
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-6">
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2 mt-8 sm:mt-12">
                  Featured Submissions
                </h2>
                <p className="text-white/60 text-sm sm:text-base">
                  Watch the top contest entries from talented creators
                </p>
              </div>

              {/* Video Carousel */}
              {participants.length > 0 && (
                <div className="mb-8">
                  <div className="relative max-w-7xl mx-auto w-full">
                    <div className="overflow-hidden w-full" ref={emblaRef}>
                      <div className="flex">
                        {participants.slice(0, 10).map((entry, index) => {
                          const isSelected = index === selectedVideoIndex;
                          const scale = isSelected ? 1 : 0.85;
                          const opacity = isSelected ? 1 : 0.3;

                          return (
                            <div 
                              key={entry.id}
                              className="flex-[0_0_100%] min-w-0 px-2 md:flex-[0_0_33.333%] lg:flex-[0_0_25%] flex items-center justify-center"
                            >
                              <div 
                                className="relative transition-all duration-300 ease-out group will-change-transform"
                                style={{
                                  transform: `scale(${scale})`,
                                  opacity,
                                  width: '280px',
                                  maxWidth: '100%'
                                }}
                              >
                                <div 
                                  className="relative bg-black rounded-2xl overflow-hidden"
                                  style={{ aspectRatio: '9/16' }}
                                >
                                  {/* Loading Placeholder */}
                                  {!coverLoaded[entry.id] && (
                                    <div className="absolute inset-0 bg-black flex items-center justify-center">
                                      <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                                    </div>
                                  )}

                                  {/* Thumbnail */}
                                  <img
                                    src={entry.thumbnail || 'https://images.pexels.com/photos/7500307/pexels-photo-7500307.jpeg'}
                                    alt={entry.title}
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                                      isSelected && videoLoaded[entry.id] ? 'opacity-0' : 'opacity-100'
                                    }`}
                                    loading={isSelected ? 'eager' : 'lazy'}
                                    onLoad={() => handleCoverLoad(entry.id)}
                                  />

                                  {/* Video Content */}
                                  {isSelected && (
                                    <div className="absolute inset-0">
                                      {entry.video_url ? (
                                        <video
                                          src={entry.video_url}
                                          className={`w-full h-full object-cover rounded-2xl transition-opacity duration-700 ${
                                            videoLoaded[entry.id] ? 'opacity-100' : 'opacity-0'
                                          }`}
                                          autoPlay
                                          loop
                                          muted={isMuted}
                                          playsInline
                                          controls={false}
                                          onLoadedData={() => handleVideoLoad(entry.id)}
                                        />
                                      ) : (
                                        <iframe
                                          src={`https://www.tiktok.com/embed/v2/${entry.tiktok_video_id}`}
                                          allow="encrypted-media; fullscreen"
                                          scrolling="no"
                                          frameBorder="0"
                                          className="absolute inset-0 w-full h-full"
                                          onLoad={() => handleVideoLoad(entry.id)}
                                        />
                                      )}
                                    </div>
                                  )}

                                  {/* Gradient Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                                  {/* Video Info */}
                                  <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                          entry.rank === 1 ? 'bg-yellow-400/20 text-yellow-400' :
                                          entry.rank === 2 ? 'bg-gray-300/20 text-gray-300' :
                                          entry.rank === 3 ? 'bg-amber-600/20 text-amber-600' :
                                          'bg-white/20 text-white'
                                        }`}>
                                          #{entry.rank}
                                        </div>
                                      </div>
                                      <h3 className="text-sm sm:text-base font-medium text-white line-clamp-1">
                                        {entry.title}
                                      </h3>
                                      <div className="flex items-center gap-2 text-xs sm:text-sm text-white/60">
                                        <span>@{entry.tiktok_display_name || entry.username}</span>
                                        <span>•</span>
                                        <span>{formatNumber(entry.views)} views</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Mute Button */}
                                  {isSelected && (
                                    <button
                                      onClick={toggleMute}
                                      className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors"
                                    >
                                      {isMuted ? (
                                        <VolumeX className="h-4 w-4" />
                                      ) : (
                                        <Volume2 className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navigation Arrows */}
                    {participants.length > 1 && (
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
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-white/10">
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Current Rankings
                </h2>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden">
                <div className="max-h-[30vh] sm:max-h-[50vh] overflow-y-auto divide-y divide-white/10">
                  {participants.map((participant) => (
                    <div key={participant.id} className="p-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col items-center gap-0.5 min-w-[28px]">
                          <div className="flex items-center gap-0.5">
                            <div
                              className={`text-xs font-bold ${getRankColor(
                                participant.rank
                              )}`}
                            >
                              #{participant.rank}
                            </div>
                            <div className="scale-75">
                              {getRankIcon(
                                participant.rank,
                                participant.rank <= (contest.num_winners || 3)
                              )}
                            </div>
                          </div>
                          <div className="scale-[0.6]">
                            {getRankChangeIcon(
                              participant.rank,
                              participant.previousRank
                            )}
                          </div>
                        </div>

                        {/* Avatar */}
                        {participant.avatar_url ? (
                          <img
                            src={participant.avatar_url}
                            alt={`${participant.username} profile`}
                            className="w-6 h-6 rounded-full object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border border-white/10 flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {participant.tiktok_display_name?.charAt(0) ||
                                participant.username?.charAt(0) ||
                                "U"}
                            </span>
                          </div>
                        )}

                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white text-xs truncate leading-none mb-0.5">
                                {participant.tiktok_display_name ||
                                  participant.username}
                              </div>
                              <div className="text-xs text-white/60 leading-none">
                                {formatNumber(participant.views)} views
                              </div>
                            </div>

                            {/* Video Thumbnail with Play Button */}
                            {participant.thumbnail && (
                              <div
                                className="relative flex-shrink-0 cursor-pointer ml-2"
                                onClick={() => handlePlayVideo(participant)}
                                title="Play video"
                              >
                                <img
                                  src={participant.thumbnail}
                                  alt={`${participant.username} video thumbnail`}
                                  className="w-16 h-16 object-cover rounded-lg"
                                  loading="lazy"
                                  decoding="async"
                                  onLoad={(e) => {
                                    const overlay = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (overlay) overlay.style.opacity = '0';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 rounded-lg transition-all opacity-80 hover:opacity-100"
                                     style={{ transition: 'opacity 0.3s ease' }}>
                                  <Play className="h-3 w-3 text-white drop-shadow-lg" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block">
                <div className="grid grid-cols-10 gap-4 px-6 py-3 bg-white/5 text-sm font-medium text-white/60">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-6">Participant</div>
                  <div className="col-span-2 text-right">Views</div>
                  <div className="col-span-1 text-center">Preview</div>
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
                        <div className="flex items-center gap-2">
                          {/* Profile Avatar */}
                          {participant.avatar_url ? (
                            <img
                              src={participant.avatar_url}
                              alt={`${participant.username} profile`}
                              className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border border-white/10 flex-shrink-0">
                              <span className="text-white text-sm font-medium">
                                {participant.tiktok_display_name?.charAt(0) ||
                                  participant.username?.charAt(0) ||
                                  "U"}
                              </span>
                            </div>
                          )}
                          {/* Video Thumbnail with Play Button */}
                          {participant.thumbnail && (
                            <div
                              className="relative flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-white/20 rounded-lg transition-all"
                              onClick={() => handlePlayVideo(participant)}
                              title="Play video"
                            >
                              <img
                                src={participant.thumbnail}
                                alt={`${participant.username} video thumbnail`}
                                className="w-10 h-10 rounded-lg object-cover border border-white/10"
                              />
                              {/* Play icon overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 rounded-lg transition-all opacity-80 hover:opacity-100">
                                <Play className="h-4 w-4 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">
                            {participant.tiktok_display_name ||
                              participant.username}
                          </div>
                          <div className="text-sm text-white/60 line-clamp-1">
                            @{participant.username}
                          </div>
                          {participant.title && (
                            <div className="text-xs text-white/40 line-clamp-1">
                              {participant.title}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-medium text-white">
                        {formatNumber(participant.views)}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {participant.thumbnail ? (
                          <div
                            className="relative cursor-pointer hover:ring-1 hover:ring-white/30 rounded transition-all"
                            onClick={() => handlePlayVideo(participant)}
                            title="Play video"
                          >
                            <img
                              src={participant.thumbnail}
                              alt="Video preview"
                              className="w-6 h-6 rounded object-cover opacity-60 hover:opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play className="h-2 w-2 text-white/80 drop-shadow" />
                            </div>
                          </div>
                        ) : (
                          <div className="text-white/30 text-xs">No preview</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Join Competition Button */}
        {contest.status === "active" && (
          <div className="fixed bottom-0 left-0 right-0 py-2 px-3 sm:py-2 sm:px-4 bg-black/95 backdrop-blur-lg border-t border-white/10 pb-safe-area-inset-bottom">
            <div className="max-w-6xl mx-auto flex justify-center">
              {userSubmission ? (
                <div className="flex gap-2 sm:gap-4 w-full max-w-md">
                  <div className="flex gap-2 sm:gap-3 w-full">
                    <div className="flex-1">
                      <button
                        onClick={() =>
                          navigate(`/contest-management/${id}`)
                        }
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5 min-h-[48px] text-sm sm:text-base"
                      >
                        <Settings className="h-4 w-4" />
                        <span className="hidden xs:inline">Manage</span>
                        <span className="xs:hidden">Edit</span>
                      </button>
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={() => navigate(`/share/${id}`)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5 min-h-[48px] text-sm sm:text-base"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <button
                    onClick={handleJoinCompetition}
                    disabled={contest?.calculatedStatus === "ended"}
                    className={`w-full font-semibold py-3 sm:py-3 rounded-lg transition-colors min-h-[48px] text-sm sm:text-base flex items-center justify-center gap-1.5 ${
                      contest?.calculatedStatus === "ended"
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-white text-black hover:bg-white/90"
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    {contest?.calculatedStatus === "ended" ? (
                      "Contest Ended"
                    ) : (
                      <>
                        <span className="hidden xs:inline">Join Contest</span>
                        <span className="xs:hidden">Join</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            {session && !userSubmission && (
              <div className="max-w-6xl mx-auto mt-2 flex justify-center">
                <button
                  onClick={handleJoinCompetition}
                  disabled={contest?.calculatedStatus === "ended"}
                  className={`w-full max-w-md font-semibold py-2.5 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 min-h-[48px] text-sm sm:text-base ${
                    contest?.calculatedStatus === "ended"
                      ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  {contest?.calculatedStatus === "ended" ? (
                    "Contest Ended"
                  ) : (
                    <>
                      <span className="hidden xs:inline">Join Contest</span>
                      <span className="xs:hidden">Join</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Prize Modal */}
        {selectedPrize && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
            <div className="bg-[#1A1A1A] rounded-xl border border-white/10 shadow-xl max-w-sm w-full mx-2">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getRankIcon(selectedPrize.rank, true)}
                  <h3 className="text-base sm:text-lg font-semibold text-white">
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
                  className="p-2 hover:bg-white/10 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>
              </div>
              <div className="p-4">
                <div className="text-center">
                  {contest.prize_tier === "monetary" ? (
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      ${formatNumber(selectedPrize.prize as number)}
                    </div>
                  ) : (
                    <div className="text-lg font-medium text-white">
                      {selectedPrize.prize}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-white/10 bg-white/5">
                <button
                  onClick={() => setSelectedPrize(null)}
                  className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
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
            onClose={() => {
              setViewVideo(null);
              // Remove video parameter from URL when closing
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete("video");
              setSearchParams(newSearchParams);
            }}
            video={viewVideo}
          />
        )}

        {/* Mobile full-screen video modal */}
        {mobileVideo && (
          <MobileVideoModal
            isOpen={!!mobileVideo}
            onClose={() => {
              setMobileVideo(null);
              // Remove video parameter from URL when closing
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete("video");
              setSearchParams(newSearchParams);
            }}
            video={mobileVideo}
          />
        )}
      </div>
    </>
  );
}