"use client";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Scroll-driven atmosphere: background, image position, typography
 * and decorative geometry transform continuously on scroll.
 * Never hijacks scroll — just reacts to it.
 */
export function ScrollAtmosphere({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Very subtle: paper → warm stone as you pass through
  const bg = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["rgba(242,236,223,1)", "rgba(250,246,236,1)", "rgba(234,226,209,1)"]
  );
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.96, 1, 1, 0.96]);

  if (reduce) {
    return <div ref={ref} className={className}>{children}</div>;
  }
  return (
    <motion.div ref={ref} className={className} style={{ backgroundColor: bg, opacity }}>
      {children}
    </motion.div>
  );
}
