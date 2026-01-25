import React, { useEffect, useRef } from 'react';
import { SkinId } from '../types';

interface BackgroundAtmosphereProps {
  skin: SkinId;
}

const BackgroundAtmosphere: React.FC<BackgroundAtmosphereProps> = ({ skin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpring = skin === 'SPRING_FESTIVAL';
  const isLgbt = skin === 'LGBT';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Star layers for parallax
    const starLayers = [
      { count: 150, speed: 0.05, size: 0.8, opacity: 0.3 },
      { count: 100, speed: 0.12, size: 1.5, opacity: 0.6 },
      { count: 30, speed: 0.25, size: 2.2, opacity: 0.9 },
    ].map(layer => Array.from({ length: layer.count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * layer.size,
      opacity: Math.random() * layer.opacity,
      speed: layer.speed,
      color: isLgbt 
        ? `hsl(${Math.random() * 360}, 70%, 70%)` 
        : (isSpring ? '#fbbf24' : '#fff')
    })));

    // Comets
    const comets = Array.from({ length: 2 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: -2 - Math.random() * 5,
        vy: 1 + Math.random() * 2,
        length: 50 + Math.random() * 100,
        active: false,
        timer: Math.random() * 1000
    }));

    // Enhanced Nebulae with swirl parameters
    const nebulae = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 400 + Math.random() * 500,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.002,
      color: isLgbt 
        ? ['rgba(236, 72, 153, 0.05)', 'rgba(168, 85, 247, 0.05)', 'rgba(59, 130, 246, 0.05)', 'rgba(34, 197, 94, 0.05)'][i % 4]
        : (isSpring ? 'rgba(153, 27, 27, 0.07)' : 'rgba(30, 58, 138, 0.07)')
    }));

    // Enhanced Planets with surface details
    const planets = Array.from({ length: 4 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 15 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.0008,
      color: isLgbt 
        ? `hsla(${(i * 90) % 360}, 60%, 50%, 0.12)`
        : (isSpring ? 'rgba(251, 191, 36, 0.1)' : 'rgba(71, 85, 105, 0.1)'),
      details: Array.from({ length: 3 }, () => ({
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        r: Math.random() * 5 + 2,
        opacity: Math.random() * 0.2 + 0.1
      }))
    }));

    const render = () => {
      ctx.fillStyle = isSpring ? '#1a0b0b' : (isLgbt ? '#0a0510' : '#000');
      ctx.fillRect(0, 0, width, height);

      // Render swirling nebulae
      nebulae.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        n.rotation += n.rotationSpeed;
        
        if (n.x < -n.radius) n.x = width + n.radius;
        if (n.x > width + n.radius) n.x = -n.radius;
        if (n.y < -n.radius) n.y = height + n.radius;
        if (n.y > height + n.radius) n.y = -n.radius;

        ctx.save();
        // Create a slightly off-center gradient that rotates
        const offsetX = Math.cos(n.rotation) * (n.radius * 0.2);
        const offsetY = Math.sin(n.rotation) * (n.radius * 0.2);
        const grad = ctx.createRadialGradient(n.x + offsetX, n.y + offsetY, 0, n.x, n.y, n.radius);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      });

      // Stars
      starLayers.forEach(layer => {
        layer.forEach(s => {
          s.y += s.speed;
          if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
          ctx.globalAlpha = 0.2 + Math.abs(Math.sin(Date.now() * 0.0008 + s.x)) * 0.8;
          ctx.fillStyle = s.color;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        });
      });
      ctx.globalAlpha = 1;

      // Comets
      comets.forEach(c => {
          if (!c.active) {
              c.timer--;
              if (c.timer <= 0) {
                  c.active = true;
                  c.x = width + 100;
                  c.y = Math.random() * height * 0.5;
                  c.timer = 500 + Math.random() * 1000;
              }
          } else {
              c.x += c.vx; c.y += c.vy;
              const grad = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 10, c.y - c.vy * 10);
              grad.addColorStop(0, '#fff');
              grad.addColorStop(1, 'transparent');
              ctx.strokeStyle = grad;
              ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.vx * 5, c.y + c.vy * 5); ctx.stroke();
              if (c.x < -200 || c.y > height + 200) c.active = false;
          }
      });

      // Rotating Planets
      planets.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rotation += p.rotationSpeed;
        if (p.x < -p.radius * 2) p.x = width + p.radius * 2;
        if (p.x > width + p.radius * 2) p.x = -p.radius * 2;
        if (p.y < -p.radius * 2) p.y = height + p.radius * 2;
        if (p.y > height + p.radius * 2) p.y = -p.radius * 2;

        ctx.save();
        ctx.translate(p.x, p.y);
        
        // Outer glow
        const glowGrad = ctx.createRadialGradient(0, 0, p.radius, 0, 0, p.radius * 1.5);
        glowGrad.addColorStop(0, p.color);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;

        // Base planet body
        ctx.rotate(p.rotation);
        const pGrad = ctx.createLinearGradient(-p.radius, -p.radius, p.radius, p.radius);
        pGrad.addColorStop(0, p.color); pGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = pGrad;
        ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();

        // Surface details (craters/clouds)
        p.details.forEach(d => {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Atmosphere ring (if applicable)
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.6, p.radius * 0.3, Math.PI / 6, 0, Math.PI * 2); ctx.stroke();
        
        ctx.restore();
      });

      frameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
    };
  }, [skin, isSpring, isLgbt]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

export default BackgroundAtmosphere;