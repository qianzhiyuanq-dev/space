// index.tsx
import { createRoot } from "react-dom/client";

// App.tsx
import { useState as useState7 } from "react";
import { Analytics } from "@vercel/analytics/react";

// components/GameEngine.tsx
import { useEffect, useRef, useState as useState2, useCallback } from "react";

// constants.ts
var CIRCLE_RADIUS = 300;
var BULLET_FIRE_COOLDOWN = 1e3;
var METEORITE_SPAWN_INTERVAL = 4500;
var BULLET_SPEED = 3.5;
var METEORITE_SPEED = 0.5;
var METEORITE_INITIAL_HP = 10;
var BULLET_DAMAGE = 5;
var TURRET_RADIUS = 24;
var FRAGMENT_RADIUS = 4;
var BULLET_RADIUS = 6;
var INITIAL_UPGRADE_THRESHOLD = 5;

// services/audioService.ts
var AudioService = class {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverb = null;
    this.delayNode = null;
    this.delayGain = null;
    this.rhythmTimer = null;
    this.lastIntensity = 0;
    this.beatCount = 0;
    this.currentVolume = 0.5;
    this.chords = [
      [220, 261.63, 329.63, 392, 493.88],
      // Am9
      [174.61, 261.63, 329.63, 349.23, 440],
      // Fmaj7
      [130.81, 261.63, 329.63, 392, 493.88],
      // Cmaj7
      [196, 293.66, 392, 440, 587.33]
      // Gsus4
    ];
    const savedVolume = localStorage.getItem("stellar_sentinel_volume");
    if (savedVolume !== null) {
      this.currentVolume = parseFloat(savedVolume);
    }
  }
  init() {
    if (this.ctx)
      return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.currentVolume * 0.5;
    this.masterGain.connect(this.ctx.destination);
    this.delayNode = this.ctx.createDelay(1);
    this.delayNode.delayTime.value = 0.4;
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.value = 0.3;
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);
    this.delayGain.connect(this.masterGain);
    this.startRhythm();
  }
  setVolume(val) {
    this.currentVolume = val;
    localStorage.setItem("stellar_sentinel_volume", val.toString());
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val * (0.25 + this.lastIntensity * 0.15), this.ctx.currentTime, 0.1);
    }
  }
  getVolume() {
    return this.currentVolume;
  }
  playPianoNote(freq, startTime, velocity = 1) {
    if (!this.ctx || !this.masterGain || !this.delayNode)
      return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, startTime);
    const attack = 5e-3;
    const decay = 1.2;
    const release = 1.5;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3 * velocity, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.1 * velocity, startTime + decay);
    gain.gain.exponentialRampToValueAtTime(1e-3, startTime + decay + release);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2e3, startTime);
    filter.frequency.exponentialRampToValueAtTime(400, startTime + decay);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.delayNode);
    osc.start(startTime);
    osc.stop(startTime + decay + release);
  }
  startRhythm() {
    const playTick = () => {
      if (!this.ctx || !this.masterGain)
        return;
      const bpm = 80 + this.lastIntensity * 40;
      const secondsPerBeat = 60 / bpm;
      const subBeat = secondsPerBeat / 4;
      const now = this.ctx.currentTime;
      const chordIndex = Math.floor(this.beatCount / 16) % this.chords.length;
      const currentChord = this.chords[chordIndex];
      const step = this.beatCount % 16;
      if (step % 4 === 0) {
        this.playPianoNote(currentChord[0], now, 0.8 + this.lastIntensity * 0.2);
      }
      if (Math.random() > 0.3) {
        const noteIndex = Math.floor(Math.random() * (currentChord.length - 1)) + 1;
        this.playPianoNote(currentChord[noteIndex], now, 0.5 + Math.random() * 0.3);
      }
      if (this.lastIntensity > 0.5 && Math.random() > 0.7) {
        this.playPianoNote(currentChord[Math.floor(Math.random() * currentChord.length)] * 2, now, 0.3);
      }
      this.beatCount++;
      this.rhythmTimer = window.setTimeout(playTick, subBeat * 1e3);
    };
    playTick();
  }
  updateIntensity(intensity) {
    this.lastIntensity = intensity;
    if (!this.ctx || !this.masterGain || !this.delayGain)
      return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.currentVolume * (0.25 + intensity * 0.15), now, 1);
    this.delayGain.gain.setTargetAtTime(0.3 + intensity * 0.2, now, 1);
  }
  playFire() {
    if (!this.ctx || !this.masterGain)
      return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1 * this.currentVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }
  playHit() {
    if (!this.ctx || !this.masterGain)
      return;
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++)
      data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1 * this.currentVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1e-3, this.ctx.currentTime + 0.1);
    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }
  playCollect() {
    if (!this.ctx || !this.masterGain)
      return;
    const now = this.ctx.currentTime;
    this.playPianoNote(1760, now, 0.4);
  }
  stop() {
    if (this.rhythmTimer)
      clearTimeout(this.rhythmTimer);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
};
var audioManager = new AudioService();

// services/talentService.ts
var STORAGE_KEY = "stellar_sentinel_save_v1";
var CURRENT_VERSION = 1;
var TALENT_NODES = [
  { id: "cooldown", name: "\u6025\u901F\u88C5\u586B", description: "\u51CF\u5C11\u5B50\u5F39\u5C04\u51FB\u51B7\u5374", maxLevel: 5, costPerLevel: 5, branch: 1 },
  { id: "bulletTrail", name: "\u80FD\u91CF\u8F68\u8FF9", description: "\u589E\u52A0\u5B50\u5F39\u98DE\u884C\u901F\u5EA6", maxLevel: 3, costPerLevel: 25, prerequisiteId: "cooldown", branch: 1 },
  { id: "damage", name: "\u5F3A\u5316\u5F39\u836F", description: "\u63D0\u5347\u5B50\u5F39\u6740\u4F24\u529B", maxLevel: 5, costPerLevel: 10, branch: 2 },
  { id: "spawnRate", name: "\u5F15\u529B\u4FE1\u6807", description: "\u5438\u5F15\u66F4\u591A\u9668\u77F3\u5237\u65B0", maxLevel: 5, costPerLevel: 5, branch: 3 },
  { id: "fragmentValue", name: "\u9AD8\u6548\u56DE\u6536", description: "\u4EA7\u751F\u66F4\u591A\u80FD\u91CF\u788E\u7247", maxLevel: 3, costPerLevel: 30, prerequisiteId: "spawnRate", branch: 3 },
  { id: "magnetRange", name: "\u78C1\u573A\u6269\u5F20", description: "\u589E\u52A0\u5149\u6807\u56DE\u6536\u788E\u7247\u7684\u8303\u56F4", maxLevel: 3, costPerLevel: 25, prerequisiteId: "spawnRate", branch: 3 }
];
var initialState = {
  levels: {
    cooldown: 0,
    damage: 0,
    spawnRate: 0,
    fragmentValue: 0,
    bulletTrail: 0,
    magnetRange: 0
  },
  totalFragments: 0,
  totalCores: 0,
  currentSkin: "DEFAULT"
};
var talentService = {
  getState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved)
        return { ...initialState };
      const parsed = JSON.parse(saved);
      const mergedLevels = { ...initialState.levels, ...parsed.levels || {} };
      return {
        levels: mergedLevels,
        totalFragments: typeof parsed.totalFragments === "number" ? parsed.totalFragments : 0,
        totalCores: typeof parsed.totalCores === "number" ? parsed.totalCores : 0,
        currentSkin: parsed.currentSkin || "DEFAULT",
        version: parsed.version || CURRENT_VERSION
      };
    } catch (e) {
      console.error("\u5B58\u6863\u8BFB\u53D6\u5931\u8D25", e);
      return { ...initialState };
    }
  },
  saveState(state) {
    const dataToSave = {
      levels: state.levels,
      totalFragments: state.totalFragments,
      totalCores: state.totalCores,
      currentSkin: state.currentSkin,
      version: CURRENT_VERSION,
      lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  },
  setSkin(skin) {
    const state = this.getState();
    state.currentSkin = skin;
    this.saveState(state);
  },
  resetState() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("stellar_sentinel_talents");
    return { ...initialState };
  },
  addCurrency(fragments, cores) {
    const state = this.getState();
    state.totalFragments += fragments;
    state.totalCores += cores;
    this.saveState(state);
  },
  upgradeTalent(id) {
    const state = this.getState();
    const node = TALENT_NODES.find((n) => n.id === id);
    if (!node || (state.levels[id] || 0) >= node.maxLevel)
      return false;
    if (node.prerequisiteId && (state.levels[node.prerequisiteId] || 0) === 0)
      return false;
    const cost = node.costPerLevel * ((state.levels[id] || 0) + 1);
    if (state.totalFragments < cost)
      return false;
    state.totalFragments -= cost;
    state.levels[id] = (state.levels[id] || 0) + 1;
    this.saveState(state);
    return true;
  },
  getBonuses() {
    const state = this.getState();
    return {
      cooldownReduction: (state.levels.cooldown || 0) * 150,
      damageBoost: (state.levels.damage || 0) * 2,
      spawnBoost: (state.levels.spawnRate || 0) * 0.2,
      fragmentBonus: state.levels.fragmentValue || 0,
      bulletSpeedBoost: (state.levels.bulletTrail || 0) * 1.5,
      magnetRangeBoost: (state.levels.magnetRange || 0) * 20
    };
  }
};

// services/DifficultyService.ts
var difficultyService = {
  /**
   * 根据生存时间计算当前的生成间隔
   * @param survivalSecs 生存秒数
   * @param spawnBoost 天赋加成
   * @param perkMult 强化卡牌倍率
   * @returns 毫秒级的生成间隔
   */
  calculateSpawnInterval(survivalSecs, spawnBoost, perkMult) {
    const timeFactor = 1 + survivalSecs / 12 + Math.pow(survivalSecs / 60, 1.5);
    const baseInterval = METEORITE_SPAWN_INTERVAL / (1 + spawnBoost);
    return Math.max(350, baseInterval / (perkMult * timeFactor));
  },
  /**
   * 计算屏外生成所需的最小距离
   * @param width 屏幕宽
   * @param height 屏幕高
   * @returns 屏外生成圆半径
   */
  getSpawnDistance(width, height) {
    return Math.sqrt(width ** 2 + height ** 2) / 2 + 150;
  }
};

