
import React, { useState } from 'react';
import { Perk, PerkId, SkinId } from '../types';

const PERKS: Perk[] = [
  { id: 'extraBullets', name: '弹幕扩张', icon: '🏹', color: 'from-blue-500 to-cyan-400', description: '每次射击额外增加一发子弹' },
  { id: 'reduceCooldown', name: '急速冷却', icon: '⏱️', color: 'from-indigo-500 to-purple-400', description: '射击冷却时间减少 20%' },
  { id: 'increaseDamage', name: '高爆弹药', icon: '🧨', color: 'from-orange-500 to-red-400', description: '子弹基础伤害大幅提升' },
  { id: 'homing', name: '追踪导引', icon: '🎯', color: 'from-teal-500 to-emerald-400', description: '子弹将自动追踪附近的陨石' },
  { id: 'ice', name: '急冻核心', icon: '❄️', color: 'from-sky-300 to-blue-500', description: '子弹附带减速效果，冻结目标' },
  { id: 'fire', name: '熔岩焚烧', icon: '🔥', color: 'from-red-500 to-orange-600', description: '子弹附带燃烧效果，持续造成伤害' },
  { id: 'moreMeteorites', name: '陨石增幅', icon: '☄️', color: 'from-amber-600 to-yellow-400', description: '引力增强，提升陨石产出（危险！）' },
];

interface CardSelectionOverlayProps {
  onSelect: (perkId: PerkId) => void;
  ownedPerks: PerkId[];
  isSpring?: boolean;
  isLgbt?: boolean;
}

const CardSelectionOverlay: React.FC<CardSelectionOverlayProps> = ({ onSelect, ownedPerks, isSpring, isLgbt }) => {
  const [pendingId, setPendingId] = useState<PerkId | null>(null);

  const selectedPerks = React.useMemo(() => {
    const oneTime: PerkId[] = ['homing', 'ice', 'fire'];
    const filtered = PERKS.filter(p => !oneTime.includes(p.id) || !ownedPerks.includes(p.id));
    return [...filtered].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [ownedPerks]);

  const handleCardClick = (id: PerkId) => {
    if (pendingId === id) {
      // 如果已经选中，再次点击相当于确认（双击逻辑）
      onSelect(id);
    } else {
      setPendingId(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center max-w-5xl w-full px-4">
        <h2 className={`text-3xl font-black mb-2 tracking-[0.2em] uppercase transition-colors duration-500 ${
          isSpring ? 'text-amber-400' : isLgbt ? 'text-pink-400' : 'text-white'
        }`}>
          {isSpring ? '祥瑞加持 · 强化协议' : isLgbt ? '彩虹觉醒 · 强化协议' : '强化协议已就绪'}
        </h2>
        <p className="text-slate-400 mb-12 text-sm uppercase tracking-widest font-bold">
          {pendingId ? '请确认您的强化选择' : '请选择一项增益效果'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {selectedPerks.map((perk) => {
            const isPending = pendingId === perk.id;
            
            return (
              <div
                key={perk.id}
                className="relative flex flex-col"
              >
                <button
                  onClick={() => handleCardClick(perk.id)}
                  className={`group relative flex flex-col items-center p-8 border-2 rounded-3xl transition-all duration-300 h-full ${
                    isPending 
                      ? (isSpring ? 'bg-red-900/60 border-amber-400 scale-105 shadow-[0_0_30px_rgba(251,191,36,0.4)]' : 
                         isLgbt ? 'bg-purple-800/60 border-white scale-105 shadow-[0_0_30px_rgba(255,255,255,0.4)]' : 
                         'bg-slate-800 border-sky-400 scale-105 shadow-[0_0_30px_rgba(14,165,233,0.4)]')
                      : (isSpring ? 'bg-red-950/40 border-amber-900/50 hover:border-amber-700' : 
                         isLgbt ? 'bg-purple-900/40 border-pink-500/20 hover:border-pink-400' :
                         'bg-slate-900 border-slate-800 hover:border-slate-600')
                  }`}
                >
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${perk.color} flex items-center justify-center text-4xl mb-6 shadow-lg transition-transform ${isPending ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {perk.icon}
                  </div>
                  
                  <h3 className={`text-xl font-black mb-2 transition-colors uppercase ${
                    isPending 
                      ? (isSpring ? 'text-amber-400' : isLgbt ? 'text-white' : 'text-sky-400')
                      : (isSpring ? 'text-amber-200' : isLgbt ? 'text-pink-100' : 'text-white')
                  }`}>
                    {perk.name}
                  </h3>
                  
                  <p className={`text-sm leading-relaxed text-center font-medium transition-colors ${
                    isPending ? 'text-white' : 'text-slate-400'
                  }`}>
                    {perk.description}
                  </p>

                  {/* 装饰性呼吸灯效果 */}
                  {isPending && (
                    <div className={`absolute inset-0 rounded-3xl border-2 animate-pulse pointer-events-none ${
                      isSpring ? 'border-amber-400/50' : isLgbt ? 'border-white/50' : 'border-sky-400/50'
                    }`} />
                  )}
                </button>

                {/* 确认按钮：仅在选中时浮现 */}
                <div className={`mt-4 transition-all duration-300 flex flex-col items-center ${
                  isPending ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(perk.id);
                    }}
                    className={`w-full py-4 px-6 font-black rounded-2xl text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all ${
                      isSpring ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-red-950 hover:from-amber-300 shadow-amber-900/40' : 
                      isLgbt ? 'bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-400 to-purple-500 text-white shadow-purple-500/40' : 
                      'bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-sky-950/40'
                    }`}
                  >
                    确认选择
                  </button>
                  <span className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter animate-pulse">
                    再次点击卡牌亦可确认
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CardSelectionOverlay;
