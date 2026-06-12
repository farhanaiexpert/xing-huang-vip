import { useState, useEffect, useCallback } from 'react';
import { cn } from '../lib/utils';

const SLIDES = [
  {
    src: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Xing-Huang-hero-banner.webp',
    alt: 'Xing Huang — Sports Betting',
  },
  {
    src: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/XingHuang.webp',
    alt: 'Xing Huang — Join & Win',
  },
];

const INTERVAL_MS = 3000;
const FADE_MS     = 800;

export function HeroBannerSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setActive(i => (i + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(advance, INTERVAL_MS);
    return () => clearInterval(t);
  }, [advance, paused]);

  return (
    <div
      className="mb-5 rounded-2xl overflow-hidden shadow-2xl relative select-none"
      style={{ aspectRatio: '1200 / 500' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {SLIDES.map((slide, i) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          style={{
            opacity: i === active ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
            willChange: 'opacity',
          }}
        />
      ))}

      {/* Bottom gradient for dots legibility */}
      <div
        className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)' }}
      />

      {/* Navigation dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => { setActive(i); setPaused(true); }}
            className={cn(
              'rounded-full transition-all duration-300 ease-in-out',
              i === active ? 'bg-[#00DFA9]' : 'bg-white/40 hover:bg-white/65',
            )}
            style={{
              width:  i === active ? '22px' : '7px',
              height: '7px',
            }}
          />
        ))}
      </div>
    </div>
  );
}
