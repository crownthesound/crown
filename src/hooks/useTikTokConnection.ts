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
  const [primaryAccount, setPrimaryAccountState] = useState<TikTokAccount | null>(null);
  const [activeSessionAccount, setActiveSessionAccount] = useState<TikTokAccount | null>(null);
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
      setPrimaryAccountState(null);
      setActiveSessionAccount(null);
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
      
      // Find explicitly marked primary account, warn if multiple or none found
      const primaryAccounts = accounts.filter((account: TikTokAccount) => account.is_primary);
      
      if (primaryAccounts.length > 1) {
        console.warn("Multiple primary TikTok accounts found, using first one:", primaryAccounts);
      }
      
      let primary = primaryAccounts[0] || null;
      
      // If no primary account is found but accounts exist, warn and use first account
      if (!primary && accounts.length > 0) {
        console.warn("No primary TikTok account found, defaulting to first account:", accounts[0]);
        primary = accounts[0];
      }

      setIsConnected(connected);
      setTikTokAccounts(accounts);
      setPrimaryAccountState(primary);
    } catch (error) {
      // On network errors, don't change the current state to avoid flickering
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network connectivity issue, keep current state
      } else {
        // For other errors, reset to disconnected state
        setIsConnected(false);
        setTikTokAccounts([]);
        setPrimaryAccountState(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConnection = () => {
    // Clear cache and force a fresh check
    setLastCheckTime(0);
    checkTikTokConnection(true); // Force check on manual refresh
  };

  const connectWithVideoPermissions = async () => {
    if (!session) return;

    // Prevent multiple simultaneous connection attempts
    if (isReconnecting) {
      console.warn("TikTok connection already in progress");
      return;
    }

    setIsReconnecting(true);
    try {
      // Clear any cached connection state to ensure fresh check
      setLastCheckTime(0);
      
      // Use the working session clearing approach from TikTokConnectModal
      // Step 1: Clear local storage
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.toLowerCase().includes("tiktok")) {
            localStorage.removeItem(key);
          }
        });
        localStorage.removeItem("tiktok_access_token");
      } catch (e) {
        console.log("Could not clear local storage:", e);
      }

      console.log("Opening TikTok logout for session clearing...");

      // Step 2: Open TikTok logout in a popup window
      const logoutPopup = window.open(
        "https://www.tiktok.com/logout",
        "tiktok_logout",
        "width=600,height=600,scrollbars=yes,resizable=yes"
      );

      if (!logoutPopup) {
        throw new Error("Failed to open logout window. Please check if popups are blocked.");
      }

      // Step 3: Wait for logout popup to close
      const checkLogoutClosed = setInterval(() => {
        if (logoutPopup.closed) {
          clearInterval(checkLogoutClosed);
          console.log("TikTok logout completed! Proceeding with OAuth...");

          // Step 4: Open OAuth popup after logout
          const authUrl = `${backendUrl}/api/v1/tiktok/auth?token=${session.access_token}`;
          const authPopup = window.open(
            authUrl,
            "tiktok_auth",
            "width=600,height=700,scrollbars=yes,resizable=yes"
          );

          if (authPopup) {
            // Monitor the auth popup
            const checkAuthClosed = setInterval(() => {
              if (authPopup.closed) {
                clearInterval(checkAuthClosed);
                console.log("TikTok OAuth completed!");
                // Add a small delay to ensure backend processing is complete
                setTimeout(() => {
                  refreshConnection();
                  setIsReconnecting(false);
                }, 1000);
              }
            }, 1000);

            // Auto-close auth popup after 5 minutes
            setTimeout(() => {
              if (!authPopup.closed) {
                authPopup.close();
                clearInterval(checkAuthClosed);
                console.warn("TikTok authentication timed out");
                setIsReconnecting(false);
              }
            }, 300000);
          } else {
            throw new Error("Failed to open authentication window. Please check if popups are blocked.");
          }
        }
      }, 1000);

      // Auto-close logout popup and proceed after 10 seconds (like in working implementation)
      setTimeout(() => {
        if (!logoutPopup.closed) {
          logoutPopup.close();
          clearInterval(checkLogoutClosed);
          console.log("Logout timeout reached, proceeding with OAuth...");

          // Proceed with OAuth after logout timeout
          const authUrl = `${backendUrl}/api/v1/tiktok/auth?token=${session.access_token}`;
          const authPopup = window.open(
            authUrl,
            "tiktok_auth",
            "width=600,height=700,scrollbars=yes,resizable=yes"
          );

          if (authPopup) {
            // Monitor the auth popup
            const checkAuthClosed = setInterval(() => {
              if (authPopup.closed) {
                clearInterval(checkAuthClosed);
                console.log("TikTok OAuth completed!");
                // Add a small delay to ensure backend processing is complete
                setTimeout(() => {
                  refreshConnection();
                  setIsReconnecting(false);
                }, 1000);
              }
            }, 1000);

            // Auto-close auth popup after 5 minutes
            setTimeout(() => {
              if (!authPopup.closed) {
                authPopup.close();
                clearInterval(checkAuthClosed);
                console.warn("TikTok authentication timed out");
                setIsReconnecting(false);
              }
            }, 300000);
          } else {
            throw new Error("Failed to open authentication window. Please check if popups are blocked.");
          }
        }
      }, 10000); // 10 second timeout like in working implementation
      
    } catch (error: any) {
      console.error("Error connecting to TikTok:", error);
      setIsReconnecting(false);
      
      // Re-throw with more specific error message for UI handling
      throw new Error(error.message || "Failed to connect TikTok account");
    }
  };

  const setPrimaryAccount = async (accountId: string) => {
    if (!session) return false;

    try {
      // Step 1: Set the account as primary in the backend
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
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to set primary TikTok account");
      }

      // Step 2: Establish TikTok session with the selected account
      try {
        await establishTikTokSession(accountId);
        console.log("✅ TikTok session established successfully");
      } catch (sessionError) {
        console.warn("⚠️ Could not establish TikTok session:", sessionError);
        // Still proceed but session might not work for video access
      }

      // Step 3: Refresh the accounts list to get the updated state
      await checkTikTokConnection(true);
      return true;
    } catch (error) {
      console.error("Error setting primary TikTok account:", error);
      throw error;
    }
  };

  const validateAccountSession = async (accountId: string) => {
    if (!session) return null;

    try {
      const response = await fetch(
        `${backendUrl}/api/v1/tiktok/accounts/${accountId}/validate`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to validate TikTok session for account:", accountId);
        return null;
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error validating TikTok account session:", error);
      return null;
    }
  };

  const establishTikTokSession = async (accountId: string) => {
    if (!session) return null;

    try {
      const response = await fetch(
        `${backendUrl}/api/v1/tiktok/accounts/${accountId}/establish-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to establish TikTok session");
      }

      const data = await response.json();
      
      // Update the active session account
      const account = tikTokAccounts.find(acc => acc.id === accountId);
      if (account) {
        setActiveSessionAccount(account);
        console.log("✅ TikTok session established for account:", account.username);
      }
      
      return data.data;
    } catch (error) {
      console.error("Error establishing TikTok session:", error);
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
      setPrimaryAccountState(null);

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
    activeSessionAccount,
    refreshConnection,
    connectWithVideoPermissions,
    setPrimaryAccount,
    validateAccountSession,
    establishTikTokSession,
    deleteAccount,
    disconnectAllAccounts,
    isReconnecting,
    // Legacy compatibility - return primary account as tikTokProfile, but prefer activeSessionAccount for video operations
    tikTokProfile: activeSessionAccount || primaryAccount,
  };
};
