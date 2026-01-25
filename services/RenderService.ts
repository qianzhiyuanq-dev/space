import { Point } from '../types';
import { TURRET_RADIUS } from '../constants';

/**
 * 渲染服务系统
 * 负责复杂图形的绘制算法
 */
export const renderService = {
  /**
   * 绘制具有纹理（坑洞）的陨石
   */
  drawMinimalistMeteorite(
    ctx: CanvasRenderingContext2D, 
    radius: number, 
    isBoss: boolean, 
    isSpring: boolean,
    spawnTime: number,
    firstBossDefeated: boolean,
    vertices: Point[],
    craters?: {x: number, y: number, r: number}[]
  ) {
    const isLarge = radius >= 24 || isBoss;
    
    ctx.beginPath();
    for (let i = 0; i < vertices.length; i++) {
      if (i === 0) ctx.moveTo(vertices[i].x, vertices[i].y);
      else ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, 0, 0, 0, radius);
    const forceGray = !firstBossDefeated && !isBoss;

    // 基础颜色方案
    if (forceGray) {
      if (isLarge) { grad.addColorStop(0, '#334155'); grad.addColorStop(1, '#1e293b'); }
      else { grad.addColorStop(0, '#94a3b8'); grad.addColorStop(1, '#475569'); }
    } else if (isSpring) {
      if (isLarge) { grad.addColorStop(0, '#991b1b'); grad.addColorStop(1, '#450a0a'); }
      else { grad.addColorStop(0, '#b45309'); grad.addColorStop(1, '#78350f'); }
    } else {
      if (isLarge) { grad.addColorStop(0, isBoss ? '#4c1d95' : '#78350f'); grad.addColorStop(1, isBoss ? '#2e1065' : '#451a03'); }
      else { grad.addColorStop(0, '#1e293b'); grad.addColorStop(1, '#0f172a'); }
    }
    
    ctx.fillStyle = grad;
    ctx.fill();

    // 绘制坑洞纹理 (Craters)
    if (craters && craters.length > 0) {
      ctx.save();
      ctx.clip(); // 限制在陨石形状内
      craters.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        // 坑洞阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        // 坑洞高光边缘
        ctx.strokeStyle = isSpring ? 'rgba(251, 191, 36, 0.05)' : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.restore();
    }

    // 边缘描边
    ctx.strokeStyle = forceGray ? 'rgba(255,255,255,0.1)' : (isSpring ? 'rgba(251, 191, 36, 0.3)' : (isBoss ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.3)'));
    ctx.lineWidth = isLarge ? 2 : 1;
    ctx.stroke();

    // 额外表面细节线
    if (radius > 15) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, -radius * 0.2);
      ctx.lineTo(radius * 0.1, -radius * 0.5);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();
    }
  },

  /**
   * 绘制带有交互动画的“磁悬浮精密拦截器”
   */
  drawComplexTurret(
    ctx: CanvasRenderingContext2D,
    angle: number,
    recoil: number,
    flash: number,
    isSpring: boolean,
    isLgbt: boolean
  ) {
    const time = Date.now() / 1000;
    ctx.save();
    
    // 悬浮晃动动画
    const hoverY = Math.sin(time * 3) * 1.2;
    const hoverX = Math.cos(time * 2) * 0.8;
    ctx.translate(hoverX, hoverY);
    ctx.rotate(angle);

    // 绘制底盘 (八边形)
    const r = TURRET_RADIUS;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8 + Math.PI / 8;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    if (isSpring) ctx.fillStyle = '#7f1d1d';
    else if (isLgbt) ctx.fillStyle = '#1e1b4b';
    else ctx.fillStyle = '#0f172a';
    ctx.fill();
    
    ctx.strokeStyle = isSpring ? '#fbbf24' : (isLgbt ? '#818cf8' : '#1e293b');
    ctx.lineWidth = 2;
    ctx.stroke();

    const railX = 4 - (recoil * 0.35);
    const barrelX = 8 - recoil;
    const railLen = 40, railWidth = 4, railGap = 13;
    
    let themeColor = '#38bdf8';
    if (isSpring) themeColor = '#fbbf24';
    else if (isLgbt) themeColor = `hsl(${(time * 120) % 360}, 80%, 65%)`;
    
    // 导轨绘制
    [1, -1].forEach(dir => {
      ctx.save();
      ctx.translate(railX, dir * railGap / 2);
      ctx.fillStyle = isSpring ? '#991b1b' : (isLgbt ? '#4338ca' : '#334155');
      ctx.fillRect(0, -railWidth / 2, railLen, railWidth);
      if (recoil > 2 || isLgbt) {
        ctx.globalAlpha = isLgbt ? 0.8 : (recoil / 12) * 0.6;
        ctx.fillStyle = isLgbt ? `hsl(${(time * 120 + 180) % 360}, 80%, 65%)` : (isSpring ? '#fde68a' : '#ef4444');
        ctx.fillRect(0, -railWidth / 2, railLen * 0.7, railWidth);
      }
      ctx.restore();
    });

    // 枪口闪光
    if (flash > 0) {
      ctx.save(); ctx.translate(railX + railLen, 0);
      const blastGrad = ctx.createLinearGradient(0, 0, 20 * flash, 0);
      blastGrad.addColorStop(0, '#ffffff'); 
      blastGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = blastGrad; 
      ctx.globalAlpha = flash;
      ctx.beginPath(); ctx.moveTo(0, -railGap/2); ctx.lineTo(25 * flash, 0); ctx.lineTo(0, railGap/2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // 枪管能量条
    const energyWidth = 5;
    const grad = ctx.createLinearGradient(barrelX, 0, barrelX + railLen - 8, 0);
    grad.addColorStop(0, 'transparent'); 
    grad.addColorStop(0.4, themeColor); 
    grad.addColorStop(1, flash > 0 ? '#fff' : themeColor);
    ctx.fillStyle = grad; 
    ctx.globalAlpha = 0.5 + flash * 0.5 + Math.sin(time * 12) * 0.1;
    ctx.fillRect(barrelX, -energyWidth / 2, railLen - 12, energyWidth);

    // 核心球体
    const coreR = 9.5;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    if (flash > 0) { 
      coreGrad.addColorStop(0, '#ffffff'); 
      coreGrad.addColorStop(1, themeColor); 
    } else { 
      coreGrad.addColorStop(0, themeColor); 
      coreGrad.addColorStop(1, isSpring ? '#450a0a' : (isLgbt ? '#1e1b4b' : '#020617')); 
    }
    
    if (isLgbt) { ctx.shadowBlur = 15; ctx.shadowColor = themeColor; }
    ctx.fillStyle = coreGrad; 
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};