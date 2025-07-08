import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export function Profile() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

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
      // The profile will be updated automatically through the auth context
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'organizer':
        return {
          label: 'Organizer',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          borderColor: 'border-yellow-400/20',
          icon: Crown,
          description: 'Can create and manage contests'
        };
      case 'admin':
        return {
          label: 'Administrator',
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/20',
          icon: Shield,
          description: 'Full system access'
        };
      default:
        return {
          label: 'User',
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Profile</h1>
          <p className="text-white/60">Manage your account settings</p>
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
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8 space-y-6">
            {/* Account Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Information
              </h3>
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  <Mail className="h-5 w-5 text-white/60" />
                  <div>
                    <p className="text-sm text-white/60">Email Address</p>
                    <p className="text-white font-medium">{profile.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  <Calendar className="h-5 w-5 text-white/60" />
                  <div>
                    <p className="text-sm text-white/60">Member Since</p>
                    <p className="text-white font-medium">
                      {profile.created_at ? formatDate(profile.created_at) : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  <RoleIcon className={`h-5 w-5 ${roleInfo.color}`} />
                  <div>
                    <p className="text-sm text-white/60">Account Type</p>
                    <p className={`font-medium ${roleInfo.color}`}>{roleInfo.label}</p>
                    <p className="text-xs text-white/40 mt-1">{roleInfo.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Section (placeholder for future features) */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Activity Stats
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                  <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-white/60">Contests Joined</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                  <Trophy className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-white/60">Wins</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                  <Crown className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-white/60">Points</p>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="pt-6 border-t border-white/10">
              <button
                onClick={handleSignOut}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all duration-200 text-red-400 hover:text-red-300 group"
              >
                <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}