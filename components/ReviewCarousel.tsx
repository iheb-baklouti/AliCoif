"use client";

import { useEffect, useRef, useState } from "react";

type Review = { id: string; text: string; authorName: string; rating: number };

export function ReviewCarousel({ reviews }: { reviews: Review[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [reviews]);

  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (reviews.length === 0) return null;

  if (reviews.length <= 3) {
    return (
      <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {reviews.map((r) => (
          <blockquote key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/80">
            <p className="text-sm leading-relaxed">&ldquo;{r.text}&rdquo;</p>
            <footer className="mt-4 text-xs font-semibold text-[#c9a227]">{r.authorName} — {r.rating}/5</footer>
          </blockquote>
        ))}
      </div>
    );
  }

  // Carousel
  return (
    <div className="mt-10 relative group">
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex snap-x snap-mandatory overflow-x-auto gap-4 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {reviews.map((r) => (
          <div key={r.id} className="snap-start shrink-0 w-[85%] sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.75rem)] transition-transform hover:scale-[1.02]">
            <blockquote className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/80 flex flex-col justify-between">
              <p className="text-sm leading-relaxed">&ldquo;{r.text}&rdquo;</p>
              <footer className="mt-6 text-xs font-semibold text-[#c9a227]">{r.authorName} — {r.rating}/5</footer>
            </blockquote>
          </div>
        ))}
      </div>
      
      {/* Scroll Buttons (visible on hover/focus matching desktop interaction) */}
      <button 
        onClick={() => scrollBy(-300)}
        aria-label="Avis précédents"
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-black/80 border border-white/10 p-2 rounded-full text-white/80 hover:text-white transition-opacity focus:outline-white ${canScrollLeft ? "opacity-0 md:group-hover:opacity-100 focus:opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button 
        onClick={() => scrollBy(300)}
        aria-label="Avis suivants"
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-black/80 border border-white/10 p-2 rounded-full text-white/80 hover:text-white transition-opacity focus:outline-white ${canScrollRight ? "opacity-0 md:group-hover:opacity-100 focus:opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );
}
