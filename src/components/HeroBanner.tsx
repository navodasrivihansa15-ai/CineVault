"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Play, Plus, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { backdropUrl } from "@/lib/tmdb";
import type { TMDBMovie, TMDBGenre } from "@/lib/tmdb";

/* ──────────────────────────────────────────────────────────
   HeroBanner — Cinematic sliding banner for Trending Movies
   ────────────────────────────────────────────────────────── */

interface HeroBannerProps {
  movies: TMDBMovie[];
  genres: TMDBGenre[];
}

export default function HeroBanner({ movies, genres }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const topMovies = movies.slice(0, 8);

  // Auto-slide
  const startAutoSlide = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % topMovies.length);
        setIsTransitioning(false);
      }, 500);
    }, 6000);
  }, [topMovies.length]);

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoSlide]);

  const goTo = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setIsTransitioning(false);
      }, 400);
      startAutoSlide();
    },
    [currentIndex, startAutoSlide]
  );

  const goNext = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % topMovies.length);
      setIsTransitioning(false);
    }, 400);
    startAutoSlide();
  }, [topMovies.length, startAutoSlide]);

  const goPrev = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === 0 ? topMovies.length - 1 : prev - 1));
      setIsTransitioning(false);
    }, 400);
    startAutoSlide();
  }, [topMovies.length, startAutoSlide]);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goNext();
    }
    if (isRightSwipe) {
      goPrev();
    }
  };

  if (topMovies.length === 0) return null;

  const movie = topMovies[currentIndex];
  const genreNames = movie.genre_ids
    .slice(0, 3)
    .map((id) => genres.find((g) => g.id === id)?.name)
    .filter(Boolean);

  return (
    <section 
      className="relative w-full h-[450px] md:h-[85vh] md:min-h-[600px] md:max-h-[900px] overflow-hidden mt-0 md:-mt-24 z-0 rounded-none mx-0"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background Image */}
      <div
        className={`absolute inset-0 w-full h-full -z-10 transition-opacity duration-700 ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        {movie.backdrop_path ? (
          <Image
            src={backdropUrl(movie.backdrop_path, "original")!}
            alt={movie.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center md:object-top"
          />
        ) : (
          <div className="h-full w-full bg-[#0B0C10]" />
        )}
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-[#0B0C10]/80 md:via-[#0B0C10]/40 to-transparent -z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C10]/80 via-transparent to-transparent -z-10 hidden md:block" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 md:h-64 bg-gradient-to-t from-[#0B0C10] to-transparent -z-10" />

      {/* Content */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 px-4 pb-12 pt-20 md:px-6 md:pb-20 md:pt-32 sm:px-8 md:px-12 lg:px-16
          transition-all duration-500 z-10
          ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}
        `}
      >
        <div className="mx-auto max-w-7xl">
          {/* Genres (Desktop Only) */}
          <div className="hidden md:flex mb-3 flex-wrap items-center gap-2">
            {genreNames.map((name) => (
              <span
                key={name}
                className="
                  rounded-full border border-gold/20 bg-gold/[0.08]
                  px-3 py-1 text-2xs font-medium uppercase tracking-wider text-gold
                "
              >
                {name}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="mb-2 md:mb-3 max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-lg">
            {movie.title}
          </h1>

          {/* Overview */}
          <p className="mb-4 md:mb-5 max-w-xl text-xs md:text-sm leading-relaxed text-silver/90 sm:text-base line-clamp-2 md:line-clamp-3 drop-shadow-md">
            {movie.overview}
          </p>

          {/* Rating + Buttons */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            {/* Rating */}
            <div className="flex items-center gap-1.5 rounded-xl border border-gold/20 bg-gold/[0.08] px-2.5 py-1.5 md:px-3 md:py-1.5">
              <Star size={14} className="fill-gold text-gold md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-bold text-gold">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>

            {/* Watch Now */}
            <Link href={`/${(movie as any).media_type || 'movie'}/${movie.id}`} className="btn-gold group flex items-center justify-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs md:text-sm">
              <Play
                size={16}
                className="transition-transform duration-200 group-hover:scale-110"
              />
              Watch Now
            </Link>

            {/* Add to Vault */}
            <button className="btn-ghost group flex items-center justify-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-full font-bold text-xs md:text-sm">
              <Plus size={16} />
              <span className="inline">Vault</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows (Desktop Only) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goPrev();
        }}
        className="
          absolute left-4 top-1/2 -translate-y-1/2 z-50
          hidden md:flex h-11 w-11 items-center justify-center rounded-full
          border border-white/10 bg-oled/40 backdrop-blur-md text-silver
          transition-all duration-300
          hover:border-gold/30 hover:text-gold hover:bg-oled/60
          sm:left-6
        "
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goNext();
        }}
        className="
          absolute right-4 top-1/2 -translate-y-1/2 z-50
          hidden md:flex h-11 w-11 items-center justify-center rounded-full
          border border-white/10 bg-oled/40 backdrop-blur-md text-silver
          transition-all duration-300
          hover:border-gold/30 hover:text-gold hover:bg-oled/60
          sm:right-6
        "
        aria-label="Next slide"
      >
        <ChevronRight size={20} />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {topMovies.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`
              h-1.5 rounded-full transition-all duration-500
              ${
                i === currentIndex
                  ? "w-8 bg-gold shadow-gold-sm"
                  : "w-1.5 bg-silver-dark/40 hover:bg-silver-dark/60"
              }
            `}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

