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
  rank?: number | null; // Current rank in contest
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

  const getRankDisplay = (rank: number | null) => {
    if (!rank) return null;

    const getRankSuffix = (num: number) => {
      if (num >= 11 && num <= 13) return 'th';
      switch (num % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const rankText = `#${rank} ${rank}${getRankSuffix(rank)} Place`;
    
    // Color coding based on rank
    let bgColor = 'bg-white/20 border-white/30';
    let textColor = 'text-white';
    
    if (rank === 1) {
      bgColor = 'bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-300';
      textColor = 'text-yellow-900';
    } else if (rank === 2) {
      bgColor = 'bg-gradient-to-r from-gray-300 to-gray-500 border-gray-200';
      textColor = 'text-gray-900';
    } else if (rank === 3) {
      bgColor = 'bg-gradient-to-r from-amber-600 to-amber-800 border-amber-400';
      textColor = 'text-amber-100';
    } else if (rank <= 10) {
      bgColor = 'bg-gradient-to-r from-blue-500 to-blue-700 border-blue-300';
      textColor = 'text-blue-100';
    }

    return (
      <div className={`px-3 py-2 rounded-lg backdrop-blur-sm border ${bgColor} ${textColor} font-bold text-sm shadow-lg`}>
        {rankText}
      </div>
    );
  };

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
        aria-label="Close video"
      >
        <X className="h-6 w-6" />
      </button>
      
      {/* Video content */}
      {video.video_url ? (
        // Our stored video from Supabase
        <div className="flex items-center justify-center w-full h-full p-4">
          <div className="relative max-w-sm w-full bg-black/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden transform-gpu hover:scale-[1.02] transition-all duration-500">
            <video
              src={video.video_url}
              controls
              autoPlay
              muted={isMuted}
              className="w-full aspect-[9/16] object-cover rounded-2xl"
              controlsList="nodownload"
              onPlay={() => setIsMuted(false)}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
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
            {/* Ranking and Views */}
            <div className="flex items-center justify-between mb-2">
              {video.rank && (
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md border ${
                    video.rank === 1 ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30' :
                    video.rank === 2 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/30' :
                    video.rank === 3 ? 'bg-amber-600/20 text-amber-600 border border-amber-600/30' :
                    video.rank <= 10 ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' :
                    'bg-black/40 text-white/90 border border-white/20'
                  }`}>
                    Current Rank: #{video.rank}
                  </div>
                </div>
              )}
              {video.views !== null && video.views !== undefined && (
                <div className="text-white/80 text-xs font-medium">
                  {video.views.toLocaleString()} views
                </div>
              )}
            </div>
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