// services/RenderService.ts
var renderService = {
  /**
   * 绘制具有纹理（坑洞）的陨石
   */
  drawMinimalistMeteorite(ctx, radius, isBoss, isSpring, spawnTime, firstBossDefeated, vertices, craters) {
    const isLarge = radius >= 24 || isBoss;
    ctx.beginPath();
    for (let i = 0; i < vertices.length; i++) {
      if (i === 0)
        ctx.moveTo(vertices[i].x, vertices[i].y);
      else
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, 0, 0, 0, radius);
    const forceGray = !firstBossDefeated && !isBoss;
    if (forceGray) {
      if (isLarge) {
        grad.addColorStop(0, "#334155");
        grad.addColorStop(1, "#1e293b");
      } else {
        grad.addColorStop(0, "#94a3b8");
        grad.addColorStop(1, "#475569");
      }
    } else if (isSpring) {
      if (isLarge) {
        grad.addColorStop(0, "#991b1b");
        grad.addColorStop(1, "#450a0a");
      } else {
        grad.addColorStop(0, "#b45309");
        grad.addColorStop(1, "#78350f");
      }
    } else {
      if (isLarge) {
        grad.addColorStop(0, isBoss ? "#4c1d95" : "#78350f");
        grad.addColorStop(1, isBoss ? "#2e1065" : "#451a03");
      } else {
        grad.addColorStop(0, "#1e293b");
        grad.addColorStop(1, "#0f172a");
      }
    }
    ctx.fillStyle = grad;
    ctx.fill();
    if (craters && craters.length > 0) {
      ctx.save();
      ctx.clip();
      craters.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fill();
        ctx.strokeStyle = isSpring ? "rgba(251, 191, 36, 0.05)" : "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.restore();
    }
    ctx.strokeStyle = forceGray ? "rgba(255,255,255,0.1)" : isSpring ? "rgba(251, 191, 36, 0.3)" : isBoss ? "rgba(168, 85, 247, 0.4)" : "rgba(56, 189, 248, 0.3)";
    ctx.lineWidth = isLarge ? 2 : 1;
    ctx.stroke();
    if (radius > 15) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, -radius * 0.2);
      ctx.lineTo(radius * 0.1, -radius * 0.5);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.stroke();
    }
  },
  /**
   * 绘制带有交互动画的“磁悬浮精密拦截器”
   */
  drawComplexTurret(ctx, angle, recoil, flash, isSpring, isLgbt) {
    const time = Date.now() / 1e3;
    ctx.save();
    const hoverY = Math.sin(time * 3) * 1.2;
    const hoverX = Math.cos(time * 2) * 0.8;
    ctx.translate(hoverX, hoverY);
    ctx.rotate(angle);
    const r = TURRET_RADIUS;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI * 2 / 8 + Math.PI / 8;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0)
        ctx.moveTo(x, y);
      else
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (isSpring)
      ctx.fillStyle = "#7f1d1d";
    else if (isLgbt)
      ctx.fillStyle = "#1e1b4b";
    else
      ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.strokeStyle = isSpring ? "#fbbf24" : isLgbt ? "#818cf8" : "#1e293b";
    ctx.lineWidth = 2;
    ctx.stroke();
    const railX = 4 - recoil * 0.35;
    const barrelX = 8 - recoil;
    const railLen = 40, railWidth = 4, railGap = 13;
    let themeColor = "#38bdf8";
    if (isSpring)
      themeColor = "#fbbf24";
    else if (isLgbt)
      themeColor = `hsl(${time * 120 % 360}, 80%, 65%)`;
    [1, -1].forEach((dir) => {
      ctx.save();
      ctx.translate(railX, dir * railGap / 2);
      ctx.fillStyle = isSpring ? "#991b1b" : isLgbt ? "#4338ca" : "#334155";
      ctx.fillRect(0, -railWidth / 2, railLen, railWidth);
      if (recoil > 2 || isLgbt) {
        ctx.globalAlpha = isLgbt ? 0.8 : recoil / 12 * 0.6;
        ctx.fillStyle = isLgbt ? `hsl(${(time * 120 + 180) % 360}, 80%, 65%)` : isSpring ? "#fde68a" : "#ef4444";
        ctx.fillRect(0, -railWidth / 2, railLen * 0.7, railWidth);
      }
      ctx.restore();
    });
    if (flash > 0) {
      ctx.save();
      ctx.translate(railX + railLen, 0);
      const blastGrad = ctx.createLinearGradient(0, 0, 20 * flash, 0);
      blastGrad.addColorStop(0, "#ffffff");
      blastGrad.addColorStop(1, "transparent");
      ctx.fillStyle = blastGrad;
      ctx.globalAlpha = flash;
      ctx.beginPath();
      ctx.moveTo(0, -railGap / 2);
      ctx.lineTo(25 * flash, 0);
      ctx.lineTo(0, railGap / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const energyWidth = 5;
    const grad = ctx.createLinearGradient(barrelX, 0, barrelX + railLen - 8, 0);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.4, themeColor);
    grad.addColorStop(1, flash > 0 ? "#fff" : themeColor);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.5 + flash * 0.5 + Math.sin(time * 12) * 0.1;
    ctx.fillRect(barrelX, -energyWidth / 2, railLen - 12, energyWidth);
    const coreR = 9.5;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    if (flash > 0) {
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(1, themeColor);
    } else {
      coreGrad.addColorStop(0, themeColor);
      coreGrad.addColorStop(1, isSpring ? "#450a0a" : isLgbt ? "#1e1b4b" : "#020617");
    }
    if (isLgbt) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = themeColor;
    }
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

// components/CardSelectionOverlay.tsx
import React, { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var PERKS = [
  { id: "extraBullets", name: "\u5F39\u5E55\u6269\u5F20", icon: "\u{1F3F9}", color: "from-blue-500 to-cyan-400", description: "\u6BCF\u6B21\u5C04\u51FB\u989D\u5916\u589E\u52A0\u4E00\u53D1\u5B50\u5F39" },
  { id: "reduceCooldown", name: "\u6025\u901F\u51B7\u5374", icon: "\u23F1\uFE0F", color: "from-indigo-500 to-purple-400", description: "\u5C04\u51FB\u51B7\u5374\u65F6\u95F4\u51CF\u5C11 20%" },
  { id: "increaseDamage", name: "\u9AD8\u7206\u5F39\u836F", icon: "\u{1F9E8}", color: "from-orange-500 to-red-400", description: "\u5B50\u5F39\u57FA\u7840\u4F24\u5BB3\u5927\u5E45\u63D0\u5347" },
  { id: "homing", name: "\u8FFD\u8E2A\u5BFC\u5F15", icon: "\u{1F3AF}", color: "from-teal-500 to-emerald-400", description: "\u5B50\u5F39\u5C06\u81EA\u52A8\u8FFD\u8E2A\u9644\u8FD1\u7684\u9668\u77F3" },
  { id: "ice", name: "\u6025\u51BB\u6838\u5FC3", icon: "\u2744\uFE0F", color: "from-sky-300 to-blue-500", description: "\u5B50\u5F39\u9644\u5E26\u51CF\u901F\u6548\u679C\uFF0C\u51BB\u7ED3\u76EE\u6807" },
  { id: "fire", name: "\u7194\u5CA9\u711A\u70E7", icon: "\u{1F525}", color: "from-red-500 to-orange-600", description: "\u5B50\u5F39\u9644\u5E26\u71C3\u70E7\u6548\u679C\uFF0C\u6301\u7EED\u9020\u6210\u4F24\u5BB3" },
  { id: "moreMeteorites", name: "\u9668\u77F3\u589E\u5E45", icon: "\u2604\uFE0F", color: "from-amber-600 to-yellow-400", description: "\u5F15\u529B\u589E\u5F3A\uFF0C\u63D0\u5347\u9668\u77F3\u4EA7\u51FA\uFF08\u5371\u9669\uFF01\uFF09" }
];
var CardSelectionOverlay = ({ onSelect, ownedPerks, isSpring, isLgbt }) => {
  const [pendingId, setPendingId] = useState(null);
  const selectedPerks = React.useMemo(() => {
    const oneTime = ["homing", "ice", "fire"];
    const filtered = PERKS.filter((p) => !oneTime.includes(p.id) || !ownedPerks.includes(p.id));
    return [...filtered].sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [ownedPerks]);
  const handleCardClick = (id) => {
    if (pendingId === id) {
      onSelect(id);
    } else {
      setPendingId(id);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center max-w-5xl w-full px-4", children: [
    /* @__PURE__ */ jsx("h2", { className: `text-3xl font-black mb-2 tracking-[0.2em] uppercase transition-colors duration-500 ${isSpring ? "text-amber-400" : isLgbt ? "text-pink-400" : "text-white"}`, children: isSpring ? "\u7965\u745E\u52A0\u6301 \xB7 \u5F3A\u5316\u534F\u8BAE" : isLgbt ? "\u5F69\u8679\u89C9\u9192 \xB7 \u5F3A\u5316\u534F\u8BAE" : "\u5F3A\u5316\u534F\u8BAE\u5DF2\u5C31\u7EEA" }),
    /* @__PURE__ */ jsx("p", { className: "text-slate-400 mb-12 text-sm uppercase tracking-widest font-bold", children: pendingId ? "\u8BF7\u786E\u8BA4\u60A8\u7684\u5F3A\u5316\u9009\u62E9" : "\u8BF7\u9009\u62E9\u4E00\u9879\u589E\u76CA\u6548\u679C" }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8 w-full", children: selectedPerks.map((perk) => {
      const isPending = pendingId === perk.id;
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative flex flex-col",
          children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => handleCardClick(perk.id),
                className: `group relative flex flex-col items-center p-8 border-2 rounded-3xl transition-all duration-300 h-full ${isPending ? isSpring ? "bg-red-900/60 border-amber-400 scale-105 shadow-[0_0_30px_rgba(251,191,36,0.4)]" : isLgbt ? "bg-purple-800/60 border-white scale-105 shadow-[0_0_30px_rgba(255,255,255,0.4)]" : "bg-slate-800 border-sky-400 scale-105 shadow-[0_0_30px_rgba(14,165,233,0.4)]" : isSpring ? "bg-red-950/40 border-amber-900/50 hover:border-amber-700" : isLgbt ? "bg-purple-900/40 border-pink-500/20 hover:border-pink-400" : "bg-slate-900 border-slate-800 hover:border-slate-600"}`,
                children: [
                  /* @__PURE__ */ jsx("div", { className: `w-20 h-20 rounded-2xl bg-gradient-to-br ${perk.color} flex items-center justify-center text-4xl mb-6 shadow-lg transition-transform ${isPending ? "scale-110" : "group-hover:scale-105"}`, children: perk.icon }),
                  /* @__PURE__ */ jsx("h3", { className: `text-xl font-black mb-2 transition-colors uppercase ${isPending ? isSpring ? "text-amber-400" : isLgbt ? "text-white" : "text-sky-400" : isSpring ? "text-amber-200" : isLgbt ? "text-pink-100" : "text-white"}`, children: perk.name }),
                  /* @__PURE__ */ jsx("p", { className: `text-sm leading-relaxed text-center font-medium transition-colors ${isPending ? "text-white" : "text-slate-400"}`, children: perk.description }),
                  isPending && /* @__PURE__ */ jsx("div", { className: `absolute inset-0 rounded-3xl border-2 animate-pulse pointer-events-none ${isSpring ? "border-amber-400/50" : isLgbt ? "border-white/50" : "border-sky-400/50"}` })
                ]
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: `mt-4 transition-all duration-300 flex flex-col items-center ${isPending ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`, children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    onSelect(perk.id);
                  },
                  className: `w-full py-4 px-6 font-black rounded-2xl text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all ${isSpring ? "bg-gradient-to-r from-amber-400 to-amber-600 text-red-950 hover:from-amber-300 shadow-amber-900/40" : isLgbt ? "bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-400 to-purple-500 text-white shadow-purple-500/40" : "bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-sky-950/40"}`,
                  children: "\u786E\u8BA4\u9009\u62E9"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter animate-pulse", children: "\u518D\u6B21\u70B9\u51FB\u5361\u724C\u4EA6\u53EF\u786E\u8BA4" })
            ] })
          ]
        },
        perk.id
      );
    }) })
  ] }) });
};
var CardSelectionOverlay_default = CardSelectionOverlay;

