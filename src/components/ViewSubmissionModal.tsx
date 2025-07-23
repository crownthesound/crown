import React, { useEffect, useState } from "react";
import { X, Loader2, Volume2, VolumeX } from "lucide-react";

interface VideoLink {
  id: string;
  title: string;
  url: string;
  video_url?: string | null;  // Our stored video URL from Supabase
  thumbnail: string;
  username: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  tiktok_video_id?: string | null;
  embed_code?: string | null;
  avatar_url?: string | null; // TikTok profile avatar
  tiktok_display_name?: string | null; // TikTok display name
}

interface ViewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoLink | null;
}

export const ViewSubmissionModal: React.FC<ViewSubmissionModalProps> = ({
  isOpen,
  onClose,
  video,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  // Debug logging to check video_url field
  React.useEffect(() => {
    if (isOpen && video) {
      console.group('🎥 ViewSubmissionModal Debug');
      console.log('Video object:', video);
      console.log('video_url field:', video.video_url);
      console.log('video_url type:', typeof video.video_url);
      console.log('video_url exists:', !!video.video_url);
      console.log('url field:', video.url);
      console.log('Will show:', video.video_url ? 'HTML5 video' : 'TikTok iframe');
      console.groupEnd();
    }
  }, [isOpen, video]);

  // Generate fallback embed code if not available
  const generateEmbedCode = (video: VideoLink) => {
    if (!video) return "";
    const videoId = video.tiktok_video_id || extractVideoId(video.url);
    return `<blockquote class="tiktok-embed" cite="${video.url}" data-video-id="${videoId}">
      <section></section>
    </blockquote>
    <script async src="https://www.tiktok.com/embed.js"></script>`;
  };

  const extractVideoId = (url: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split("/");
      // format: /@username/video/1234567890123456789
      const idx = parts.findIndex((p) => p === "video");
      if (idx !== -1 && parts[idx + 1]) {
        return parts[idx + 1];
      }
    } catch (e) {
      console.error("Failed to parse TikTok URL", e);
    }
    return "";
  };

  useEffect(() => {
    if (!isOpen) return;
    // Re-evaluate loading state when modal opens
    setIsLoading(true);
    const handleLoad = () => {
      setIsLoading(false);
    };

    // TikTok embed will call onload on iframe; we listen after delay
    const timer = setTimeout(() => setIsLoading(false), 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, video]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const iframe = document.querySelector(
      ".tiktok-embed iframe"
    ) as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ action: isMuted ? "unmute" : "mute" }),
        "*"
      );
    }
  };

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-hidden relative">
        <button
          className="absolute top-3 right-3 text-white/70 hover:text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="p-4">
          <h2 className="text-xl font-semibold text-white mb-3 line-clamp-2">
            {video.title}
          </h2>
          
          {/* User Info Section */}
          <div className="flex items-center gap-3 mb-4">
            {video.avatar_url ? (
              <img
                src={video.avatar_url}
                alt={`${video.username} profile`}
                className="w-10 h-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border border-white/10">
                <span className="text-white text-sm font-medium">
                  {video.tiktok_display_name?.charAt(0) || video.username?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="font-medium text-white">
                {video.tiktok_display_name || video.username}
              </div>
              <div className="text-sm text-white/60">
                @{video.username}
              </div>
            </div>
          </div>
          
          <div
            className="relative w-full rounded-xl overflow-hidden"
            style={{ aspectRatio: "9/16" }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              </div>
            )}
            
            {/* Conditional rendering: video_url takes priority over TikTok iframe */}
            {video.video_url ? (
              // Our stored video from Supabase
              <>
                <video
                  src={video.video_url}
                  controls
                  muted={isMuted}
                  className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-2xl"
                  onLoadedData={() => setIsLoading(false)}
                  onClick={() => setShowFullScreen(true)}
                  style={{ cursor: 'pointer' }}
                >
                  Your browser does not support the video tag.
                </video>
                
                {/* Mobile full-screen trigger overlay for better UX */}
                <div 
                  className="absolute inset-0 bg-transparent cursor-pointer md:hidden"
                  onClick={() => setShowFullScreen(true)}
                  title="Tap to view full screen"
                />
              </>
            ) : (
              // Fallback to TikTok iframe
              <>
                <iframe
                  src={`https://www.tiktok.com/embed/v2/${
                    video.tiktok_video_id || extractVideoId(video.url)
                  }`}
                  allow="encrypted-media; fullscreen"
                  scrolling="no"
                  frameBorder="0"
                  className="absolute inset-0 w-full h-full"
                  onLoad={() => setIsLoading(false)}
                ></iframe>
                
                {/* Gradient overlay for iframe only */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                
                {/* Mute Button for iframe only */}
                <button
                  onClick={toggleMute}
                  className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 flex justify-between text-white/80 text-sm">
            <span>{(video.views || 0).toLocaleString()} views</span>
            <span>{(video.likes || 0).toLocaleString()} likes</span>
            <span>{(video.comments || 0).toLocaleString()} comments</span>
          </div>
        </div>
      </div>
      
      {/* Full-screen video modal for mobile */}
      {showFullScreen && video.video_url && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setShowFullScreen(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          {/* Full-screen video */}
          <video
            src={video.video_url}
            controls
            autoPlay
            muted={isMuted}
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
          
          {/* Background tap to close */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={() => setShowFullScreen(false)}
          />
        </div>
      )}
    </div>
  );
};
