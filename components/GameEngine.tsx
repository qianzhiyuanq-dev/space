import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CIRCLE_RADIUS, BULLET_FIRE_COOLDOWN,
  BULLET_SPEED, METEORITE_SPEED, METEORITE_INITIAL_HP, BULLET_DAMAGE, 
  TURRET_RADIUS, FRAGMENT_RADIUS, BULLET_RADIUS, INITIAL_UPGRADE_THRESHOLD
} from '../constants';
import { Bullet, Meteorite, Fragment, GameStats, Point, SkinId, VisualEffect, PerkId } from '../types';
import { audioManager } from '../services/audioService';
import { talentService } from '../services/talentService';
import { difficultyService } from '../services/DifficultyService';
import { renderService } from '../services/RenderService';
import CardSelectionOverlay from './CardSelectionOverlay';

interface GameEngineProps {
  onGameOver: (stats: GameStats) => void;
  skin: SkinId;
}

// 扩展陨石类型以存储渲染所需数据
interface CachedMeteorite extends Meteorite {
  vertices: Point[];
  targetId?: number;
}

// 扩展子弹类型以支持追踪与拖尾
interface OptimizedBullet extends Bullet {
  trail: Point[];
  targetRef?: Meteorite;
  homingSearchCooldown: number;
}

interface EnhancedEffect extends VisualEffect {
  type: 'particle' | 'shockwave' | 'collection' | 'trailFade' | 'burst' | 'sparks' | 'flare' | 'ring' | 'debris' | 'status' | 'impact';
  angle?: number;
  points?: Point[];
  baseColor?: string;
  decayRate?: number;
  flicker?: boolean;
  rotation?: number;
  rotationSpeed?: number;
}

