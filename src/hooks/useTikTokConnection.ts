import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface TikTokAccount {
  id: string;
  tiktok_user_id: string;
  username: string;
  display_name: string;
  account_name: string;
  avatar_url: string;
  is_primary: boolean;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
  is_verified: boolean;
  created_at: string;
}

export const useTikTokConnection = () => {
  const { session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tikTokAccounts, setTikTokAccounts] = useState<TikTokAccount[]>([]);
  const [primaryAccount, setPrimaryAccount] = useState<TikTokAccount | null>(null);
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
      setTikTokAccounts([]);
      setPrimaryAccount(null);
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
      return;
    }

    setIsLoading(true);
    setLastCheckTime(now);
    
    try {
      // Check if we have a valid session and user
      if (!session.user?.id) {
        setIsConnected(false);
        setTikTokAccounts([]);
        setPrimaryAccount(null);
        return;
      }

      // Use the new backend API to get all TikTok accounts
      const response = await fetch(`${backendUrl}/api/v1/tiktok/accounts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const accounts = result.data?.accounts || [];
      const connected = accounts.length > 0;
      const primary = accounts.find((account: TikTokAccount) => account.is_primary) || accounts[0] || null;

      setIsConnected(connected);
      setTikTokAccounts(accounts);
      setPrimaryAccount(primary);
    } catch (error) {
      // On network errors, don't change the current state to avoid flickering
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network connectivity issue, keep current state
      } else {
        // For other errors, reset to disconnected state
        setIsConnected(false);
        setTikTokAccounts([]);
        setPrimaryAccount(null);
      }
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

  const setPrimaryAccount = async (accountId: string) => {
    if (!session) return false;

    try {

      const response = await fetch(
        `${backendUrl}/api/v1/tiktok/accounts/set-primary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ accountId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to set primary TikTok account");
      }


      // Refresh the accounts list
      await checkTikTokConnection(true);
      return true;
    } catch (error) {
      console.error("Error setting primary TikTok account:", error);
      throw error;
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!session) return false;

    try {

      const response = await fetch(
        `${backendUrl}/api/v1/tiktok/accounts/${accountId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete TikTok account");
      }


      // Refresh the accounts list
      await checkTikTokConnection(true);
      return true;
    } catch (error) {
      console.error("Error deleting TikTok account:", error);
      throw error;
    }
  };

  const disconnectAllAccounts = async () => {
    if (!session) return false;

    setIsLoading(true);
    try {

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
        throw new Error("Failed to disconnect TikTok accounts");
      }


      // Update local state
      setIsConnected(false);
      setTikTokAccounts([]);
      setPrimaryAccount(null);

      return true;
    } catch (error) {
      console.error("Error disconnecting TikTok accounts:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    isLoading,
    tikTokAccounts,
    primaryAccount,
    refreshConnection,
    connectWithVideoPermissions,
    setPrimaryAccount,
    deleteAccount,
    disconnectAllAccounts,
    isReconnecting,
    // Legacy compatibility - return primary account as tikTokProfile
    tikTokProfile: primaryAccount,
  };
};