// components/GameEngine.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var GameEngine = ({ onGameOver, skin }) => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const bonuses = useRef(talentService.getBonuses());
  const isSpring = skin === "SPRING_FESTIVAL";
  const isLgbt = skin === "LGBT";
  const perksRef = useRef({
    bulletsPerShot: 1,
    cooldownMult: 1,
    damageBoost: 0,
    isHoming: false,
    isIce: false,
    isFire: false,
    spawnRateMult: 1,
    ownedOneTimers: []
  });
  const statsRef = useRef({
    fragmentsCollected: 0,
    coresCollected: 0,
    meteoritesDestroyed: 0,
    totalDamageDealt: 0,
    bulletsFired: 0
  });
  const bulletsRef = useRef([]);
  const meteoritesRef = useRef([]);
  const fragmentsRef = useRef([]);
  const effectsRef = useRef([]);
  const screenShakeRef = useRef(0);
  const gameTimeRef = useRef(0);
  const survivalTimeRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const lastFireTimeRef = useRef(0);
  const bossSpawnedRef = useRef(false);
  const firstBossDefeatedRef = useRef(false);
  const initialSpawnDoneRef = useRef(false);
  const turretFlashRef = useRef(0);
  const turretAngleRef = useRef(0);
  const upgradeThresholdRef = useRef(INITIAL_UPGRADE_THRESHOLD);
  const currentUpgradeProgressRef = useRef(0);
  const gameActiveRef = useRef(true);
  const [showCardSelection, setShowCardSelection] = useState2(false);
  const [bossWarning, setBossWarning] = useState2(false);
  const [hud, setHud] = useState2({
    totalFrags: 0,
    totalCores: 0,
    progress: 0,
    survivalSecs: 0,
    threshold: INITIAL_UPGRADE_THRESHOLD
  });
  const getThemeColor = (alpha = 1, hueOffset = 0) => {
    if (isSpring)
      return `rgba(245, 158, 11, ${alpha})`;
    if (isLgbt) {
      const hue = (gameTimeRef.current * 0.2 + hueOffset) % 360;
      return `hsla(${hue}, 80%, 60%, ${alpha})`;
    }
    return `rgba(56, 189, 248, ${alpha})`;
  };
  const getBulletColor = (b, alpha = 1, hueOffset = 0) => {
    if (b.isIce)
      return `rgba(125, 211, 252, ${alpha})`;
    if (b.isFire)
      return `rgba(239, 68, 68, ${alpha})`;
    return getThemeColor(alpha, hueOffset);
  };
  const triggerScreenShake = (intensity) => {
    screenShakeRef.current = Math.max(screenShakeRef.current, intensity);
  };
  const createExplosion = (x, y, color, scale = 1) => {
    if (scale > 2)
      triggerScreenShake(15);
    effectsRef.current.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 1,
      size: 60 * scale,
      color: isSpring ? "#fff7ed" : "#ffffff",
      type: "burst",
      decayRate: 0.12
    });
    effectsRef.current.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 1,
      size: 35 * scale,
      color,
      type: "shockwave",
      decayRate: 0.03
    });
    const debrisCount = Math.floor((isLgbt ? 18 : 12) * scale);
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      let debrisColor = color;
      if (isLgbt) {
        debrisColor = `hsla(${Math.random() * 360}, 90%, 60%, 1)`;
      } else if (isSpring) {
        debrisColor = Math.random() > 0.5 ? "#991b1b" : "#fbbf24";
      }
      effectsRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.8,
        maxLife: 1,
        size: (5 + Math.random() * 6) * Math.sqrt(scale),
        color: debrisColor,
        type: "debris",
        decayRate: 0.015,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25
      });
    }
  };
  const createImpactEffects = (x, y, bvx, bvy, color) => {
    effectsRef.current.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, size: 25, color: "#ffffff", type: "impact", decayRate: 0.15 });
    effectsRef.current.push({ x, y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, size: 12, color: "#ffffff", type: "burst", decayRate: 0.1 });
    const angle = Math.atan2(bvy, bvx) + Math.PI;
    for (let i = 0; i < 5; i++) {
      const spread = (Math.random() - 0.5) * 1.5;
      const speed = 3 + Math.random() * 5;
      effectsRef.current.push({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        life: 0.5,
        maxLife: 0.5,
        size: 2,
        color: i % 2 === 0 ? "#ffffff" : color,
        type: "sparks",
        decayRate: 0.08
      });
    }
  };
  const generateMeteoriteVertices = (radius, isBoss) => {
    const sides = isBoss ? 14 : radius >= 24 ? 10 : 7;
    const vertices = [];
    const noiseIntensity = isBoss || radius >= 24 ? 0.15 : 0.08;
    for (let i = 0; i < sides; i++) {
      const angle = i * Math.PI * 2 / sides;
      const seed = Math.random() * noiseIntensity + (1 - noiseIntensity / 2);
      const r = radius * seed;
      vertices.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return vertices;
  };
  const generateCraters = (radius) => {
    const craterCount = Math.floor(radius / 5);
    const craters = [];
    for (let i = 0; i < craterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.7;
      craters.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        r: 1.5 + Math.random() * (radius * 0.25)
      });
    }
    return craters;
  };
  const fireBullet = useCallback(() => {
    if (!gameActiveRef.current || showCardSelection)
      return;
    const now = gameTimeRef.current;
    const baseCD = BULLET_FIRE_COOLDOWN;
    const actualCD = Math.max(200, (baseCD - bonuses.current.cooldownReduction) * perksRef.current.cooldownMult);
    if (now - lastFireTimeRef.current >= actualCD) {
      const canvas = canvasRef.current;
      if (!canvas)
        return;
      const cX = canvas.width / 2, cY = canvas.height / 2;
      const bSpeed = BULLET_SPEED + bonuses.current.bulletSpeedBoost;
      const num = perksRef.current.bulletsPerShot;
      const spread = 0.15;
      for (let i = 0; i < num; i++) {
        const offset = (i - (num - 1) / 2) * spread;
        const finalAngle = turretAngleRef.current + offset;
        bulletsRef.current.push({
          x: cX,
          y: cY,
          vx: Math.cos(finalAngle) * bSpeed,
          vy: Math.sin(finalAngle) * bSpeed,
          radius: BULLET_RADIUS,
          distanceTraveled: 0,
          maxDistance: CIRCLE_RADIUS,
          trail: [],
          isIce: perksRef.current.isIce,
          isFire: perksRef.current.isFire,
          isHoming: perksRef.current.isHoming,
          homingSearchCooldown: 0
        });
        statsRef.current.bulletsFired++;
      }
      lastFireTimeRef.current = now;
      turretFlashRef.current = 1;
      audioManager.playFire();
    }
  }, [showCardSelection]);
  const update = useCallback((timestamp, width, height) => {
    if (!gameActiveRef.current || showCardSelection) {
      lastTimestampRef.current = timestamp;
      return;
    }
    const delta = lastTimestampRef.current === 0 ? 0 : timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;
    gameTimeRef.current += delta;
    survivalTimeRef.current += delta;
    const now = gameTimeRef.current;
    const cX = width / 2, cY = height / 2;
    const targetAngle = Math.atan2(mousePosRef.current.y - cY, mousePosRef.current.x - cX);
    let angleDiff = targetAngle - turretAngleRef.current;
    while (angleDiff < -Math.PI)
      angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI)
      angleDiff -= Math.PI * 2;
    turretAngleRef.current += angleDiff * 0.18;
    if (turretFlashRef.current > 0)
      turretFlashRef.current -= 0.1;
    if (screenShakeRef.current > 0)
      screenShakeRef.current *= 0.9;
    const spawnDist = difficultyService.getSpawnDistance(width, height);
    const spawnInterval = difficultyService.calculateSpawnInterval(survivalTimeRef.current / 1e3, bonuses.current.spawnBoost, perksRef.current.spawnRateMult);
    if (!initialSpawnDoneRef.current && now >= 300 || initialSpawnDoneRef.current && now - lastSpawnTimeRef.current >= spawnInterval) {
      initialSpawnDoneRef.current = true;
      const angle = Math.random() * Math.PI * 2;
      const x = cX + Math.cos(angle) * spawnDist, y = cY + Math.sin(angle) * spawnDist;
      const dx = cX - x, dy = cY - y, dist = Math.sqrt(dx * dx + dy * dy);
      const radius = 14 + Math.random() * 24;
      meteoritesRef.current.push({
        x,
        y,
        hp: METEORITE_INITIAL_HP,
        maxHp: METEORITE_INITIAL_HP,
        vx: dx / dist * METEORITE_SPEED,
        vy: dy / dist * METEORITE_SPEED,
        radius,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        spawnTime: now,
        vertices: generateMeteoriteVertices(radius, false),
        craters: generateCraters(radius)
      });
      lastSpawnTimeRef.current = now;
    }
    if (survivalTimeRef.current >= 3e4 && !bossSpawnedRef.current) {
      setBossWarning(true);
      setTimeout(() => setBossWarning(false), 4e3);
      const angle = Math.random() * Math.PI * 2;
      const x = cX + Math.cos(angle) * spawnDist, y = cY + Math.sin(angle) * spawnDist;
      const dx = cX - x, dy = cY - y, dist = Math.sqrt(dx * dx + dy * dy);
      meteoritesRef.current.push({
        x,
        y,
        hp: 200,
        maxHp: 200,
        vx: dx / dist * (METEORITE_SPEED * 0.4),
        vy: dy / dist * (METEORITE_SPEED * 0.4),
        radius: 65,
        rotation: 0,
        rotationSpeed: 8e-3,
        spawnTime: now,
        isBoss: true,
        vertices: generateMeteoriteVertices(65, true),
        craters: generateCraters(65)
      });
      bossSpawnedRef.current = true;
    }
    effectsRef.current = effectsRef.current.filter((e) => {
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= 0.95;
      e.vy *= 0.95;
      e.life -= e.decayRate || 0.03;
      return e.life > 0;
    });
    meteoritesRef.current.forEach((m) => {
      let speedMult = 1;
      if (m.slowTimer && m.slowTimer > 0) {
        speedMult = 0.4;
        m.slowTimer -= delta;
      }
      if (m.burnTimer && m.burnTimer > 0) {
        m.hp -= 6e-3 * delta;
        m.burnTimer -= delta;
      }
      if (m.flashTimer && m.flashTimer > 0)
        m.flashTimer -= delta;
      m.x += m.vx * speedMult;
      m.y += m.vy * speedMult;
      m.rotation += m.rotationSpeed * speedMult;
      if (Math.sqrt((m.x - cX) ** 2 + (m.y - cY) ** 2) < TURRET_RADIUS + 5) {
        gameActiveRef.current = false;
        onGameOver(statsRef.current);
      }
    });
    bulletsRef.current = bulletsRef.current.filter((b) => {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 20)
        b.trail.shift();
      if (b.isHoming) {
        b.homingSearchCooldown -= delta;
        if (!b.targetRef || b.targetRef.hp <= 0 || b.homingSearchCooldown <= 0) {
          let bestTarget = null;
          let bestDist = Infinity;
          for (let m of meteoritesRef.current) {
            if (m.hp <= 0)
              continue;
            const d = (m.x - b.x) ** 2 + (m.y - b.y) ** 2;
            if (d < bestDist) {
              bestDist = d;
              bestTarget = m;
            }
          }
          b.targetRef = bestTarget || void 0;
          b.homingSearchCooldown = 150;
        }
        if (b.targetRef) {
          const t = b.targetRef;
          const targetAngle2 = Math.atan2(t.y - b.y, t.x - b.x);
          const currentAngle = Math.atan2(b.vy, b.vx);
          let diff = targetAngle2 - currentAngle;
          while (diff < -Math.PI)
            diff += Math.PI * 2;
          while (diff > Math.PI)
            diff -= Math.PI * 2;
          const newAngle = currentAngle + diff * 0.18;
          const speed = Math.sqrt(b.vx ** 2 + b.vy ** 2);
          b.vx = Math.cos(newAngle) * speed;
          b.vy = Math.sin(newAngle) * speed;
        }
      }
      b.x += b.vx;
      b.y += b.vy;
      b.distanceTraveled += Math.sqrt(b.vx ** 2 + b.vy ** 2);
      let hit = false;
      for (let m of meteoritesRef.current) {
        if (m.hp <= 0)
          continue;
        if ((b.x - m.x) ** 2 + (b.y - m.y) ** 2 < (m.radius + b.radius) ** 2) {
          const dmg = BULLET_DAMAGE + bonuses.current.damageBoost + perksRef.current.damageBoost;
          m.hp -= dmg;
          statsRef.current.totalDamageDealt += dmg;
          m.flashTimer = 120;
          m.flashColor = b.isIce ? "#7dd3fc" : b.isFire ? "#ef4444" : "#ffffff";
          if (b.isIce)
            m.slowTimer = 2e3;
          if (b.isFire)
            m.burnTimer = 3e3;
          createImpactEffects(b.x, b.y, b.vx, b.vy, m.flashColor);
          audioManager.playHit();
          hit = true;
          break;
        }
      }
      return b.distanceTraveled < b.maxDistance && !hit;
    });
    meteoritesRef.current.forEach((m) => {
      if (m.hp <= 0 && !m.isUpgraded) {
        m.isUpgraded = true;
        statsRef.current.meteoritesDestroyed++;
        createExplosion(m.x, m.y, isSpring ? "#f59e0b" : isLgbt ? "#ec4899" : m.isBoss ? "#ef4444" : "#38bdf8", m.isBoss ? 4 : 1.3);
        const fragCount = m.isBoss ? 20 : 4;
        for (let i = 0; i < fragCount; i++)
          fragmentsRef.current.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, radius: FRAGMENT_RADIUS, color: "#fbbf24", opacity: 1 });
        if (m.isBoss) {
          firstBossDefeatedRef.current = true;
          fragmentsRef.current.push({ x: m.x, y: m.y, vx: 0, vy: 0, radius: FRAGMENT_RADIUS * 2.5, color: "#a855f7", opacity: 1, isCore: true });
        }
      }
    });
    meteoritesRef.current = meteoritesRef.current.filter((m) => m.hp > 0);
    fragmentsRef.current = fragmentsRef.current.filter((f) => {
      if (!f.isMovingToTurret) {
        f.x += f.vx;
        f.y += f.vy;
        f.vx *= 0.92;
        f.vy *= 0.92;
        const distToMouseSq = (mousePosRef.current.x - f.x) ** 2 + (mousePosRef.current.y - f.y) ** 2;
        if (distToMouseSq < (30 + (bonuses.current.magnetRangeBoost || 0)) ** 2)
          f.isMovingToTurret = true;
      } else {
        const dx = cX - f.x, dy = cY - f.y, d = Math.sqrt(dx * dx + dy * dy);
        f.x += dx / d * 12;
        f.y += dy / d * 12;
        if (d < TURRET_RADIUS + 5) {
          if (f.isCore)
            statsRef.current.coresCollected++;
          else {
            statsRef.current.fragmentsCollected++;
            currentUpgradeProgressRef.current++;
            if (currentUpgradeProgressRef.current >= upgradeThresholdRef.current) {
              currentUpgradeProgressRef.current = 0;
              upgradeThresholdRef.current = Math.floor(upgradeThresholdRef.current * 1.5) + 3;
              setShowCardSelection(true);
            }
          }
          audioManager.playCollect();
          return false;
        }
      }
      return true;
    });
    setHud({ totalFrags: statsRef.current.fragmentsCollected, totalCores: statsRef.current.coresCollected, progress: Math.min(1, currentUpgradeProgressRef.current / upgradeThresholdRef.current), survivalSecs: Math.floor(survivalTimeRef.current / 1e3), threshold: upgradeThresholdRef.current });
  }, [onGameOver, isLgbt, isSpring, showCardSelection]);
  const draw = useCallback((ctx, width, height) => {
    const cX = width / 2, cY = height / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (screenShakeRef.current > 0.1)
      ctx.translate((Math.random() - 0.5) * screenShakeRef.current, (Math.random() - 0.5) * screenShakeRef.current);
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    for (let x = width % 100; x < width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = height % 100; y < height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cX, cY, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = isSpring ? "rgba(251, 191, 36, 0.1)" : "rgba(56, 189, 248, 0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();
    bulletsRef.current.forEach((b) => {
      if (b.trail.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        for (let i = 1; i < b.trail.length; i++) {
          const ratio = i / b.trail.length;
          ctx.strokeStyle = getBulletColor(b, ratio * 0.45);
          ctx.lineWidth = b.radius * ratio;
          ctx.beginPath();
          ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y);
          ctx.lineTo(b.trail[i].x, b.trail[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = getBulletColor(b, 1);
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    meteoritesRef.current.forEach((m) => {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rotation);
      renderService.drawMinimalistMeteorite(ctx, m.radius, !!m.isBoss, isSpring, m.spawnTime, firstBossDefeatedRef.current, m.vertices, m.craters);
      if (m.flashTimer && m.flashTimer > 0) {
        ctx.fillStyle = m.flashColor || "#ffffff";
        const alpha = m.flashTimer / 120;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();
        ctx.shadowBlur = 20 * alpha;
        ctx.shadowColor = m.flashColor || "#ffffff";
        ctx.strokeStyle = m.flashColor || "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    });
    fragmentsRef.current.forEach((f) => {
      if (f.isCore) {
        ctx.save();
        const glow = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 3);
        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.3, "#c084fc");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.globalAlpha = glow;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    effectsRef.current.forEach((e) => {
      ctx.save();
      ctx.globalAlpha = e.life;
      ctx.fillStyle = e.color;
      if (e.type === "impact" || e.type === "burst") {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * (1 - e.life * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === "shockwave") {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size + (1 - e.life) * 50, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.save();
    ctx.translate(cX, cY);
    const recoil = Math.max(0, 1 - (gameTimeRef.current - lastFireTimeRef.current) / 180) * 12;
    renderService.drawComplexTurret(ctx, turretAngleRef.current, recoil, turretFlashRef.current, isSpring, isLgbt);
    ctx.restore();
    ctx.restore();
  }, [isSpring, isLgbt, getBulletColor]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c)
      return;
    const ctx = c.getContext("2d");
    let frame;
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    const move = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const click = (e) => {
      if (e.button === 0)
        fireBullet();
    };
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", click);
    resize();
    const loop = (ts) => {
      update(ts, c.width, c.height);
      if (ctx)
        draw(ctx, c.width, c.height);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", click);
      cancelAnimationFrame(frame);
    };
  }, [update, draw, fireBullet]);
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  return /* @__PURE__ */ jsxs2("div", { className: "relative w-full h-full overflow-hidden cursor-crosshair", children: [
    bossWarning && /* @__PURE__ */ jsx2("div", { className: "absolute inset-0 z-[200] flex items-center justify-center pointer-events-none", children: /* @__PURE__ */ jsxs2("div", { className: "bg-red-600/20 w-full h-40 flex flex-col items-center justify-center border-y border-red-500/50 backdrop-blur-sm animate-pulse", children: [
      /* @__PURE__ */ jsx2("div", { className: "text-red-500 font-black text-6xl tracking-[0.5em] italic mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]", children: "WARNING" }),
      /* @__PURE__ */ jsx2("div", { className: "text-white font-bold text-xl tracking-[0.2em] uppercase", children: "\u5DE8\u5927\u5F15\u529B\u6CE2\u9760\u8FD1\uFF1A\u9668\u77F3\u9886\u4E3B\u5DF2\u73B0\u8EAB" })
    ] }) }),
    showCardSelection && /* @__PURE__ */ jsx2(CardSelectionOverlay_default, { onSelect: (id) => {
      if (id === "extraBullets")
        perksRef.current.bulletsPerShot++;
      else if (id === "reduceCooldown")
        perksRef.current.cooldownMult *= 0.8;
      else if (id === "increaseDamage")
        perksRef.current.damageBoost += 5;
      else if (id === "homing") {
        perksRef.current.isHoming = true;
        perksRef.current.ownedOneTimers.push(id);
      } else if (id === "ice") {
        perksRef.current.isIce = true;
        perksRef.current.ownedOneTimers.push(id);
      } else if (id === "fire") {
        perksRef.current.isFire = true;
        perksRef.current.ownedOneTimers.push(id);
      } else if (id === "moreMeteorites")
        perksRef.current.spawnRateMult += 0.5;
      setShowCardSelection(false);
    }, ownedPerks: perksRef.current.ownedOneTimers, isSpring, isLgbt }),
    /* @__PURE__ */ jsx2("div", { className: "absolute top-0 left-0 w-full h-1 bg-slate-900/50 z-50", children: /* @__PURE__ */ jsx2("div", { className: `h-full transition-all duration-500 ${isSpring ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]" : isLgbt ? "bg-pink-500 shadow-[0_0_10px_#ec4899]" : "bg-sky-500 shadow-[0_0_10px_#0ea5e9]"}`, style: { width: `${hud.progress * 100}%` } }) }),
    /* @__PURE__ */ jsxs2("div", { className: "absolute top-6 left-6 flex gap-4 z-50", children: [
      /* @__PURE__ */ jsxs2("div", { className: "p-4 bg-slate-950/80 rounded-2xl border border-white/5 backdrop-blur-md font-mono shadow-2xl", children: [
        /* @__PURE__ */ jsx2("div", { className: "text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1", children: "\u788E\u7247" }),
        /* @__PURE__ */ jsx2("div", { className: "text-3xl text-amber-400 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]", children: hud.totalFrags })
      ] }),
      /* @__PURE__ */ jsxs2("div", { className: "p-4 bg-slate-950/80 rounded-2xl border border-white/5 backdrop-blur-md font-mono shadow-2xl", children: [
        /* @__PURE__ */ jsx2("div", { className: "text-[9px] text-purple-500 uppercase font-black tracking-widest mb-1", children: "\u6838\u5FC3" }),
        /* @__PURE__ */ jsx2("div", { className: "text-3xl text-purple-400 font-black drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]", children: hud.totalCores })
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("div", { className: "absolute top-6 right-6 p-4 bg-slate-950/80 rounded-2xl border border-white/5 backdrop-blur-md font-mono z-50 shadow-2xl text-right", children: [
      /* @__PURE__ */ jsx2("div", { className: "text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1", children: "\u751F\u5B58\u65F6\u95F4" }),
      /* @__PURE__ */ jsx2("div", { className: "text-3xl text-white font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]", children: formatTime(hud.survivalSecs) })
    ] }),
    /* @__PURE__ */ jsx2("canvas", { ref: canvasRef })
  ] });
};
var GameEngine_default = GameEngine;

// components/SummaryOverlay.tsx
import { useEffect as useEffect2, useState as useState3 } from "react";

// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
var getGameSummaryLore = async (stats) => {
  const ai = new GoogleGenAI({ apiKey: "" });
  const prompt = `
    \u4F60\u73B0\u5728\u662F\u201C\u661F\u9645\u536B\u58EB\u201D\u9632\u536B\u519B\u7684\u6700\u9AD8\u7EDF\u5E05\u3002\u8BF7\u9488\u5BF9\u4EE5\u4E0B\u6218\u62A5\uFF0C\u76F4\u63A5\u5BF9\u521A\u521A\u64A4\u51FA\u6218\u573A\u7684\u98DE\u884C\u5458\uFF08\u73A9\u5BB6\uFF09\u8FDB\u884C\u7B80\u77ED\u3001\u786C\u6838\u4E14\u6781\u5177\u4E34\u573A\u611F\u7684\u70B9\u8BC4\uFF1A
    - \u6536\u96C6\u80FD\u91CF\u788E\u7247: ${stats.fragmentsCollected}
    - \u51FB\u6BC1\u654C\u5BF9\u9668\u77F3: ${stats.meteoritesDestroyed}
    - \u9020\u6210\u7684\u603B\u7834\u574F: ${stats.totalDamageDealt}
    - \u6D88\u8017\u5F39\u836F\u57FA\u6570: ${stats.bulletsFired}

    \u8981\u6C42\uFF1A
    1. \u8BED\u6C14\u8981\u50CF\u662F\u5728\u6307\u6325\u8230\u6865\u4E0A\u901A\u8FC7\u52A0\u5BC6\u9891\u9053\u76F4\u63A5\u5BF9\u8BDD\u3002
    2. \u98CE\u683C\u5E94\u7ED3\u5408\u786C\u6838\u79D1\u5E7B\u3001\u519B\u5B98\u7684\u5A01\u4E25\uFF0C\u6216\u8005\u4E00\u70B9\u8001\u6D3E\u519B\u4EBA\u7684\u9ED1\u8272\u5E7D\u9ED8\u3002
    3. \u8BC4\u4EF7\u8981\u7B80\u77ED\u6709\u529B\uFF0C\u63A7\u5236\u5728 2 \u53E5\u8BDD\u5185\u3002
    4. \u4E0D\u8981\u5305\u542B\u201C\u8BC4\u4EF7\u5982\u4E0B\u201D\u4E4B\u7C7B\u7684\u5E9F\u8BDD\uFF0C\u76F4\u63A5\u8F93\u51FA\u5BF9\u8BDD\u5185\u5BB9\u3002
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text?.trim() || "\u6570\u636E\u4F20\u8F93\u53D7\u635F\uFF0C\u4F46\u4F60\u7684\u6218\u7EE9\u5C06\u88AB\u661F\u7CFB\u94ED\u8BB0\u3002";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "\u901A\u8BAF\u4E2D\u5FC3\u6682\u65F6\u79BB\u7EBF\uFF0C\u4F60\u7684\u82F1\u52C7\u4E8B\u8FF9\u5DF2\u5B58\u5165\u9ED1\u5323\u5B50\u3002";
  }
};

// components/SummaryOverlay.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var SummaryOverlay = ({ stats, onRestart, onOpenTalents, skin }) => {
  const [lore, setLore] = useState3("\u6B63\u5728\u5206\u6790\u6218\u6597\u6570\u636E...");
  const [loading, setLoading] = useState3(true);
  const isSpring = skin === "SPRING_FESTIVAL";
  const isLgbt = skin === "LGBT";
  useEffect2(() => {
    const fetchLore = async () => {
      const result = await getGameSummaryLore(stats);
      setLore(result);
      setLoading(false);
    };
    fetchLore();
  }, [stats]);
  return /* @__PURE__ */ jsx3("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500", children: /* @__PURE__ */ jsxs3("div", { className: `max-w-md w-full mx-4 p-8 border rounded-3xl shadow-2xl transition-all duration-1000 ${isSpring ? "bg-red-950 border-amber-900/50" : isLgbt ? "bg-purple-950 border-pink-500/30 shadow-pink-500/20" : "bg-gray-900 border-gray-800"}`, children: [
    /* @__PURE__ */ jsx3("h2", { className: `text-4xl font-extrabold mb-6 text-center tracking-tight ${isSpring ? "text-amber-400" : isLgbt ? "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400" : "text-white"}`, children: isSpring ? "\u5B88\u5C81\u7ED3\u7AE0" : isLgbt ? "\u7231\u4E0E\u80DC\u5229" : "\u7CFB\u7EDF\u6545\u969C" }),
    /* @__PURE__ */ jsxs3("div", { className: "grid grid-cols-2 gap-4 mb-8", children: [
      /* @__PURE__ */ jsx3(StatCard, { label: "\u672C\u6B21\u6536\u96C6", value: stats.fragmentsCollected, color: isSpring ? "text-amber-400" : isLgbt ? "text-pink-300" : "text-amber-400", isSpring, isLgbt }),
      /* @__PURE__ */ jsx3(StatCard, { label: "\u6838\u5FC3\u6536\u96C6", value: stats.coresCollected, color: isSpring ? "text-yellow-200" : isLgbt ? "text-indigo-200" : "text-purple-400", isSpring, isLgbt }),
      /* @__PURE__ */ jsx3(StatCard, { label: "\u51FB\u6BC1\u9668\u77F3", value: stats.meteoritesDestroyed, color: isSpring ? "text-red-500" : isLgbt ? "text-red-300" : "text-red-400", isSpring, isLgbt }),
      /* @__PURE__ */ jsx3(StatCard, { label: "\u53D1\u5C04\u5B50\u5F39", value: stats.bulletsFired, color: isSpring ? "text-orange-400" : isLgbt ? "text-cyan-300" : "text-emerald-400", isSpring, isLgbt })
    ] }),
    /* @__PURE__ */ jsxs3("div", { className: `p-6 rounded-2xl border mb-8 min-h-[120px] flex flex-col justify-center ${isSpring ? "bg-black/40 border-amber-900/30" : isLgbt ? "bg-black/40 border-pink-500/20" : "bg-black/50 border-gray-800"}`, children: [
      /* @__PURE__ */ jsx3("h3", { className: "text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold", children: "\u6307\u6325\u5B98\u70B9\u8BC4" }),
      loading ? /* @__PURE__ */ jsxs3("div", { className: "flex items-center space-x-2 text-gray-400 italic text-sm", children: [
        /* @__PURE__ */ jsx3("div", { className: `w-2 h-2 rounded-full animate-bounce ${isSpring ? "bg-red-600" : isLgbt ? "bg-pink-500" : "bg-gray-600"}` }),
        /* @__PURE__ */ jsx3("div", { className: `w-2 h-2 rounded-full animate-bounce delay-100 ${isSpring ? "bg-red-600" : isLgbt ? "bg-pink-500" : "bg-gray-600"}` }),
        /* @__PURE__ */ jsx3("span", { children: "\u6B63\u5728\u89E3\u7801\u4F20\u8F93\u4FE1\u53F7..." })
      ] }) : /* @__PURE__ */ jsxs3("p", { className: `italic leading-relaxed text-lg ${isSpring ? "text-amber-200/90" : isLgbt ? "text-pink-100/90" : "text-gray-300"}`, children: [
        '"',
        lore,
        '"'
      ] })
    ] }),
    /* @__PURE__ */ jsxs3("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ jsx3(
        "button",
        {
          onClick: onRestart,
          className: `w-full py-4 px-6 font-bold rounded-2xl transition-all active:scale-95 shadow-xl ${isSpring ? "bg-gradient-to-r from-amber-500 to-amber-600 text-red-950 hover:from-amber-400" : isLgbt ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:opacity-90" : "bg-white text-black hover:bg-gray-200"}`,
          children: isSpring ? "\u518D\u6B21\u5F00\u542F\u65B0\u6625\u5B88\u536B" : isLgbt ? "\u5F00\u542F\u65B0\u7684\u5F69\u8679\u5F81\u7A0B" : "\u91CD\u65B0\u542F\u52A8\u9632\u5FA1\u534F\u8BAE"
        }
      ),
      /* @__PURE__ */ jsx3(
        "button",
        {
          onClick: onOpenTalents,
          className: `w-full py-4 px-6 font-bold rounded-2xl border transition-all active:scale-95 ${isSpring ? "bg-red-900/30 border-amber-900/50 text-amber-500 hover:bg-red-900/50" : isLgbt ? "bg-purple-900/30 border-pink-500/30 text-pink-400 hover:bg-purple-900/50" : "bg-gray-800 text-white border-gray-700 hover:bg-gray-700"}`,
          children: "\u8FDB\u5165\u7814\u53D1\u4E2D\u5FC3 (\u5347\u7EA7)"
        }
      )
    ] })
  ] }) });
};
var StatCard = ({ label, value, color, isSpring, isLgbt }) => /* @__PURE__ */ jsxs3("div", { className: `p-4 rounded-2xl border ${isSpring ? "bg-red-900/20 border-amber-900/30" : isLgbt ? "bg-purple-900/20 border-pink-500/10" : "bg-gray-800/50 border-gray-700/50"}`, children: [
  /* @__PURE__ */ jsx3("div", { className: "text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1", children: label }),
  /* @__PURE__ */ jsx3("div", { className: `text-2xl font-mono font-bold ${color}`, children: value })
] });
var SummaryOverlay_default = SummaryOverlay;

// components/TalentTree.tsx
import { useState as useState4, useMemo } from "react";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var TalentTree = ({ onBack, skin }) => {
  const [state, setState] = useState4(talentService.getState());
  const isSpring = skin === "SPRING_FESTIVAL";
  const isLgbt = skin === "LGBT";
  const handleUpgrade = (id) => {
    if (talentService.upgradeTalent(id)) {
      setState(talentService.getState());
    }
  };
  const bonuses = useMemo(() => talentService.getBonuses(), [state]);
  const nodePositions = {
    cooldown: { x: 180, y: 150, icon: "\u26A1", color: "#0ea5e9" },
    bulletTrail: { x: 420, y: 150, icon: "\u{1F6F0}\uFE0F", color: "#0ea5e9" },
    damage: { x: 180, y: 320, icon: "\u{1F4A5}", color: "#ef4444" },
    spawnRate: { x: 180, y: 490, icon: "\u{1F9F2}", color: "#8b5cf6" },
    fragmentValue: { x: 420, y: 420, icon: "\u{1F48E}", color: "#fbbf24" },
    magnetRange: { x: 420, y: 560, icon: "\u{1F9F2}", color: "#38bdf8" }
  };
  const connections = useMemo(() => {
    return TALENT_NODES.filter((n) => n.prerequisiteId).map((n) => ({
      from: nodePositions[n.prerequisiteId],
      to: nodePositions[n.id],
      isUnlocked: (state.levels[n.prerequisiteId] || 0) > 0
    }));
  }, [state.levels]);
  const renderNode = (node) => {
    const level = state.levels[node.id] || 0;
    const isMax = level >= node.maxLevel;
    const isUnlocked = level > 0;
    const isPrereqMet = node.prerequisiteId ? (state.levels[node.prerequisiteId] || 0) > 0 : true;
    const cost = node.costPerLevel * (level + 1);
    const canAfford = state.totalFragments >= cost;
    const pos = nodePositions[node.id];
    return /* @__PURE__ */ jsxs4(
      "div",
      {
        style: { left: pos.x, top: pos.y },
        className: "absolute -translate-x-1/2 -translate-y-1/2 group z-20 flex flex-col items-center gap-3",
        children: [
          /* @__PURE__ */ jsxs4("div", { className: `
          absolute bottom-full mb-4 w-48 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30 border text-center translate-y-2 group-hover:translate-y-0
          ${isSpring ? "bg-red-950/95 border-amber-900 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]" : "bg-slate-900/95 border-slate-700 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"}
        `, children: [
            /* @__PURE__ */ jsx4("p", { className: `text-[10px] leading-relaxed font-medium ${isSpring ? "text-amber-100" : "text-slate-300"}`, children: node.description }),
            /* @__PURE__ */ jsx4("div", { className: `absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45 border-r border-b ${isSpring ? "bg-red-950 border-amber-900" : "bg-slate-900 border-slate-700"}` })
          ] }),
          /* @__PURE__ */ jsxs4(
            "div",
            {
              onClick: () => isPrereqMet && !isMax && handleUpgrade(node.id),
              className: `
            w-16 h-16 rounded-2xl flex items-center justify-center text-3xl cursor-pointer transition-all duration-300 border-2 backdrop-blur-md relative transform group-hover:scale-110
            ${!isPrereqMet ? "bg-slate-900/30 border-slate-800 grayscale opacity-40 blur-[1px] cursor-not-allowed" : isSpring ? "bg-red-950/40 border-amber-900/50 hover:border-amber-400" : "bg-slate-900/60 border-slate-700 hover:border-sky-400"}
            ${isUnlocked ? isSpring ? "shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "shadow-[0_0_15px_rgba(14,165,233,0.2)]" : ""}
            ${isMax ? isSpring ? "border-amber-400" : "border-sky-400" : ""}
          `,
              children: [
                /* @__PURE__ */ jsx4("span", { className: `${!isPrereqMet ? "opacity-20" : "drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"}`, children: pos.icon }),
                isMax && /* @__PURE__ */ jsx4("div", { className: `absolute -inset-1 rounded-2xl border animate-pulse ${isSpring ? "border-amber-400/30" : "border-sky-400/30"}` })
              ]
            }
          ),
          /* @__PURE__ */ jsxs4("div", { className: "flex flex-col items-center pointer-events-none", children: [
            /* @__PURE__ */ jsx4("div", { className: `text-[10px] font-black uppercase tracking-widest mb-1 ${isSpring ? "text-amber-500/80" : "text-slate-400"}`, children: node.name }),
            /* @__PURE__ */ jsx4("div", { className: `
            px-2 py-0.5 rounded-full text-[9px] font-mono font-bold whitespace-nowrap border
            ${isSpring ? "bg-red-900/80 border-amber-600/50 text-amber-200" : "bg-slate-900 border-slate-700 text-sky-400"}
            ${isMax ? isSpring ? "bg-amber-500 text-red-950 border-amber-400" : "bg-sky-500 text-black border-sky-400" : ""}
          `, children: isMax ? "MAX" : `${level} / ${node.maxLevel}` }),
            !isMax && isPrereqMet && /* @__PURE__ */ jsxs4("div", { className: `mt-1 flex items-center gap-1 text-[9px] font-bold ${canAfford ? "text-amber-400" : "text-rose-500 opacity-60"}`, children: [
              /* @__PURE__ */ jsx4("div", { className: "w-1.5 h-1.5 rounded-full bg-current" }),
              cost
            ] })
          ] })
        ]
      },
      node.id
    );
  };
  const currentStats = [
    { label: "\u5B50\u5F39\u706B\u529B (Dmg)", value: (BULLET_DAMAGE + bonuses.damageBoost).toFixed(0), bonus: `+${bonuses.damageBoost}`, unit: "pt" },
    { label: "\u5C04\u51FB\u95F4\u9694 (CD)", value: ((BULLET_FIRE_COOLDOWN - bonuses.cooldownReduction) / 1e3).toFixed(1), bonus: `-${(bonuses.cooldownReduction / 1e3).toFixed(1)}`, unit: "s" },
    { label: "\u98DE\u884C\u521D\u901F (Vel)", value: (BULLET_SPEED + bonuses.bulletSpeedBoost).toFixed(1), bonus: `+${bonuses.bulletSpeedBoost.toFixed(1)}`, unit: "m/s" },
    { label: "\u5F15\u529B\u4FE1\u6807 (Grav)", value: (1 + bonuses.spawnBoost).toFixed(1), bonus: `x${(1 + bonuses.spawnBoost).toFixed(1)}`, unit: "x" },
    { label: "\u56DE\u6536\u589E\u5E45 (Gain)", value: (4 + bonuses.fragmentBonus).toFixed(0), bonus: `+${bonuses.fragmentBonus}`, unit: "qty" },
    { label: "\u78C1\u529B\u8303\u56F4 (Mag)", value: (30 + bonuses.magnetRangeBoost).toFixed(0), bonus: `+${bonuses.magnetRangeBoost}`, unit: "px" }
  ];
  return /* @__PURE__ */ jsxs4("div", { className: `fixed inset-0 z-50 flex flex-col items-center justify-start overflow-hidden ${isSpring ? "bg-[#1a0b0b]" : "bg-[#020617]"}`, children: [
    /* @__PURE__ */ jsx4(
      "div",
      {
        className: "absolute inset-0 opacity-20 pointer-events-none",
        style: { backgroundImage: "linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)", backgroundSize: "60px 60px" }
      }
    ),
    /* @__PURE__ */ jsxs4("div", { className: "w-full h-20 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-10 z-50", children: [
      /* @__PURE__ */ jsxs4("button", { onClick: onBack, className: `flex items-center gap-3 px-4 py-2 group transition-colors ${isSpring ? "text-amber-500 hover:text-amber-400" : "text-slate-400 hover:text-white"}`, children: [
        /* @__PURE__ */ jsx4("span", { className: "text-xl", children: "\u2190" }),
        /* @__PURE__ */ jsx4("span", { className: "font-bold uppercase tracking-[0.2em] text-[11px]", children: "\u9000\u51FA\u7814\u53D1" })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-6", children: [
        /* @__PURE__ */ jsxs4("div", { className: `flex items-center gap-3 border rounded-2xl px-5 py-2 transition-all ${isSpring ? "bg-red-950/40 border-amber-900/50" : "bg-black/40 border-white/5"}`, children: [
          /* @__PURE__ */ jsx4("div", { className: "text-[9px] uppercase font-bold text-slate-500", children: "\u53EF\u7528\u80FD\u91CF\u788E\u7247" }),
          /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx4("div", { className: "w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" }),
            /* @__PURE__ */ jsx4("span", { className: "text-lg font-mono font-black text-amber-400", children: state.totalFragments.toLocaleString() })
          ] })
        ] }),
        /* @__PURE__ */ jsxs4("div", { className: `flex items-center gap-3 border rounded-2xl px-5 py-2 transition-all ${isSpring ? "bg-red-950/40 border-amber-900/50" : "bg-black/40 border-white/5"}`, children: [
          /* @__PURE__ */ jsx4("div", { className: "text-[9px] uppercase font-bold text-slate-500", children: "\u9668\u77F3\u6838\u5FC3" }),
          /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx4("div", { className: "w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" }),
            /* @__PURE__ */ jsx4("span", { className: "text-lg font-mono font-black text-purple-400", children: state.totalCores.toLocaleString() })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx4("div", { className: "relative flex-1 w-full flex items-center justify-center", children: /* @__PURE__ */ jsxs4("div", { className: "relative w-full h-full max-w-6xl flex", children: [
      /* @__PURE__ */ jsxs4("div", { className: "relative flex-1 h-full", children: [
        /* @__PURE__ */ jsxs4("svg", { className: "absolute inset-0 w-full h-full z-10 pointer-events-none opacity-50", children: [
          /* @__PURE__ */ jsx4("defs", { children: /* @__PURE__ */ jsxs4("filter", { id: "glow", children: [
            /* @__PURE__ */ jsx4("feGaussianBlur", { stdDeviation: "2", result: "coloredBlur" }),
            /* @__PURE__ */ jsxs4("feMerge", { children: [
              /* @__PURE__ */ jsx4("feMergeNode", { in: "coloredBlur" }),
              /* @__PURE__ */ jsx4("feMergeNode", { in: "SourceGraphic" })
            ] })
          ] }) }),
          connections.map((conn, i) => /* @__PURE__ */ jsx4(
            "line",
            {
              x1: conn.from.x,
              y1: conn.from.y,
              x2: conn.to.x,
              y2: conn.to.y,
              stroke: conn.isUnlocked ? isSpring ? "#f59e0b" : "#0ea5e9" : "#1e293b",
              strokeWidth: conn.isUnlocked ? "3" : "1",
              strokeDasharray: conn.isUnlocked ? "" : "4,4",
              filter: conn.isUnlocked ? "url(#glow)" : ""
            },
            i
          ))
        ] }),
        TALENT_NODES.map((node) => renderNode(node))
      ] }),
      /* @__PURE__ */ jsx4("div", { className: "w-80 h-full py-10 pr-10 z-20 flex flex-col justify-center", children: /* @__PURE__ */ jsxs4("div", { className: `p-6 rounded-3xl border backdrop-blur-md shadow-2xl ${isSpring ? "bg-red-950/40 border-amber-900/50" : isLgbt ? "bg-purple-950/40 border-pink-500/30" : "bg-slate-900/60 border-slate-800"}`, children: [
        /* @__PURE__ */ jsx4("h3", { className: `text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-center ${isSpring ? "text-amber-500" : "text-sky-400"}`, children: "\u7CFB\u7EDF\u5C5E\u6027\u76D1\u6D4B (System Specs)" }),
        /* @__PURE__ */ jsx4("div", { className: "space-y-5", children: currentStats.map((stat, i) => /* @__PURE__ */ jsxs4("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxs4("div", { className: "flex justify-between items-end", children: [
            /* @__PURE__ */ jsx4("span", { className: "text-[9px] font-bold text-slate-500 uppercase tracking-tighter", children: stat.label }),
            /* @__PURE__ */ jsx4("span", { className: `text-[10px] font-mono font-bold ${isSpring ? "text-amber-600" : "text-sky-600"}`, children: stat.bonus })
          ] }),
          /* @__PURE__ */ jsxs4("div", { className: "flex items-baseline gap-1", children: [
            /* @__PURE__ */ jsx4("span", { className: `text-xl font-mono font-black ${isSpring ? "text-amber-100" : "text-white"}`, children: stat.value }),
            /* @__PURE__ */ jsx4("span", { className: "text-[9px] font-bold text-slate-600 uppercase", children: stat.unit })
          ] }),
          /* @__PURE__ */ jsx4("div", { className: "w-full h-[2px] bg-slate-800/50 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx4(
            "div",
            {
              className: `h-full transition-all duration-1000 ${isSpring ? "bg-amber-500" : "bg-sky-500"}`,
              style: { width: `${Math.min(100, parseFloat(stat.value) / 20 * 100)}%` }
            }
          ) })
        ] }, i)) }),
        /* @__PURE__ */ jsx4("div", { className: "mt-8 pt-6 border-t border-white/5", children: /* @__PURE__ */ jsx4("div", { className: `text-[8px] leading-relaxed italic text-center ${isSpring ? "text-amber-700" : "text-slate-600"}`, children: "* \u53C2\u6570\u57FA\u4E8E\u5F53\u524D\u5DF2\u5B89\u88C5\u7684\u6838\u5FC3\u6A21\u7EC4\u5B9E\u65F6\u8BA1\u7B97\uFF0C\u6218\u6597\u4E2D\u62FE\u53D6\u7684\u5361\u724C\u589E\u76CA\u4E0D\u8BA1\u5165\u6B64\u5217\u8868\u3002" }) })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxs4("div", { className: `w-full py-2 px-10 border-t flex justify-between items-center text-[9px] font-bold tracking-widest uppercase ${isSpring ? "bg-red-950/80 border-amber-900/30 text-amber-900" : "bg-slate-950/80 border-white/5 text-slate-600"}`, children: [
      /* @__PURE__ */ jsx4("span", { children: "Sentinel R&D Department" }),
      /* @__PURE__ */ jsx4("span", { children: "Stats Analysis: Online" })
    ] })
  ] });
};
var TalentTree_default = TalentTree;

// components/OpeningAnimation.tsx
import { useEffect as useEffect3, useRef as useRef2, useState as useState5, useMemo as useMemo2 } from "react";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var OpeningAnimation = ({ onComplete, skin }) => {
  const canvasRef = useRef2(null);
  const [stage, setStage] = useState5(0);
  const [progress, setProgress] = useState5(0);
  const isSpring = skin === "SPRING_FESTIVAL";
  const isLgbt = skin === "LGBT";
  const theme = useMemo2(() => {
    if (isSpring) {
      return {
        starColor: "#fbbf24",
        glowColor: "rgba(153, 27, 27, 0.4)",
        messages: ["\u7965\u4E91\u7CFB\u7EDF\u70B9\u706B...", "\u8F7D\u5165\u5B88\u5C81\u534F\u8BAE...", "\u745E\u6C14\u80FD\u91CF\u540C\u6B65...", "\u9A71\u5E74\u4FE1\u6807\u6FC0\u6D3B!", "\u6838\u5FC3\u9632\u5FA1\u5C31\u7EEA!"],
        primary: "text-amber-400",
        accent: "bg-amber-500"
      };
    } else if (isLgbt) {
      return {
        starColor: "#fff",
        glowColor: "rgba(168, 85, 247, 0.4)",
        messages: ["\u591A\u5F69\u9891\u8C31\u626B\u63CF...", "\u81EA\u7531\u610F\u5FD7\u6838\u5FC3...", "\u5305\u5BB9\u529B\u573A\u5C55\u5F00...", "\u9A84\u50B2\u4E4B\u5149\u5145\u80FD!", "\u7231\u5373\u662F\u76FE\uFF0C\u51FA\u53D1!"],
        primary: "text-pink-400",
        accent: "bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-400 to-purple-500"
      };
    } else {
      return {
        starColor: "#fff",
        glowColor: "rgba(56, 189, 248, 0.4)",
        messages: ["\u7CFB\u7EDF\u521D\u59CB\u5316...", "\u540C\u6B65\u9632\u5FA1\u77E9\u9635...", "\u7A7A\u95F4\u8DF3\u8DC3\u51C6\u5907...", "\u63A8\u8FDB\u5668\u5168\u5F00!", "\u6218\u6597\u72B6\u6001\u786E\u8BA4!"],
        primary: "text-sky-400",
        accent: "bg-sky-500"
      };
    }
  }, [isSpring, isLgbt]);
  useEffect3(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const stars = Array.from({ length: 800 }, () => ({
      x: Math.random() * width - width / 2,
      y: Math.random() * height - height / 2,
      z: Math.random() * width,
      px: 0,
      py: 0
    }));
    let animationFrame;
    let speed = 2;
    let currentProgress = 0;
    const animate = () => {
      ctx.fillStyle = isSpring ? "#1a0b0b" : isLgbt ? "#0a0510" : "#000";
      ctx.fillRect(0, 0, width, height);
      if (currentProgress < 0.2)
        speed = 2.5;
      else if (currentProgress < 0.8)
        speed = 2.5 + (currentProgress - 0.2) * 80;
      else
        speed = 50 - (currentProgress - 0.8) * 200;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      stars.forEach((s, i) => {
        s.z -= speed;
        if (s.z <= 0) {
          s.z = width;
          s.x = Math.random() * width - width / 2;
          s.y = Math.random() * height - height / 2;
          s.px = 0;
          s.py = 0;
        }
        const sx = s.x * (width / s.z);
        const sy = s.y * (width / s.z);
        const size = (1 - s.z / width) * 3.5;
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
      if (currentProgress > 0.4 && currentProgress < 0.85) {
        const shake = (currentProgress - 0.4) * 15;
        canvas.style.transform = `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)`;
      } else {
        canvas.style.transform = "none";
      }
      animationFrame = requestAnimationFrame(animate);
    };
    const progressTimer = setInterval(() => {
      currentProgress += 0.03;
      setProgress(Math.min(currentProgress, 1));
      const stageIdx = Math.floor(currentProgress * theme.messages.length);
      setStage(Math.min(stageIdx, theme.messages.length - 1));
      if (currentProgress >= 1) {
        clearInterval(progressTimer);
        setTimeout(onComplete, 200);
      }
    }, 20);
    animate();
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(progressTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [onComplete, theme, isSpring, isLgbt]);
  return /* @__PURE__ */ jsxs5("div", { className: "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden font-mono", children: [
    /* @__PURE__ */ jsx5("canvas", { ref: canvasRef, className: "absolute inset-0" }),
    /* @__PURE__ */ jsx5("div", { className: `absolute inset-0 pointer-events-none transition-opacity duration-500 ${progress > 0.5 ? "opacity-40" : "opacity-20"} ${isSpring ? "bg-gradient-to-t from-red-900/50 to-transparent" : isLgbt ? "bg-gradient-to-t from-purple-900/50 to-transparent" : "bg-gradient-to-t from-sky-900/50 to-transparent"}` }),
    /* @__PURE__ */ jsxs5("div", { className: "relative z-10 flex flex-col items-center gap-4 w-full max-w-lg", children: [
      /* @__PURE__ */ jsxs5("div", { className: "flex flex-col items-center", children: [
        /* @__PURE__ */ jsx5("div", { className: `text-[10px] uppercase tracking-[0.5em] mb-4 opacity-50 ${theme.primary}`, children: "Hyper-Space Sequence" }),
        /* @__PURE__ */ jsx5("div", { className: `text-3xl font-black italic tracking-wider transition-all duration-150 ${theme.primary} drop-shadow-lg`, children: theme.messages[stage] })
      ] }),
      /* @__PURE__ */ jsx5("div", { className: "absolute top-1/2 -translate-y-1/2 -left-20 flex flex-col gap-1 opacity-20 hidden md:flex", children: Array.from({ length: 12 }).map((_, i) => /* @__PURE__ */ jsx5("div", { className: `h-4 w-1 ${i <= stage * 2 ? theme.accent : "bg-white/20"}` }, i)) }),
      /* @__PURE__ */ jsxs5("div", { className: "absolute top-1/2 -translate-y-1/2 -right-20 flex flex-col gap-1 opacity-20 hidden md:flex text-[8px] text-white", children: [
        /* @__PURE__ */ jsxs5("span", { children: [
          "VELOCITY: ",
          (progress * 299792).toFixed(0),
          " KM/S"
        ] }),
        /* @__PURE__ */ jsxs5("span", { children: [
          "ALT: ",
          (progress * 149).toFixed(1),
          " AU"
        ] }),
        /* @__PURE__ */ jsxs5("span", { children: [
          "FUEL: ",
          (100 - progress * 15).toFixed(1),
          "%"
        ] })
      ] })
    ] }),
    progress > 0.9 && /* @__PURE__ */ jsx5(
      "div",
      {
        className: "absolute inset-0 bg-white z-[110] transition-opacity duration-300",
        style: { opacity: (progress - 0.9) * 10 }
      }
    )
  ] });
};
var OpeningAnimation_default = OpeningAnimation;

// components/SettingsOverlay.tsx
import { useState as useState6, useEffect as useEffect4 } from "react";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var SettingsOverlay = ({ onClose, onResetSave }) => {
  const [volume, setVolume] = useState6(audioManager.getVolume());
  const [isFullscreen, setIsFullscreen] = useState6(!!document.fullscreenElement);
  const [showConfirmReset, setShowConfirmReset] = useState6(false);
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioManager.setVolume(val);
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  useEffect4(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);
  return /* @__PURE__ */ jsx6("div", { className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300", children: /* @__PURE__ */ jsxs6("div", { className: "w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative", children: [
    /* @__PURE__ */ jsx6(
      "button",
      {
        onClick: onClose,
        className: "absolute top-6 right-6 text-slate-500 hover:text-white transition-colors",
        children: /* @__PURE__ */ jsx6("span", { className: "text-2xl", children: "\u2715" })
      }
    ),
    /* @__PURE__ */ jsx6("h2", { className: "text-2xl font-black text-white mb-8 tracking-[0.2em] uppercase border-b border-slate-800 pb-4", children: "\u7CFB\u7EDF\u8BBE\u7F6E" }),
    /* @__PURE__ */ jsxs6("div", { className: "space-y-8", children: [
      /* @__PURE__ */ jsxs6("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs6("div", { className: "flex justify-between items-center", children: [
          /* @__PURE__ */ jsx6("label", { className: "text-xs font-bold text-slate-400 uppercase tracking-widest", children: "\u4E3B\u97F3\u91CF" }),
          /* @__PURE__ */ jsxs6("span", { className: "text-xs font-mono text-sky-400", children: [
            Math.round(volume * 100),
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsx6(
          "input",
          {
            type: "range",
            min: "0",
            max: "1",
            step: "0.01",
            value: volume,
            onChange: handleVolumeChange,
            className: "w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs6("div", { className: "flex justify-between items-center p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50", children: [
        /* @__PURE__ */ jsxs6("div", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsx6("span", { className: "text-sm font-bold text-white uppercase tracking-wider", children: "\u5168\u5C4F\u6A21\u5F0F" }),
          /* @__PURE__ */ jsx6("span", { className: "text-[10px] text-slate-500 uppercase mt-1", children: "\u6C89\u6D78\u5F0F\u6218\u6597\u4F53\u9A8C" })
        ] }),
        /* @__PURE__ */ jsx6(
          "button",
          {
            onClick: toggleFullscreen,
            className: `w-12 h-6 rounded-full transition-colors relative ${isFullscreen ? "bg-sky-500" : "bg-slate-700"}`,
            children: /* @__PURE__ */ jsx6("div", { className: `absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isFullscreen ? "left-7" : "left-1"}` })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs6("div", { className: "pt-4 border-t border-slate-800/50", children: [
        /* @__PURE__ */ jsx6("h3", { className: "text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-4", children: "\u5371\u9669\u533A\u57DF" }),
        /* @__PURE__ */ jsx6(
          "button",
          {
            onClick: () => setShowConfirmReset(true),
            className: "w-full py-3 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest",
            children: "\u62B9\u9664\u6240\u6709\u4F5C\u6218\u5B58\u6863"
          }
        )
      ] })
    ] }),
    showConfirmReset && /* @__PURE__ */ jsx6("div", { className: "absolute inset-0 z-10 flex items-center justify-center bg-slate-900 rounded-3xl p-8 border border-rose-500/30", children: /* @__PURE__ */ jsxs6("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx6("div", { className: "text-4xl mb-4", children: "\u26A0\uFE0F" }),
      /* @__PURE__ */ jsx6("h3", { className: "text-lg font-bold text-white mb-2", children: "\u786E\u8BA4\u6E05\u7A7A\uFF1F" }),
      /* @__PURE__ */ jsx6("p", { className: "text-xs text-slate-400 mb-6 leading-relaxed", children: "\u8BE5\u64CD\u4F5C\u5C06\u6C38\u4E45\u5220\u9664\u6240\u6709\u7814\u53D1\u8FDB\u5EA6\u548C\u8D44\u6E90\uFF0C\u65E0\u6CD5\u64A4\u9500\u3002" }),
      /* @__PURE__ */ jsxs6("div", { className: "flex gap-4", children: [
        /* @__PURE__ */ jsx6("button", { onClick: () => setShowConfirmReset(false), className: "flex-1 py-2 text-xs font-bold text-slate-400 hover:text-white", children: "\u53D6\u6D88" }),
        /* @__PURE__ */ jsx6(
          "button",
          {
            onClick: () => {
              onResetSave();
              setShowConfirmReset(false);
            },
            className: "flex-1 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg",
            children: "\u786E\u8BA4\u5220\u9664"
          }
        )
      ] })
    ] }) })
  ] }) });
};
var SettingsOverlay_default = SettingsOverlay;

// components/BackgroundAtmosphere.tsx
import { useEffect as useEffect5, useRef as useRef3 } from "react";
import { jsx as jsx7 } from "react/jsx-runtime";
var BackgroundAtmosphere = ({ skin }) => {
  const canvasRef = useRef3(null);
  const isSpring = skin === "SPRING_FESTIVAL";
  const isLgbt = skin === "LGBT";
  useEffect5(() => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;
    let frameId;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    const starLayers = [
      { count: 150, speed: 0.05, size: 0.8, opacity: 0.3 },
      { count: 100, speed: 0.12, size: 1.5, opacity: 0.6 },
      { count: 30, speed: 0.25, size: 2.2, opacity: 0.9 }
    ].map((layer) => Array.from({ length: layer.count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * layer.size,
      opacity: Math.random() * layer.opacity,
      speed: layer.speed,
      color: isLgbt ? `hsl(${Math.random() * 360}, 80%, 75%)` : isSpring ? "#fbbf24" : "#fff"
    })));
    const comets = Array.from({ length: isLgbt ? 4 : 2 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: -2 - Math.random() * 5,
      vy: 1 + Math.random() * 2,
      length: 50 + Math.random() * 100,
      active: false,
      timer: Math.random() * 1e3,
      color: isLgbt ? `hsl(${Math.random() * 360}, 80%, 70%)` : "#fff"
    }));
    const nebulae = Array.from({ length: isLgbt ? 8 : 6 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 400 + Math.random() * 500,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 2e-3,
      color: isLgbt ? [`rgba(239, 68, 68, 0.08)`, `rgba(245, 158, 11, 0.08)`, `rgba(251, 191, 36, 0.08)`, `rgba(34, 197, 94, 0.08)`, `rgba(59, 130, 246, 0.08)`, `rgba(168, 85, 247, 0.08)`][i % 6] : isSpring ? "rgba(153, 27, 27, 0.08)" : "rgba(30, 58, 138, 0.08)"
    }));
    const planets = Array.from({ length: 4 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 15 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 8e-4,
      color: isLgbt ? `hsla(${i * 90 % 360}, 70%, 55%, 0.15)` : isSpring ? "rgba(251, 191, 36, 0.12)" : "rgba(71, 85, 105, 0.1)",
      details: Array.from({ length: 3 }, () => ({
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        r: Math.random() * 5 + 2,
        opacity: Math.random() * 0.2 + 0.1
      }))
    }));
    const render = () => {
      ctx.fillStyle = isSpring ? "#1a0b0b" : isLgbt ? "#0a0510" : "#000";
      ctx.fillRect(0, 0, width, height);
      nebulae.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        n.rotation += n.rotationSpeed;
        if (n.x < -n.radius)
          n.x = width + n.radius;
        if (n.x > width + n.radius)
          n.x = -n.radius;
        if (n.y < -n.radius)
          n.y = height + n.radius;
        if (n.y > height + n.radius)
          n.y = -n.radius;
        ctx.save();
        const offsetX = Math.cos(n.rotation) * (n.radius * 0.2);
        const offsetY = Math.sin(n.rotation) * (n.radius * 0.2);
        const grad = ctx.createRadialGradient(n.x + offsetX, n.y + offsetY, 0, n.x, n.y, n.radius);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      });
      starLayers.forEach((layer) => {
        layer.forEach((s) => {
          s.y += s.speed;
          if (s.y > height) {
            s.y = 0;
            s.x = Math.random() * width;
          }
          ctx.globalAlpha = 0.2 + Math.abs(Math.sin(Date.now() * 8e-4 + s.x)) * 0.8;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.globalAlpha = 1;
      comets.forEach((c) => {
        if (!c.active) {
          c.timer--;
          if (c.timer <= 0) {
            c.active = true;
            c.x = width + 100;
            c.y = Math.random() * height * 0.5;
            c.timer = 500 + Math.random() * 1e3;
          }
        } else {
          c.x += c.vx;
          c.y += c.vy;
          const grad = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 10, c.y - c.vy * 10);
          grad.addColorStop(0, c.color);
          grad.addColorStop(1, "transparent");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + c.vx * 5, c.y + c.vy * 5);
          ctx.stroke();
          if (c.x < -200 || c.y > height + 200)
            c.active = false;
        }
      });
      planets.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (p.x < -p.radius * 2)
          p.x = width + p.radius * 2;
        if (p.x > width + p.radius * 2)
          p.x = -p.radius * 2;
        if (p.y < -p.radius * 2)
          p.y = height + p.radius * 2;
        if (p.y > height + p.radius * 2)
          p.y = -p.radius * 2;
        ctx.save();
        ctx.translate(p.x, p.y);
        const glowGrad = ctx.createRadialGradient(0, 0, p.radius, 0, 0, p.radius * 1.5);
        glowGrad.addColorStop(0, p.color);
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.rotate(p.rotation);
        const pGrad = ctx.createLinearGradient(-p.radius, -p.radius, p.radius, p.radius);
        pGrad.addColorStop(0, p.color);
        pGrad.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        p.details.forEach((d) => {
          ctx.fillStyle = isLgbt ? `hsla(${Math.random() * 360}, 50%, 90%, 0.1)` : "rgba(255, 255, 255, 0.05)";
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 1.6, p.radius * 0.3, Math.PI / 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
      frameId = requestAnimationFrame(render);
    };
    render();
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
    };
  }, [skin, isSpring, isLgbt]);
  return /* @__PURE__ */ jsx7("canvas", { ref: canvasRef, className: "fixed inset-0 z-0 pointer-events-none" });
};
var BackgroundAtmosphere_default = BackgroundAtmosphere;

// App.tsx
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
var App = () => {
  const [gameState, setGameState] = useState7("START");
  const [lastStats, setLastStats] = useState7(null);
  const [showSettings, setShowSettings] = useState7(false);
  const [skin, setSkin] = useState7(talentService.getState().currentSkin);
  const isSpring = skin === "SPRING_FESTIVAL";
  const isLgbt = skin === "LGBT";
  const handleGameOver = (stats) => {
    talentService.addCurrency(stats.fragmentsCollected, stats.coresCollected);
    setLastStats(stats);
    setGameState("GAMEOVER");
  };
  const handleStartSequence = () => {
    audioManager.init();
    setGameState("OPENING");
  };
  const startGame = () => {
    setGameState("PLAYING");
    setLastStats(null);
  };
  const toggleSkin = () => {
    let nextSkin = "DEFAULT";
    if (skin === "DEFAULT")
      nextSkin = "SPRING_FESTIVAL";
    else if (skin === "SPRING_FESTIVAL")
      nextSkin = "LGBT";
    else
      nextSkin = "DEFAULT";
    setSkin(nextSkin);
    talentService.setSkin(nextSkin);
  };
  const handleResetSave = () => {
    talentService.resetState();
    window.location.reload();
  };
  const getThemeColor = () => {
    if (isSpring)
      return "text-amber-500";
    if (isLgbt)
      return "text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-blue-400 to-purple-500";
    return "text-white";
  };
  return /* @__PURE__ */ jsxs7("div", { className: `w-screen h-screen overflow-hidden select-none transition-colors duration-1000 ${isSpring ? "bg-[#1a0b0b]" : isLgbt ? "bg-[#0a0510]" : "bg-black"}`, children: [
    /* @__PURE__ */ jsx8("div", { className: `transition-opacity duration-1000 ${gameState === "PLAYING" ? "opacity-60" : "opacity-100"}`, children: /* @__PURE__ */ jsx8(BackgroundAtmosphere_default, { skin }) }),
    showSettings && /* @__PURE__ */ jsx8(
      SettingsOverlay_default,
      {
        onClose: () => setShowSettings(false),
        onResetSave: handleResetSave
      }
    ),
    gameState === "START" && /* @__PURE__ */ jsxs7("div", { className: "fixed inset-0 z-50 flex flex-col items-center justify-center p-4", children: [
      /* @__PURE__ */ jsxs7("div", { className: "absolute top-10 left-10 flex flex-col gap-2 z-50", children: [
        /* @__PURE__ */ jsx8("span", { className: "text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2", children: "Armor Skin" }),
        /* @__PURE__ */ jsxs7(
          "button",
          {
            onClick: toggleSkin,
            className: `flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 shadow-2xl ${isSpring ? "bg-red-950/60 border-amber-500 text-amber-400 shadow-red-900/20" : isLgbt ? "bg-purple-900/60 border-pink-400/50 text-pink-300 shadow-purple-900/20" : "bg-white/5 border-white/10 text-slate-400"}`,
            children: [
              /* @__PURE__ */ jsx8("div", { className: "text-2xl transition-transform duration-500 transform group-hover:rotate-12", children: isSpring ? "\u{1F3EE}" : isLgbt ? "\u{1F3F3}\uFE0F\u200D\u{1F308}" : "\u{1F6F0}\uFE0F" }),
              /* @__PURE__ */ jsxs7("div", { className: "flex flex-col items-start", children: [
                /* @__PURE__ */ jsx8("span", { className: "text-[11px] font-black uppercase tracking-widest leading-none", children: isSpring ? "\u65B0\u6625\u9650\u5B9A" : isLgbt ? "\u591A\u5143\u5B87\u5B99" : "\u6807\u51C6\u578B\u53F7" }),
                /* @__PURE__ */ jsx8("span", { className: "text-[8px] font-bold opacity-50 uppercase tracking-tighter mt-1", children: isSpring ? "Spring Festival" : isLgbt ? "Rainbow Pride" : "Default Armor" })
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs7("div", { className: "text-center max-w-lg relative z-10", children: [
        /* @__PURE__ */ jsx8("h1", { className: `text-7xl font-black mb-2 tracking-tighter uppercase transition-all duration-1000 ${getThemeColor()} ${!isLgbt ? isSpring ? "drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "" : "drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"}`, children: isSpring ? "\u661F\u9645\u5B88\u5C81" : isLgbt ? "\u5F69\u8679\u54E8\u5175" : "\u661F\u9645\u536B\u58EB" }),
        /* @__PURE__ */ jsx8("p", { className: `mb-8 text-lg font-light ${isSpring ? "text-amber-600/80" : isLgbt ? "text-pink-300/80" : "text-gray-400"}`, children: isSpring ? "\u9A71\u9010\u5E74\u517D\u9668\u77F3\uFF0C\u5B88\u62A4\u5BF0\u5B87\u5B89\u5B81\u3002" : isLgbt ? "\u6BCF\u4E00\u79CD\u8272\u5F69\u90FD\u503C\u5F97\u5B88\u62A4\u3002" : "\u6838\u5FC3\u9632\u533A\u6B63\u53D7\u5230\u5A01\u80C1\u3002\u8A93\u6B7B\u4FDD\u536B\u6838\u5FC3\u3002" }),
        /* @__PURE__ */ jsxs7("div", { className: `rounded-3xl p-8 mb-10 text-left transition-all duration-1000 border backdrop-blur-sm ${isSpring ? "bg-red-950/40 border-amber-900/30" : isLgbt ? "bg-purple-900/20 border-pink-500/20" : "bg-gray-900/40 border-gray-800"}`, children: [
          /* @__PURE__ */ jsxs7("h3", { className: `text-xs font-black uppercase tracking-[0.3em] mb-4 text-center ${isSpring ? "text-amber-500/60" : isLgbt ? "text-pink-500/60" : "text-slate-500"}`, children: [
            "\u2014 ",
            isSpring ? "\u4F5C\u6218\u6307\u5357" : isLgbt ? "\u7231\u4E0E\u51C6\u5219" : "HOW TO PLAY",
            " \u2014"
          ] }),
          /* @__PURE__ */ jsxs7("ul", { className: `text-sm space-y-4 font-medium leading-relaxed ${isSpring ? "text-amber-100/80" : isLgbt ? "text-purple-100/80" : "text-gray-300"}`, children: [
            /* @__PURE__ */ jsxs7("li", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx8("div", { className: `w-1 h-1 rounded-full ${isSpring ? "bg-red-500" : isLgbt ? "bg-pink-500" : "bg-sky-500"}` }),
              /* @__PURE__ */ jsx8("span", { children: "\u70B9\u51FB\u9F20\u6807\u5DE6\u952E\u63A7\u5236\u70AE\u5854\u5411\u5149\u6807\u65B9\u5411\u8FDB\u884C\u5C04\u51FB\u3002" })
            ] }),
            /* @__PURE__ */ jsxs7("li", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx8("div", { className: `w-1 h-1 rounded-full ${isSpring ? "bg-red-500" : isLgbt ? "bg-purple-500" : "bg-sky-500"}` }),
              /* @__PURE__ */ jsx8("span", { children: "\u79FB\u52A8\u9F20\u6807\u81F3\u9668\u77F3\u788E\u7247\u4E0A\u8FDB\u884C\u80FD\u91CF\u56DE\u6536\u4E0E\u6536\u96C6\u3002" })
            ] }),
            /* @__PURE__ */ jsxs7("li", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx8("div", { className: `w-1 h-1 rounded-full ${isSpring ? "bg-red-500" : isLgbt ? "bg-blue-500" : "bg-sky-500"}` }),
              /* @__PURE__ */ jsx8("span", { children: "\u82E5\u9668\u77F3\u649E\u51FB\u4E2D\u5FC3\u70AE\u5854\uFF0C\u9632\u5FA1\u534F\u8BAE\u5C06\u7ACB\u5373\u7EC8\u6B62\u3002" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs7("div", { className: "flex flex-col gap-4", children: [
          /* @__PURE__ */ jsxs7("div", { className: "flex gap-4", children: [
            /* @__PURE__ */ jsx8(
              "button",
              {
                onClick: handleStartSequence,
                className: `flex-[2] group relative inline-flex items-center justify-center px-8 py-5 font-bold transition-all duration-200 rounded-2xl active:scale-95 overflow-hidden ${isSpring ? "bg-gradient-to-r from-red-600 to-red-700 text-amber-100 border-2 border-amber-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]" : isLgbt ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]" : "bg-white text-black hover:bg-gray-200 shadow-xl"}`,
                children: /* @__PURE__ */ jsx8("span", { className: "relative z-10", children: isSpring ? "\u5F00\u542F\u65B0\u6625\u5B88\u536B" : isLgbt ? "\u4F20\u64AD\u5F69\u8679\u4E4B\u529B" : "\u542F\u52A8\u9632\u5FA1\u534F\u8BAE" })
              }
            ),
            /* @__PURE__ */ jsx8(
              "button",
              {
                onClick: () => setGameState("TALENTS"),
                className: `flex-1 px-8 py-5 font-bold transition-all duration-200 border rounded-2xl active:scale-95 ${isSpring ? "bg-amber-900/20 border-amber-800 text-amber-500 hover:bg-amber-900/40" : isLgbt ? "bg-purple-900/20 border-pink-500/30 text-pink-400 hover:bg-purple-900/40" : "bg-gray-900 border-gray-700 text-white hover:bg-gray-800"}`,
                children: "\u7814\u53D1\u4E2D\u5FC3"
              }
            )
          ] }),
          /* @__PURE__ */ jsx8("button", { onClick: () => setShowSettings(true), className: "w-full py-4 font-bold text-slate-500 hover:text-white transition-colors tracking-widest text-xs uppercase", children: "\u2699 \u7CFB\u7EDF\u8BBE\u7F6E" })
        ] })
      ] })
    ] }),
    gameState === "OPENING" && /* @__PURE__ */ jsx8(OpeningAnimation_default, { onComplete: startGame, skin }),
    gameState === "PLAYING" && /* @__PURE__ */ jsx8(GameEngine_default, { onGameOver: handleGameOver, skin }),
    gameState === "GAMEOVER" && lastStats && /* @__PURE__ */ jsx8(SummaryOverlay_default, { stats: lastStats, onRestart: handleStartSequence, onOpenTalents: () => setGameState("TALENTS"), skin }),
    gameState === "TALENTS" && /* @__PURE__ */ jsx8(TalentTree_default, { onBack: () => setGameState("START"), skin }),
    /* @__PURE__ */ jsx8(Analytics, {})
  ] });
};
var App_default = App;

// index.tsx
import { jsx as jsx9 } from "react/jsx-runtime";
var container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(/* @__PURE__ */ jsx9(App_default, {}));
}
