import React, { useState } from "react";
import { X, Zap, AlertCircle, CheckCircle, Settings } from "lucide-react";
import { useTikTokConnection } from "../hooks/useTikTokConnection";
import toast from "react-hot-toast";

interface TikTokSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TikTokSettingsModal({
  isOpen,
  onClose,
}: TikTokSettingsModalProps) {
  const {
    isConnected,
    tikTokProfile,
    disconnectTikTok,
    connectWithVideoPermissions,
    isLoading,
    isReconnecting,
  } = useTikTokConnection();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  console.log("🔍 TikTokSettingsModal render - isOpen:", isOpen);

  if (!isOpen) return null;

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectTikTok();
      toast.success("TikTok account disconnected successfully!");
    } catch (error) {
      console.error("Error disconnecting TikTok:", error);
      toast.error("Failed to disconnect TikTok account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleReconnect = async () => {
    try {
      await connectWithVideoPermissions();
      toast.success("Reconnecting to TikTok...");
    } catch (error) {
      console.error("Error reconnecting TikTok:", error);
      toast.error("Failed to reconnect TikTok account");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              TikTok Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              <div>
                <h3 className="font-medium text-white">Connection Status</h3>
                <p className="text-sm text-white/60">
                  {isConnected ? "Connected" : "Not Connected"}
                </p>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isConnected
                  ? "bg-green-400/20 text-green-400"
                  : "bg-red-400/20 text-red-400"
              }`}
            >
              {isConnected ? "Active" : "Inactive"}
            </div>
          </div>

          {/* Profile Info */}
          {isConnected && tikTokProfile && (
            <div className="p-4 bg-black/20 rounded-lg border border-white/10">
              <h3 className="font-medium text-white mb-2">Account Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Username:</span>
                  <span className="text-white">
                    @{tikTokProfile.username || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Display Name:</span>
                  <span className="text-white">
                    {tikTokProfile.display_name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Connected:</span>
                  <span className="text-white">
                    {tikTokProfile.created_at
                      ? new Date(tikTokProfile.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {isConnected ? (
              <>
                <button
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isReconnecting ? "Reconnecting..." : "Reconnect Account"}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="w-full px-4 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDisconnecting ? "Disconnecting..." : "Disconnect Account"}
                </button>
              </>
            ) : (
              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {isReconnecting ? "Connecting..." : "Connect TikTok Account"}
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-400 font-medium mb-1">Need Help?</p>
                <p className="text-blue-300/80">
                  {isConnected
                    ? "If you're having issues with video loading, try reconnecting your account with fresh permissions."
                    : "Connect your TikTok account to participate in contests and submit your videos."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
