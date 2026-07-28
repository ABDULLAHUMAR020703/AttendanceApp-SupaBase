import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Interactive neural-dot network for the hero.
 * Soft cyan/teal points drift, pulse, and gently react to the cursor.
 * Depth-of-field: distant dots are softer / more transparent.
 */
export function HeroMeshBackground() {
  const canvasRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const mouse = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4, active: false };
    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let started = performance.now();

    const COLORS = [
      { r: 160, g: 235, b: 207 }, // mint
      { r: 166, g: 213, b: 250 }, // sky
      { r: 1, g: 72, b: 113 }, // deep teal
      { r: 208, g: 232, b: 248 }, // soft blue
    ];

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

      const count = Math.max(48, Math.min(110, Math.floor((width * height) / 14000)));
      nodes = Array.from({ length: count }, (_, i) => {
        const depth = 0.25 + Math.random() * 0.75;
        const c = COLORS[i % COLORS.length];
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (0.08 + depth * 0.18),
          vy: (Math.random() - 0.5) * (0.08 + depth * 0.18),
          depth,
          radius: 0.8 + depth * 2.4,
          phase: Math.random() * Math.PI * 2,
          color: c,
        };
      });
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - rect.left) / Math.max(rect.width, 1);
      mouse.ty = (e.clientY - rect.top) / Math.max(rect.height, 1);
      mouse.active = true;
    }

    function onPointerLeave() {
      mouse.active = false;
    }

    function drawStatic() {
      resize();
      ctx.clearRect(0, 0, width, height);
      for (const n of nodes) {
        const alpha = 0.12 + n.depth * 0.28;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${n.color.r},${n.color.g},${n.color.b},${alpha})`;
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(now) {
      const t = (now - started) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      const mx = mouse.x * width;
      const my = mouse.y * height;

      ctx.clearRect(0, 0, width, height);

      // Soft atmospheric wash (blurred light source)
      const wash = ctx.createRadialGradient(
        width * 0.5,
        height * 0.28,
        40,
        width * 0.5,
        height * 0.4,
        Math.max(width, height) * 0.7
      );
      wash.addColorStop(0, 'rgba(166, 213, 250, 0.22)');
      wash.addColorStop(0.45, 'rgba(160, 235, 207, 0.12)');
      wash.addColorStop(1, 'rgba(248, 251, 252, 0)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, width, height);

      // Connections (near neighbors only — keeps it calm)
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = 90 + (a.depth + b.depth) * 35;
          if (dist > maxDist) continue;
          const lineAlpha = (1 - dist / maxDist) * 0.12 * Math.min(a.depth, b.depth);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(1, 72, 113, ${lineAlpha})`;
          ctx.lineWidth = 0.7;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        // Cursor attraction (faint)
        if (mouse.active) {
          const dx = mx - n.x;
          const dy = my - n.y;
          const dist = Math.hypot(dx, dy) || 1;
          const influence = Math.max(0, 1 - dist / 220) * 0.035 * n.depth;
          n.vx += (dx / dist) * influence;
          n.vy += (dy / dist) * influence;
        }

        n.x += n.vx + Math.sin(t * 0.35 + n.phase) * 0.12 * n.depth;
        n.y += n.vy + Math.cos(t * 0.28 + n.phase) * 0.12 * n.depth;

        // Soft wrap
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;

        // Dampen velocity so it stays effortless
        n.vx *= 0.992;
        n.vy *= 0.992;

        const pulse = 0.75 + Math.sin(t * 1.4 + n.phase) * 0.25;
        const alpha = (0.1 + n.depth * 0.35) * pulse;
        const r = n.radius * (0.85 + pulse * 0.2);

        // Depth of field: near dots sharper, far dots softer via larger blur circle
        if (n.depth < 0.45) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${n.color.r},${n.color.g},${n.color.b},${alpha * 0.35})`;
          ctx.arc(n.x, n.y, r * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(${n.color.r},${n.color.g},${n.color.b},${alpha})`;
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Tiny specular highlight on nearer nodes
        if (n.depth > 0.6) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${0.35 * n.depth})`;
          ctx.arc(n.x - r * 0.25, n.y - r * 0.25, r * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const host = canvas.closest('section') || canvas.parentElement;
    host?.addEventListener('pointermove', onPointerMove, { passive: true });
    host?.addEventListener('pointerleave', onPointerLeave);

    if (reduce) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(frame);
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
      {/* Soft base wash so canvas never looks sparse */}
      <div className="absolute inset-0 bg-[#F8FBFC]" />
      <div className="absolute -top-24 left-1/4 h-[28rem] w-[28rem] rounded-full bg-[#A6D5FA]/45 blur-[120px]" />
      <div className="absolute right-1/5 top-1/3 h-[24rem] w-[24rem] rounded-full bg-[#A0EBCF]/40 blur-[130px]" />
      <div className="absolute bottom-10 left-1/2 h-[18rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#014871]/10 blur-[150px]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Depth-of-field: slight blur veil at edges, keep center clearer for UI */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_45%,rgba(248,251,252,0.55)_100%)]" />
    </div>
  );
}
