import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Halftone Dot Matrix Background with Soothing Ambient Pulse & Interactive Cursor Glow
 */
export function HeroMeshBackground() {
  const canvasRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let started = performance.now();
    
    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    }

    function onPointerLeave() {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    }

    function drawHalftoneGrid(now) {
      const time = (now - started) / 1000;
      
      // Interpolate cursor movement for smooth liquid response
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const spacing = 18; // Dot density spacing
      const rows = Math.ceil(height / spacing) + 1;
      const cols = Math.ceil(width / spacing) + 1;

      const brandColors = [
        { r: 0, g: 151, b: 167 },
        { r: 0, g: 131, b: 143 },
        { r: 230, g: 247, b: 249 },
      ];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * spacing;
          const y = r * spacing;

          // Calculate normalized distance from center (0 = center, 1 = outer sides)
          const normX = Math.abs((x - width / 2) / (width / 2));
          const normY = Math.abs((y - height / 2) / (height / 2));

          // Halftone gradient intensity: Dense at left/right edges, completely clear in the center
          let intensity = Math.pow(normX, 1.8) * 0.95 + normY * 0.15;
          
          if (intensity < 0.12) continue; // Keep text & check-in card area clean

          // Soothing ambient breathing wave (slow 8-second cycle)
          const pulseWave = Math.sin(time * 0.8 + normX * 3.0 + normY * 1.5) * 0.18;
          let currentIntensity = Math.min(1, Math.max(0, intensity + pulseWave));

          // Interactive cursor reaction: subtle dot expansion near cursor
          if (mouse.active) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.hypot(dx, dy);
            const maxDist = 200;
            if (dist < maxDist) {
              const hoverBoost = (1 - dist / maxDist) * 0.35;
              currentIntensity = Math.min(1, currentIntensity + hoverBoost);
            }
          }

          // Radius scale based on halftone edge proximity
          const maxRadius = 3.6;
          const radius = Math.max(0.6, currentIntensity * maxRadius);
          const alpha = Math.min(0.85, currentIntensity * 0.7);

          ctx.beginPath();
          const color = brandColors[(r + c) % brandColors.length];
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.62})`;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduce) {
        raf = requestAnimationFrame(drawHalftoneGrid);
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const host = canvas.closest('section') || canvas.parentElement;
    host?.addEventListener('pointermove', onPointerMove, { passive: true });
    host?.addEventListener('pointerleave', onPointerLeave);

    if (reduce) {
      drawHalftoneGrid(performance.now());
    } else {
      raf = requestAnimationFrame(drawHalftoneGrid);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host?.removeEventListener('pointermove', onPointerMove);
      host?.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [reduce]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#F8FCFD]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(230,247,249,0.45),transparent_28%),radial-gradient(circle_at_78%_24%,rgba(0,191,255,0.18),transparent_30%),linear-gradient(180deg,#F8FCFD_0%,#E0F6FC_48%,#F8FCFD_100%)]" />
      <div className="animate-float-slow absolute -left-24 top-20 h-[34rem] w-[34rem] rounded-full bg-[#00BFFF]/14 blur-[120px]" />
      <div className="animate-float-slower absolute -right-28 top-28 h-[36rem] w-[36rem] rounded-full bg-[#70C9EF]/18 blur-[135px]" />
      <div className="animate-float-slow absolute bottom-8 left-1/2 h-[22rem] w-[46rem] -translate-x-1/2 rounded-full bg-[#E0F6FC]/60 blur-[150px]" />
      <div className="absolute inset-0 opacity-[0.22] bg-[linear-gradient(rgba(0,191,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(0,191,255,0.10)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_48%,rgba(248,253,252,0.72)_100%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-multiply" />
    </div>
  );
}