
import React, { useEffect, useState } from 'react';

interface OpeningAnimationProps {
  onComplete: () => void;
}

const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);
  const messages = [
    "INITIALIZING DEFENSE PROTOCOL...",
    "SCANNING SECTOR 7-G...",
    "SYNCING TURRET SYSTEMS...",
    "ENERGY CORE: STABLE",
    "TARGETING HUD: ACTIVE",
    "READY TO ENGAGE"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStage(prev => {
        if (prev >= messages.length - 1) {
          clearInterval(timer);
          setTimeout(onComplete, 200);
          return prev;
        }
        return prev + 1;
      });
    }, 80); // 速度提升至 80ms

    return () => clearInterval(timer);
  }, [onComplete, messages.length]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_center,_#3b82f6_0%,_transparent_70%)] animate-pulse" />
      
      <div className="w-full max-w-lg space-y-4">
        <div className="w-full h-1 bg-slate-900 overflow-hidden rounded-full mb-8">
          <div 
            className="h-full bg-sky-500 transition-all duration-300 shadow-[0_0_10px_#0ea5e9]"
            style={{ width: `${(stage / (messages.length - 1)) * 100}%` }}
          />
        </div>

        <div className="font-mono text-xs tracking-widest space-y-1">
          {messages.map((msg, idx) => (
            <div 
              key={idx}
              className={`transition-all duration-200 flex items-center gap-4 ${idx <= stage ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}
            >
              <span className={idx <= stage ? 'text-sky-400 animate-pulse' : 'text-slate-600'}>
                {idx < stage ? '[ OK ]' : idx === stage ? '[ .. ]' : '[    ]'}
              </span>
              <span className={idx === stage ? 'text-white font-bold' : 'text-slate-500'}>
                {msg}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
    </div>
  );
};

export default OpeningAnimation;
