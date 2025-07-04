import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Loader2,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useTikTokConnection } from "../hooks/useTikTokConnection";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

interface TikTokVideo {
  id: string;
  title: string;
  cover_image_url: string;
  share_url: string;
  video_description: string;
  duration: number;
  create_time: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  height?: number;
  width?: number;
}

interface Contest {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  submission_deadline?: string | null;
  hashtags?: string[] | null;
  rules?: string | null;
  guidelines?: string | null;
}

interface ContestJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest | null;
  onSuccess: () => void;
}

export const ContestJoinModal: React.FC<ContestJoinModalProps> = ({
  isOpen,
  onClose,
  contest,
  onSuccess,
}) => {
  const { session } = useAuth();
  const {
    isConnected: isTikTokConnected,
    isLoading: isTikTokLoading,
    refreshConnection: refreshTikTokConnection,
    connectWithVideoPermissions,
  } = useTikTokConnection();
  const [step, setStep] = useState<"join" | "select-video">("join");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<TikTokVideo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false);
  const [tikTokConnectionError, setTikTokConnectionError] = useState<
    string | null
  >(null);

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  // Fetch leaderboard data (only when join step is active)
  const { data: leaderboardResponse, isLoading: isLeaderboardLoading } =
    useQuery({
      queryKey: ["leaderboard", contest?.id],
      queryFn: async (): Promise<any> => {
        const res = await fetch(
          `${backendUrl}/api/v1/contests/${contest?.id}/leaderboard?limit=100`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch leaderboard");
        }
        return res.json();
      },
      enabled: step === "join" && !!contest?.id,
      refetchInterval: 30000, // 30 seconds
    });

  const leaderboard: any[] = leaderboardResponse?.data?.leaderboard || [];

  if (!isOpen || !contest) return null;

  const handleConnectTikTok = async () => {
    if (!session) {
      toast.error("Please sign in first");
      return;
    }

    setIsConnectingTikTok(true);
    try {
      if (tikTokConnectionError === "permissions") {
        await connectWithVideoPermissions();
      } else {
        const response = await fetch(
          `${backendUrl}/api/v1/tiktok/auth/initiate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({}),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to initiate TikTok connection");
        }

        const data = await response.json();
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error("Error connecting to TikTok:", error);
      toast.error("Failed to connect to TikTok. Please try again.");
    } finally {
      setIsConnectingTikTok(false);
    }
  };

  const handleJoinContest = async () => {
    if (!session) {
      toast.error("Please sign in first");
      return;
    }

    if (!isTikTokConnected) {
      toast.error("Please connect your TikTok account first to join contests");
      return;
    }

    setIsJoining(true);
    try {
      // Check if user has already joined this contest
      const { data: existingParticipant, error: checkError } = await supabase
        .from("contest_participants")
        .select("*")
        .eq("contest_id", contest.id)
        .eq("user_id", session.user.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingParticipant) {
        toast.error("You have already joined this contest");
        return;
      }

      // Load user's TikTok videos first (don't join contest yet)
      await loadTikTokVideos();
      setStep("select-video");
      // Don't show success message yet - wait until video is selected
    } catch (error) {
      console.error("Error preparing to join contest:", error);
      toast.error("Failed to load your TikTok videos");
    } finally {
      setIsJoining(false);
    }
  };

  const loadTikTokVideos = async () => {
    if (!session) return;

    setIsLoadingVideos(true);
    try {
      console.log("🔍 Loading TikTok videos...");
      const response = await fetch(`${backendUrl}/api/v1/tiktok/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      console.log("🔍 TikTok videos response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Failed to load TikTok videos:", errorData);

        // Check if it's a permissions issue
        if (
          errorData.error_code === "PERMISSION_DENIED" ||
          (errorData.message &&
            errorData.message.includes("permission not granted"))
        ) {
          setTikTokConnectionError("permissions");
          toast.error(
            "TikTok video access permission not granted. Please reconnect your TikTok account with video permissions.",
            { duration: 6000 }
          );
        } else {
          throw new Error(
            errorData.message || `Failed to load videos: ${response.status}`
          );
        }
        return;
      }

      const responseData = await response.json();
      console.log("🔍 TikTok videos full response:", responseData);

      // Extract videos from the response
      let videos = [];

      if (responseData.status === "success") {
        // Extract videos based on the structure we observed in the console
        if (responseData.data && Array.isArray(responseData.data.videos)) {
          // Format: { status: "success", data: { videos: [...] } }
          videos = responseData.data.videos;
          console.log("🔍 Found videos in data.videos");
        } else if (
          responseData.data &&
          responseData.data.data &&
          Array.isArray(responseData.data.data.videos)
        ) {
          // Format: { status: "success", data: { data: { videos: [...] } } }
          videos = responseData.data.data.videos;
          console.log("🔍 Found videos in data.data.videos");
        } else {
          console.error(
            "❌ Could not find videos array in response:",
            responseData
          );
          toast.error("Could not find videos in the API response");
          return;
        }
      } else {
        console.error("❌ Response status is not success:", responseData);
        toast.error("Unexpected response from TikTok API");
        return;
      }

      console.log("🔍 Extracted videos:", videos);
      setVideos(videos);

      if (videos.length === 0) {
        toast.error(
          "No TikTok videos found. Please make sure you have public videos on your TikTok account."
        );
      }
    } catch (error) {
      console.error("❌ Error loading TikTok videos:", error);
      toast.error("Failed to load your TikTok videos. Please try again.");
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleSubmitVideo = async () => {
    if (!selectedVideo || !session) return;

    setIsSubmitting(true);
    try {
      console.log("🔍 Submitting video:", selectedVideo);

      // First, join the contest
      const { error: joinError } = await supabase
        .from("contest_participants")
        .insert({
          contest_id: contest.id,
          user_id: session.user.id,
        });

      if (joinError) {
        if (joinError.code === "23505") {
          toast.error("You have already joined this contest");
        } else {
          throw joinError;
        }
        return;
      }

      // Get TikTok username from profile
      const { data: tikTokProfileData } = await supabase
        .from("tiktok_profiles")
        .select("username")
        .eq("user_id", session.user.id)
        .single();

      const username = tikTokProfileData?.username || "username";

      // Construct the TikTok video URL
      const videoUrl =
        selectedVideo.share_url ||
        `https://www.tiktok.com/@${username}/video/${selectedVideo.id}`;

      // Reject videos older than 24 hours
      const nowSeconds = Math.floor(Date.now() / 1000);
      const videoAgeSeconds = nowSeconds - (selectedVideo.create_time || 0);
      if (videoAgeSeconds > 24 * 60 * 60) {
        toast.error(
          "Selected video is more than 24 hours old. Please upload a newer video to join this contest."
        );
        setIsSubmitting(false);
        // Offer to open TikTok upload page
        window.open("https://www.tiktok.com/upload", "_blank");
        return;
      }

      // Generate embed code for the video
      const embedCode = `<blockquote class=\"tiktok-embed\" cite=\"${videoUrl}\" data-video-id=\"${selectedVideo.id}\"><section></section></blockquote><script async src=\"https://www.tiktok.com/embed.js\"></script>`;

      // Then submit the selected video to the contest
      const { error: submitError } = await supabase
        .from("contest_links")
        .insert({
          url: videoUrl,
          title:
            selectedVideo.title ||
            selectedVideo.video_description ||
            "TikTok Video",
          thumbnail: selectedVideo.cover_image_url,
          username: username,
          views: selectedVideo.view_count || 0,
          likes: selectedVideo.like_count || 0,
          comments: selectedVideo.comment_count || 0,
          shares: selectedVideo.share_count || 0,
          created_by: session.user.id,
          contest_id: contest.id,
          tiktok_video_id: selectedVideo.id,
          is_contest_submission: true,
          submission_date: new Date().toISOString(),
          embed_code: embedCode,
          video_type: "tiktok",
          duration: selectedVideo.duration,
        });

      if (submitError) throw submitError;

      toast.success("Successfully joined contest and submitted your video!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error submitting video:", error);
      toast.error("Failed to submit video");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {step === "join" ? "Join Contest" : "Select Video"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === "join" ? (
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {contest.cover_image && (
                  <div className="lg:w-1/3">
                    <img
                      src={contest.cover_image}
                      alt={contest.name}
                      className="w-full h-48 lg:h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {contest.name}
                    </h3>
                    <p className="text-white/70">{contest.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">Start Date:</span>
                      <div className="text-white">
                        {formatDate(contest.start_date)}
                      </div>
                    </div>
                    <div>
                      <span className="text-white/60">End Date:</span>
                      <div className="text-white">
                        {formatDate(contest.end_date)}
                      </div>
                    </div>
                    {contest.submission_deadline && (
                      <div className="md:col-span-2">
                        <span className="text-white/60">
                          Submission Deadline:
                        </span>
                        <div className="text-white">
                          {formatDate(contest.submission_deadline)}
                        </div>
                      </div>
                    )}
                  </div>

                  {contest.hashtags && contest.hashtags.length > 0 && (
                    <div>
                      <span className="text-white/60 text-sm">
                        Required Hashtags:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {contest.hashtags.map((hashtag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs"
                          >
                            #{hashtag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {contest.rules && (
                    <div>
                      <span className="text-white/60 text-sm">Rules:</span>
                      <p className="text-white/80 text-sm mt-1">
                        {contest.rules}
                      </p>
                    </div>
                  )}

                  {contest.guidelines && (
                    <div>
                      <span className="text-white/60 text-sm">Guidelines:</span>
                      <p className="text-white/80 text-sm mt-1">
                        {contest.guidelines}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {!isTikTokConnected && !isTikTokLoading && (
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start space-x-3 mb-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-amber-400 font-medium">
                        TikTok Account Required
                      </h4>
                      <p className="text-amber-300/80 text-sm mt-1">
                        You need to connect your TikTok account before joining
                        this contest. This allows you to select videos from your
                        TikTok profile.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={handleConnectTikTok}
                      disabled={isConnectingTikTok}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isConnectingTikTok ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <span>Connect TikTok Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <h4 className="text-lg font-semibold text-white mb-3">
                  Current Leaderboard
                </h4>
                {isLeaderboardLoading ? (
                  <div className="text-white/60 text-sm">Loading…</div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-white/60 text-sm">
                    No participants yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10 max-h-56 overflow-y-auto">
                    {leaderboard.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between py-2 text-sm text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-blue-400">
                            #{entry.rank}
                          </span>
                          <span>{entry.username}</span>
                        </span>
                        <span className="text-white/70">
                          {entry.views?.toLocaleString() || 0} views
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-white/60 hover:text-white border border-white/20 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinContest}
                  disabled={isJoining || !isTikTokConnected || isTikTokLoading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : isTikTokLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Checking TikTok...</span>
                    </>
                  ) : !isTikTokConnected ? (
                    <span>Connect TikTok First</span>
                  ) : (
                    <span>Join Contest</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Select a video to submit
                </h3>
                <p className="text-white/60 text-sm">
                  Choose one of your TikTok videos to participate in this
                  contest
                </p>
              </div>

              {isLoadingVideos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                  <span className="ml-2 text-white/60">
                    Loading your videos...
                  </span>
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12">
                  {tikTokConnectionError === "permissions" ? (
                    <div>
                      <div className="flex items-center justify-center mb-4 text-amber-400">
                        <AlertCircle className="h-6 w-6 mr-2" />
                        <p>TikTok video access permission not granted</p>
                      </div>
                      <p className="text-white/60 mb-6">
                        You need to reconnect your TikTok account with video
                        permissions to participate in this contest.
                      </p>
                      <button
                        onClick={() => {
                          setTikTokConnectionError(null);
                          handleConnectTikTok();
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Reconnect TikTok with Video Permissions
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-white/60 mb-4">
                        No videos found in your TikTok profile
                      </p>
                      <a
                        href="https://www.tiktok.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Go to TikTok to create videos</span>
                      </a>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map((video) => {
                    const isEligible =
                      Date.now() / 1000 - (video.create_time || 0) <
                      24 * 60 * 60;
                    return (
                      <div
                        key={video.id}
                        onClick={() => {
                          if (!isEligible) {
                            toast.error(
                              "Video is older than 24 hours. Please upload a new TikTok to participate."
                            );
                            window.open(
                              "https://www.tiktok.com/upload",
                              "_blank"
                            );
                            return;
                          }
                          setSelectedVideo(video);
                        }}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedVideo?.id === video.id
                            ? "border-blue-500 ring-2 ring-blue-500/20"
                            : "border-white/10 hover:border-white/30"
                        } ${
                          !isEligible ? "opacity-40 pointer-events-auto" : ""
                        }`}
                      >
                        <div className="aspect-[9/16] relative">
                          <iframe
                            src={`https://www.tiktok.com/embed/v2/${video.id}`}
                            allow="encrypted-media; fullscreen"
                            scrolling="no"
                            className="absolute inset-0 w-full h-full"
                            frameBorder="0"
                          ></iframe>
                          {!isEligible && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs text-center px-2">
                              Video too old (24h+)
                            </div>
                          )}
                          {selectedVideo?.id === video.id && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
                            {formatDuration(video.duration)}
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                            {video.title ||
                              video.video_description ||
                              "Untitled"}
                          </p>
                          <div className="flex items-center space-x-3 text-xs text-white/60">
                            <span>
                              {video.view_count?.toLocaleString() || 0} views
                            </span>
                            <span>
                              {video.like_count?.toLocaleString() || 0} likes
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Leaderboard Section */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">
                  Current Leaderboard
                </h4>
                {isLeaderboardLoading ? (
                  <div className="text-white/60 text-sm">Loading…</div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-white/60 text-sm">
                    No participants yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10 max-h-56 overflow-y-auto">
                    {leaderboard.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between py-2 text-sm text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-blue-400">
                            #{entry.rank}
                          </span>
                          <span>{entry.username}</span>
                        </span>
                        <span className="text-white/70">
                          {entry.views?.toLocaleString() || 0} views
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => setStep("join")}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                >
                  ← Back
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 text-white/60 hover:text-white border border-white/20 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitVideo}
                    disabled={
                      !selectedVideo ||
                      isSubmitting ||
                      (selectedVideo &&
                        Date.now() / 1000 - (selectedVideo.create_time || 0) >
                          24 * 60 * 60)
                    }
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Video</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Selected video preview */}
              {selectedVideo && (
                <div className="flex justify-center mb-6">
                  <iframe
                    src={`https://www.tiktok.com/embed/v2/${selectedVideo.id}`}
                    width="320"
                    height="560"
                    allow="encrypted-media; fullscreen"
                    scrolling="no"
                    frameBorder="0"
                    className="rounded-lg shadow-lg"
                  ></iframe>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
