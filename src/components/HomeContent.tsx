import React, { useState, useEffect } from "react";
import {
  Trophy,
  Crown,
  Medal,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  Play,
  Share2,
  Globe,
  Sparkles,
  ArrowRight,
  UserPlus,
  Settings,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { VideoCarousel } from "./VideoCarousel";
import { HowToEnterCarousel } from "./HowToEnterCarousel";
import { TikTokConnectModal } from "./TikTokConnectModal";
import { TikTokSettingsModal } from "./TikTokSettingsModal";
import { ContestJoinModal } from "./ContestJoinModal";
import { supabase } from "../lib/supabase";
import { useRealtimeData } from "../hooks/useRealtimeData";
import { useTikTokConnection } from "../hooks/useTikTokConnection";
import { ViewSubmissionModal } from "./ViewSubmissionModal";

interface LeaderboardContest {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  status: string | null;
  music_category?: string | null;
  prize_tier?: string | null;
  prize_per_winner?: number | null;
  prize_titles?: any | null;
  num_winners?: number | null;
  total_prize?: number | null;
  guidelines?: string | null;
  rules?: string | null;
  hashtags?: string[] | null;
  submission_deadline?: string | null;
  max_participants?: number | null;
  top_participants?: {
    rank: number;
    username: string;
    full_name: string;
    points: number;
    views: number;
    previousRank?: number;
  }[];
}

interface HomeContentProps {
  contests: LeaderboardContest[];
  loading: boolean;
  session: any;
  onShowAuth: (isSignUp: boolean) => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function HomeContent({
  contests: initialContests,
  loading: initialLoading,
  session,
  onShowAuth,
}: HomeContentProps) {
  const navigate = useNavigate();
  const [contests, setContests] = useState(initialContests);
  const [loading, setLoading] = useState(initialLoading);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showTikTokSettings, setShowTikTokSettings] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedContest, setSelectedContest] =
    useState<LeaderboardContest | null>(null);
  const { isConnected: isTikTokConnected, refreshConnection } =
    useTikTokConnection();
  const [userSubmissions, setUserSubmissions] = useState<Record<string, any>>(
    {}
  );
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewVideo, setViewVideo] = useState<any>(null);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from("contests")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const contestsWithParticipants = await Promise.all(
        (data || []).map(async (contest) => {
          // Fetch leaderboard data for each contest
          let top_participants: any[] = [];
          try {
            const response = await fetch(
              `${backendUrl}/api/v1/contests/${contest.id}/leaderboard?limit=${
                contest.num_winners || 15
              }`
            );
            if (response.ok) {
              const leaderboardData = await response.json();
              if (leaderboardData.data?.leaderboard) {
                top_participants = leaderboardData.data.leaderboard.map(
                  (participant: any, index: number) => ({
                    rank: index + 1,
                    username: participant.username || "Unknown",
                    full_name:
                      participant.full_name ||
                      participant.username ||
                      "Unknown",
                    points: participant.views || 0,
                    views: participant.views || 0,
                    previousRank: participant.previousRank || index + 1,
                  })
                );
              }
            }
          } catch (error) {
            console.error(
              `Error fetching leaderboard for contest ${contest.id}:`,
              error
            );
          }

          return {
            ...contest,
            cover_image: contest.cover_image || "",
            music_category: contest.music_category || "",
            prize_tier: contest.prize_per_winner ? "monetary" : "non-monetary",
            prize_per_winner:
              contest.total_prize && contest.num_winners
                ? Math.floor(contest.total_prize / contest.num_winners)
                : contest.prize_per_winner || 0,
            prize_titles: contest.prize_titles || [
              { rank: 1, title: "Winner" },
              { rank: 2, title: "Runner-up" },
              { rank: 3, title: "Third Place" },
            ],
            top_participants,
          };
        })
      );

      setContests(contestsWithParticipants);
    } catch (error) {
      console.error("Error fetching contests:", error);
      toast.error("Failed to load contests");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubmissions = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from("contest_links")
        .select("*")
        .eq("created_by", session.user.id)
        .eq("is_contest_submission", true);
      if (error) throw error;
      const mapping: Record<string, any> = {};
      data.forEach((row) => {
        if (row.contest_id) {
          mapping[row.contest_id] = row;
        }
      });
      setUserSubmissions(mapping);
    } catch (err) {
      console.error("Error fetching user submissions", err);
    }
  };

  const handleJoinContest = (contest: LeaderboardContest) => {
    console.log("Join contest clicked:", contest);
    console.log("Session:", session);
    console.log("TikTok connected:", isTikTokConnected);

    if (!session) {
      console.log("No session, showing auth");
      onShowAuth(false);
      return;
    }

    if (!isTikTokConnected) {
      console.log("TikTok not connected, showing TikTok modal");
      setShowTikTokModal(true);
      return;
    }

    console.log("Opening join modal");
    setSelectedContest(contest);
    setShowJoinModal(true);
  };

  const handleTikTokConnected = () => {
    setShowTikTokModal(false);
    refreshConnection();
    toast.success("TikTok connected successfully!");
  };

  const handleContestJoined = () => {
    setShowJoinModal(false);
    setSelectedContest(null);
    fetchUserSubmissions();
    // Refresh contests to update leaderboard
    fetchContests();
    toast.success("Successfully joined contest!");
  };

  const handleViewVideo = (video: any) => {
    setViewVideo(video);
    setShowViewModal(true);
  };

  useRealtimeData({
    eventName: "contestUpdate",
    onUpdate: () => {
      fetchContests();
    },
  });

  useRealtimeData({
    eventName: "videoUpdate",
    onUpdate: () => {
      window.dispatchEvent(new Event("refreshVideoCarousel"));
    },
  });

  useEffect(() => {
    setContests(initialContests);
    setLoading(initialLoading);
  }, [initialContests, initialLoading]);

  useEffect(() => {
    console.log("🔍 showTikTokSettings changed to:", showTikTokSettings);
  }, [showTikTokSettings]);

  useEffect(() => {
    fetchUserSubmissions();
  }, [session]);

  // Fetch contests on component mount to ensure we have the latest data
  useEffect(() => {
    fetchContests();
  }, []);

  // Handle TikTok callback redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tiktokConnected = urlParams.get("tiktok_connected");
    const isMock = urlParams.get("mock");
    const error = urlParams.get("error");
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");
    const userToken = urlParams.get("user_token");
    const tiktokUser = urlParams.get("tiktok_user");

    // Debug logging
    console.log("🔍 TikTok callback check:", {
      tiktokConnected,
      isMock,
      error,
      hasAccessToken: !!accessToken,
      hasUserToken: !!userToken,
      hasTiktokUser: !!tiktokUser,
      hasSession: !!session,
      url: window.location.href,
    });

    if (tiktokConnected === "true") {
      if (!session) {
        console.log(
          "⚠️ TikTok connected but no session, waiting for session..."
        );
        // Store the callback data temporarily and wait for session
        localStorage.setItem(
          "tiktok_callback_data",
          JSON.stringify({
            accessToken,
            refreshToken,
            userToken,
            tiktokUser,
            isPartial: urlParams.get("partial"),
            isMock,
          })
        );
        return;
      }
      const isPartial = urlParams.get("partial");

      const saveTikTokProfile = async () => {
        try {
          if (accessToken && tiktokUser) {
            const userInfo = JSON.parse(decodeURIComponent(tiktokUser));
            console.log("🔍 Saving TikTok profile (immediate):", userInfo);

            const backendUrl =
              import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
            const response = await fetch(
              `${backendUrl}/api/v1/tiktok/profile/save`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  accessToken,
                  refreshToken,
                  userInfo,
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error("❌ Failed to save TikTok profile:", errorText);
              throw new Error(
                `Failed to save TikTok profile: ${response.status}`
              );
            }

            const result = await response.json();
            console.log(
              "✅ TikTok profile saved to database (immediate):",
              result
            );
            return true;
          }
          return false;
        } catch (error) {
          console.error("❌ Failed to save TikTok profile:", error);
          toast.error(
            "Failed to save TikTok profile, but connection was successful"
          );
          return false;
        }
      };

      if (isMock === "true") {
        toast.success("TikTok connected successfully! (Mock mode)");
      } else if (isPartial === "true") {
        toast.success(
          "TikTok connected with limited permissions. Some features may be restricted."
        );
        // Even with partial permissions, try to save the profile
        saveTikTokProfile().then((success) => {
          if (success) {
            console.log("Successfully saved partial TikTok profile");
          }
        });
      } else {
        toast.success("TikTok connected successfully! Full access granted.");
        saveTikTokProfile();
      }

      refreshConnection();
      setShowTikTokModal(false);

      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error(`TikTok connection failed: ${error}`);
      setShowTikTokModal(false);

      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshConnection, session]);

  // Handle stored TikTok callback data when session becomes available
  useEffect(() => {
    if (session) {
      const storedCallbackData = localStorage.getItem("tiktok_callback_data");
      if (storedCallbackData) {
        console.log("🔍 Processing stored TikTok callback data...");
        try {
          const {
            accessToken,
            refreshToken,
            userToken,
            tiktokUser,
            isPartial,
            isMock,
          } = JSON.parse(storedCallbackData);

          const saveTikTokProfile = async () => {
            try {
              if (accessToken && tiktokUser) {
                const userInfo = JSON.parse(decodeURIComponent(tiktokUser));
                console.log("🔍 Saving TikTok profile:", userInfo);

                const backendUrl =
                  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
                const response = await fetch(
                  `${backendUrl}/api/v1/tiktok/profile/save`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                      accessToken,
                      refreshToken,
                      userInfo,
                    }),
                  }
                );

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error("❌ Failed to save TikTok profile:", errorText);
                  throw new Error(
                    `Failed to save TikTok profile: ${response.status}`
                  );
                }

                const result = await response.json();
                console.log("✅ TikTok profile saved to database:", result);
                return true;
              }
              return false;
            } catch (error) {
              console.error("❌ Failed to save TikTok profile:", error);
              toast.error(
                "Failed to save TikTok profile, but connection was successful"
              );
              return false;
            }
          };

          if (isMock === "true") {
            toast.success("TikTok connected successfully! (Mock mode)");
          } else if (isPartial === "true") {
            toast.success(
              "TikTok connected with limited permissions. Some features may be restricted."
            );
            saveTikTokProfile().then((success) => {
              if (success) {
                console.log("Successfully saved partial TikTok profile");
              }
            });
          } else {
            toast.success(
              "TikTok connected successfully! Full access granted."
            );
            saveTikTokProfile();
          }

          refreshConnection();
          setShowTikTokModal(false);

          // Clean up stored data
          localStorage.removeItem("tiktok_callback_data");
        } catch (error) {
          console.error(
            "❌ Error processing stored TikTok callback data:",
            error
          );
          localStorage.removeItem("tiktok_callback_data");
        }
      }
    }
  }, [session, refreshConnection]);

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

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Helper to format currency values, rounding to 2 decimals maximum and
  // ensuring we don't show long floating-point artifacts
  const formatCurrency = (value: number) => {
    // Round to 2 decimal places to avoid JS floating-point issues
    const rounded = Math.round(value * 100) / 100;
    // Use the existing formatNumber helper for large numbers (≥1k)
    if (rounded >= 1000) {
      return formatNumber(rounded);
    }
    // Show up to 2 decimals but trim trailing zeros (e.g. 399.5 → "399.5", 400 → "400")
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  const formatTimeLeft = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const distance = end - now;

    if (distance < 0) return "Ended";

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    return `${days}d ${hours}h left`;
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

  const handleShare = async (contest: LeaderboardContest) => {
    const shareUrl = `${window.location.origin}/l/${contest.id}`;
    try {
      await navigator.share({
        title: contest.name,
        text: contest.description,
        url: shareUrl,
      });
    } catch (error) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const handlePlayVideo = () => {
    if (!session) {
      onShowAuth(false);
      return;
    }
    toast.success("Video player coming soon!");
  };

  if (loading) {
    return (
      <>
        <div className="min-h-[60vh] flex items-center justify-center">
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

        <TikTokConnectModal
          isOpen={showTikTokModal}
          onClose={() => setShowTikTokModal(false)}
          onSuccess={handleTikTokConnected}
        />

        <TikTokSettingsModal
          isOpen={showTikTokSettings}
          onClose={() => setShowTikTokSettings(false)}
        />

        <ContestJoinModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          contest={selectedContest}
          onSuccess={handleContestJoined}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
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
                onClick={() => {
                  console.log("🔍 TikTok Settings button clicked");
                  setShowTikTokSettings(true);
                  console.log("🔍 showTikTokSettings set to true");
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white text-sm sm:text-base"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">TikTok</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onShowAuth(false)}
                className="px-3 sm:px-6 py-2 text-white hover:bg-white/5 rounded-xl transition-colors whitespace-nowrap text-sm sm:text-base"
              >
                Login
              </button>
              <button
                onClick={() => onShowAuth(true)}
                className="bg-white text-[#1A1A1A] px-3 sm:px-6 py-2 rounded-xl hover:bg-white/90 transition-colors transform hover:scale-105 duration-200 text-sm sm:text-base font-medium"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">
            Music Leaderboard Competitions
          </h1>
          <p className="text-sm sm:text-base text-white/60">
            Get Noticed. Get Rewarded.
          </p>
        </div>

        <div className="mb-20 sm:mb-16">
          <VideoCarousel />
        </div>

        <div className="mb-20 sm:mb-16">
          <div className="text-center mb-8">
            <h2 className="text-[1.75rem] xs:text-[2rem] sm:text-[2.5rem] font-black text-white tracking-tight">
              How It Works
            </h2>
          </div>
          <HowToEnterCarousel />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-[1.75rem] xs:text-[2rem] sm:text-[2.5rem] font-black text-white tracking-tight">
            Active Contests
          </h2>
        </div>

        <div>
          {contests.length === 0 ? (
            <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <Trophy className="h-16 w-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">
                No active contests
              </h3>
              <p className="text-white/80">
                Check back later for new contests!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {contests.map((contest) => (
                <div
                  key={contest.id}
                  className="group bg-[#0A0A0A] backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-white/20"
                >
                  {contest.cover_image && (
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={contest.cover_image}
                        alt={contest.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm sm:text-xl font-black text-white line-clamp-1">
                            {contest.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-2 space-y-2">
                    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          <h4 className="text-xs font-medium text-white">
                            Prizes
                          </h4>
                        </div>
                        <div className="text-xs text-white/60">
                          {contest.prize_titles.length} Winners
                        </div>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
                        {contest.prize_titles
                          .slice(
                            0,
                            contest.num_winners || contest.prize_titles.length
                          )
                          .map((prize: any, index: number) => (
                            <div
                              key={index}
                              className="p-1.5 rounded-lg border snap-start flex-shrink-0 min-w-[70px] bg-black/20 border-white/10 transition-all hover:bg-white/5"
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                {getRankIcon(index + 1)}
                                <span
                                  className={`text-[10px] font-medium ${getRankColor(
                                    index + 1
                                  )}`}
                                >
                                  {formatRank(index + 1)}
                                </span>
                              </div>
                              <div className="text-[10px] font-medium leading-tight line-clamp-2 text-white">
                                {contest.prize_tier === "monetary"
                                  ? `$${formatCurrency(
                                      (contest.prize_per_winner || 0) *
                                        (1 - index * 0.2)
                                    )}`
                                  : prize.title}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {contest.top_participants &&
                      contest.top_participants.length > 0 && (
                        <div className="bg-black/20 backdrop-blur-sm rounded-lg overflow-hidden">
                          <div className="grid grid-cols-3 divide-x divide-white/5">
                            {contest.top_participants
                              .slice(0, 3)
                              .map((participant, index) => (
                                <div key={index} className="px-1.5 py-1">
                                  <div className="text-[10px] font-medium text-white/60 text-center">
                                    {index === 0
                                      ? "1st"
                                      : index === 1
                                      ? "2nd"
                                      : "3rd"}
                                  </div>
                                  <div className="text-[10px] text-white text-center truncate">
                                    @{participant.username}
                                  </div>
                                  <div className="text-[9px] text-white/40 text-center">
                                    {formatNumber(participant.views)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {session &&
                      (userSubmissions[contest.id] ? (
                        <button
                          onClick={() =>
                            handleViewVideo(userSubmissions[contest.id])
                          }
                          className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          View Your Video
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinContest(contest)}
                          className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Join Contest
                        </button>
                      ))}

                    <Link
                      to={`/l/${contest.id}`}
                      className="w-full px-4 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5 group text-xs"
                    >
                      <span>View Details</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!session && contests.length > 0 && (
          <div className="mt-12 bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-white/10">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
              Want to participate?
            </h3>
            <p className="text-sm sm:text-base text-white/80 mb-6 max-w-md mx-auto">
              Join our community and start competing in contests to showcase
              your talent!
            </p>
            <button
              onClick={() => onShowAuth(true)}
              className="bg-white text-[#1A1A1A] px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl hover:bg-white/90 transition-colors transform hover:scale-105 duration-200 text-sm sm:text-base font-medium"
            >
              Create Account
            </button>
          </div>
        )}
      </div>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t border-white/10">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-white/40" />
            <span className="text-white/40 font-light tracking-wider">
              CROWN
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              to="/terms"
              className="text-white/60 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-white/20">•</span>
            <Link
              to="/privacy"
              className="text-white/60 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
          <p className="text-white/40 text-xs text-center">
            © {new Date().getFullYear()} Crown. All rights reserved.
          </p>
        </div>
      </footer>

      <TikTokConnectModal
        isOpen={showTikTokModal}
        onClose={() => setShowTikTokModal(false)}
        onSuccess={handleTikTokConnected}
      />

      <TikTokSettingsModal
        isOpen={showTikTokSettings}
        onClose={() => setShowTikTokSettings(false)}
      />

      <ContestJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        contest={selectedContest}
        onSuccess={handleContestJoined}
      />

      <ViewSubmissionModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        video={viewVideo}
      />
    </div>
  );
}
