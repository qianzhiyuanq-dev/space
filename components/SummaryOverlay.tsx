
import React, { useEffect, useState } from 'react';
import { GameStats, SkinId } from '../types';
import { getGameSummaryLore } from '../services/geminiService';

interface SummaryOverlayProps {
  stats: GameStats;
  onRestart: () => void;
  onOpenTalents: () => void;
  skin?: SkinId;
}

const SummaryOverlay: React.FC<SummaryOverlayProps> = ({ stats, onRestart, onOpenTalents, skin }) => {
  const [lore, setLore] = useState<string>("正在分析战斗数据...");
  const [loading, setLoading] = useState(true);
  const isSpring = skin === 'SPRING_FESTIVAL';
  const isLgbt = skin === 'LGBT';

  useEffect(() => {
    const fetchLore = async () => {
      const result = await getGameSummaryLore(stats);
      setLore(result);
      setLoading(false);
    };
    fetchLore();
  }, [stats]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
      <div className={`max-w-md w-full mx-4 p-8 border rounded-3xl shadow-2xl transition-all duration-1000 ${
        isSpring ? 'bg-red-950 border-amber-900/50' : 
        isLgbt ? 'bg-purple-950 border-pink-500/30 shadow-pink-500/20' : 
        'bg-gray-900 border-gray-800'
      }`}>
        <h2 className={`text-4xl font-extrabold mb-6 text-center tracking-tight ${
          isSpring ? 'text-amber-400' : 
          isLgbt ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400' : 
          'text-white'
        }`}>
          {isSpring ? '守岁结章' : isLgbt ? '爱与胜利' : '系统故障'}
        </h2>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard label="本次收集" value={stats.fragmentsCollected} color={isSpring ? "text-amber-400" : isLgbt ? "text-pink-300" : "text-amber-400"} isSpring={isSpring} isLgbt={isLgbt} />
          <StatCard label="核心收集" value={stats.coresCollected} color={isSpring ? "text-yellow-200" : isLgbt ? "text-indigo-200" : "text-purple-400"} isSpring={isSpring} isLgbt={isLgbt} />
          <StatCard label="击毁陨石" value={stats.meteoritesDestroyed} color={isSpring ? "text-red-500" : isLgbt ? "text-red-300" : "text-red-400"} isSpring={isSpring} isLgbt={isLgbt} />
          <StatCard label="发射子弹" value={stats.bulletsFired} color={isSpring ? "text-orange-400" : isLgbt ? "text-cyan-300" : "text-emerald-400"} isSpring={isSpring} isLgbt={isLgbt} />
        </div>

        <div className={`p-6 rounded-2xl border mb-8 min-h-[120px] flex flex-col justify-center ${
          isSpring ? 'bg-black/40 border-amber-900/30' : 
          isLgbt ? 'bg-black/40 border-pink-500/20' : 
          'bg-black/50 border-gray-800'
        }`}>
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">指挥官点评</h3>
          {loading ? (
            <div className="flex items-center space-x-2 text-gray-400 italic text-sm">
               <div className={`w-2 h-2 rounded-full animate-bounce ${isSpring ? 'bg-red-600' : isLgbt ? 'bg-pink-500' : 'bg-gray-600'}`}></div>
               <div className={`w-2 h-2 rounded-full animate-bounce delay-100 ${isSpring ? 'bg-red-600' : isLgbt ? 'bg-pink-500' : 'bg-gray-600'}`}></div>
               <span>正在解码传输信号...</span>
            </div>
          ) : (
            <p className={`italic leading-relaxed text-lg ${isSpring ? 'text-amber-200/90' : isLgbt ? 'text-pink-100/90' : 'text-gray-300'}`}>"{lore}"</p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            className={`w-full py-4 px-6 font-bold rounded-2xl transition-all active:scale-95 shadow-xl ${
              isSpring ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-red-950 hover:from-amber-400' : 
              isLgbt ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:opacity-90' : 
              'bg-white text-black hover:bg-gray-200'
            }`}
          >
            {isSpring ? '再次开启新春守卫' : isLgbt ? '开启新的彩虹征程' : '重新启动防御协议'}
          </button>
          <button
            onClick={onOpenTalents}
            className={`w-full py-4 px-6 font-bold rounded-2xl border transition-all active:scale-95 ${
              isSpring ? 'bg-red-900/30 border-amber-900/50 text-amber-500 hover:bg-red-900/50' : 
              isLgbt ? 'bg-purple-900/30 border-pink-500/30 text-pink-400 hover:bg-purple-900/50' : 
              'bg-gray-800 text-white border-gray-700 hover:bg-gray-700'
            }`}
          >
            进入研发中心 (升级)
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, isSpring, isLgbt }: { label: string; value: number; color: string, isSpring: boolean, isLgbt: boolean }) => (
  <div className={`p-4 rounded-2xl border ${
    isSpring ? 'bg-red-900/20 border-amber-900/30' : 
    isLgbt ? 'bg-purple-900/20 border-pink-500/10' : 
    'bg-gray-800/50 border-gray-700/50'
  }`}>
    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">{label}</div>
    <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
  </div>
);

export default SummaryOverlay;
