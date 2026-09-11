"use client";
import { useEffect, useRef } from "react";

/**
 * Subtle light field that follows the pointer on capable desktop devices.
 * Feels like light moving across cream paper — not a cursor effect.
 * - Only active when (hover: hover) and (pointer: fine)
 * - Respects prefers-reduced-motion
 * - Uses a single fixed radial gradient, lerped for softness
 */
export function PointerLight() {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const target = useRef({ x: 50, y: 50 });
  const current = useRef({ x: 50, y: 50 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hoverMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!hoverMq.matches || reduceMq.matches) {
      el.style.display = "none";
      return;
    }
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 100;
      target.current.y = (e.clientY / window.innerHeight) * 100;
    };
    const onEnter = () => (el.style.opacity = "1");
    const onLeave = () => (el.style.opacity = "0");

    // Lerp loop — measured in pixels, soft
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.06;
      current.current.y += (target.current.y - current.current.y) * 0.06;
      el.style.setProperty("--px", `${current.current.x}%`);
      el.style.setProperty("--py", `${current.current.y}%`);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerenter", onEnter);
    window.addEventListener("pointerleave", onLeave);
    // Start invisible until first move
    el.style.opacity = "0";

    const onReduceChange = () => {
      if (reduceMq.matches) {
        el.style.display = "none";
        cancelAnimationFrame(raf.current);
      } else {
        el.style.display = "";
      }
    };
    reduceMq.addEventListener?.("change", onReduceChange);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerenter", onEnter);
      window.removeEventListener("pointerleave", onLeave);
      reduceMq.removeEventListener?.("change", onReduceChange);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden lg:block"
      style={{
        // A very soft champagne wash that follows the pointer
        background: `radial-gradient(600px 600px at var(--px,50%) var(--py,50%), rgba(163,128,63,0.08), transparent 60%),
                     radial-gradient(900px 700px at var(--px,50%) var(--py,40%), rgba(242,236,223,0.55), transparent 70%)`,
        opacity: 0,
        transition: "opacity 700ms cubic-bezier(0.22,1,0.36,1)",
        willChange: "background",
      }}
    />
  );
}
