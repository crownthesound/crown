import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Trophy, 
  Clock, 
  Star, 
  Trash2, 
  HelpCircle, 
  ArrowLeft,
  Play,
  Eye,
  BarChart3,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  TrendingUp,
  Heart,
  MessageCircle,
  Share,
  Users,
  Target,
  Zap,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ViewSubmissionModal } from '../components/ViewSubmissionModal';
import toast from 'react-hot-toast';

interface Contest {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  status: string;
  music_category: string;
  prize_per_winner: number;
  num_winners: number;
  prize_titles: any[];
  guidelines?: string;
  rules?: string;
  hashtags?: string[];
}

interface UserSubmission {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  tiktok_video_id?: string;
  embed_code?: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  views: number;
  video_id: string;
}

export function ContestManagement() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [userSubmission, setUserSubmission] = useState<UserSubmission | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  useEffect(() => {
    if (!session) {
      navigate('/signin');
      return;
    }
    
    if (id) {
      fetchContestData();
      fetchUserSubmission();
      fetchLeaderboard();
    }
  }, [id, session]);

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
      toast.error('Failed to load contest details');
      navigate('/contests-page');
    }
  };

  const fetchUserSubmission = async () => {
    if (!session) return;
    
    try {
      const { data, error } = await supabase
        .from('contest_links')
        .select('*')
        .eq('contest_id', id)
        .eq('created_by', session.user.id)
        .eq('is_contest_submission', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        // User hasn't submitted to this contest
        navigate('/contests-page');
        return;
      }
      
      setUserSubmission(data);
    } catch (error) {
      console.error('Error fetching user submission:', error);
      toast.error('Failed to load your submission');
      navigate('/contests-page');
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
            
            // Find user's rank
            const userEntry = data.data.leaderboard.find((entry: any) => 
              entry.video_id === userSubmission?.id
            );
            if (userEntry) {
              setUserRank(userEntry.rank);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!userSubmission) return;
    
    setDeleting(true);
    try {
      // Delete from contest_links
      const { error: linkError } = await supabase
        .from('contest_links')
        .delete()
        .eq('id', userSubmission.id)
        .eq('created_by', session?.user.id);

      if (linkError) throw linkError;

      // Delete from contest_participants
      const { error: participantError } = await supabase
        .from('contest_participants')
        .delete()
        .eq('contest_id', id)
        .eq('user_id', session?.user.id);

      if (participantError) throw participantError;

      toast.success('Your submission has been removed from the contest');
      navigate('/contests-page');
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to remove submission');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatTimeLeft = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const distance = end - now;

    if (distance < 0) return 'Contest Ended';

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else if (minutes > 0) {
      return `${minutes}m left`;
    } else {
      return 'Ending soon';
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
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const getRankColor = (rank: number | null) => {
    if (!rank) return 'text-white/60';
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    if (rank <= 10) return 'text-blue-400';
    return 'text-white';
  };

  const getRankIcon = (rank: number | null) => {
    if (!rank) return <Target className="h-8 w-8 text-white/40" />;
    if (rank === 1) return <Trophy className="h-8 w-8 text-yellow-400" />;
    if (rank === 2) return <Award className="h-8 w-8 text-gray-300" />;
    if (rank === 3) return <Award className="h-8 w-8 text-amber-600" />;
    return <BarChart3 className="h-8 w-8 text-blue-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-white/60" />
          <p className="mt-2 text-white/60">Loading contest management...</p>
        </div>
      </div>
    );
  }

  if (!contest || !userSubmission) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Contest Not Found</h2>
          <p className="text-white/60 mb-6">The contest you're looking for doesn't exist or you haven't submitted to it.</p>
          <Link
            to="/contests-page"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to Contests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 1. Rank with Performance Metrics */}
        <div className="mb-6">
          <div className="bg-white/3 backdrop-blur-sm rounded-lg border border-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center">
                  {React.cloneElement(getRankIcon(userRank), { className: "h-5 w-5" })}
                </div>
                <div>
                  <div className={`text-lg font-semibold ${getRankColor(userRank)}`}>
                    {userRank ? `#${userRank}` : 'Unranked'}
                  </div>
                  <div className="text-white/40 text-xs">Current Position</div>
                </div>
                {userRank && userRank <= 3 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-400/10 text-yellow-400 rounded text-xs font-medium">
                    <Star className="h-3 w-3" />
                    Prize
                  </div>
                )}
              </div>

              {/* Compact Performance Metrics */}
              <div className="flex items-center gap-4 text-xs text-white/60">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span className="font-medium text-white">{formatNumber(userSubmission.views || 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span className="font-medium text-white">{formatNumber(userSubmission.likes || 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span className="font-medium text-white">{formatNumber(userSubmission.comments || 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share className="h-3 w-3" />
                  <span className="font-medium text-white">{formatNumber(userSubmission.shares || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Video Submission */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Your Submission
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowViewModal(true)}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Play className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-6">
                <img
                  src={userSubmission.thumbnail}
                  alt={userSubmission.title}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover shadow-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white mb-3 line-clamp-2">{userSubmission.title}</h3>
                  <p className="text-white/60 mb-4">
                    Submitted {formatDate(userSubmission.created_at)}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-white/60">
                    <span>{formatNumber(userSubmission.views || 0)} views</span>
                    <span>•</span>
                    <span>{formatNumber(userSubmission.likes || 0)} likes</span>
                    <span>•</span>
                    <span>{formatNumber(userSubmission.comments || 0)} comments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Contest Title with Contest Image */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            {contest.cover_image ? (
              <div className="relative h-48 sm:h-56">
                <img
                  src={contest.cover_image}
                  alt={contest.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="px-6 sm:px-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{contest.name}</h1>
                    <div className="flex items-center gap-6 text-white/80">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">{formatTimeLeft(contest.end_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        <span className="font-medium">{contest.music_category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{contest.name}</h1>
                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">{formatTimeLeft(contest.end_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    <span className="font-medium">{contest.music_category}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Contest Information */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Contest Information
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Description</h3>
                <p className="text-white/90 leading-relaxed text-lg">{contest.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Start Date</h3>
                  <p className="text-white/90">{formatDate(contest.start_date)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">End Date</h3>
                  <p className="text-white/90">{formatDate(contest.end_date)}</p>
                </div>
              </div>

              {contest.guidelines && (
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Guidelines</h3>
                  <p className="text-white/90 leading-relaxed">{contest.guidelines}</p>
                </div>
              )}

              {contest.rules && (
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Rules</h3>
                  <p className="text-white/90 leading-relaxed">{contest.rules}</p>
                </div>
              )}

              {contest.hashtags && contest.hashtags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Required Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    {contest.hashtags.map((hashtag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium"
                      >
                        #{hashtag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contest Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-white mb-1">{contest.num_winners}</div>
                  <div className="text-sm text-white/60 font-medium">Winners</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-white mb-1">{leaderboard.length}</div>
                  <div className="text-sm text-white/60 font-medium">Participants</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Quick Action Results */}
        <div className="mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to={`/l/${contest.id}`}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                View Full Leaderboard
              </Link>
              <button
                onClick={() => setShowHelpModal(true)}
                className="px-6 py-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <HelpCircle className="h-5 w-5" />
                Get Help & Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Submission Modal */}
      {userSubmission && (
        <ViewSubmissionModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          video={userSubmission}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Remove Submission</h3>
              </div>
              <p className="text-white/70 mb-6 leading-relaxed">
                Are you sure you want to remove your submission from this contest? This action cannot be undone and you'll lose your current ranking position.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSubmission}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Remove Submission
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <HelpCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  Help & Support
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    Contest Support
                  </h4>
                  <p className="text-white/70 text-sm leading-relaxed">
                    For questions about contest rules, prizes, or technical issues, our support team is here to help.
                  </p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    Improve Performance
                  </h4>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Your ranking is based on video views and engagement. Share your video on social media to increase visibility and climb the leaderboard.
                  </p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    Submission Guidelines
                  </h4>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Ensure your video follows all contest guidelines and rules to remain eligible for prizes and maintain your ranking.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/10">
                <a
                  href="mailto:support@crownthesound.com"
                  className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-center block font-medium"
                >
                  Contact Support Team
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}