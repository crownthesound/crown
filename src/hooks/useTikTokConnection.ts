import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export const useTikTokConnection = () => {
  const { session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tikTokProfile, setTikTokProfile] = useState<any>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(0);

  // Get backend URL from environment or default
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  // Debounce interval (5 seconds)
  const DEBOUNCE_INTERVAL = 5000;

  useEffect(() => {
    if (!session) {
      setIsConnected(false);
      setIsLoading(false);
      setTikTokProfile(null);
      return;
    }

    // Only check if enough time has passed since last check
    const now = Date.now();
    if (now - lastCheckTime > DEBOUNCE_INTERVAL) {
      checkTikTokConnection();
    } else {
      // Use cached state, don't make new API call
      setIsLoading(false);
    }
  }, [session]);

  const checkTikTokConnection = async (force = false) => {
    if (!session) return;

    // Debounce: only check if forced or enough time has passed
    const now = Date.now();
    if (!force && now - lastCheckTime < DEBOUNCE_INTERVAL) {
      console.log("🔄 Skipping TikTok connection check (debounced)");
      return;
    }

    setIsLoading(true);
    setLastCheckTime(now);
    
    try {
      console.log("🔍 Checking TikTok connection for user:", session.user.id);
      const { data, error } = await supabase
        .from("tiktok_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no row exists

      console.log("🔍 TikTok profile query result:", { data, error });

      if (error) {
        console.error("❌ TikTok profile query error:", error);
        throw error;
      }

      const connected = !!data;
      console.log("🔍 TikTok connection status:", connected);
      setIsConnected(connected);
      setTikTokProfile(data);
    } catch (error) {
      console.error("Error checking TikTok connection:", error);
      setIsConnected(false);
      setTikTokProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConnection = () => {
    checkTikTokConnection(true); // Force check on manual refresh
  };

  const connectWithVideoPermissions = async () => {
    if (!session) return;

    setIsReconnecting(true);
    try {
      // First, initiate the TikTok auth flow with emphasis on video permissions
      const response = await fetch(
        `${backendUrl}/api/v1/tiktok/auth/initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            force_account_selection: true,
            emphasize_video_permissions: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to initiate TikTok connection");
      }

      const data = await response.json();

      // Open the TikTok auth URL in a new window
      const authWindow = window.open(
        data.auth_url,
        "tiktok-auth",
        "width=600,height=700"
      );

      // Poll for window closure
      const checkWindow = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkWindow);
          refreshConnection();
          setIsReconnecting(false);
        }
      }, 500);
    } catch (error) {
      console.error("Error connecting to TikTok:", error);
      setIsReconnecting(false);
    }
  };

  const disconnectTikTok = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      console.log("🔌 Disconnecting TikTok account...");

      const response = await fetch(
        `${backendUrl}/api/v1/tiktok/profile/disconnect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to disconnect TikTok account");
      }

      console.log("✅ TikTok account disconnected successfully");

      // Update local state
      setIsConnected(false);
      setTikTokProfile(null);

      return true;
    } catch (error) {
      console.error("Error disconnecting TikTok:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    isLoading,
    tikTokProfile,
    refreshConnection,
    connectWithVideoPermissions,
    disconnectTikTok,
    isReconnecting,
  };
};
