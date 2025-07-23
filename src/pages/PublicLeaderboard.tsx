import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Trophy, 
  Clock, 
  Star, 
  Share2, 
  Play, 
  Eye, 
  Heart, 
  MessageCircle, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  Loader2,
  Medal,
  Gift,
  Users,
  Calendar,
  ExternalLink,
  UserPlus,
  Settings,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ContestJoinModal } from '../components/ContestJoinModal';
import { TikTokSettingsModal } from '../components/TikTokSettingsModal';
import { ViewSubmissionModal } from '../components/ViewSubmissionModal';
import { MobileVideoModal } from '../components/MobileVideoModal';
import toast from 'react-hot-toast';
import { useTikTokConnection } from '../hooks/useTikTokConnection';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { 
  calculateContestStatus, 
  getStatusLabel, 
  getStatusColor,
  formatTimeRemaining,
  getTimeRemaining 
} from '../lib/contestUtils';

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

interface LeaderboardEntry {
  rank: number;
  user_id: string;
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
}

export function PublicLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [userSubmission, setUserSubmission] = useState<any>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  
  const { isConnected: isTikTokConnected } = useTikTokConnection();
  const { redirectToAuth } = useAuthRedirect();

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  useEffect(() => {
    if (id) {
      fetchContestData();
      fetchLeaderboard();
    }
  }, [id]);

  useEffect(() => {
    if (session && contest) {
      fetchUserSubmission();
    }
  }, [session, contest]);

  useEffect(() => {
    if (contest?.end_date) {
      const timer = setInterval(() => {
        const timeRemaining = getTimeRemaining(contest);
        if (timeRemaining) {
          setTimeLeft(formatTimeRemaining(timeRemaining) + ' left');
        } else {
          setTimeLeft('Contest Ended');
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [contest?.end_date]);

  const fetchContestData = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContest(data);
    } catch (error) {
      console.error('Error fetching contest:', error);
      toast.error('Contest not found');
      navigate('/');
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
            setLeaderboard(data.data.leaderboard);
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubmission = async () => {
    if (!session || !contest) return;
    
    try {
      const { data, error } = await supabase
        .from('contest_links')
        .select('*')
        .eq('contest_id', contest.id)
        .eq('created_by', session.user.id)
        .eq('is_contest_submission', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setUserSubmission(data);
        // Find user's rank in leaderboard
        const userEntry = leaderboard.find(entry => entry.video_id === data.id);
        if (userEntry) {
          setUserRank(userEntry.rank);
        }
      }
    } catch (error) {
      console.error('Error fetching user submission:', error);
    }
  };

  const handleJoinContest = () => {
    if (!session) {
      redirectToAuth('/signin');
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
    toast.success('Successfully joined contest!');
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      await navigator.share({
        title: contest?.name || 'Contest Leaderboard',
        text: contest?.description || 'Check out this contest!',
        url: shareUrl,
      });
    } catch (error) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleVideoClick = (video: LeaderboardEntry) => {
    const videoData = {
      id: video.video_id,
      title: video.video_title,
      url: video.video_url,
      video_url: video.video_url,
      thumbnail: video.thumbnail,
      username: video.tiktok_username,
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      shares: video.shares,
      tiktok_display_name: video.tiktok_display_name,
    };

    // Check if mobile device
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      setSelectedVideo(videoData);
      setShowMobileModal(true);
    } else {
      setSelectedVideo(videoData);
      setShowViewModal(true);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="relative">
            <Crown className="h-6 w-6 text-yellow-400" />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
          </div>
        );
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <Star className="h-6 w-6 text-white/60" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-white/60';
    }
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-white/60" />
          <p className="mt-2 text-white/60">Loading contest...</p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Contest not found</h2>
          <Link
            to="/"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const contestStatus = calculateContestStatus(contest);
  const isActive = contestStatus === 'active';
  const hasEnded = contestStatus === 'ended';

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex flex-col">
      {/* Header */}
      <div className="relative">
        {contest.cover_image && (
          <div className="absolute inset-0 h-64 sm:h-80">
            <img
              src={contest.cover_image}
              alt={contest.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/90" />
          </div>
        )}
        
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 pb-8">
          <div className="max-w-6xl mx-auto">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 mb-8">
              <Crown className="h-8 w-8 text-white" />
              <span className="text-2xl font-black text-white tracking-tight">Crown</span>
            </Link>

            {/* Contest Info */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isActive ? 'bg-green-500/20 text-green-400' :
                  hasEnded ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {getStatusLabel(contestStatus)}
                </div>
                {contest.music_category && (
                  <div className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-sm">
                    {contest.music_category}
                  </div>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                {contest.name}
              </h1>

              <p className="text-lg text-white/80 max-w-3xl leading-relaxed">
                {contest.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-white/60">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">{timeLeft}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{leaderboard.length} participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <span>{contest.num_winners || 5} winners</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4">
          {session && userSubmission ? (
            <Link
              to={`/contest-management/${contest.id}`}
              className="flex-1 sm:flex-none px-6 py-3 bg-white text-black rounded-xl hover:bg-white/90 transition-colors font-medium text-center flex items-center justify-center gap-2"
            >
              <Settings className="h-5 w-5" />
              Manage Submission
            </Link>
          ) : (
            <button
              onClick={handleJoinContest}
              disabled={hasEnded}
              className="flex-1 sm:flex-none px-6 py-3 bg-white text-black rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              <UserPlus className="h-5 w-5" />
              {session ? 'Join Contest' : 'Sign Up to Join'}
            </button>
          )}
          
          <button
            onClick={handleShare}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Share2 className="h-5 w-5" />
            Share
          </button>
        </div>
      </div>

      {/* Prize Information */}
      {contest.prize_titles && (
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-white/10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="h-6 w-6 text-yellow-400" />
              Prizes
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {contest.prize_titles.slice(0, contest.num_winners || 5).map((prize: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-white/5 rounded-xl border border-white/10 text-center"
                >
                  <div className="flex items-center justify-center mb-2">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className={`text-sm font-medium ${getRankColor(index + 1)} mb-1`}>
                    {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Place
                  </div>
                  <div className="text-xs text-white/80">
                    {contest.prize_per_winner ? 
                      `$${(contest.prize_per_winner * (1 - index * 0.2)).toLocaleString()}` : 
                      prize.title
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User's Position (if participating) */}
      {session && userSubmission && userRank && (
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center">
                    {getRankIcon(userRank)}
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${getRankColor(userRank)}`}>
                      #{userRank}
                    </div>
                    <div className="text-white/60 text-sm">Your Position</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">
                    {formatNumber(userSubmission.views || 0)} views
                  </div>
                  <div className="text-white/60 text-sm">
                    {formatNumber(userSubmission.likes || 0)} likes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
            Current Rankings
          </h2>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
              <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No participants yet</h3>
              <p className="text-white/60">Be the first to join this contest!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.video_id}
                  className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                  onClick={() => handleVideoClick(entry)}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex items-center justify-center w-12">
                      <div className="flex items-center gap-2">
                        {getRankIcon(entry.rank)}
                        <span className={`text-lg font-bold ${getRankColor(entry.rank)}`}>
                          #{entry.rank}
                        </span>
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                      {entry.thumbnail ? (
                        <img
                          src={entry.thumbnail}
                          alt={entry.video_title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-6 w-6 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white line-clamp-1 mb-1">
                        {entry.video_title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                        <span>@{entry.tiktok_username}</span>
                        {entry.tiktok_display_name && entry.tiktok_display_name !== entry.tiktok_username && (
                          <>
                            <span>•</span>
                            <span>{entry.tiktok_display_name}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/60">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{formatNumber(entry.views)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{formatNumber(entry.likes)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{formatNumber(entry.comments)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {formatNumber(entry.views)}
                      </div>
                      <div className="text-sm text-white/60">views</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-8 py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-6 w-6 text-white/40" />
            <span className="text-white/40 font-light tracking-wider">CROWN</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm mb-4">
            <Link to="/terms" className="text-white/60 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/privacy" className="text-white/60 hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} Crown. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <TikTokSettingsModal
        isOpen={showTikTokModal}
        onClose={() => setShowTikTokModal(false)}
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