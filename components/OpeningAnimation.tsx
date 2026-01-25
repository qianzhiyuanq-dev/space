
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SkinId } from '../types';

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
}

interface OpeningAnimationProps {
  onComplete: () => void;
  skin: SkinId;
}

const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete, skin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const isSpring = skin === 'SPRING_FESTIVAL';
  const isLgbt = skin === 'LGBT';

  const theme = useMemo(() => {
    if (isSpring) {
      return {
        starColor: '#fbbf24',
        glowColor: 'rgba(153, 27, 27, 0.4)',
        messages: ["祥云系统点火...", "载入守岁协议...", "瑞气能量同步...", "驱年信标激活!", "核心防御就绪!"],
        primary: "text-amber-400",
        accent: "bg-amber-500"
      };
    } else if (isLgbt) {
      return {
        starColor: '#fff',
        glowColor: 'rgba(168, 85, 247, 0.4)',
        messages: ["多彩频谱扫描...", "自由意志核心...", "包容力场展开...", "骄傲之光充能!", "爱即是盾，出发!"],
        primary: "text-pink-400",
        accent: "bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-400 to-purple-500"
      };
    } else {
      return {
        starColor: '#fff',
        glowColor: 'rgba(56, 189, 248, 0.4)',
        messages: ["系统初始化...", "同步防御矩阵...", "空间跳跃准备...", "推进器全开!", "战斗状态确认!"],
        primary: "text-sky-400",
        accent: "bg-sky-500"
      };
    }
  }, [isSpring, isLgbt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const stars: Star[] = Array.from({ length: 800 }, () => ({
      x: Math.random() * width - width / 2,
      y: Math.random() * height - height / 2,
      z: Math.random() * width,
      px: 0,
      py: 0
    }));

    let animationFrame: number;
    let speed = 2;
    let currentProgress = 0;

    const animate = () => {
      ctx.fillStyle = isSpring ? '#1a0b0b' : (isLgbt ? '#0a0510' : '#000');
      ctx.fillRect(0, 0, width, height);
      
      // 动态速度曲线
      if (currentProgress < 0.2) speed = 1.5;
      else if (currentProgress < 0.8) speed = 1.5 + (currentProgress - 0.2) * 60; // 跃迁加速
      else speed = 40 - (currentProgress - 0.8) * 150; // 冲出后的减速

      ctx.save();
      ctx.translate(width / 2, height / 2);

      stars.forEach((s, i) => {
        s.z -= speed;
        if (s.z <= 0) {
          s.z = width;
          s.x = Math.random() * width - width / 2;
          s.y = Math.random() * height - height / 2;
          s.px = 0; s.py = 0;
        }

        const sx = s.x * (width / s.z);
        const sy = s.y * (width / s.z);
        const size = (1 - s.z / width) * 3;

        if (s.px !== 0) {
          ctx.beginPath();
          if (isLgbt) {
            ctx.strokeStyle = `hsla(${(i * 10 + currentProgress * 500) % 360}, 80%, 70%, ${1 - s.z / width})`;
          } else {
            ctx.strokeStyle = theme.starColor;
            ctx.globalAlpha = 1 - s.z / width;
          }
          
          ctx.lineWidth = size;
          ctx.moveTo(sx, sy);
          ctx.lineTo(s.px, s.py);
          ctx.stroke();
        }

        s.px = sx;
        s.py = sy;
      });
      ctx.restore();

      // 屏幕震动
      if (currentProgress > 0.4 && currentProgress < 0.85) {
        const shake = (currentProgress - 0.4) * 10;
        canvas.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`;
      } else {
        canvas.style.transform = 'none';
      }

      animationFrame = requestAnimationFrame(animate);
    };

    const progressTimer = setInterval(() => {
      currentProgress += 0.01;
      setProgress(currentProgress);
      
      const stageIdx = Math.floor(currentProgress * theme.messages.length);
      setStage(Math.min(stageIdx, theme.messages.length - 1));

      if (currentProgress >= 1) {
        clearInterval(progressTimer);
        setTimeout(onComplete, 500);
      }
    }, 30);

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(progressTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [onComplete, theme, isSpring, isLgbt]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden font-mono">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* 渐变遮罩增强空间感 */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${progress > 0.5 ? 'opacity-40' : 'opacity-20'} ${
        isSpring ? 'bg-gradient-to-t from-red-900/50 to-transparent' : 
        isLgbt ? 'bg-gradient-to-t from-purple-900/50 to-transparent' : 
        'bg-gradient-to-t from-sky-900/50 to-transparent'
      }`} />

      {/* HUD 系统文字 */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-lg">
        <div className="flex flex-col items-center">
            <div className={`text-[10px] uppercase tracking-[0.5em] mb-4 opacity-50 ${theme.primary}`}>
                Hyper-Space Sequence
            </div>
            <div className={`text-2xl font-black italic tracking-wider transition-all duration-300 ${theme.primary} drop-shadow-lg`}>
                {theme.messages[stage]}
            </div>
        </div>

        {/* 极简进度条 */}
        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
            <div 
                className={`h-full transition-all duration-100 ease-linear ${theme.accent}`}
                style={{ width: `${progress * 100}%` }}
            />
        </div>

        {/* 侧边装饰 HUD */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-20 flex flex-col gap-1 opacity-20 hidden md:flex">
            {Array.from({length: 12}).map((_, i) => (
                <div key={i} className={`h-4 w-1 ${i <= stage * 2 ? theme.accent : 'bg-white/20'}`} />
            ))}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-20 flex flex-col gap-1 opacity-20 hidden md:flex text-[8px] text-white">
            <span>VELOCITY: {(progress * 299792).toFixed(0)} KM/S</span>
            <span>ALT: {(progress * 149).toFixed(1)} AU</span>
            <span>FUEL: {(100 - progress * 15).toFixed(1)}%</span>
        </div>
      </div>

      {/* 跃迁白光爆发特效 */}
      {progress > 0.9 && (
        <div 
          className="absolute inset-0 bg-white z-[110] transition-opacity duration-500" 
          style={{ opacity: (progress - 0.9) * 10 }}
        />
      )}
    </div>
  );
};

export default OpeningAnimation;
