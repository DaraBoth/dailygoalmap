import React from "react";

const LogoAvatar: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return (
    <div
      className="rounded-full overflow-hidden border border-gray-300 dark:border-gray-700"
      style={{ width: size, height: size }}
    >
      <img
        src="/logo/logo.png"
        alt="Logo"
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default LogoAvatar;
