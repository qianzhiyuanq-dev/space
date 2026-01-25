import React, { useState, useMemo } from 'react';
import { TALENT_NODES, talentService } from '../services/talentService';
import { TalentId, SkinId } from '../types';
import { 
  BULLET_DAMAGE, 
  BULLET_FIRE_COOLDOWN, 
  BULLET_SPEED, 
  METEORITE_SPAWN_INTERVAL,
  METEORITE_SPEED
} from '../constants';

interface TalentTreeProps {
  onBack: () => void;
  skin?: SkinId;
}

const TalentTree: React.FC<TalentTreeProps> = ({ onBack, skin }) => {
  const [state, setState] = useState(talentService.getState());
  const isSpring = skin === 'SPRING_FESTIVAL';
  const isLgbt = skin === 'LGBT';

  const handleUpgrade = (id: TalentId) => {
    if (talentService.upgradeTalent(id)) {
      setState(talentService.getState());
    }
  };

  const bonuses = useMemo(() => talentService.getBonuses(), [state]);

  const nodePositions: Record<TalentId, { x: number; y: number; icon: string; color: string }> = {
    cooldown: { x: 180, y: 150, icon: '⚡', color: '#0ea5e9' },
    bulletTrail: { x: 420, y: 150, icon: '🛰️', color: '#0ea5e9' },
    damage: { x: 180, y: 320, icon: '💥', color: '#ef4444' },
    spawnRate: { x: 180, y: 490, icon: '🧲', color: '#8b5cf6' },
    fragmentValue: { x: 420, y: 420, icon: '💎', color: '#fbbf24' },
    magnetRange: { x: 420, y: 560, icon: '🧲', color: '#38bdf8' },
  };

  const connections = useMemo(() => {
    return TALENT_NODES.filter(n => n.prerequisiteId).map(n => ({
      from: nodePositions[n.prerequisiteId!],
      to: nodePositions[n.id],
      isUnlocked: (state.levels[n.prerequisiteId!] || 0) > 0
    }));
  }, [state.levels]);

  const renderNode = (node: typeof TALENT_NODES[0]) => {
    const level = state.levels[node.id] || 0;
    const isMax = level >= node.maxLevel;
    const isUnlocked = level > 0;
    const isPrereqMet = node.prerequisiteId ? (state.levels[node.prerequisiteId] || 0) > 0 : true;
    const cost = node.costPerLevel * (level + 1);
    const canAfford = state.totalFragments >= cost;
    const pos = nodePositions[node.id];

    return (
      <div 
        key={node.id} 
        style={{ left: pos.x, top: pos.y }} 
        className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 flex flex-col items-center gap-3"
      >
        <div className={`
          absolute bottom-full mb-4 w-48 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30 border text-center translate-y-2 group-hover:translate-y-0
          ${isSpring ? 'bg-red-950/95 border-amber-900 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]' : 'bg-slate-900/95 border-slate-700 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]'}
        `}>
          <p className={`text-[10px] leading-relaxed font-medium ${isSpring ? 'text-amber-100' : 'text-slate-300'}`}>
            {node.description}
          </p>
          <div className={`absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45 border-r border-b ${isSpring ? 'bg-red-950 border-amber-900' : 'bg-slate-900 border-slate-700'}`} />
        </div>

        <div 
          onClick={() => isPrereqMet && !isMax && handleUpgrade(node.id)}
          className={`
            w-16 h-16 rounded-2xl flex items-center justify-center text-3xl cursor-pointer transition-all duration-300 border-2 backdrop-blur-md relative transform group-hover:scale-110
            ${!isPrereqMet ? 'bg-slate-900/30 border-slate-800 grayscale opacity-40 blur-[1px] cursor-not-allowed' : 
              isSpring ? 'bg-red-950/40 border-amber-900/50 hover:border-amber-400' : 'bg-slate-900/60 border-slate-700 hover:border-sky-400'}
            ${isUnlocked ? (isSpring ? 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'shadow-[0_0_15px_rgba(14,165,233,0.2)]') : ''}
            ${isMax ? (isSpring ? 'border-amber-400' : 'border-sky-400') : ''}
          `}
        >
          <span className={`${!isPrereqMet ? 'opacity-20' : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]'}`}>
            {pos.icon}
          </span>
          {isMax && (
            <div className={`absolute -inset-1 rounded-2xl border animate-pulse ${isSpring ? 'border-amber-400/30' : 'border-sky-400/30'}`} />
          )}
        </div>

        <div className="flex flex-col items-center pointer-events-none">
          <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSpring ? 'text-amber-500/80' : 'text-slate-400'}`}>
            {node.name}
          </div>
          <div className={`
            px-2 py-0.5 rounded-full text-[9px] font-mono font-bold whitespace-nowrap border
            ${isSpring ? 'bg-red-900/80 border-amber-600/50 text-amber-200' : 'bg-slate-900 border-slate-700 text-sky-400'}
            ${isMax ? (isSpring ? 'bg-amber-500 text-red-950 border-amber-400' : 'bg-sky-500 text-black border-sky-400') : ''}
          `}>
            {isMax ? 'MAX' : `${level} / ${node.maxLevel}`}
          </div>
          {!isMax && isPrereqMet && (
            <div className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${canAfford ? 'text-amber-400' : 'text-rose-500 opacity-60'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
              {cost}
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentStats = [
    { label: '子弹火力 (Dmg)', value: (BULLET_DAMAGE + bonuses.damageBoost).toFixed(0), bonus: `+${bonuses.damageBoost}`, unit: 'pt' },
    { label: '射击间隔 (CD)', value: ((BULLET_FIRE_COOLDOWN - bonuses.cooldownReduction) / 1000).toFixed(1), bonus: `-${(bonuses.cooldownReduction / 1000).toFixed(1)}`, unit: 's' },
    { label: '飞行初速 (Vel)', value: (BULLET_SPEED + bonuses.bulletSpeedBoost).toFixed(1), bonus: `+${bonuses.bulletSpeedBoost.toFixed(1)}`, unit: 'm/s' },
    { label: '引力信标 (Grav)', value: (1 + bonuses.spawnBoost).toFixed(1), bonus: `x${(1 + bonuses.spawnBoost).toFixed(1)}`, unit: 'x' },
    { label: '回收增幅 (Gain)', value: (4 + bonuses.fragmentBonus).toFixed(0), bonus: `+${bonuses.fragmentBonus}`, unit: 'qty' },
    { label: '磁力范围 (Mag)', value: (30 + bonuses.magnetRangeBoost).toFixed(0), bonus: `+${bonuses.magnetRangeBoost}`, unit: 'px' },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-start overflow-hidden ${isSpring ? 'bg-[#1a0b0b]' : 'bg-[#020617]'}`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="w-full h-20 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-10 z-50">
        <button onClick={onBack} className={`flex items-center gap-3 px-4 py-2 group transition-colors ${isSpring ? 'text-amber-500 hover:text-amber-400' : 'text-slate-400 hover:text-white'}`}>
          <span className="text-xl">←</span>
          <span className="font-bold uppercase tracking-[0.2em] text-[11px]">退出研发</span>
        </button>
        
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-3 border rounded-2xl px-5 py-2 transition-all ${isSpring ? 'bg-red-950/40 border-amber-900/50' : 'bg-black/40 border-white/5'}`}>
            <div className="text-[9px] uppercase font-bold text-slate-500">可用能量碎片</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
              <span className="text-lg font-mono font-black text-amber-400">{state.totalFragments.toLocaleString()}</span>
            </div>
          </div>
          <div className={`flex items-center gap-3 border rounded-2xl px-5 py-2 transition-all ${isSpring ? 'bg-red-950/40 border-amber-900/50' : 'bg-black/40 border-white/5'}`}>
            <div className="text-[9px] uppercase font-bold text-slate-500">陨石核心</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
              <span className="text-lg font-mono font-black text-purple-400">{state.totalCores.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-1 w-full flex items-center justify-center">
        <div className="relative w-full h-full max-w-6xl flex">
          {/* 天赋树左侧图表 */}
          <div className="relative flex-1 h-full">
            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-50">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {connections.map((conn, i) => (
                <line 
                  key={i} 
                  x1={conn.from.x} y1={conn.from.y} 
                  x2={conn.to.x} y2={conn.to.y} 
                  stroke={conn.isUnlocked ? (isSpring ? "#f59e0b" : "#0ea5e9") : "#1e293b"} 
                  strokeWidth={conn.isUnlocked ? "3" : "1"}
                  strokeDasharray={conn.isUnlocked ? "" : "4,4"}
                  filter={conn.isUnlocked ? "url(#glow)" : ""}
                />
              ))}
            </svg>
            {TALENT_NODES.map(node => renderNode(node))}
          </div>

          {/* 右侧规格面板 */}
          <div className="w-80 h-full py-10 pr-10 z-20 flex flex-col justify-center">
            <div className={`p-6 rounded-3xl border backdrop-blur-md shadow-2xl ${
              isSpring ? 'bg-red-950/40 border-amber-900/50' : isLgbt ? 'bg-purple-950/40 border-pink-500/30' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-center ${isSpring ? 'text-amber-500' : 'text-sky-400'}`}>
                系统属性监测 (System Specs)
              </h3>
              <div className="space-y-5">
                {currentStats.map((stat, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{stat.label}</span>
                      <span className={`text-[10px] font-mono font-bold ${isSpring ? 'text-amber-600' : 'text-sky-600'}`}>
                        {stat.bonus}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-mono font-black ${isSpring ? 'text-amber-100' : 'text-white'}`}>
                        {stat.value}
                      </span>
                      <span className="text-[9px] font-bold text-slate-600 uppercase">{stat.unit}</span>
                    </div>
                    <div className="w-full h-[2px] bg-slate-800/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${isSpring ? 'bg-amber-500' : 'bg-sky-500'}`} 
                        style={{ width: `${Math.min(100, (parseFloat(stat.value) / 20) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5">
                <div className={`text-[8px] leading-relaxed italic text-center ${isSpring ? 'text-amber-700' : 'text-slate-600'}`}>
                  * 参数基于当前已安装的核心模组实时计算，战斗中拾取的卡牌增益不计入此列表。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full py-2 px-10 border-t flex justify-between items-center text-[9px] font-bold tracking-widest uppercase ${isSpring ? 'bg-red-950/80 border-amber-900/30 text-amber-900' : 'bg-slate-950/80 border-white/5 text-slate-600'}`}>
        <span>Sentinel R&D Department</span>
        <span>Stats Analysis: Online</span>
      </div>
    </div>
  );
};

export default TalentTree;