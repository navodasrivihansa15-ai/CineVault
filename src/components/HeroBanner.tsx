"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Play, Plus, ChevronLeft, ChevronRight } from "lucide-react";
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

  if (topMovies.length === 0) return null;

  const movie = topMovies[currentIndex];
  const genreNames = movie.genre_ids
    .slice(0, 3)
    .map((id) => genres.find((g) => g.id === id)?.name)
    .filter(Boolean);

  return (
    <section className="relative h-[85vh] min-h-[600px] max-h-[900px] w-full overflow-hidden">
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
            className="object-cover object-top"
          />
        ) : (
          <div className="h-full w-full bg-[#0B0C10]" />
        )}
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-[#0B0C10]/40 to-transparent -z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C10]/80 via-transparent to-transparent -z-10" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0B0C10] to-transparent -z-10" />

      {/* Content */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 px-6 pb-20 pt-40 sm:px-8 md:px-12 lg:px-16
          transition-all duration-500 z-10
          ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}
        `}
      >
        <div className="mx-auto max-w-7xl">
          {/* Genres */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
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
          <h1 className="mb-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            {movie.title}
          </h1>

          {/* Overview */}
          <p className="mb-5 max-w-xl text-sm leading-relaxed text-silver/90 sm:text-base line-clamp-3">
            {movie.overview}
          </p>

          {/* Rating + Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Rating */}
            <div className="flex items-center gap-1.5 rounded-xl border border-gold/20 bg-gold/[0.08] px-3 py-1.5">
              <Star size={16} className="fill-gold text-gold" />
              <span className="text-sm font-bold text-gold">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>

            {/* Watch Now */}
            <Link href={`/${movie.media_type || 'movie'}/${movie.id}`} className="btn-gold group flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold">
              <Play
                size={18}
                className="transition-transform duration-200 group-hover:scale-110"
              />
              Watch Now
            </Link>

            {/* Add to Vault */}
            <button className="btn-ghost group flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold">
              <Plus size={18} />
              <span className="hidden sm:inline">Vault</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCurrentIndex((prev) => (prev === 0 ? topMovies.length - 1 : prev - 1));
        }}
        className="
          absolute left-4 top-1/2 -translate-y-1/2 z-50
          flex h-11 w-11 items-center justify-center rounded-full
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
          setCurrentIndex((prev) => (prev + 1) % topMovies.length);
        }}
        className="
          absolute right-4 top-1/2 -translate-y-1/2 z-50
          flex h-11 w-11 items-center justify-center rounded-full
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
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
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
