"use client";

import { useEffect, useRef } from "react";

type WeatherEffect =
  | "rain"
  | "heavy-rain"
  | "thunder"
  | "drizzle"
  | "fog"
  | "cloudy"
  | "clear";

function getEffect(description: string): WeatherEffect {
  if (!description) return "clear";
  const d = description.toLowerCase();
  if (d.includes("thunder")) return "thunder";
  if (d.includes("heavy") || d.includes("violent")) return "heavy-rain";
  if (d.includes("rain") || d.includes("shower")) return "rain";
  if (d.includes("drizzle")) return "drizzle";
  if (d.includes("fog") || d.includes("mist") || d.includes("rime")) return "fog";
  if (d.includes("cloud") || d.includes("overcast")) return "cloudy";
  return "clear";
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  length: number;
  angle: number;
  radius: number;
  drift: number;
}

function createParticles(
  effect: WeatherEffect,
  width: number,
  height: number
): Particle[] {
  const make = (
    count: number,
    init: () => Partial<Particle>
  ): Particle[] =>
    Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0,
      size: 1,
      opacity: 0,
      length: 0,
      angle: 0,
      radius: 0,
      drift: 0,
      ...init(),
    }));

  switch (effect) {
    case "heavy-rain":
    case "thunder":
      return make(200, () => ({
        x: Math.random() * width * 1.4,
        y: Math.random() * height,
        speed: 6 + Math.random() * 6,
        size: 1.5 + Math.random(),
        opacity: 0.15 + Math.random() * 0.2,
        length: 18 + Math.random() * 12,
        angle: 0.15,
      }));

    case "rain":
      return make(120, () => ({
        x: Math.random() * width * 1.2,
        y: Math.random() * height,
        speed: 4 + Math.random() * 4,
        size: 1 + Math.random() * 0.5,
        opacity: 0.1 + Math.random() * 0.15,
        length: 12 + Math.random() * 8,
        angle: 0.1,
      }));

    case "drizzle":
      return make(60, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 2 + Math.random() * 2,
        size: 0.8,
        opacity: 0.08 + Math.random() * 0.1,
        length: 6 + Math.random() * 4,
        angle: 0.05,
      }));

    case "fog":
      return make(15, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.03 + Math.random() * 0.04,
        radius: 80 + Math.random() * 120,
        drift: (Math.random() - 0.5) * 0.3,
      }));

    case "cloudy":
      return make(25, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.1 + Math.random() * 0.2,
        opacity: 0.02 + Math.random() * 0.03,
        radius: 40 + Math.random() * 60,
        drift: (Math.random() - 0.5) * 0.2,
      }));

    case "clear":
    default:
      return make(20, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.1 + Math.random() * 0.15,
        size: 1 + Math.random() * 2,
        opacity: 0.03 + Math.random() * 0.04,
        drift: (Math.random() - 0.5) * 0.2,
      }));
  }
}

const GRADIENTS: Record<WeatherEffect, string> = {
  clear:
    "radial-gradient(ellipse at 50% 0%, rgba(30, 58, 95, 0.15) 0%, transparent 70%)",
  cloudy:
    "linear-gradient(180deg, rgba(40, 50, 65, 0.15) 0%, transparent 100%)",
  drizzle:
    "linear-gradient(180deg, rgba(30, 40, 60, 0.2) 0%, transparent 100%)",
  rain: "linear-gradient(180deg, rgba(20, 30, 55, 0.25) 0%, rgba(15, 25, 45, 0.1) 100%)",
  "heavy-rain":
    "linear-gradient(180deg, rgba(15, 25, 50, 0.3) 0%, rgba(10, 20, 40, 0.15) 100%)",
  thunder:
    "linear-gradient(180deg, rgba(25, 15, 45, 0.3) 0%, rgba(15, 10, 35, 0.15) 100%)",
  fog: "linear-gradient(180deg, rgba(45, 50, 60, 0.2) 0%, rgba(35, 40, 50, 0.1) 100%)",
};

export default function WeatherBackground({
  condition,
}: {
  condition: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    particles: [] as Particle[],
    flash: 0,
    effect: "clear" as WeatherEffect,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const effect = getEffect(condition);
    stateRef.current.effect = effect;

    const dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current.particles = createParticles(effect, width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    let animId: number;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const { particles } = stateRef.current;
      const currentEffect = stateRef.current.effect;

      // Thunder flash
      if (currentEffect === "thunder") {
        if (stateRef.current.flash > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${stateRef.current.flash})`;
          ctx.fillRect(0, 0, width, height);
          stateRef.current.flash -= 0.02;
        } else if (Math.random() < 0.003) {
          stateRef.current.flash = 0.12 + Math.random() * 0.08;
        }
      }

      for (const p of particles) {
        if (
          currentEffect === "rain" ||
          currentEffect === "heavy-rain" ||
          currentEffect === "thunder" ||
          currentEffect === "drizzle"
        ) {
          // Rain drops as falling lines
          ctx.beginPath();
          ctx.strokeStyle = `rgba(180, 200, 255, ${p.opacity})`;
          ctx.lineWidth = p.size;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.length * p.angle, p.y + p.length);
          ctx.stroke();

          p.x += p.angle * p.speed * 2;
          p.y += p.speed;

          if (p.y > height) {
            p.y = -p.length;
            p.x = Math.random() * width * 1.4;
          }
        } else if (currentEffect === "fog") {
          // Fog as soft radial blobs
          const grad = ctx.createRadialGradient(
            p.x, p.y, 0,
            p.x, p.y, p.radius
          );
          grad.addColorStop(0, `rgba(200, 210, 220, ${p.opacity})`);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          p.x += p.drift;
          p.y += p.speed * 0.5;

          if (p.x > width + p.radius) p.x = -p.radius;
          if (p.x < -p.radius) p.x = width + p.radius;
          if (p.y > height + p.radius) {
            p.y = -p.radius;
            p.x = Math.random() * width;
          }
        } else if (currentEffect === "cloudy") {
          // Clouds as drifting soft blobs
          const grad = ctx.createRadialGradient(
            p.x, p.y, 0,
            p.x, p.y, p.radius
          );
          grad.addColorStop(0, `rgba(150, 160, 180, ${p.opacity})`);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          p.x += p.drift;
          if (p.x > width + p.radius) p.x = -p.radius;
          if (p.x < -p.radius) p.x = width + p.radius;
        } else {
          // Clear sky — floating luminous dots
          ctx.beginPath();
          ctx.fillStyle = `rgba(180, 200, 255, ${p.opacity})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          p.x += p.drift;
          p.y -= p.speed;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x > width + 10) p.x = -10;
          if (p.x < -10) p.x = width + 10;
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [condition]);

  const effect = getEffect(condition);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div
        className="absolute inset-0 transition-all duration-[2000ms]"
        style={{ background: GRADIENTS[effect] }}
      />
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