const GameEngine: React.FC<GameEngineProps> = ({ onGameOver, skin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });
  const bonuses = useRef(talentService.getBonuses());
  
  const isSpring = skin === 'SPRING_FESTIVAL';
  const isLgbt = skin === 'LGBT';

  const perksRef = useRef({
    bulletsPerShot: 1,
    cooldownMult: 1,
    damageBoost: 0,
    isHoming: false,
    isIce: false,
    isFire: false,
    spawnRateMult: 1,
    ownedOneTimers: [] as PerkId[]
  });

  const statsRef = useRef<GameStats>({
    fragmentsCollected: 0,
    coresCollected: 0,
    meteoritesDestroyed: 0,
    totalDamageDealt: 0,
    bulletsFired: 0,
  });

  const bulletsRef = useRef<OptimizedBullet[]>([]);
  const meteoritesRef = useRef<CachedMeteorite[]>([]);
  const fragmentsRef = useRef<Fragment[]>([]);
  const effectsRef = useRef<EnhancedEffect[]>([]);
  const screenShakeRef = useRef<number>(0);
  
  const gameTimeRef = useRef<number>(0);
  const survivalTimeRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const lastFireTimeRef = useRef<number>(0);
  const bossSpawnedRef = useRef<boolean>(false);
  const firstBossDefeatedRef = useRef<boolean>(false);
  const initialSpawnDoneRef = useRef<boolean>(false);
  const turretFlashRef = useRef<number>(0);
  const turretAngleRef = useRef<number>(0); 
  
  const upgradeThresholdRef = useRef<number>(INITIAL_UPGRADE_THRESHOLD);
  const currentUpgradeProgressRef = useRef<number>(0);
  
  const gameActiveRef = useRef<boolean>(true);
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [bossWarning, setBossWarning] = useState(false);
  const [hud, setHud] = useState({ 
    totalFrags: 0, 
    totalCores: 0,
    progress: 0, 
    survivalSecs: 0,
    threshold: INITIAL_UPGRADE_THRESHOLD 
  });

  const getThemeColor = (alpha: number = 1, hueOffset: number = 0) => {
    if (isSpring) return `rgba(245, 158, 11, ${alpha})`;
    if (isLgbt) {
      const hue = (gameTimeRef.current * 0.2 + hueOffset) % 360;
      return `hsla(${hue}, 80%, 60%, ${alpha})`;
    }
    return `rgba(56, 189, 248, ${alpha})`;
  };

  const getBulletColor = (b: Partial<Bullet>, alpha: number = 1, hueOffset: number = 0) => {
    if (b.isIce) return `rgba(125, 211, 252, ${alpha})`;
    if (b.isFire) return `rgba(239, 68, 68, ${alpha})`;
    return getThemeColor(alpha, hueOffset);
  };

  const triggerScreenShake = (intensity: number) => {
    screenShakeRef.current = Math.max(screenShakeRef.current, intensity);
  };

  const createExplosion = (x: number, y: number, color: string, scale: number = 1) => {
    if (scale > 2) triggerScreenShake(15); 
    
    effectsRef.current.push({
      x, y, vx: 0, vy: 0, life: 1, maxLife: 1, size: 60 * scale, color: isSpring ? '#fff7ed' : '#ffffff', type: 'burst', decayRate: 0.12
    });
    effectsRef.current.push({
      x, y, vx: 0, vy: 0, life: 1, maxLife: 1, size: 35 * scale, color, type: 'shockwave', decayRate: 0.03
    });
    
    const debrisCount = Math.floor((isLgbt ? 18 : 12) * scale);
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      let debrisColor = color;
      if (isLgbt) {
        debrisColor = `hsla(${Math.random() * 360}, 90%, 60%, 1)`;
      } else if (isSpring) {
        debrisColor = Math.random() > 0.5 ? '#991b1b' : '#fbbf24';
      }
      effectsRef.current.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.8, maxLife: 1, size: (5 + Math.random() * 6) * Math.sqrt(scale), 
        color: debrisColor, type: 'debris', decayRate: 0.015,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25
      });
    }
  };

  const createImpactEffects = (x: number, y: number, bvx: number, bvy: number, color: string) => {
    // 命中瞬间的火花与光效
    effectsRef.current.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, size: 25, color: '#ffffff', type: 'impact', decayRate: 0.15 });
    effectsRef.current.push({ x, y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, size: 12, color: '#ffffff', type: 'burst', decayRate: 0.1 });
    const angle = Math.atan2(bvy, bvx) + Math.PI; 
    for (let i = 0; i < 5; i++) {
      const spread = (Math.random() - 0.5) * 1.5;
      const speed = 3 + Math.random() * 5;
      effectsRef.current.push({
        x, y, vx: Math.cos(angle + spread) * speed, vy: Math.sin(angle + spread) * speed,
        life: 0.5, maxLife: 0.5, size: 2, color: i % 2 === 0 ? '#ffffff' : color, type: 'sparks', decayRate: 0.08
      });
    }
  };

  const generateMeteoriteVertices = (radius: number, isBoss: boolean) => {
    const sides = isBoss ? 14 : (radius >= 24 ? 10 : 7);
    const vertices: Point[] = [];
    const noiseIntensity = isBoss || radius >= 24 ? 0.15 : 0.08;
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides;
      const seed = Math.random() * noiseIntensity + (1 - noiseIntensity / 2);
      const r = radius * seed;
      vertices.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return vertices;
  };

  const generateCraters = (radius: number) => {
    const craterCount = Math.floor(radius / 5);
    const craters: {x: number, y: number, r: number}[] = [];
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
    if (!gameActiveRef.current || showCardSelection) return;
    const now = gameTimeRef.current;
    const baseCD = BULLET_FIRE_COOLDOWN;
    const actualCD = Math.max(200, (baseCD - bonuses.current.cooldownReduction) * perksRef.current.cooldownMult);
    
    if (now - lastFireTimeRef.current >= actualCD) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cX = canvas.width / 2, cY = canvas.height / 2;
      const bSpeed = BULLET_SPEED + bonuses.current.bulletSpeedBoost;
      const num = perksRef.current.bulletsPerShot;
      const spread = 0.15;
      
      for (let i = 0; i < num; i++) {
        const offset = (i - (num - 1) / 2) * spread;
        const finalAngle = turretAngleRef.current + offset;
        bulletsRef.current.push({
          x: cX, y: cY, 
          vx: Math.cos(finalAngle) * bSpeed, 
          vy: Math.sin(finalAngle) * bSpeed,
          radius: BULLET_RADIUS, distanceTraveled: 0, maxDistance: CIRCLE_RADIUS,
          trail: [],
          isIce: perksRef.current.isIce,
          isFire: perksRef.current.isFire,
          isHoming: perksRef.current.isHoming,
          homingSearchCooldown: 0
        });
        statsRef.current.bulletsFired++;
      }
      lastFireTimeRef.current = now;
      turretFlashRef.current = 1.0;
      audioManager.playFire();
    }
  }, [showCardSelection]);

  const update = useCallback((timestamp: number, width: number, height: number) => {
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
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    turretAngleRef.current += angleDiff * 0.18;

    if (turretFlashRef.current > 0) turretFlashRef.current -= 0.1;
    if (screenShakeRef.current > 0) screenShakeRef.current *= 0.9;

    const spawnDist = difficultyService.getSpawnDistance(width, height);
    const spawnInterval = difficultyService.calculateSpawnInterval(survivalTimeRef.current / 1000, bonuses.current.spawnBoost, perksRef.current.spawnRateMult);

    // 将 initialSpawnDoneRef.current 检测从 500ms 降低到 300ms
    if (!initialSpawnDoneRef.current && now >= 300 || (initialSpawnDoneRef.current && (now - lastSpawnTimeRef.current >= spawnInterval))) {
      initialSpawnDoneRef.current = true;
      const angle = Math.random() * Math.PI * 2;
      const x = cX + Math.cos(angle) * spawnDist, y = cY + Math.sin(angle) * spawnDist;
      const dx = cX - x, dy = cY - y, dist = Math.sqrt(dx * dx + dy * dy);
      const radius = 14 + Math.random() * 24;
      meteoritesRef.current.push({
        x, y, hp: METEORITE_INITIAL_HP, maxHp: METEORITE_INITIAL_HP,
        vx: (dx / dist) * METEORITE_SPEED, vy: (dy / dist) * METEORITE_SPEED,
        radius, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.04,
        spawnTime: now, vertices: generateMeteoriteVertices(radius, false),
        craters: generateCraters(radius)
      });
      lastSpawnTimeRef.current = now;
    }

    // Boss 逻辑
    if (survivalTimeRef.current >= 30000 && !bossSpawnedRef.current) {
      setBossWarning(true);
      setTimeout(() => setBossWarning(false), 4000);
      const angle = Math.random() * Math.PI * 2;
      const x = cX + Math.cos(angle) * spawnDist, y = cY + Math.sin(angle) * spawnDist;
      const dx = cX - x, dy = cY - y, dist = Math.sqrt(dx * dx + dy * dy);
      meteoritesRef.current.push({
        x, y, hp: 200, maxHp: 200,
        vx: (dx / dist) * (METEORITE_SPEED * 0.4), vy: (dy / dist) * (METEORITE_SPEED * 0.4),
        radius: 65, rotation: 0, rotationSpeed: 0.008,
        spawnTime: now, isBoss: true, vertices: generateMeteoriteVertices(65, true),
        craters: generateCraters(65)
      });
      bossSpawnedRef.current = true;
    }

    effectsRef.current = effectsRef.current.filter(e => {
      e.x += e.vx; e.y += e.vy; e.vx *= 0.95; e.vy *= 0.95;
      e.life -= (e.decayRate || 0.03); 
      return e.life > 0;
    });

    meteoritesRef.current.forEach(m => {
      let speedMult = 1;
      if (m.slowTimer && m.slowTimer > 0) { speedMult = 0.4; m.slowTimer -= delta; }
      if (m.burnTimer && m.burnTimer > 0) { m.hp -= 0.006 * delta; m.burnTimer -= delta; }
      if (m.flashTimer && m.flashTimer > 0) m.flashTimer -= delta;
      m.x += m.vx * speedMult; m.y += m.vy * speedMult; m.rotation += m.rotationSpeed * speedMult;
      if (Math.sqrt((m.x - cX)**2 + (m.y - cY)**2) < TURRET_RADIUS + 5) {
        gameActiveRef.current = false; onGameOver(statsRef.current);
      }
    });

    bulletsRef.current = bulletsRef.current.filter(b => {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 20) b.trail.shift();

      if (b.isHoming) {
        b.homingSearchCooldown -= delta;
        if (!b.targetRef || b.targetRef.hp <= 0 || b.homingSearchCooldown <= 0) {
          let bestTarget: CachedMeteorite | null = null;
          let bestDist = Infinity;
          for (let m of meteoritesRef.current) {
            if (m.hp <= 0) continue;
            const d = (m.x - b.x)**2 + (m.y - b.y)**2;
            if (d < bestDist) { bestDist = d; bestTarget = m; }
          }
          b.targetRef = bestTarget || undefined;
          b.homingSearchCooldown = 150;
        }
        if (b.targetRef) {
          const t = b.targetRef;
          const targetAngle = Math.atan2(t.y - b.y, t.x - b.x);
          const currentAngle = Math.atan2(b.vy, b.vx);
          let diff = targetAngle - currentAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          const newAngle = currentAngle + diff * 0.18;
          const speed = Math.sqrt(b.vx**2 + b.vy**2);
          b.vx = Math.cos(newAngle) * speed; b.vy = Math.sin(newAngle) * speed;
        }
      }
      
      b.x += b.vx; b.y += b.vy; b.distanceTraveled += Math.sqrt(b.vx**2 + b.vy**2);
      let hit = false;
      for (let m of meteoritesRef.current) {
        if (m.hp <= 0) continue;
        if ((b.x - m.x)**2 + (b.y - m.y)**2 < (m.radius + b.radius)**2) {
          const dmg = BULLET_DAMAGE + bonuses.current.damageBoost + perksRef.current.damageBoost;
          m.hp -= dmg; statsRef.current.totalDamageDealt += dmg;
          m.flashTimer = 120; m.flashColor = b.isIce ? '#7dd3fc' : (b.isFire ? '#ef4444' : '#ffffff');
          if (b.isIce) m.slowTimer = 2000;
          if (b.isFire) m.burnTimer = 3000;
          createImpactEffects(b.x, b.y, b.vx, b.vy, m.flashColor);
          audioManager.playHit(); hit = true; break;
        }
      }
      return b.distanceTraveled < b.maxDistance && !hit;
    });

    meteoritesRef.current.forEach(m => {
      if (m.hp <= 0 && !m.isUpgraded) {
        m.isUpgraded = true; statsRef.current.meteoritesDestroyed++;
        createExplosion(m.x, m.y, isSpring ? '#f59e0b' : (isLgbt ? '#ec4899' : (m.isBoss ? '#ef4444' : '#38bdf8')), m.isBoss ? 4.0 : 1.3);
        const fragCount = m.isBoss ? 20 : 4;
        for (let i = 0; i < fragCount; i++) fragmentsRef.current.push({ x: m.x, y: m.y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, radius: FRAGMENT_RADIUS, color: '#fbbf24', opacity: 1 });
        if (m.isBoss) { firstBossDefeatedRef.current = true; fragmentsRef.current.push({ x: m.x, y: m.y, vx: 0, vy: 0, radius: FRAGMENT_RADIUS * 2.5, color: '#a855f7', opacity: 1, isCore: true }); }
      }
    });

    meteoritesRef.current = meteoritesRef.current.filter(m => m.hp > 0);
    fragmentsRef.current = fragmentsRef.current.filter(f => {
      if (!f.isMovingToTurret) {
        f.x += f.vx; f.y += f.vy; f.vx *= 0.92; f.vy *= 0.92;
        const distToMouseSq = (mousePosRef.current.x - f.x)**2 + (mousePosRef.current.y - f.y)**2;
        if (distToMouseSq < (30 + (bonuses.current.magnetRangeBoost || 0))**2) f.isMovingToTurret = true;
      } else {
        const dx = cX - f.x, dy = cY - f.y, d = Math.sqrt(dx*dx + dy*dy);
        f.x += (dx/d) * 12; f.y += (dy/d) * 12;
        if (d < TURRET_RADIUS + 5) {
          if (f.isCore) statsRef.current.coresCollected++;
          else { 
            statsRef.current.fragmentsCollected++; currentUpgradeProgressRef.current++; 
            if (currentUpgradeProgressRef.current >= upgradeThresholdRef.current) { 
              currentUpgradeProgressRef.current = 0; upgradeThresholdRef.current = Math.floor(upgradeThresholdRef.current * 1.5) + 3; setShowCardSelection(true); 
            } 
          }
          audioManager.playCollect(); return false;
        }
      }
      return true;
    });

    setHud({ totalFrags: statsRef.current.fragmentsCollected, totalCores: statsRef.current.coresCollected, progress: Math.min(1, currentUpgradeProgressRef.current / upgradeThresholdRef.current), survivalSecs: Math.floor(survivalTimeRef.current / 1000), threshold: upgradeThresholdRef.current });
  }, [onGameOver, isLgbt, isSpring, showCardSelection]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cX = width / 2, cY = height / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (screenShakeRef.current > 0.1) ctx.translate((Math.random()-0.5)*screenShakeRef.current, (Math.random()-0.5)*screenShakeRef.current);

    ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1;
    for (let x = width % 100; x < width; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = height % 100; y < height; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

    ctx.beginPath(); ctx.arc(cX, cY, CIRCLE_RADIUS, 0, Math.PI*2);
    ctx.strokeStyle = isSpring ? 'rgba(251, 191, 36, 0.1)' : 'rgba(56, 189, 248, 0.1)'; ctx.lineWidth = 2; ctx.stroke();

    bulletsRef.current.forEach(b => {
      if (b.trail.length > 1) {
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 1; i < b.trail.length; i++) {
          const ratio = i / b.trail.length;
          ctx.strokeStyle = getBulletColor(b, ratio * 0.45); ctx.lineWidth = b.radius * ratio;
          ctx.beginPath(); ctx.moveTo(b.trail[i-1].x, b.trail[i-1].y); ctx.lineTo(b.trail[i].x, b.trail[i].y); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save(); ctx.translate(b.x, b.y); ctx.fillStyle = getBulletColor(b, 1);
      ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    meteoritesRef.current.forEach(m => {
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rotation);
      renderService.drawMinimalistMeteorite(ctx, m.radius, !!m.isBoss, isSpring, m.spawnTime, firstBossDefeatedRef.current, m.vertices, m.craters);
      
      // 闪光效果渲染
      if (m.flashTimer && m.flashTimer > 0) {
        ctx.fillStyle = m.flashColor || '#ffffff';
        const alpha = (m.flashTimer / 120);
        ctx.globalAlpha = alpha * 0.8; // 稍微增加透明度让闪光更亮
        ctx.fill();
        ctx.shadowBlur = 20 * alpha; // 增加阴影范围
        ctx.shadowColor = m.flashColor || '#ffffff';
        ctx.strokeStyle = m.flashColor || '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    });

    fragmentsRef.current.forEach(f => {
      if (f.isCore) {
        ctx.save(); const glow = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 3); grad.addColorStop(0, '#fff'); grad.addColorStop(0.3, '#c084fc'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.globalAlpha = glow; ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * 4, 0, Math.PI*2); ctx.fill(); ctx.restore();
      } else { ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2); ctx.fill(); }
    });

    effectsRef.current.forEach(e => {
      ctx.save(); ctx.globalAlpha = e.life; ctx.fillStyle = e.color;
      if (e.type === 'impact' || e.type === 'burst') { ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (1 - e.life * 0.5), 0, Math.PI * 2); ctx.fill(); }
      else if (e.type === 'shockwave') { ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.size + (1 - e.life) * 50, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });

    ctx.save(); ctx.translate(cX, cY);
    const recoil = Math.max(0, 1 - ((gameTimeRef.current - lastFireTimeRef.current) / 180)) * 12;
    renderService.drawComplexTurret(ctx, turretAngleRef.current, recoil, turretFlashRef.current, isSpring, isLgbt);
    ctx.restore(); ctx.restore(); 
  }, [isSpring, isLgbt, getBulletColor]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    let frame: number;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    const move = (e: MouseEvent) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; };
    const click = (e: MouseEvent) => { if (e.button === 0) fireBullet(); };
    window.addEventListener('resize', resize); window.addEventListener('mousemove', move); window.addEventListener('mousedown', click); 
    resize();
    const loop = (ts: number) => { update(ts, c.width, c.height); if(ctx) draw(ctx, c.width, c.height); frame = requestAnimationFrame(loop); };
    frame = requestAnimationFrame(loop);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('mousemove', move); window.removeEventListener('mousedown', click); cancelAnimationFrame(frame); };
  }, [update, draw, fireBullet]);

  const formatTime = (secs: number) => { const m = Math.floor(secs / 60); const s = secs % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  return (
    <div className="relative w-full h-full overflow-hidden cursor-crosshair">
      {bossWarning && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center pointer-events-none">
          <div className="bg-red-600/20 w-full h-40 flex flex-col items-center justify-center border-y border-red-500/50 backdrop-blur-sm animate-pulse">
            <div className="text-red-500 font-black text-6xl tracking-[0.5em] italic mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">WARNING</div>
            <div className="text-white font-bold text-xl tracking-[0.2em] uppercase">巨大引力波靠近：陨石领主已现身</div>
          </div>
        </div>
      )}
      {showCardSelection && <CardSelectionOverlay onSelect={(id) => { 
        if(id === 'extraBullets') perksRef.current.bulletsPerShot++;
        else if(id === 'reduceCooldown') perksRef.current.cooldownMult *= 0.8;
        else if(id === 'increaseDamage') perksRef.current.damageBoost += 5;
        else if(id === 'homing') { perksRef.current.isHoming = true; perksRef.current.ownedOneTimers.push(id); }
        else if(id === 'ice') { perksRef.current.isIce = true; perksRef.current.ownedOneTimers.push(id); }
        else if(id === 'fire') { perksRef.current.isFire = true; perksRef.current.ownedOneTimers.push(id); }
        else if(id === 'moreMeteorites') perksRef.current.spawnRateMult += 0.5;
        setShowCardSelection(false);
      }} ownedPerks={perksRef.current.ownedOneTimers} isSpring={isSpring} isLgbt={isLgbt} />}
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-900/50 z-50">
        <div className={`h-full transition-all duration-500 ${isSpring ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : isLgbt ? 'bg-pink-500 shadow-[0_0_10px_#ec4899]' : 'bg-sky-500 shadow-[0_0_10px_#0ea5e9]'}`} style={{ width: `${hud.progress * 100}%` }} />
      </div>
      <div className="absolute top-6 left-6 flex gap-4 z-50">
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 backdrop-blur-md font-mono shadow-2xl">
          <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">碎片</div>
          <div className="text-3xl text-amber-400 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">{hud.totalFrags}</div>
        </div>
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 backdrop-blur-md font-mono shadow-2xl">
          <div className="text-[9px] text-purple-500 uppercase font-black tracking-widest mb-1">核心</div>
          <div className="text-3xl text-purple-400 font-black drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">{hud.totalCores}</div>
        </div>
      </div>
      <div className="absolute top-6 right-6 p-4 bg-slate-950/80 rounded-2xl border border-white/5 backdrop-blur-md font-mono z-50 shadow-2xl text-right">
        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">生存时间</div>
        <div className="text-3xl text-white font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{formatTime(hud.survivalSecs)}</div>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default GameEngine;