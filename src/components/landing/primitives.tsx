import { cn } from "@/lib/utils";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useRef, type PointerEvent, type ReactNode } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

const WORD_VARIANTS = {
  hidden: { y: "115%", rotate: 4 },
  visible: (i: number) => ({ y: "0%", rotate: 0, transition: { duration: 0.9, delay: i, ease: EASE } }),
};

/**
 * Headline whose words rise out of a clipping mask one after another.
 * `lines` keeps deliberate line breaks; `delay` offsets the whole sequence.
 * Visibility is observed on the container: each word starts translated out
 * of its own mask, so observing the words themselves would never fire.
 */
export function RevealText({
  lines,
  className,
  delay = 0,
  inView = false,
}: {
  lines: string[];
  className?: string;
  delay?: number;
  /** Animate when scrolled into view instead of on mount. */
  inView?: boolean;
}) {
  let wordIndex = 0;
  return (
    <motion.span
      className={cn("block", className)}
      initial="hidden"
      {...(inView
        ? { whileInView: "visible", viewport: { once: true, margin: "-10%" } }
        : { animate: "visible" })}
    >
      {lines.map((line) => (
        <span key={line} className="block">
          {line.split(" ").map((word) => {
            const i = wordIndex++;
            return (
              <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  className="inline-block origin-bottom-left"
                  variants={WORD_VARIANTS}
                  custom={delay + i * 0.06}
                >
                  {word}&nbsp;
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </motion.span>
  );
}

/** Button that leans toward the cursor while hovered (mouse only). */
export function MagneticButton({
  children,
  onClick,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });

  function handleMove(e: PointerEvent<HTMLButtonElement>) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ x, y }}
      whileTap={{ scale: 0.96 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

/** Endless horizontal ticker (pure CSS, paused for reduced motion in globals.css). */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (
    <div className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-6">{item}</span>
          <span aria-hidden className="text-muted-foreground/40">
            ✦
          </span>
        </span>
      ))}
    </div>
  );
  return (
    <div
      className={cn(
        "relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]",
        className,
      )}
      aria-hidden
    >
      <div className="flex w-max animate-marquee">
        {row}
        {row}
      </div>
    </div>
  );
}
