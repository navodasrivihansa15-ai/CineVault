"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MediaCard from "./MediaCard";

/* ──────────────────────────────────────────────────────────
   MediaCarousel — Reusable horizontal media carousel
   ────────────────────────────────────────────────────────── */

export interface MediaCardItem {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year: string;
  mediaType: "movie" | "tv";
}

interface MediaCarouselProps {
  title: string;
  items: MediaCardItem[];
  onCardClick?: (item: MediaCardItem) => void;
  exploreLink?: string;
}

export default function MediaCarousel({
  title,
  items,
  onCardClick,
  exploreLink,
}: MediaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, items]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="relative">
      {/* Section Header */}
      <div className="mb-5 flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <h2 className="section-heading">{title}</h2>
          {exploreLink && (
            <Link 
              href={exploreLink}
              className="rounded-full border border-gold/30 bg-gold/5 px-4 py-1 text-xs font-semibold text-gold transition-all hover:bg-gold hover:text-black hover:shadow-gold-sm"
            >
              All
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="
              flex h-9 w-9 items-center justify-center rounded-xl
              border border-white/10 text-silver
              transition-all duration-200
              hover:border-gold/30 hover:text-gold hover:bg-gold/5
              disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-silver disabled:hover:bg-transparent
            "
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="
              flex h-9 w-9 items-center justify-center rounded-xl
              border border-white/10 text-silver
              transition-all duration-200
              hover:border-gold/30 hover:text-gold hover:bg-gold/5
              disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-silver disabled:hover:bg-transparent
            "
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Carousel Track */}
      <div className="relative group/carousel">
        {/* Left fade gradient */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-oled to-transparent" />
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        >
          {items.map((item, idx) => (
            <MediaCard
              key={`${item.id}-${idx}`}
              id={item.id}
              title={item.title}
              posterPath={item.posterPath}
              rating={item.rating}
              year={item.year}
              mediaType={item.mediaType}
              onClick={() => onCardClick?.(item)}
            />
          ))}
        </div>

        {/* Right fade gradient */}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-oled to-transparent" />
        )}
      </div>
    </section>
  );
}
