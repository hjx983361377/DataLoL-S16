import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** 滚动进入视口时淡入上浮一次；prefers-reduced-motion 下直接显示。 */
export default function Reveal({ children, className = "", delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const inView = () => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.94 && rect.bottom > 0;
    };
    if (!("IntersectionObserver" in window) || inView()) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={"reveal " + className}
      style={{ "--delay": delay + "ms" } as CSSProperties}
    >
      {children}
    </div>
  );
}