import React from "react";

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      <div
        className="absolute inset-0 z-0 opacity-20 dark:opacity-14"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)
          `,
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse 75% 60% at 50% 35%, #000 65%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 60% at 50% 35%, #000 65%, transparent 100%)',
        }}
      />

      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[980px] h-[540px] bg-primary/8 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-30%] right-[-10%] w-[520px] h-[520px] bg-sky-400/8 dark:bg-sky-500/8 rounded-full blur-[100px] -z-10" />

      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none mix-blend-overlay z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default Background;
