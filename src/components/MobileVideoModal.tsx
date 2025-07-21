import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

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
  avatar_url?: string | null; // TikTok profile avatar
  tiktok_display_name?: string | null; // TikTok display name
}

interface MobileVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoData | null;
}

export const MobileVideoModal: React.FC<MobileVideoModalProps> = ({
  isOpen,
  onClose,
  video,
}) => {
  const [isMuted, setIsMuted] = useState(true);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
        aria-label="Close video"
      >
        <X className="h-6 w-6" />
      </button>
      
      {/* Video content */}
      {video.video_url ? (
        // Our stored video from Supabase
        <video
          src={video.video_url}
          controls
          autoPlay
          muted={isMuted}
          className="w-full h-full object-contain"
          controlsList="nodownload"
          onPlay={() => setIsMuted(false)}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        // Fallback to TikTok iframe for full-screen
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full max-w-sm h-full">
            <iframe
              src={`https://www.tiktok.com/embed/v2/${video.url.split('/').pop()}`}
              allow="encrypted-media; fullscreen"
              className="w-full h-full border-0"
              title={`TikTok video by ${video.username}`}
            />
          </div>
        </div>
      )}
      
      {/* Background tap to close */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close video"
      />
      
      {/* Optional: Video title overlay (can be hidden for pure full-screen experience) */}
      {video.title && (
        <div className="absolute bottom-4 left-4 right-16 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
            <h3 className="text-white text-sm font-medium line-clamp-2">
              {video.title}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              {video.avatar_url ? (
                <img
                  src={video.avatar_url}
                  alt={`${video.username} profile`}
                  className="w-6 h-6 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border border-white/20">
                  <span className="text-white text-xs font-medium">
                    {video.tiktok_display_name?.charAt(0) || video.username?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="text-white/90 text-xs font-medium">
                  {video.tiktok_display_name || video.username}
                </p>
                <p className="text-white/60 text-xs">
                  @{video.username}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};