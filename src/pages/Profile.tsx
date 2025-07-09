import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Calendar, 
  Crown, 
  LogOut, 
  Edit3, 
  Save, 
  X,
  Shield,
  Star,
  Trophy,
  Settings,
  Play,
  Eye,
  ExternalLink,
  Clock,
  Award,
  Upload,
  Trash2,
  Edit,
  BarChart3,
  Heart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { TikTokSettingsModal } from '../components/TikTokSettingsModal';

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
  joined_at?: string;
}

interface Submission {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  contest_id: string;
  contest_name: string;
  tiktok_video_id?: string;
  embed_code?: string;
}

export function Profile() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'contests' | 'submissions'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [joinedContests, setJoinedContests] = useState<Contest[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTikTokSettings, setShowTikTokSettings] = useState(false);

  useEffect(() => {
    if (session && (activeTab === 'contests' || activeTab === 'submissions')) {
      fetchUserData();
    }
  }, [session, activeTab]);

  const fetchUserData = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      // Fetch joined contests
      const { data: participantData, error: participantError } = await supabase
        .from('contest_participants')
        .select(`
          joined_at,
          contests (
            id,
            name,
            description,
            cover_image,
            start_date,
            end_date,
            status,
            music_category,
            prize_per_winner,
            num_winners
          )
        `)
        .eq('user_id', session.user.id);

      if (participantError) throw participantError;

      const contests = participantData?.map(p => ({
        ...p.contests,
        joined_at: p.joined_at
      })) || [];
      setJoinedContests(contests);

      // Fetch user submissions
      const { data: submissionData, error: submissionError } = await supabase
        .from('contest_links')
        .select(`
          id,
          title,
          url,
          thumbnail,
          views,
          likes,
          comments,
          shares,
          created_at,
          contest_id,
          tiktok_video_id,
          embed_code,
          contests (
            name
          )
        `)
        .eq('created_by', session.user.id)
        .eq('is_contest_submission', true);

      if (submissionError) throw submissionError;

      const processedSubmissions = submissionData?.map(s => ({
        ...s,
        contest_name: s.contests?.name || 'Unknown Contest'
      })) || [];
      setSubmissions(processedSubmissions);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error during sign out');
    }
  };

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editedName,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      const { error } = await supabase
        .from('contest_links')
        .delete()
        .eq('id', submissionId)
        .eq('created_by', session?.user?.id);

      if (error) throw error;

      setSubmissions(submissions.filter(s => s.id !== submissionId));
      toast.success('Submission deleted successfully');
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to delete submission');
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'organizer':
        return {
          label: 'Organizer',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          borderColor: 'border-yellow-400/20',
          icon: Crown,
          description: 'Can create and manage contests'
        };
      case 'admin':
        return {
          label: 'Administrator',
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          borderColor: 'border-red-400/20',
          icon: Shield,
          description: 'Full system access'
        };
      default:
        return {
          label: 'User',
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/20',
          borderColor: 'border-blue-400/20',
          icon: User,
          description: 'Can participate in contests'
        };
    }
  };

  const roleInfo = getRoleInfo(profile?.role || 'user');
  const RoleIcon = roleInfo.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  const getContestStatus = (contest: Contest) => {
    const now = new Date();
    const endDate = new Date(contest.end_date);
    
    if (contest.status === 'completed' || endDate < now) {
      return { label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-400/10' };
    }
    if (contest.status === 'active') {
      return { label: 'Active', color: 'text-blue-400', bgColor: 'bg-blue-400/10' };
    }
    return { label: 'Draft', color: 'text-gray-400', bgColor: 'bg-gray-400/10' };
  };

  if (!session || !profile) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-16 w-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Not signed in</h2>
          <p className="text-white/60">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
      {/* Header with Logo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">Crown</span>
          </Link>
          {session && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log("🔍 TikTok Settings button clicked");
                  setShowTikTokSettings(true);
                  console.log("🔍 showTikTokSettings set to true");
                }}
                className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white text-sm sm:text-base"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">TikTok</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TikTok Settings Modal */}
      <TikTokSettingsModal
        isOpen={showTikTokSettings}
        onClose={() => setShowTikTokSettings(false)}
      />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Profile</h1>
          <p className="text-white/60">Manage your account and track your progress</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          {/* Profile Header */}
          <div className="relative bg-gradient-to-r from-blue-500/20 to-purple-600/20 p-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10"></div>
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
                <User className="h-12 w-12 text-white" />
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-white/20"
                        placeholder="Enter your name"
                      />
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                      >
                        <Save className="h-4 w-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedName(profile?.full_name || '');
                        }}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-white">
                        {profile.full_name || 'Anonymous User'}
                      </h2>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <Edit3 className="h-4 w-4 text-white/60" />
                      </button>
                    </>
                  )}
                </div>

                {/* Role Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${roleInfo.bgColor} ${roleInfo.borderColor} border`}>
                  <RoleIcon className={`h-4 w-4 ${roleInfo.color}`} />
                  <span className={`text-sm font-medium ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{joinedContests.length}</p>
                  <p className="text-xs text-white/60">Contests</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{submissions.length}</p>
                  <p className="text-xs text-white/60">Submissions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-white/10">
            <nav className="flex overflow-x-auto scrollbar-hide">
              {[
                { id: 'overview', label: 'Overview', icon: Settings },
                { id: 'contests', label: 'My Contests', icon: Trophy },
                { id: 'submissions', label: 'My Submissions', icon: Upload }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'text-white border-white'
                        : 'text-white/60 hover:text-white border-transparent'
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-4 sm:w-4" />
                    <span className="text-sm sm:text-base">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Account Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-400" />
                    Account Information
                  </h3>
                  <div className="grid gap-5">
                    <div className="group flex items-center gap-4 p-5 bg-white/5 hover:bg-white/8 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Mail className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/70 mb-1">Email Address</p>
                        <p className="text-white font-medium tracking-wide">{profile.email || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 p-5 bg-white/5 hover:bg-white/8 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Calendar className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/70 mb-1">Member Since</p>
                        <p className="text-white font-medium tracking-wide">
                          {profile.created_at ? formatDate(profile.created_at) : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="group flex items-center gap-4 p-5 bg-white/5 hover:bg-white/8 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
                      <div className={`w-12 h-12 ${roleInfo.bgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <RoleIcon className={`h-5 w-5 ${roleInfo.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/70 mb-1">Account Type</p>
                        <p className={`font-medium ${roleInfo.color} tracking-wide`}>{roleInfo.label}</p>
                        <p className="text-xs text-white/50 mt-1.5">{roleInfo.description}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-400" />
                    Activity Stats
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="group p-5 bg-white/5 hover:bg-white/8 rounded-xl border border-white/10 hover:border-white/20 text-center transition-all duration-300 transform hover:translate-y-[-2px]">
                      <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Star className="h-6 w-6 text-yellow-400" />
                      </div>
                      <p className="text-2xl font-bold text-white mb-1">{joinedContests.length}</p>
                      <p className="text-sm text-white/70">Contests Joined</p>
                    </div>
                    <div className="group p-5 bg-white/5 hover:bg-white/8 rounded-xl border border-white/10 hover:border-white/20 text-center transition-all duration-300 transform hover:translate-y-[-2px]">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Trophy className="h-6 w-6 text-blue-400" />
                      </div>
                      <p className="text-2xl font-bold text-white mb-1">0</p>
                      <p className="text-sm text-white/70">Wins</p>
                    </div>
                    <div className="group p-5 bg-white/5 hover:bg-white/8 rounded-xl border border-white/10 hover:border-white/20 text-center transition-all duration-300 transform hover:translate-y-[-2px]">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Crown className="h-6 w-6 text-purple-400" />
                      </div>
                      <p className="text-2xl font-bold text-white mb-1">
                        {submissions.reduce((total, sub) => total + (sub.views || 0), 0)}
                      </p>
                      <p className="text-sm text-white/70">Total Views</p>
                    </div>
                  </div>
                </div>

                {/* Sign Out Button */}
                <div className="pt-8 mt-2 border-t border-white/10">
                  <button
                    onClick={handleSignOut}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl transition-all duration-300 text-red-400 hover:text-red-300 group"
                  >
                    <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    <span className="font-medium tracking-wide">Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'contests' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Joined Contests ({joinedContests.length})
                  </h3>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-white/60 mt-4">Loading contests...</p>
                  </div>
                ) : joinedContests.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="h-16 w-16 text-white/20 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-white mb-2">No contests joined yet</h4>
                    <p className="text-white/60 mb-6">Start participating in contests to see them here</p>
                    <button
                      onClick={() => navigate('/')}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Browse Contests
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {joinedContests.map((contest) => {
                      const status = getContestStatus(contest);
                      return (
                        <div key={contest.id} className="bg-white/5 rounded-lg border border-white/10 p-6">
                          <div className="flex items-start gap-4">
                            {contest.cover_image && (
                              <img
                                src={contest.cover_image}
                                alt={contest.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-lg font-semibold text-white">{contest.name}</h4>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                                  {status.label}
                                </div>
                              </div>
                              <p className="text-white/60 text-sm mb-3 line-clamp-2">{contest.description}</p>
                              <div className="flex items-center gap-4 text-xs text-white/40">
                                <span>Joined: {contest.joined_at ? formatDate(contest.joined_at) : 'Unknown'}</span>
                                <span>•</span>
                                <span>Category: {contest.music_category}</span>
                                <span>•</span>
                                <span>Prize: ${contest.prize_per_winner}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(`/l/${contest.id}`)}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                              title="View contest"
                            >
                              <ExternalLink className="h-4 w-4 text-white/60" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'submissions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    My Submissions ({submissions.length})
                  </h3>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-white/60 mt-4">Loading submissions...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Upload className="h-16 w-16 text-white/20 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-white mb-2">No submissions yet</h4>
                    <p className="text-white/60 mb-6">Submit your first video to a contest to see it here</p>
                    <button
                      onClick={() => navigate('/')}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Join a Contest
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="group bg-white/5 hover:bg-white/8 rounded-xl border border-white/10 hover:border-white/20 overflow-hidden transition-all duration-300 transform hover:translate-y-[-2px]">
                        <div className="flex flex-col sm:flex-row">
                          {/* Thumbnail with overlay */}
                          <div className="relative sm:w-48 h-40 flex-shrink-0">
                            <img
                              src={submission.thumbnail}
                              alt={submission.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-70"></div>
                            
                            {/* Play button overlay */}
                            <button
                              onClick={() => window.open(submission.url, '_blank')}
                              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              title="Play video"
                            >
                              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                <Play className="h-6 w-6 text-white" />
                              </div>
                            </button>
                            
                            {/* Stats overlay at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 flex justify-between items-center">
                              <div className="flex items-center gap-2 text-xs text-white">
                                <Eye className="h-3 w-3" />
                                <span>{formatNumber(submission.views || 0)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-white">
                                <Heart className="h-3 w-3" />
                                <span>{formatNumber(submission.likes || 0)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 p-4 sm:p-5 flex flex-col">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-lg font-semibold text-white truncate">{submission.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Trophy className="h-3.5 w-3.5 text-blue-400" />
                                  <p className="text-sm text-white/70">{submission.contest_name}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Stats grid - visible on larger screens */}
                            <div className="hidden sm:grid grid-cols-4 gap-3 mt-3 mb-4">
                              <div className="bg-white/5 rounded-lg p-2 text-center">
                                <p className="text-lg font-semibold text-white">{formatNumber(submission.views || 0)}</p>
                                <p className="text-xs text-white/60">Views</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-2 text-center">
                                <p className="text-lg font-semibold text-white">{formatNumber(submission.likes || 0)}</p>
                                <p className="text-xs text-white/60">Likes</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-2 text-center">
                                <p className="text-lg font-semibold text-white">{formatNumber(submission.comments || 0)}</p>
                                <p className="text-xs text-white/60">Comments</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-2 text-center">
                                <p className="text-lg font-semibold text-white">{formatNumber(submission.shares || 0)}</p>
                                <p className="text-xs text-white/60">Shares</p>
                              </div>
                            </div>
                            
                            {/* Mobile stats - visible only on small screens */}
                            <div className="grid grid-cols-2 gap-2 sm:hidden mt-3 mb-4">
                              <div className="bg-white/5 rounded-lg p-2 text-center">
                                <p className="text-base font-semibold text-white">{formatNumber(submission.views || 0)}</p>
                                <p className="text-xs text-white/60">Views</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-2 text-center">
                                <p className="text-base font-semibold text-white">{formatNumber(submission.likes || 0)}</p>
                                <p className="text-xs text-white/60">Likes</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                              <div className="text-xs text-white/40">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {formatDate(submission.created_at)}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/contest-management/${submission.contest_id}`}
                                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                  title="Manage submission"
                                >
                                  <Settings className="h-4 w-4 text-white/80" />
                                </Link>
                                <button
                                  onClick={() => window.open(submission.url, '_blank')}
                                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                  title="View video"
                                >
                                  <ExternalLink className="h-4 w-4 text-white/80" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubmission(submission.id)}
                                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                                  title="Delete submission"
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}