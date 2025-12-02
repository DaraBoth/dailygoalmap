import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react"; // Import an offline icon

export function OfflinePopup() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center space-x-2">
      <WifiOff className="h-5 w-5" /> {/* Add the offline icon */}
      <span>You are offline.</span>
    </div>
  );
}

export default OfflinePopup;
