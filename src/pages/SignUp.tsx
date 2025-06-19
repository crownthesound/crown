import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Footer } from '../components/Footer';

export function SignUp() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validatePassword(password)) {
        throw new Error('Password must be at least 6 characters long');
      }

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw signUpError;
      }

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              full_name: fullName,
              role: 'user',
            },
          ]);

        if (profileError) {
          throw new Error('Failed to create user profile. Please try again.');
        }
      }

      toast.success('Sign up successful! You can now sign in.');
      navigate('/signin');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#2A2A2A] flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 w-full">
        <Link to="/" className="flex items-center gap-3">
          <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">Crown</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-white/60 mb-8">Join our community and start competing</p>

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                required
              />
            </div>

            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                required
                minLength={6}
              />
              <p className="text-xs text-white/40 mt-2">
                Password must be at least 6 characters long
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5 mx-auto" />
              ) : (
                'Create Account'
              )}
            </button>

            <p className="text-sm text-white/60 text-center">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-white hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-white hover:underline">Privacy Policy</Link>
            </p>
          </form>

          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 text-sm text-white/40 bg-[#0A0A0A]">OR</span>
              </div>
            </div>

            <Link
              to="/signin"
              className="mt-6 w-full inline-block py-3 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors"
            >
              Sign In Instead
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}