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
  Share2,
  Play,
  Home,
  Users,
  Gift,
  Sparkles,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share,
  Calendar,
  Music,
  Award,
  Target,
  Zap,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Loader2,
  UserPlus,
  Settings,
  ExternalLink,
  Info,
  X,
  CheckCircle,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { ContestJoinModal } from "../components/ContestJoinModal";
import { TikTokSettingsModal } from "../components/TikTokSettingsModal";
import { ViewSubmissionModal } from "../components/ViewSubmissionModal";
import { MobileVideoModal } from "../components/MobileVideoModal";
import { useTikTokConnection } from "../hooks/useTikTokConnection";
import { useAuthRedirect } from "../hooks/useAuthRedirect";
import { 
  calculateContestStatus, 
  getStatusLabel, 
  getStatusColor,
  formatTimeRemaining,
  getTimeRemaining 
} from "../lib/contestUtils";
import { ContestCountdown } from "../components/ContestCountdown";
import useEmblaCarousel from 'embla-carousel-react';

interface Contest {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  status: string | null;
  music_category?: string | null;
  prize_per_winner?: number | null;
  prize_titles?: any | null;
  num_winners?: number | null;
  total_prize?: number | null;
  guidelines?: string | null;
  rules?: string | null;
  hashtags?: string[] | null;
  submission_deadline?: string | null;
  max_participants?: number | null;
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

interface Participant {
  rank: number;
  user_id: string;
  full_name: string;
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
}

export function PublicLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { redirectToAuth } = useAuthRedirect();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [showTikTokSettings, setShowTikTokSettings] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState<{[key: string]: boolean}>({});
  const [coverLoaded, setCoverLoaded] = useState<{[key: string]: boolean}>({});
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentHowItWorksSlide, setCurrentHowItWorksSlide] = useState(0);

  const howItWorksSteps = [
    {
      icon: UserPlus,
      title: "Step 1: Submit Your Entry",
      description: "Create and submit your festival-level original mix or set following the contest guidelines. Make sure your content is original and follows all contest rules.",
      tip: "High-quality audio and engaging visuals will help your entry stand out from the competition."
    },
    {
      icon: Share2,
      title: "Step 2: Share & Promote",
      description: "Share your entry across social media platforms to gain views and engagement. The more people who watch and interact with your content, the higher you'll rank.",
      tip: "Use relevant hashtags and engage with your audience to maximize reach and views."
    },
    {
      icon: TrendingUp,
      title: "Step 3: Climb the Leaderboard",
      description: "Your ranking is based on views, likes, comments, and shares. Monitor your position on the leaderboard and keep promoting to climb higher.",
      tip: "Consistent promotion and audience engagement are key to maintaining a top position."
    },
    {
      icon: Trophy,
      title: "Step 4: Win Amazing Prizes",
      description: "Top performers win cash prizes, recognition, and opportunities for career advancement. Winners are announced at the end of the contest period.",
      tip: "Even if you don't win first place, being in the top rankings can lead to valuable networking opportunities."
    }
  ];

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false
  });

  useEffect(() => {
    if (id) {
      fetchContestData();
      fetchLeaderboard();
      fetchFeaturedVideos();
      if (session) {
        fetchUserSubmission();
      }
    }
  }, [id, session]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrentVideoIndex(emblaApi.selectedScrollSnap());
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
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setContest(data);
    } catch (error) {
      console.error("Error fetching contest:", error);
      toast.error("Contest not found");
      navigate("/");
    }
  };

  const fetchLeaderboard = async () => {
    try {
      if (backendUrl && backendUrl !== "http://localhost:3000") {
        const response = await fetch(
          `${backendUrl}/api/v1/contests/${id}/leaderboard?limit=100`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.data?.leaderboard) {
            setParticipants(data.data.leaderboard);
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch leaderboard:', error);
    }
  };

  const fetchFeaturedVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("contest_links")
        .select("*")
        .eq("contest_id", id)
        .eq("is_contest_submission", true)
        .eq("active", true)
        .order("views", { ascending: false })
        .limit(10);

      if (error) throw error;

      const videosWithRank = (data || []).map((video, index) => ({
        ...video,
        rank: index + 1,
      }));

      setFeaturedVideos(videosWithRank);

      // Initialize loading states
      const initialLoadState = videosWithRank.reduce((acc, video) => ({
        ...acc,
        [video.id]: false
      }), {});
      setCoverLoaded(initialLoadState);
      setVideoLoaded(initialLoadState);
    } catch (error) {
      console.error("Error fetching featured videos:", error);
      // Set empty array to prevent UI issues
      setFeaturedVideos([]);
      setCoverLoaded({});
      setVideoLoaded({});
    } finally {
      setLoading(false);
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

      if (error && error.code !== 'PGRST116') throw error;
      setUserSubmission(data);
    } catch (error) {
      console.error("Error fetching user submission:", error);
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
    fetchUserSubmission();
    fetchLeaderboard();
    toast.success("Successfully joined contest!");
  };

  const handleVideoClick = (video: VideoData, index: number) => {
    setSelectedVideo(video);
    setCurrentVideoIndex(index);
    
    // Check if mobile
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setShowMobileModal(true);
    } else {
      setShowViewModal(true);
    }
  };

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

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
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
          <Crown className={`h-5 w-5 ${color}`} />
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
        </div>
      );
    }

    return (
      <div className="relative">
        <Crown className={`h-5 w-5 ${color}`} />
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

  const formatCurrency = (value: number) => {
    const rounded = Math.round(value * 100) / 100;
    if (rounded >= 1000) {
      return formatNumber(rounded);
    }
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  const formatRank = (rank: number) => {
    const suffixes = ["st", "nd", "rd"];
    return `${rank}${suffixes[rank - 1] || "th"}`;
  };

  const getRankColor = (rank: number) => {
    const colors = {
      1: "text-yellow-400",
      2: "text-gray-400",
      3: "text-amber-600",
    };
    return colors[rank as keyof typeof colors] || "text-white/60";
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      await navigator.share({
        title: contest?.name || "Contest",
        text: contest?.description || "Check out this contest!",
        url: shareUrl,
      });
    } catch (error) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
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
          <p className="mt-6 text-white/60 font-light tracking-wider">LOADING</p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Contest Not Found</h2>
          <p className="text-white/60 mb-6">This contest may have ended or been removed.</p>
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
  const timeRemaining = getTimeRemaining(contest);

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
      {/* Hero Section with Cover Image */}
      <div className="relative mb-8 sm:mb-0">
        {contest.cover_image && (
          <div className="absolute inset-0 h-[50vh] sm:h-[70vh]">
            <img
              src={contest.cover_image}
              alt={contest.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90"></div>
          </div>
        )}
        
        <div className="relative z-10 h-[50vh] sm:h-[70vh] flex flex-col">
          {/* Header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 w-full">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">Crown</span>
              </Link>
              
              {session ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTikTokSettings(true)}
                    className="flex items-center justify-center px-2 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl transition-colors text-white text-xs sm:text-base"
                  >
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
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
          
          {/* Bottom gradient overlay for better blending */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 via-[#0A0A0A]/40 to-transparent pointer-events-none"></div>
        </div>
      </div>

      {/* Contest Info Section - Moved Lower */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 -mt-16 sm:-mt-24 relative z-10">
        <div className="space-y-12 sm:space-y-16">
          {/* Section 1: Contest Title */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight sm:leading-[0.9] -mt-32 sm:-mt-40 relative z-20 bg-gradient-to-b from-transparent via-black/30 via-black/70 via-black/95 to-[#0A0A0A] pt-24 sm:pt-32 pb-8 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-16 lg:px-16 xl:-mx-24 xl:px-24 2xl:-mx-32 2xl:px-32 flex items-center justify-center min-h-[40vh] sm:min-h-[50vh]">
              <span className="bg-gradient-to-r from-white via-white to-gray-100 bg-clip-text text-transparent drop-shadow-2xl filter text-shadow-lg transform-gpu hover:scale-105 transition-transform duration-300 block animate-pulse-subtle text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl">
                {contest.name}
                <span className="block text-sm sm:text-base lg:text-lg text-white/80 mt-4 font-normal tracking-normal leading-relaxed max-w-3xl mx-auto px-4 animate-none hover:scale-100">
                  {contest.description}
                </span>
              </span>
            </h1>
            <div className="mt-4 sm:mt-6">
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center max-w-lg mx-auto">
              {session && userSubmission ? (
                <button
                  onClick={() => navigate(`/contest-management/${contest.id}`)}
                  className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-black rounded-xl sm:rounded-2xl hover:bg-white/90 transition-all duration-300 font-semibold text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105 border border-white/20"
                >
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  Manage Entry
                </button>
              ) : (
                <button
                  onClick={handleJoinContest}
                  className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-black rounded-xl sm:rounded-2xl hover:bg-white/90 transition-all duration-300 font-semibold text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105 border border-white/20"
                >
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                  {session ? "Join Contest" : "Sign Up to Join"}
                </button>
              )}
              
              <button
                onClick={() => setShowHowItWorksModal(true)}
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl sm:rounded-2xl transition-all duration-300 font-semibold text-base sm:text-lg flex items-center justify-center gap-3 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Info className="h-4 w-4 sm:h-5 sm:w-5" />
                How It Works
              </button>
            </div>
          </div>

          {/* Section 3: How It Works */}
          <div className="text-center mt-12 sm:mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 tracking-tight bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              How It Works
            </h2>
            
            {/* Horizontal Scroll Implementation */}
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                {/* Step 1: Submit Entry */}
                <div className="flex-shrink-0 w-48 p-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 snap-start hover:bg-white/10 transition-all duration-300">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-blue-400">1</span>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">Submit Your Entry</h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Create and submit your festival-level original mix or set following the contest guidelines.
                    </p>
                  </div>
                </div>

                {/* Step 2: Get Views */}
                <div className="flex-shrink-0 w-48 p-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 snap-start hover:bg-white/10 transition-all duration-300">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-green-400">2</span>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">Share & Promote</h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Share your entry across social media to gain views, likes, and engagement from the community.
                    </p>
                  </div>
                </div>

                {/* Step 3: Climb Rankings */}
                <div className="flex-shrink-0 w-48 p-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 snap-start hover:bg-white/10 transition-all duration-300">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-purple-400">3</span>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">Climb the Leaderboard</h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Watch your ranking rise as you gain more views and engagement from the community.
                    </p>
                  </div>
                </div>

                {/* Step 4: Win Prizes */}
                <div className="flex-shrink-0 w-48 p-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 snap-start hover:bg-white/10 transition-all duration-300">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-yellow-400">4</span>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">Win Amazing Prizes</h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      Top performers win cash prizes and recognition in the electronic music community.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      {/* Featured Submissions Video Player */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-8 sm:mt-12">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-3xl font-black text-white mb-2 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
            <Play className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
            Featured Submissions
          </h2>
          <p className="text-sm sm:text-base text-white/60">
            Watch the top performing entries in this contest
          </p>
        </div>

        {featuredVideos.length > 0 ? (
          <div className="relative max-w-7xl mx-auto w-full">
            <div className="overflow-hidden w-full" ref={emblaRef}>
              <div className="flex">
                {featuredVideos.map((video, index) => {
                  const isSelected = index === currentVideoIndex;
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
                          width: '280px',
                          maxWidth: '100%'
                        }}
                        onClick={() => handleVideoClick(video, index)}
                      >
                        <div 
                          className="relative bg-black rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all"
                          style={{ aspectRatio: '9/16' }}
                        >
                          {/* Loading Placeholder */}
                          {!coverLoaded[video.id] && (
                            <div className="absolute inset-0 bg-black flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                            </div>
                          )}

                          {/* Thumbnail */}
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                              isSelected && videoLoaded[video.id] ? 'opacity-0' : 'opacity-100'
                            }`}
                            loading={isSelected ? 'eager' : 'lazy'}
                            onLoad={() => handleCoverLoad(video.id)}
                          />

                          {/* Video Content */}
                          {isSelected && (
                            <div className="absolute inset-0">
                              {video.video_url ? (
                                <video
                                  src={video.video_url}
                                  className="w-full h-full object-cover rounded-2xl opacity-100"
                                  autoPlay
                                  loop
                                  muted={isMuted}
                                  playsInline
                                  controls={false}
                                />
                              ) : null}
                            </div>
                          )}

                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                          {/* Rank Badge */}
                          {video.rank && (
                            <div className="absolute top-4 left-4">
                              <div className={`px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm border ${
                                video.rank === 1 ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' :
                                video.rank === 2 ? 'bg-gray-300/20 text-gray-300 border-gray-300/30' :
                                video.rank === 3 ? 'bg-amber-600/20 text-amber-600 border-amber-600/30' :
                                video.rank <= 10 ? 'bg-blue-400/20 text-blue-400 border-blue-400/30' :
                                'bg-white/20 text-white border-white/30'
                              }`}>
                                #{video.rank}
                              </div>
                            </div>
                          )}

                          {/* Video Info */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="space-y-2">
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
                                setIsMuted(!isMuted);
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation Arrows */}
            {featuredVideos.length > 1 && (
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
            <Music className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Submissions Yet</h3>
            <p className="text-white/60">Be the first to submit your entry!</p>
          </div>
        )}
      </div>

      {/* Contest Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
          <div className="text-center p-4 sm:p-6 bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400 mx-auto mb-2 sm:mb-3" />
            <div className="text-lg sm:text-2xl font-bold text-white">{participants.length}</div>
            <div className="text-xs sm:text-sm text-white/60">Participants</div>
          </div>
          
          <div className="text-center p-4 sm:p-6 bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400 mx-auto mb-2 sm:mb-3" />
            <div className="text-lg sm:text-2xl font-bold text-white">{contest.num_winners || 3}</div>
            <div className="text-xs sm:text-sm text-white/60">Winners</div>
          </div>
          
          <div className="text-center p-4 sm:p-6 bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10">
            <Music className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400 mx-auto mb-2 sm:mb-3" />
            <div className="text-sm sm:text-lg font-bold text-white">{contest.music_category || "All"}</div>
            <div className="text-xs sm:text-sm text-white/60">Category</div>
          </div>
          
          <div className="text-center p-4 sm:p-6 bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10">
            <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-green-400 mx-auto mb-2 sm:mb-3" />
            <div className="text-sm sm:text-lg font-bold text-white">
              {contest.prize_per_winner ? `$${formatCurrency(contest.prize_per_winner)}` : "Titles"}
            </div>
            <div className="text-xs sm:text-sm text-white/60">Prize Type</div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-3xl font-black text-white mb-2 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
            Live Leaderboard
          </h2>
          <p className="text-sm sm:text-base text-white/60">
            Rankings update in real-time based on video performance
          </p>
        </div>

        {participants.length > 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-white/10">
              {participants.slice(0, 50).map((participant) => (
                <div key={participant.video_id} className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Rank and Icon */}
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${getRankColor(participant.rank)}`}>
                        #{participant.rank}
                      </span>
                      {getRankIcon(participant.rank)}
                    </div>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate text-sm">
                        @{participant.tiktok_username || participant.username || 'Unknown'}
                      </div>
                      <div className="text-xs text-white/60">
                        {formatNumber(participant.views)} views
                      </div>
                    </div>
                    
                    {/* Right Side - Likes and Thumbnail */}
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-white/40 text-right">
                        {formatNumber(participant.likes)} ♥
                      </div>
                      {/* Thumbnail with Play Button Overlay */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative group cursor-pointer"
                        onClick={() => {
                          const video = {
                            id: participant.video_id,
                            title: participant.video_title,
                            url: participant.video_url,
                            video_url: participant.video_url,
                            thumbnail: participant.thumbnail,
                            username: participant.tiktok_username,
                            views: participant.views,
                            likes: participant.likes,
                            comments: participant.comments,
                            shares: participant.shares,
                            rank: participant.rank
                          };
                          handleVideoClick(video, participants.findIndex(p => p.video_id === participant.video_id));
                        }}
                      >
                        <img
                          src={participant.thumbnail}
                          alt={participant.video_title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
                            <Play className="h-3 w-3 text-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                      Engagement
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {participants.slice(0, 50).map((participant) => (
                    <tr key={participant.video_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getRankIcon(participant.rank)}
                          <span className={`font-bold text-lg ${getRankColor(participant.rank)}`}>
                            #{participant.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {participant.tiktok_display_name?.charAt(0) || participant.tiktok_username?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {participant.tiktok_display_name || participant.tiktok_username}
                            </div>
                            <div className="text-sm text-white/60">
                              @{participant.tiktok_username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-lg font-bold text-white">
                          {formatNumber(participant.views)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="flex items-center gap-3 text-sm text-white/60">
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4 text-red-400" />
                              <span>{formatNumber(participant.likes)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4 text-blue-400" />
                              <span>{formatNumber(participant.comments)}</span>
                            </div>
                          </div>
                          
                          {/* Thumbnail with Play Button Overlay */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative group cursor-pointer"
                            onClick={() => {
                              const video = {
                                id: participant.video_id,
                                title: participant.video_title,
                                url: participant.video_url,
                                video_url: participant.video_url,
                                thumbnail: participant.thumbnail,
                                username: participant.tiktok_username,
                                views: participant.views,
                                likes: participant.likes,
                                comments: participant.comments,
                                shares: participant.shares,
                                rank: participant.rank
                              };
                              handleVideoClick(video, participants.findIndex(p => p.video_id === participant.video_id));
                            }}
                          >
                            <img
                              src={participant.thumbnail}
                              alt={participant.video_title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
                                <Play className="h-3 w-3 text-black ml-0.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <Target className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Participants Yet</h3>
            <p className="text-white/60 mb-6">Be the first to join this contest!</p>
            <button
              onClick={handleJoinContest}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-medium"
            >
              Join Contest
            </button>
          </div>
        )}
      </div>

      {/* Contest Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Guidelines */}
          {contest.guidelines && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                Guidelines
              </h3>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">{contest.guidelines}</p>
            </div>
          )}

          {/* Rules */}
          {contest.rules && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                Rules
              </h3>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">{contest.rules}</p>
            </div>
          )}

          {/* Hashtags */}
          {contest.hashtags && contest.hashtags.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
                Hashtags
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {contest.hashtags.map((hashtag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30"
                  >
                    #{hashtag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How It Works Modal */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="relative">
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="absolute top-4 right-4 z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-white/60" />
              </button>
              
              <div className="p-8 text-center">
                {/* Dynamic Step Content */}
                {howItWorksSteps[currentHowItWorksSlide] && (
                  <>
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      {React.createElement(howItWorksSteps[currentHowItWorksSlide].icon, {
                        className: "h-8 w-8 text-blue-400"
                      })}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      {howItWorksSteps[currentHowItWorksSlide].title}
                    </h3>
                    <p className="text-white/70 text-lg leading-relaxed mb-6">
                      {howItWorksSteps[currentHowItWorksSlide].description}
                    </p>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-left">
                          <p className="text-blue-400 font-medium text-sm">Tip:</p>
                          <p className="text-blue-300/80 text-sm">
                            {howItWorksSteps[currentHowItWorksSlide].tip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Navigation */}
              <div className="px-8 pb-8">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentHowItWorksSlide(prev => 
                      prev === 0 ? howItWorksSteps.length - 1 : prev - 1
                    )}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  
                  {/* Slide Indicators */}
                  <div className="flex gap-2">
                    {howItWorksSteps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentHowItWorksSlide(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentHowItWorksSlide ? 'bg-blue-400' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentHowItWorksSlide(prev => 
                      prev === howItWorksSteps.length - 1 ? 0 : prev + 1
                    )}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}