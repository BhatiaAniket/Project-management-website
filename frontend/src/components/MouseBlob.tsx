import { useEffect, useRef, useCallback } from "react";

const MouseBlob = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const target = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const time = useRef(0);
  const isDarkRef = useRef(document.documentElement.classList.contains("dark"));
  const themeT = useRef(isDarkRef.current ? 1 : 0);
  const particles = useRef<Array<{
    offsetX: number; offsetY: number; radius: number;
    speed: number; phase: number; noiseAmp: number;
  }>>([]);

  // Generate smoke particles on mount
  useEffect(() => {
    const count = 18;
    particles.current = Array.from({ length: count }, (_, i) => ({
      offsetX: (Math.random() - 0.5) * 200,
      offsetY: (Math.random() - 0.5) * 200,
      radius: 40 + Math.random() * 120,
      speed: 0.3 + Math.random() * 0.8,
      phase: (i / count) * Math.PI * 2,
      noiseAmp: 0.5 + Math.random() * 0.8,
    }));
  }, []);

  const lerp = useCallback((a: number, b: number, t: number) => a + (b - a) * t, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    const observer = new MutationObserver(() => {
      isDarkRef.current = document.documentElement.classList.contains("dark");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let animationId: number;

    const drawSmokeParticle = (
      cx: number, cy: number, radius: number,
      t: number, phase: number, noiseAmp: number,
      r: number, g: number, b: number, alpha: number
    ) => {
      ctx.beginPath();
      const points = 64;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const n1 = Math.sin(angle * 3 + t + phase) * noiseAmp * 0.15;
        const n2 = Math.cos(angle * 2 - t * 0.7 + phase) * noiseAmp * 0.1;
        const n3 = Math.sin(angle * 5 + t * 1.3 + phase) * noiseAmp * 0.05;
        const n4 = Math.cos(angle * 7 - t * 0.4 + phase) * noiseAmp * 0.03;
        const rr = radius * (1 + n1 + n2 + n3 + n4);
        const x = cx + Math.cos(angle) * rr;
        const y = cy + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.3);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
      grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
      grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.15})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    };

    const animate = () => {
      const targetT = isDarkRef.current ? 1 : 0;
      themeT.current += (targetT - themeT.current) * 0.025;
      const t = themeT.current;

      pos.current.x += (target.current.x - pos.current.x) * 0.04;
      pos.current.y += (target.current.y - pos.current.y) * 0.04;
      time.current += 0.005;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Light mode: light greyish smoke (like #C8C4C0 fog on #E8E4DF bg)
      // Dark mode: dark smoky ball (like #1A1A1A smoke on #0A0A0A bg)
      const smokeR = Math.round(lerp(185, 25, t));
      const smokeG = Math.round(lerp(180, 25, t));
      const smokeB = Math.round(lerp(178, 28, t));

      // Draw all smoke particles
      for (const p of particles.current) {
        const wobbleX = Math.sin(time.current * p.speed + p.phase) * 30;
        const wobbleY = Math.cos(time.current * p.speed * 0.8 + p.phase) * 25;
        const px = pos.current.x + p.offsetX + wobbleX;
        const py = pos.current.y + p.offsetY + wobbleY;
        
        // Base alpha: stronger in dark mode for more contrast
        const baseAlpha = lerp(0.06, 0.12, t);
        
        drawSmokeParticle(
          px, py, p.radius,
          time.current, p.phase, p.noiseAmp,
          smokeR, smokeG, smokeB, baseAlpha
        );
      }

      // Core dense area — the "ball" illusion
      const coreR = Math.round(lerp(170, 18, t));
      const coreG = Math.round(lerp(165, 18, t));
      const coreB = Math.round(lerp(163, 20, t));
      const coreAlpha = lerp(0.12, 0.25, t);

      drawSmokeParticle(
        pos.current.x, pos.current.y, 100,
        time.current * 0.8, 0, 0.6,
        coreR, coreG, coreB, coreAlpha
      );

      // Second core layer slightly offset for depth
      drawSmokeParticle(
        pos.current.x + Math.sin(time.current * 0.3) * 12,
        pos.current.y + Math.cos(time.current * 0.4) * 10,
        75,
        time.current * 1.1, 2, 0.5,
        coreR, coreG, coreB, coreAlpha * 0.8
      );

      // Subtle highlight in light mode (glass refraction)
      if (t < 0.7) {
        const hlX = pos.current.x - 25;
        const hlY = pos.current.y - 30;
        const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, 40);
        const hlAlpha = (1 - t) * 0.08;
        hlGrad.addColorStop(0, `rgba(255, 255, 255, ${hlAlpha})`);
        hlGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.fillStyle = hlGrad;
        ctx.beginPath();
        ctx.arc(hlX, hlY, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", resize);
      observer.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, [lerp]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1]"
    />
  );
};

export default MouseBlob;
