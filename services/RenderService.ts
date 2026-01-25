import { SkinId, Point } from '../types';
import { TURRET_RADIUS } from '../constants';

/**
 * 渲染服务系统
 * 负责复杂图形的绘制算法
 */
export const renderService = {
  /**
   * 绘制差异化视觉陨石 (支持预计算顶点)
   */
  drawMinimalistMeteorite(
    ctx: CanvasRenderingContext2D, 
    radius: number, 
    isBoss: boolean, 
    isSpring: boolean,
    spawnTime: number,
    firstBossDefeated: boolean,
    vertices: Point[] // 新增预计算顶点参数
  ) {
    const isLarge = radius >= 24 || isBoss;
    
    // 使用预计算顶点
    ctx.beginPath();
    for (let i = 0; i < vertices.length; i++) {
      if (i === 0) ctx.moveTo(vertices[i].x, vertices[i].y);
      else ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, 0, 0, 0, radius);
    const forceGray = !firstBossDefeated && !isBoss;

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

    ctx.strokeStyle = forceGray ? 'rgba(255,255,255,0.1)' : (isSpring ? 'rgba(251, 191, 36, 0.3)' : (isBoss ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.3)'));
    ctx.lineWidth = isLarge ? 2 : 1;
    ctx.stroke();

    if (radius > 15) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, -radius * 0.3);
      ctx.lineTo(radius * 0.2, -radius * 0.6);
      ctx.strokeStyle = forceGray ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.15)';
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
    
    // 悬浮晃动
    const hoverY = Math.sin(time * 3) * 1.2;
    const hoverX = Math.cos(time * 2) * 0.8;
    ctx.translate(hoverX, hoverY);
    ctx.rotate(angle);

    // 底盘
    const r = TURRET_RADIUS;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8 + Math.PI / 8;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = isSpring ? '#450a0a' : '#0f172a';
    ctx.fill();
    ctx.strokeStyle = isSpring ? '#92400e' : '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    const railX = 4 - (recoil * 0.35);
    const barrelX = 8 - recoil;
    const railLen = 40, railWidth = 4, railGap = 13;
    const themeColor = isSpring ? '#fbbf24' : (isLgbt ? '#ec4899' : '#38bdf8');
    
    [1, -1].forEach(dir => {
      ctx.save();
      ctx.translate(railX, dir * railGap / 2);
      ctx.fillStyle = isSpring ? '#991b1b' : '#334155';
      ctx.fillRect(0, -railWidth / 2, railLen, railWidth);
      if (recoil > 2) {
        ctx.globalAlpha = (recoil / 12) * 0.6;
        ctx.fillStyle = isSpring ? '#fde68a' : '#ef4444';
        ctx.fillRect(0, -railWidth / 2, railLen * 0.7, railWidth);
      }
      ctx.restore();
    });

    if (flash > 0) {
      ctx.save(); ctx.translate(railX + railLen, 0);
      const blastGrad = ctx.createLinearGradient(0, 0, 20 * flash, 0);
      blastGrad.addColorStop(0, '#ffffff'); blastGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = blastGrad; ctx.globalAlpha = flash;
      ctx.beginPath(); ctx.moveTo(0, -railGap/2); ctx.lineTo(25 * flash, 0); ctx.lineTo(0, railGap/2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    const energyWidth = 5;
    const grad = ctx.createLinearGradient(barrelX, 0, barrelX + railLen - 8, 0);
    grad.addColorStop(0, 'transparent'); grad.addColorStop(0.4, themeColor); grad.addColorStop(1, flash > 0 ? '#fff' : themeColor);
    ctx.fillStyle = grad; ctx.globalAlpha = 0.5 + flash * 0.5 + Math.sin(time * 12) * 0.1;
    ctx.fillRect(barrelX, -energyWidth / 2, railLen - 12, energyWidth);

    const coreR = 9.5;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    if (flash > 0) { coreGrad.addColorStop(0, '#ffffff'); coreGrad.addColorStop(1, themeColor); }
    else { coreGrad.addColorStop(0, themeColor); coreGrad.addColorStop(1, isSpring ? '#450a0a' : '#020617'); }
    ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};