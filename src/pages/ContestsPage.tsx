import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Trophy, 
  Clock, 
  Users, 
  Star, 
  ArrowRight, 
  Filter,
  Search,
  Sparkles,
  Gift,
  Music,
  Loader2,
  Calendar,
  Award,
  Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ContestJoinModal } from '../components/ContestJoinModal';
import { TikTokConnectModal } from '../components/TikTokConnectModal';
import { ViewSubmissionModal } from '../components/ViewSubmissionModal';
import { useTikTokConnection } from '../hooks/useTikTokConnection';
import toast from 'react-hot-toast';

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

const MUSIC_CATEGORIES = [
  'All',
  'Pop',
  'Rock', 
  'Hip Hop/Rap',
  'R&B/Soul',
  'Electronic/Dance',
  'Jazz',
  'Classical',
  'Country',
  'Folk',
  'Blues',
  'Metal',
  'Reggae',
  'World Music',
  'Alternative',
  'Indie',
  'Latin',
  'Gospel/Christian',
  'Punk',
  'Funk'
];

export function ContestsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState<LeaderboardContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<LeaderboardContest | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<Record<string, any>>({});
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewVideo, setViewVideo] = useState<any>(null);
  
  const { isConnected: isTikTokConnected, refreshConnection } = useTikTokConnection();

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  useEffect(() => {
    fetchContests();
    fetchUserSubmissions();
  }, []);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const contestsWithParticipants = await Promise.all(
        (data || []).map(async (contest) => {
          // Fetch leaderboard data for each contest
          let top_participants: any[] = [];
          
          // Only attempt to fetch leaderboard if backend URL is properly configured
          if (backendUrl && backendUrl !== "http://localhost:3000") {
            try {
              // Create AbortController for timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              
              const response = await fetch(
                `${backendUrl}/api/v1/contests/${contest.id}/leaderboard?limit=${
                  contest.num_winners || 15
                }`,
                { 
                  signal: controller.signal,
                  headers: {
                    'Content-Type': 'application/json',
                  }
                }
              );
              
              clearTimeout(timeoutId);
              
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
              } else {
                console.warn(`Leaderboard API returned ${response.status} for contest ${contest.id}`);
              }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                console.warn(`Leaderboard request timeout for contest ${contest.id}`);
              } else {
                console.warn(`Network error fetching leaderboard for contest ${contest.id}:`, error);
              }
            }
          } else {
            console.warn('Backend URL not configured or using default localhost - skipping leaderboard fetch');
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
      console.error('Error fetching contests:', error);
      toast.error('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubmissions = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('contest_links')
        .select('*')
        .eq('created_by', session.user.id)
        .eq('is_contest_submission', true);
      if (error) throw error;
      const mapping: Record<string, any> = {};
      data.forEach((row) => {
        if (row.contest_id) {
          mapping[row.contest_id] = row;
        }
      });
      setUserSubmissions(mapping);
    } catch (err) {
      console.error('Error fetching user submissions', err);
    }
  };

  const handleJoinContest = (contest: LeaderboardContest) => {
    if (!session) {
      navigate('/signin');
      return;
    }

    if (!isTikTokConnected) {
      setShowTikTokModal(true);
      return;
    }

    setSelectedContest(contest);
    setShowJoinModal(true);
  };

  const handleTikTokConnected = () => {
    setShowTikTokModal(false);
    refreshConnection();
    toast.success('TikTok connected successfully!');
  };

  const handleContestJoined = () => {
    setShowJoinModal(false);
    setSelectedContest(null);
    fetchUserSubmissions(); // Refresh user submissions after joining
    toast.success('Successfully joined contest!');
  };

  const filteredContests = contests.filter(contest => {
    const matchesSearch = contest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contest.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || contest.music_category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatTimeLeft = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const distance = end - now;

    if (distance < 0) return 'Ended';

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `${days}d ${hours}h left`;
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

  const getRankIcon = (rank: number) => {
    const colors = {
      1: "text-yellow-400",
      2: "text-gray-400", 
      3: "text-amber-600"
    };
    const color = colors[rank as keyof typeof colors] || "text-white/60";

    if (rank === 1) {
      return (
        <div className="relative">
          <Crown className={`h-4 w-4 ${color}`} />
          <Sparkles className="absolute -top-1 -right-1 h-2 w-2 text-yellow-300 animate-pulse" />
        </div>
      );
    }

    return <Crown className={`h-4 w-4 ${color}`} />;
  };

  const handleViewVideo = (video: any) => {
    setViewVideo(video);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-white/60" />
          <p className="mt-2 text-white/60">Loading contests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <Link to="/" className="flex items-center gap-3">
          <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">Crown</span>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Active Contests
            </h1>
          </div>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Join live music competitions and showcase your talent to win amazing prizes
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type="text"
                placeholder="Search contests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer w-full sm:min-w-[200px] sm:w-auto"
              >
                {MUSIC_CATEGORIES.map(category => (
                  <option key={category} value={category} className="bg-[#1A1A1A] text-white">
                    {category}
                  </option>
                ))}
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="text-white/60 text-sm">
            {filteredContests.length} contest{filteredContests.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Contests Grid */}
        {filteredContests.length === 0 ? (
          <div className="text-center py-16">
            <Music className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No contests found</h3>
            <p className="text-white/60">
              {searchTerm || selectedCategory !== 'All' 
                ? 'Try adjusting your search or filter criteria'
                : 'Check back later for new contests!'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContests.map((contest) => (
              <div
                key={contest.id}
                className="group bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 hover:scale-[1.02]"
              >
                {/* Contest Image */}
                <div className="relative aspect-video overflow-hidden">
                  {contest.cover_image ? (
                    <img
                      src={contest.cover_image}
                      alt={contest.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <Music className="h-12 w-12 text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  {/* Time left badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeLeft(contest.end_date)}
                  </div>

                  {/* Category badge */}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                    {contest.music_category || 'Music'}
                  </div>
                </div>

                {/* Contest Info */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">
                      {contest.name}
                    </h3>
                    <p className="text-white/70 text-sm line-clamp-2">
                      {contest.description}
                    </p>
                  </div>

                  {/* Prize Info */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-medium text-white">Prizes</span>
                      </div>
                      <span className="text-xs text-white/60">{contest.num_winners} Winners</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {contest.prize_tier === "monetary" 
                        ? `$${formatNumber(contest.total_prize || (contest.prize_per_winner || 0) * (contest.num_winners || 1))}`
                        : "Title Rewards"
                      }
                    </div>
                  </div>

                  {/* Top Participants */}
                  {contest.top_participants && contest.top_participants.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-white/60" />
                        <span className="text-sm font-medium text-white/60">Current Leaders</span>
                      </div>
                      <div className="space-y-1">
                        {contest.top_participants.slice(0, 3).map((participant) => (
                          <div key={participant.rank} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {getRankIcon(participant.rank)}
                              <span className="text-white">@{participant.username}</span>
                            </div>
                            <span className="text-white/60">{formatNumber(participant.views)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Link
                      to={`/l/${contest.id}`}
                      className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-center text-sm font-medium"
                    >
                      Leaderboard
                    </Link>
                    {session && userSubmissions[contest.id] ? (
                      <button
                        onClick={() => navigate(`/contest-management/${contest.id}`)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Manage
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinContest(contest)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Trophy className="h-4 w-4" />
                        {session ? 'Join Contest' : 'Sign Up to Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {!session && filteredContests.length > 0 && (
          <div className="mt-16 text-center bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <Award className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Compete?</h3>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              Sign up now to join contests and showcase your musical talent to the world
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="px-8 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition-colors font-medium"
              >
                Create Account
              </Link>
              <Link
                to="/signin"
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors font-medium"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TikTokConnectModal
        isOpen={showTikTokModal}
        onClose={() => setShowTikTokModal(false)}
        onSuccess={handleTikTokConnected}
      />

      {selectedContest && (
        <ContestJoinModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          contest={selectedContest as any}
          onSuccess={handleContestJoined}
        />
      )}

      {viewVideo && (
        <ViewSubmissionModal
          isOpen={!!viewVideo}
          onClose={() => setViewVideo(null)}
          video={viewVideo}
        />
      )}
    </div>
  );
}