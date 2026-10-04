"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, Loader2, X, Film, Tv, User } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import type { TMDBMultiResult } from "@/lib/tmdb";

/* ──────────────────────────────────────────────────────────
   Live SearchBar — Debounced multi-search (movies, tv, people)
   ────────────────────────────────────────────────────────── */

interface SearchBarProps {
  onResultClick?: (result: TMDBMultiResult) => void;
}

export default function SearchBar({ onResultClick }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<TMDBMultiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Debounce input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setIsOpen(true);

    fetch(`/api/tmdb?action=search&query=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          // Filter out people or results without images if desired, but here we show top 5
          setResults(data.results?.slice(0, 5) || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Search error:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  const getIcon = (type: string) => {
    if (type === "movie") return <Film size={14} className="text-gold" />;
    if (type === "tv") return <Tv size={14} className="text-gold" />;
    return <User size={14} className="text-silver-dark" />;
  };

  const getTitle = (r: TMDBMultiResult) => r.title || r.name || "Unknown";
  const getYear = (r: TMDBMultiResult) => {
    const date = r.release_date || r.first_air_date;
    return date ? date.substring(0, 4) : "";
  };
  const getImagePath = (r: TMDBMultiResult) =>
    r.poster_path || r.profile_path || null;

  return (
    <div
      ref={wrapperRef}
      className="relative z-50 w-full max-w-md transition-all duration-300"
    >
      {/* Input Field */}
      <form onSubmit={handleSearchSubmit} className="group relative flex items-center">
        <Search
          size={20}
          className="absolute left-4 text-silver-dark transition-colors group-focus-within:text-[#D4AF37]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search movies, TV shows..."
          className="
            w-full rounded-2xl border border-white/10
            bg-[#0B0C10]/40 backdrop-blur-md py-3 pl-12 pr-10
            text-lg text-white placeholder-gray-500
            outline-none transition-all duration-300
            focus:border-[#D4AF37]/50 focus:bg-[#0B0C10]/80 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)]
          "
        />
        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-4 flex items-center justify-center">
          {loading ? (
            <Loader2 size={18} className="animate-spin text-[#D4AF37]" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </form>

      {/* Dropdown Results */}
      {isOpen && (query.trim().length > 0) && (
        <div
          className="
            absolute top-full left-0 right-0 mt-2
            animate-fade-in overflow-hidden
            rounded-2xl border border-[#D4AF37]/30
            bg-[#0B0C10] backdrop-blur-2xl shadow-cinematic
          "
        >
          {loading && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-silver-dark">
              Searching the vault...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-2">
              {results.map((result) => {
                const title = getTitle(result);
                const year = getYear(result);
                const imagePath = getImagePath(result);

                return (
                  <li key={`${result.media_type}-${result.id}`}>
                    <Link
                      href={`/${result.media_type || 'movie'}/${result.id}`}
                      onClick={() => setIsOpen(false)}
                      className="
                        flex w-full items-center gap-3 px-4 py-2.5
                        text-left transition-colors
                        hover:bg-white/[0.04] active:bg-white/[0.08]
                        group/item
                      "
                    >
                      {/* Thumbnail */}
                      <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-[#0B0C10]">
                        {imagePath ? (
                          <Image
                            src={posterUrl(imagePath, "w92")!}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center border border-white/5">
                            {getIcon(result.media_type)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-silver-light transition-colors group-hover/item:text-[#D4AF37]">
                            {title}
                          </p>
                          {year && (
                            <span className="flex-shrink-0 text-xs text-silver-dark">
                              ({year})
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-2xs uppercase tracking-wider text-silver-dark">
                          {getIcon(result.media_type)}
                          <span>
                            {result.media_type === "person"
                              ? result.known_for_department
                              : result.media_type}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-silver-dark">
              No results found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
