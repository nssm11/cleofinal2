"use client";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { EASE_LUXE } from "@/lib/motion";

/**
 * Restrained parallax — different layers move at different speeds.
 * Movement is measured in pixels (8–24), not dramatic screen-wide jumps.
 * Respects prefers-reduced-motion (no transform).
 */
export function Parallax({
  children,
  offset = 18,
  className,
}: {
  children: ReactNode;
  offset?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  if (reduce) {
    return <div ref={ref} className={className}>{children}</div>;
  }
  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      <motion.div style={{ y }} transition={{ ease: EASE_LUXE }}>
        {children}
      </motion.div>
    </div>
  );
}

export function ParallaxImage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Parallax offset={14} className={className}>{children}</Parallax>;
}
