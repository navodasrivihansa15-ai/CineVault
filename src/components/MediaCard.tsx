"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Star, Heart, Archive, Check } from "lucide-react";
import { getFullImageUrl } from "@/lib/sync";
import { db } from "@/lib/db";

import { useAuth } from "@/components/AuthProvider";
import { toggleWatchlist, toggleVault } from "@/lib/sync";

export interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year: string;
  mediaType: "movie" | "tv";
  onClick?: () => void;
  className?: string;
}

export default function MediaCard({
  id,
  title,
  posterPath,
  rating,
  year,
  mediaType,
  onClick,
  className,
}: MediaCardProps) {
  const { user } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  const [inVault, setInVault] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const checkDb = async () => {
      const wishlisted = await db.watchlist.where("tmdbId").equals(id).count();
      const vaulted = await db.watchedMovies.where("tmdbId").equals(id).count();
      setInWishlist(wishlisted > 0);
      setInVault(vaulted > 0);
    };
    checkDb();
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      window.dispatchEvent(new Event("open-auth-modal"));
      return;
    }

    const payload = {
      tmdbId: id,
      title,
      posterPath,
      backdropPath: null,
      releaseYear: parseInt(year) || 0,
      genreIds: [],
    };
    
    const success = await toggleWatchlist(payload, inWishlist);
    if (success) {
      setInWishlist(!inWishlist);
      showToast(inWishlist ? "Removed from Wishlist" : "Added to Wishlist");
    }
  };

  const handleVault = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      window.dispatchEvent(new Event("open-auth-modal"));
      return;
    }

    const payload = {
      tmdbId: id,
      title,
      posterPath,
      backdropPath: null,
      releaseYear: parseInt(year) || 0,
      genreIds: [],
    };

    const success = await toggleVault(payload, inVault);
    if (success) {
      setInVault(!inVault);
      showToast(inVault ? "Removed from Vault" : "Added to Vault");
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex-shrink-0
        cursor-pointer
        ${className || "w-[160px] sm:w-[180px] md:w-[200px]"}
      `}
    >
      {toast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 bg-gold text-oled text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap animate-fade-up pointer-events-none">
          {toast}
        </div>
      )}
      
      {/* Poster Image */}
      <div
        className="
          relative aspect-[2/3] w-full overflow-hidden rounded-2xl
          border border-white/[0.06]
          transition-all duration-400 ease-out
          group-hover:border-gold/30 group-hover:shadow-gold-md
          group-hover:scale-[1.05]
        "
      >
        {posterPath && !imgError ? (
          <Image
            src={getFullImageUrl(posterPath, "w500") || ""}
            alt={title}
            fill
            sizes="(max-width: 640px) 160px, (max-width: 768px) 180px, 200px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-navy-light text-silver-dark text-xs">
            No Poster
          </div>
        )}

        {/* Hover Overlay */}
        <div className="poster-overlay flex flex-col justify-between p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex justify-end gap-2">
            <button
              onClick={handleWishlist}
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md transition-colors hover:bg-black/80 ${inWishlist ? "text-gold" : "text-white"}`}
            >
              {inWishlist ? <Check size={14} /> : <Heart size={14} />}
            </button>
            <button
              onClick={handleVault}
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md transition-colors hover:bg-black/80 ${inVault ? "text-gold" : "text-white"}`}
            >
              {inVault ? <Check size={14} /> : <Archive size={14} />}
            </button>
          </div>
          
          <div>
            {/* Rating Badge */}
            <div className="mb-1 flex items-center gap-1">
              <Star size={12} className="fill-gold text-gold" />
              <span className="text-xs font-semibold text-gold">
                {rating.toFixed(1)}
              </span>
            </div>
            <p className="text-xs font-medium text-silver-light line-clamp-2">
              {title}
            </p>
            <p className="text-2xs text-silver-dark mt-0.5">
              {year} · {mediaType === "tv" ? "TV" : "Movie"}
            </p>
          </div>
        </div>
      </div>

      {/* Title below poster */}
      <div className="mt-2.5 px-0.5">
        <p className="text-sm font-medium text-silver-light line-clamp-1 transition-colors group-hover:text-gold">
          {title}
        </p>
        <p className="text-2xs text-silver-dark mt-0.5">
          {year}
        </p>
      </div>
    </div>
  );
}
