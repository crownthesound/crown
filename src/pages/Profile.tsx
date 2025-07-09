import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Trophy, Calendar, Clock, Users, ExternalLink, Trash2 } from 'lucide-react';

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  participant_count?: number;
}

interface Submission {
  id: string;
  contest_id: string;
  tiktok_url: string;
  submitted_at: string;
  contest: Contest;
}

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contests');
  const [joinedContests, setJoinedContests] = useState<Contest[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch joined contests
      const { data: contestData, error: contestError } = await supabase
        .from('contest_participants')
        .select(`
          contest_id,
          contests (
            id,
            title,
            description,
            start_date,
            end_date,
            status
          )
        `)
        .eq('user_id', user.id);

      if (contestError) throw contestError;

      const contests = contestData?.map(item => item.contests).filter(Boolean) || [];
      setJoinedContests(contests);

      // Fetch submissions
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .select(`
          id,
          contest_id,
          tiktok_url,
          submitted_at,
          contests (
            id,
            title,
            description,
            start_date,
            end_date,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (submissionError) throw submissionError;

      setSubmissions(submissionData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;

      setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Failed to delete submission. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/10';
      case 'upcoming':
        return 'text-blue-400 bg-blue-400/10';
      case 'ended':
        return 'text-gray-400 bg-gray-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {user.email?.split('@')[0] || 'User'}
              </h1>
              <p className="text-white/60">{user.email}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 text-white/80">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm">{joinedContests.length} Contests Joined</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{submissions.length} Submissions</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 bg-white/5 backdrop-blur-sm rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('contests')}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'contests'
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Joined Contests
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'submissions'
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            My Submissions
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'contests' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <span>Joined Contests</span>
                <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-xs font-medium text-white/80">
                  {joinedContests.length}
                </span>
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
                  Join a Contest
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {joinedContests.map((contest) => (
                  <div key={contest.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-semibold text-white mb-2">{contest.title}</h4>
                        <p className="text-white/70 mb-4">{contest.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contest.status)}`}>
                        {contest.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-white/60 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Starts: {formatDate(contest.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Ends: {formatDate(contest.end_date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/contest/${contest.id}`}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        View Contest
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'submissions' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>My Submissions</span>
                <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-xs font-medium text-white/80">
                  {submissions.length}
                </span>
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="text-white/60 mt-4">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">No submissions yet</h4>
                <p className="text-white/60 mb-6">Submit your first TikTok video to a contest</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Browse Contests
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {submissions.map((submission) => (
                  <div key={submission.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-semibold text-white mb-2">{submission.contest.title}</h4>
                        <p className="text-white/70 mb-2">{submission.contest.description}</p>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <Clock className="h-4 w-4" />
                          <span>Submitted: {formatDate(submission.submitted_at)}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.contest.status)}`}>
                        {submission.contest.status}
                      </span>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 mb-4">
                      <p className="text-white/80 text-sm mb-2">TikTok URL:</p>
                      <a
                        href={submission.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm break-all flex items-center gap-2"
                      >
                        {submission.tiktok_url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/contest/${submission.contest_id}`}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        View Contest
                      </Link>
                      <button
                        onClick={() => handleDeleteSubmission(submission.id)}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}