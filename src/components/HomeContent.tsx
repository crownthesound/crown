import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Star, ArrowUp, ArrowDown, Minus, Clock, Play, Share2, Globe, Sparkles, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { VideoCarousel } from './VideoCarousel';
import { HowToEnterCarousel } from './HowToEnterCarousel';
import { supabase } from '../lib/supabase';
import { useRealtimeData } from '../hooks/useRealtimeData';

interface LeaderboardContest {
  id: string;
  name: string;
  description: string;
  cover_image: string;
  start_date: string;
  end_date: string;
  status: string;
  music_category: string;
  prize_tier: string;
  prize_per_winner: number;
  prize_titles: { rank: number; title: string; }[];
  num_winners?: number;
  top_participants?: {
    rank: number;
    username: string;
    full_name: string;
    points: number;
    views: number;
    previousRank?: number;
  }[];
}

interface HomeContentProps {
  contests: LeaderboardContest[];
  loading: boolean;
  session: any;
  onShowAuth: (isSignUp: boolean) => void;
}

export function HomeContent({ contests: initialContests, loading: initialLoading, session, onShowAuth }: HomeContentProps) {
  const navigate = useNavigate();
  const [contests, setContests] = useState(initialContests);
  const [loading, setLoading] = useState(initialLoading);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_config')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const contestsWithParticipants = (data || []).map(contest => ({
        ...contest,
        top_participants: mockParticipants.slice(0, contest.num_winners || 15)
      }));

      setContests(contestsWithParticipants);
    } catch (error) {
      console.error('Error fetching contests:', error);
      toast.error('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  useRealtimeData({
    eventName: 'contestUpdate',
    onUpdate: () => {
      fetchContests();
    }
  });

  useRealtimeData({
    eventName: 'videoUpdate',
    onUpdate: () => {
      window.dispatchEvent(new Event('refreshVideoCarousel'));
    }
  });

  useEffect(() => {
    setContests(initialContests);
    setLoading(initialLoading);
  }, [initialContests, initialLoading]);

  const getRankIcon = (rank: number) => {
    const colors = {
      1: 'text-yellow-400',
      2: 'text-gray-400',
      3: 'text-amber-600',
      4: 'text-blue-400',
      5: 'text-green-400'
    };

    const color = colors[rank as keyof typeof colors] || 'text-slate-400';

    if (rank === 1) {
      return (
        <div className="relative">
          <Crown className={`h-5 w-5 ${color}`} />
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
        </div>
      );
    }

    return (
      <div className="relative">
        <Crown className={`h-5 w-5 ${color}`} />
      </div>
    );
  };

  const getRankChangeIcon = (currentRank: number, previousRank?: number) => {
    if (!previousRank) return <Minus className="h-3 w-3 text-white/40" />;
    
    if (currentRank < previousRank) {
      return <ArrowUp className="h-3 w-3 text-green-500" />;
    } else if (currentRank > previousRank) {
      return <ArrowDown className="h-3 w-3 text-red-500" />;
    }
    return <Minus className="h-3 w-3 text-white/40" />;
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

  const formatTimeLeft = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const distance = end - now;

    if (distance < 0) return 'Ended';

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `${days}d ${hours}h left`;
  };

  const getRankColor = (rank: number) => {
    const colors = {
      1: 'text-yellow-400',
      2: 'text-gray-400',
      3: 'text-amber-600'
    };
    return colors[rank as keyof typeof colors] || 'text-white/60';
  };

  const formatRank = (rank: number) => {
    const suffixes = ['st', 'nd', 'rd'];
    return `${rank}${suffixes[rank - 1] || 'th'}`;
  };

  const handleShare = async (contest: LeaderboardContest) => {
    const shareUrl = `${window.location.origin}/l/${contest.id}`;
    try {
      await navigator.share({
        title: contest.name,
        text: contest.description,
        url: shareUrl
      });
    } catch (error) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const handlePlayVideo = () => {
    if (!session) {
      onShowAuth(false);
      return;
    }
    toast.success('Video player coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-2 border-t-white animate-spin"></div>
          </div>
          <p className="mt-6 text-white/60 font-light tracking-wider">LOADING</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">Crown</span>
          </Link>
          {!session && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onShowAuth(false)}
                className="px-3 sm:px-6 py-2 text-white hover:bg-white/5 rounded-xl transition-colors whitespace-nowrap text-sm sm:text-base"
              >
                Login
              </button>
              <button
                onClick={() => onShowAuth(true)}
                className="bg-white text-[#1A1A1A] px-3 sm:px-6 py-2 rounded-xl hover:bg-white/90 transition-colors transform hover:scale-105 duration-200 text-sm sm:text-base font-medium"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">
            Music Leaderboard Competitions
          </h1>
          <p className="text-sm sm:text-base text-white/60">
            Get Noticed. Get Rewarded.
          </p>
        </div>

        <div className="mb-20 sm:mb-16">
          <VideoCarousel />
        </div>

        <div className="mb-20 sm:mb-16">
          <div className="text-center mb-8">
            <h2 className="text-[1.75rem] xs:text-[2rem] sm:text-[2.5rem] font-black text-white tracking-tight">
              How It Works
            </h2>
          </div>
          <HowToEnterCarousel />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-[1.75rem] xs:text-[2rem] sm:text-[2.5rem] font-black text-white tracking-tight">
            Active Contests
          </h2>
        </div>

        <div>
          {contests.filter(contest => contest.status === 'active').length === 0 ? (
            <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <Trophy className="h-16 w-16 text-white/40 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No active contests</h3>
              <p className="text-white/80">Check back later for new contests!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {contests.filter(contest => contest.status === 'active').map(contest => (
                <div
                  key={contest.id}
                  className="group bg-[#0A0A0A] backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-white/20"
                >
                  {contest.cover_image && (
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={contest.cover_image}
                        alt={contest.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm sm:text-xl font-black text-white line-clamp-1">{contest.name}</h3>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-2 space-y-2">
                    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-400" />
                          <h4 className="text-xs font-medium text-white">Prizes</h4>
                        </div>
                        <div className="text-xs text-white/60">
                          {contest.prize_titles.length} Winners
                        </div>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
                        {contest.prize_titles.slice(0, contest.num_winners || contest.prize_titles.length).map((prize, index) => (
                          <div
                            key={index}
                            className="p-1.5 rounded-lg border snap-start flex-shrink-0 min-w-[70px] bg-black/20 border-white/10 transition-all hover:bg-white/5"
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              {getRankIcon(index + 1)}
                              <span className={`text-[10px] font-medium ${getRankColor(index + 1)}`}>
                                {formatRank(index + 1)}
                              </span>
                            </div>
                            <div className="text-[10px] font-medium leading-tight line-clamp-2 text-white">
                              {contest.prize_tier === 'monetary' 
                                ? `$${formatNumber(contest.prize_per_winner * (1 - index * 0.2))}` 
                                : prize.title
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {contest.top_participants && contest.top_participants.length > 0 && (
                      <div className="bg-black/20 backdrop-blur-sm rounded-lg overflow-hidden">
                        <div className="grid grid-cols-3 divide-x divide-white/5">
                          {contest.top_participants.slice(0, 3).map((participant, index) => (
                            <div key={index} className="px-1.5 py-1">
                              <div className="text-[10px] font-medium text-white/60 text-center">
                                {index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'}
                              </div>
                              <div className="text-[10px] text-white text-center truncate">
                                @{participant.username}
                              </div>
                              <div className="text-[9px] text-white/40 text-center">
                                {formatNumber(participant.views)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      to={`/l/${contest.id}`}
                      className="w-full px-4 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5 group text-xs"
                    >
                      <span>View Details</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!session && contests.length > 0 && (
          <div className="mt-12 bg-white/5 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-white/10">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Want to participate?</h3>
            <p className="text-sm sm:text-base text-white/80 mb-6 max-w-md mx-auto">
              Join our community and start competing in contests to showcase your talent!
            </p>
            <button
              onClick={() => onShowAuth(true)}
              className="bg-white text-[#1A1A1A] px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl hover:bg-white/90 transition-colors transform hover:scale-105 duration-200 text-sm sm:text-base font-medium"
            >
              Create Account
            </button>
          </div>
        )}
      </div>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t border-white/10">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-white/40" />
            <span className="text-white/40 font-light tracking-wider">CROWN</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link 
              to="/terms" 
              className="text-white/60 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-white/20">•</span>
            <Link 
              to="/privacy" 
              className="text-white/60 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
          <p className="text-white/40 text-xs text-center">
            © {new Date().getFullYear()} Crown. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}