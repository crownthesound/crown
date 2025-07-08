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
  ExternalLink
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
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">Crown</span>
          </Link>
          <Link
            to="/contests-page"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contests
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contest Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden mb-8">
          {contest.cover_image && (
            <div className="relative h-48 sm:h-64">
              <img
                src={contest.cover_image}
                alt={contest.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{contest.name}</h1>
                <div className="flex items-center gap-4 text-white/80">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{formatTimeLeft(contest.end_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span className="text-sm">{contest.music_category}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!contest.cover_image && (
            <div className="p-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{contest.name}</h1>
              <div className="flex items-center gap-4 text-white/80">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{formatTimeLeft(contest.end_date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm">{contest.music_category}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Current Ranking */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">
              {userRank ? `#${userRank}` : 'Unranked'}
            </div>
            <div className="text-xs sm:text-sm text-white/60">Current Ranking</div>
          </div>

          {/* Video Performance */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">
              {formatNumber(userSubmission.views || 0)}
            </div>
            <div className="text-xs sm:text-sm text-white/60">Total Views</div>
          </div>

          {/* Time Remaining */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mb-1">
              {formatTimeLeft(contest.end_date).split(' ')[0]}
            </div>
            <div className="text-xs sm:text-sm text-white/60">Time Left</div>
          </div>
        </div>

        {/* Your Submission */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              Your Submission
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowViewModal(true)}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                View Video
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{userSubmission.title}</h3>
                <p className="text-white/60 text-sm">Submitted on {formatDate(userSubmission.created_at)}</p>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-white/40">
                <div className="flex items-center gap-1">
                  <span>{formatNumber(userSubmission.likes || 0)}</span>
                  <span>likes</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{formatNumber(userSubmission.comments || 0)}</span>
                  <span>comments</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-end">
              <img
                src={userSubmission.thumbnail}
                alt={userSubmission.title}
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl object-cover shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Contest Details */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Contest Details
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-white/60 mb-1">Description</h3>
              <p className="text-white">{contest.description}</p>
            </div>

            {contest.guidelines && (
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-1">Guidelines</h3>
                <p className="text-white">{contest.guidelines}</p>
              </div>
            )}

            {contest.rules && (
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-1">Rules</h3>
                <p className="text-white">{contest.rules}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-1">Start Date</h3>
                <p className="text-white">{formatDate(contest.start_date)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-1">End Date</h3>
                <p className="text-white">{formatDate(contest.end_date)}</p>
              </div>
            </div>

            {contest.hashtags && contest.hashtags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-2">Hashtags</h3>
                <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to={`/l/${contest.id}`}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-center font-medium flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Full Leaderboard
          </Link>
          
          <button
            onClick={() => setShowHelpModal(true)}
            className="flex-1 px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Get Help
          </button>
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
          <div className="bg-[#1A1A1A] rounded-xl border border-white/10 shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Remove Submission</h3>
              </div>
              <p className="text-white/70 mb-6">
                Are you sure you want to remove your submission from this contest? This action cannot be undone and you'll lose your current ranking.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSubmission}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Remove
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
          <div className="bg-[#1A1A1A] rounded-xl border border-white/10 shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-400" />
                  Need Help?
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>
              </div>
              <div className="space-y-4 text-white/70">
                <div>
                  <h4 className="font-medium text-white mb-1">Contest Support</h4>
                  <p className="text-sm">For questions about contest rules, prizes, or technical issues, contact our support team.</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Video Performance</h4>
                  <p className="text-sm">Your ranking is based on video views. Share your video on social media to increase engagement.</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Submission Guidelines</h4>
                  <p className="text-sm">Make sure your video follows all contest guidelines to remain eligible for prizes.</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10">
                <a
                  href="mailto:support@crownthesound.com"
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-center block"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}