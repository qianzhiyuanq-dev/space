
import React, { useState, useEffect } from 'react';
import { audioManager } from '../services/audioService';
import { talentService } from '../services/talentService';

interface SettingsOverlayProps {
  onClose: () => void;
  onResetSave: () => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ onClose, onResetSave }) => {
  const [volume, setVolume] = useState(audioManager.getVolume());
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioManager.setVolume(val);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
        >
          <span className="text-2xl">✕</span>
        </button>

        <h2 className="text-2xl font-black text-white mb-8 tracking-[0.2em] uppercase border-b border-slate-800 pb-4">系统设置</h2>

        <div className="space-y-8">
          {/* Volume Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">主音量</label>
              <span className="text-xs font-mono text-sky-400">{Math.round(volume * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400"
            />
          </div>

          {/* Fullscreen Section */}
          <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white uppercase tracking-wider">全屏模式</span>
              <span className="text-[10px] text-slate-500 uppercase mt-1">沉浸式战斗体验</span>
            </div>
            <button 
              onClick={toggleFullscreen}
              className={`w-12 h-6 rounded-full transition-colors relative ${isFullscreen ? 'bg-sky-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isFullscreen ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Archive Section */}
          <div className="pt-4 border-t border-slate-800/50">
            <h3 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-4">危险区域</h3>
            <button 
              onClick={() => setShowConfirmReset(true)}
              className="w-full py-3 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest"
            >
              抹除所有作战存档
            </button>
          </div>
        </div>

        {showConfirmReset && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900 rounded-3xl p-8 border border-rose-500/30">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-bold text-white mb-2">确认清空？</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">该操作将永久删除所有研发进度和资源，无法撤销。</p>
              <div className="flex gap-4">
                <button onClick={() => setShowConfirmReset(false)} className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-white">取消</button>
                <button 
                  onClick={() => {
                    onResetSave();
                    setShowConfirmReset(false);
                  }} 
                  className="flex-1 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsOverlay;
