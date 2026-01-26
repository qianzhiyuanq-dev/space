
import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import GameEngine from './components/GameEngine';
import SummaryOverlay from './components/SummaryOverlay';
import TalentTree from './components/TalentTree';
import OpeningAnimation from './components/OpeningAnimation';
import SettingsOverlay from './components/SettingsOverlay';
import BackgroundAtmosphere from './components/BackgroundAtmosphere';
import { GameStats, SkinId } from './types';
import { audioManager } from './services/audioService';
import { talentService } from './services/talentService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'START' | 'OPENING' | 'PLAYING' | 'GAMEOVER' | 'TALENTS'>('START');
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [skin, setSkin] = useState<SkinId>(talentService.getState().currentSkin);

  const isSpring = skin === 'SPRING_FESTIVAL';
  const isLgbt = skin === 'LGBT';

  const handleGameOver = (stats: GameStats) => {
    talentService.addCurrency(stats.fragmentsCollected, stats.coresCollected);
    setLastStats(stats);
    setGameState('GAMEOVER');
  };

  const handleStartSequence = () => {
    audioManager.init();
    setGameState('OPENING');
  };

  const startGame = () => {
    setGameState('PLAYING');
    setLastStats(null);
  };

  const toggleSkin = () => {
    let nextSkin: SkinId = 'DEFAULT';
    if (skin === 'DEFAULT') nextSkin = 'SPRING_FESTIVAL';
    else if (skin === 'SPRING_FESTIVAL') nextSkin = 'LGBT';
    else nextSkin = 'DEFAULT';
    
    setSkin(nextSkin);
    talentService.setSkin(nextSkin);
  };

  const handleResetSave = () => {
    talentService.resetState();
    window.location.reload();
  };

  const getThemeColor = () => {
    if (isSpring) return 'text-amber-500';
    if (isLgbt) return 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-400 to-purple-500';
    return 'text-white';
  };

  return (
    <div className={`w-screen h-screen overflow-hidden select-none transition-colors duration-1000 ${
      isSpring ? 'bg-[#1a0b0b]' : isLgbt ? 'bg-[#0a0510]' : 'bg-black'
    }`}>
      {/* 始终渲染背景层，游戏时降低一点亮度以突出战局 */}
      <div className={`transition-opacity duration-1000 ${gameState === 'PLAYING' ? 'opacity-60' : 'opacity-100'}`}>
        <BackgroundAtmosphere skin={skin} />
      </div>

      {showSettings && (
        <SettingsOverlay 
          onClose={() => setShowSettings(false)} 
          onResetSave={handleResetSave} 
        />
      )}

      {gameState === 'START' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
          <div className="absolute top-10 left-10 flex flex-col gap-2 z-50">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Armor Skin</span>
             <button 
                onClick={toggleSkin}
                className={`flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 shadow-2xl ${
                  isSpring ? 'bg-red-950/60 border-amber-500 text-amber-400 shadow-red-900/20' : 
                  isLgbt ? 'bg-purple-900/60 border-pink-400/50 text-pink-300 shadow-purple-900/20' : 
                  'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <div className="text-2xl transition-transform duration-500 transform group-hover:rotate-12">
                  {isSpring ? '🏮' : isLgbt ? '🏳️‍🌈' : '🛰️'}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                    {isSpring ? '新春限定' : isLgbt ? '多元宇宙' : '标准型号'}
                  </span>
                  <span className="text-[8px] font-bold opacity-50 uppercase tracking-tighter mt-1">
                    {isSpring ? 'Spring Festival' : isLgbt ? 'Rainbow Pride' : 'Default Armor'}
                  </span>
                </div>
              </button>
          </div>

          <div className="text-center max-w-lg relative z-10">
            <h1 className={`text-7xl font-black mb-2 tracking-tighter uppercase transition-all duration-1000 ${getThemeColor()} ${
              !isLgbt ? (isSpring ? 'drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : '') : 'drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'
            }`}>
              {isSpring ? '星际守岁' : isLgbt ? '彩虹哨兵' : '星际卫士'}
            </h1>
            <p className={`mb-8 text-lg font-light ${
              isSpring ? 'text-amber-600/80' : isLgbt ? 'text-pink-300/80' : 'text-gray-400'
            }`}>
              {isSpring ? '驱逐年兽陨石，守护寰宇安宁。' : isLgbt ? '每一种色彩都值得守护。' : '核心防区正受到威胁。誓死保卫核心。'}
            </p>
            
            <div className={`rounded-3xl p-8 mb-10 text-left transition-all duration-1000 border backdrop-blur-sm ${
              isSpring ? 'bg-red-950/40 border-amber-900/30' : 
              isLgbt ? 'bg-purple-900/20 border-pink-500/20' : 
              'bg-gray-900/40 border-gray-800'
            }`}>
              <h3 className={`text-xs font-black uppercase tracking-[0.3em] mb-4 text-center ${
                isSpring ? 'text-amber-500/60' : isLgbt ? 'text-pink-500/60' : 'text-slate-500'
              }`}>
                — {isSpring ? '作战指南' : isLgbt ? '爱与准则' : 'HOW TO PLAY'} —
              </h3>
              <ul className={`text-sm space-y-4 font-medium leading-relaxed ${
                isSpring ? 'text-amber-100/80' : isLgbt ? 'text-purple-100/80' : 'text-gray-300'
              }`}>
                <li className="flex items-center gap-3">
                  <div className={`w-1 h-1 rounded-full ${isSpring ? 'bg-red-500' : isLgbt ? 'bg-pink-500' : 'bg-sky-500'}`} />
                  <span>点击鼠标左键控制炮塔向光标方向进行射击。</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className={`w-1 h-1 rounded-full ${isSpring ? 'bg-red-500' : isLgbt ? 'bg-purple-500' : 'bg-sky-500'}`} />
                  <span>移动鼠标至陨石碎片上进行能量回收与收集。</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className={`w-1 h-1 rounded-full ${isSpring ? 'bg-red-500' : isLgbt ? 'bg-blue-500' : 'bg-sky-500'}`} />
                  <span>若陨石撞击中心炮塔，防御协议将立即终止。</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button
                  onClick={handleStartSequence}
                  className={`flex-[2] group relative inline-flex items-center justify-center px-8 py-5 font-bold transition-all duration-200 rounded-2xl active:scale-95 overflow-hidden ${
                    isSpring ? 'bg-gradient-to-r from-red-600 to-red-700 text-amber-100 border-2 border-amber-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 
                    isLgbt ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]' :
                    'bg-white text-black hover:bg-gray-200 shadow-xl'
                  }`}
                >
                  <span className="relative z-10">{isSpring ? '开启新春守卫' : isLgbt ? '传播彩虹之力' : '启动防御协议'}</span>
                </button>
                <button
                  onClick={() => setGameState('TALENTS')}
                  className={`flex-1 px-8 py-5 font-bold transition-all duration-200 border rounded-2xl active:scale-95 ${
                    isSpring ? 'bg-amber-900/20 border-amber-800 text-amber-500 hover:bg-amber-900/40' : 
                    isLgbt ? 'bg-purple-900/20 border-pink-500/30 text-pink-400 hover:bg-purple-900/40' :
                    'bg-gray-900 border-gray-700 text-white hover:bg-gray-800'
                  }`}
                >
                  研发中心
                </button>
              </div>
              <button onClick={() => setShowSettings(true)} className="w-full py-4 font-bold text-slate-500 hover:text-white transition-colors tracking-widest text-xs uppercase">⚙ 系统设置</button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'OPENING' && <OpeningAnimation onComplete={startGame} skin={skin} />}
      {gameState === 'PLAYING' && <GameEngine onGameOver={handleGameOver} skin={skin} />}
      {gameState === 'GAMEOVER' && lastStats && <SummaryOverlay stats={lastStats} onRestart={handleStartSequence} onOpenTalents={() => setGameState('TALENTS')} skin={skin} />}
      {gameState === 'TALENTS' && <TalentTree onBack={() => setGameState('START')} skin={skin} />}
      <Analytics />
    </div>
  );
};

export default App;
