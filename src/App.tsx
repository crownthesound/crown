import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Auth } from "./components/Auth";
import { BuildLeaderboard } from "./components/BuildLeaderboard";
import { Contests } from "./pages/Contests";
import { ContestDetails } from "./pages/ContestDetails";
import { PublicLeaderboard } from "./pages/PublicLeaderboard";
import { PastContests } from "./pages/PastContests";
import { Start } from "./pages/Start";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { AdminPage } from "./pages/AdminPage";
import { TermsOfService } from "./pages/TermsOfService";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { HomeContent } from "./components/HomeContent";
import { supabase } from "./lib/supabase";
import { Toaster } from "react-hot-toast";
import {
  Home,
  Crown,
  Medal,
  Star,
  Settings,
  ListTodo,
  Menu,
  X,
  History,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  Plus,
  LogOut,
  Settings2,
  Trophy,
  User,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { useScrollToTop } from "./hooks/useScrollToTop";
import toast from "react-hot-toast";

interface Contest {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  num_winners: number | null;
  total_prize: number | null;
  status: string | null;
  music_category?: string | null;
  prize_per_winner?: number | null;
  prize_titles?: any | null;
  guidelines?: string | null;
  rules?: string | null;
  hashtags?: string[] | null;
  submission_deadline?: string | null;
  max_participants?: number | null;
  top_participants?: any[];
}

const mockParticipants = [
  {
    rank: 1,
    username: "baeb__8",
    full_name: "Mukonazwothe Khabubu",
    points: 1200000,
    views: 1200000,
    previousRank: 2,
  },
  {
    rank: 2,
    username: "lordmust",
    full_name: "Lordmust Sadulloev",
    points: 850000,
    views: 850000,
    previousRank: 1,
  },
  {
    rank: 3,
    username: "glen_versoza",
    full_name: "Glen Versoza",
    points: 620000,
    views: 620000,
    previousRank: 3,
  },
  {
    rank: 4,
    username: "dance_queen",
    full_name: "Sarah Johnson",
    points: 450000,
    views: 450000,
    previousRank: 5,
  },
  {
    rank: 5,
    username: "beatmaster",
    full_name: "James Wilson",
    points: 380000,
    views: 380000,
    previousRank: 4,
  },
  {
    rank: 6,
    username: "rhythm_master",
    full_name: "Michael Chen",
    points: 320000,
    views: 320000,
    previousRank: 7,
  },
  {
    rank: 7,
    username: "melody_queen",
    full_name: "Emma Thompson",
    points: 280000,
    views: 280000,
    previousRank: 6,
  },
  {
    rank: 8,
    username: "groove_guru",
    full_name: "David Martinez",
    points: 250000,
    views: 250000,
    previousRank: 8,
  },
  {
    rank: 9,
    username: "beat_breaker",
    full_name: "Sophie Anderson",
    points: 220000,
    views: 220000,
    previousRank: 10,
  },
  {
    rank: 10,
    username: "music_maverick",
    full_name: "Ryan O'Connor",
    points: 200000,
    views: 200000,
    previousRank: 9,
  },
  {
    rank: 11,
    username: "vibes_master",
    full_name: "Aisha Patel",
    points: 180000,
    views: 180000,
    previousRank: 12,
  },
  {
    rank: 12,
    username: "sound_wave",
    full_name: "Lucas Kim",
    points: 160000,
    views: 160000,
    previousRank: 11,
  },
  {
    rank: 13,
    username: "harmony_hub",
    full_name: "Isabella Garcia",
    points: 140000,
    views: 140000,
    previousRank: 13,
  },
  {
    rank: 14,
    username: "tempo_king",
    full_name: "Marcus Lee",
    points: 120000,
    views: 120000,
    previousRank: 15,
  },
  {
    rank: 15,
    username: "beat_flow",
    full_name: "Nina Rodriguez",
    points: 100000,
    views: 100000,
    previousRank: 14,
  },
];

function App() {
  const { session, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeContests, setActiveContests] = useState<Contest[]>([]);

  useScrollToTop();

  const isPublicPage = location.pathname.startsWith("/l/");
  const isAuthPage = ["/signin", "/signup", "/terms", "/privacy"].includes(
    location.pathname
  );
  const currentPage =
    location.pathname === "/" ? "home" : location.pathname.slice(1);
  const isOrganizer = profile?.role === "organizer";
  const showFooter = session && !isPublicPage && !isAuthPage;

  useEffect(() => {
    const fetchActiveContests = async () => {
      try {
        const { data, error } = await supabase
          .from("contests")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const contestsWithParticipants = (data || []).map((contest) => ({
          ...contest,
          top_participants: mockParticipants.slice(
            0,
            contest.num_winners || 15
          ),
        }));

        setActiveContests(contestsWithParticipants);
      } catch (error) {
        console.error("Error fetching active contests:", error);
        toast.error("Failed to load contests");
      } finally {
        setLoading(false);
      }
    };

    fetchActiveContests();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      navigate("/");
      toast.error("Error during sign out");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "organizer":
        return "text-yellow-400";
      case "admin":
        return "text-red-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A]">
      <main className={`flex-1 ${showFooter ? "pb-24" : ""}`}>
        <Routes>
          <Route
            path="/"
            element={
              <HomeContent
                contests={activeContests}
                loading={loading}
                session={session}
                onShowAuth={(isSignUp) =>
                  navigate(isSignUp ? "/signup" : "/signin")
                }
              />
            }
          />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/start" element={<Start />} />
          <Route
            path="/past"
            element={
              session ? <PastContests /> : <Navigate to="/signin" replace />
            }
          />
          <Route
            path="/contests"
            element={
              session && isOrganizer ? (
                <Contests />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/contests/:id" element={<ContestDetails />} />
          <Route path="/l/:id" element={<PublicLeaderboard />} />
          <Route
            path="/build"
            element={
              session && isOrganizer ? (
                <BuildLeaderboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/build/:id"
            element={
              session && isOrganizer ? (
                <BuildLeaderboard />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              session && isOrganizer ? (
                <AdminPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </main>

      {showFooter && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-center">
              <nav
                className={`grid ${
                  isOrganizer
                    ? "grid-cols-7 w-[700px]"
                    : "grid-cols-4 w-[400px]"
                } gap-1`}
              >
                <Link
                  to="/"
                  className={`flex flex-col items-center justify-center py-3 px-4 rounded-lg transition-all duration-300 group ${
                    currentPage === "home"
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Home className="h-6 w-6 mb-1 transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-xs font-medium">Home</span>
                </Link>

                <Link
                  to="/past"
                  className={`flex flex-col items-center justify-center py-3 px-4 rounded-lg transition-all duration-300 group ${
                    currentPage === "past"
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <History className="h-6 w-6 mb-1 transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-xs font-medium">Past</span>
                </Link>

                {isOrganizer && (
                  <>
                    <Link
                      to="/contests"
                      className={`flex flex-col items-center justify-center py-3 px-4 rounded-lg transition-all duration-300 group ${
                        currentPage === "contests"
                          ? "text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <ListTodo className="h-6 w-6 mb-1 transition-transform duration-300 group-hover:scale-110" />
                      <span className="text-xs font-medium">Manage</span>
                    </Link>

                    <Link
                      to="/build"
                      className={`flex flex-col items-center justify-center py-3 px-4 rounded-lg transition-all duration-300 group ${
                        currentPage === "build"
                          ? "text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Plus className="h-6 w-6 mb-1 transition-transform duration-300 group-hover:scale-110" />
                      <span className="text-xs font-medium">Create</span>
                    </Link>

                    <Link
                      to="/admin"
                      className={`flex flex-col items-center justify-center py-3 px-4 rounded-lg transition-all duration-300 group ${
                        currentPage === "admin"
                          ? "text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Settings2 className="h-6 w-6 mb-1 transition-transform duration-300 group-hover:scale-110" />
                      <span className="text-xs font-medium">Admin</span>
                    </Link>
                  </>
                )}

                <div className="flex flex-col items-center justify-center py-3 px-4 rounded-lg text-white/60">
                  <User
                    className={`h-6 w-6 mb-1 ${getRoleColor(
                      profile?.role || "user"
                    )}`}
                  />
                  <span
                    className={`text-xs font-medium capitalize ${getRoleColor(
                      profile?.role || "user"
                    )}`}
                  >
                    {profile?.role || "User"}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex flex-col items-center justify-center py-3 px-4 rounded-lg transition-all duration-300 text-white/60 hover:text-white group"
                >
                  <LogOut className="h-6 w-6 mb-1 transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-xs font-medium">Sign Out</span>
                </button>
              </nav>
            </div>
          </div>
        </footer>
      )}

      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;
