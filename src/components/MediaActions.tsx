"use client";

import { useState, useEffect } from "react";
import { Play, Heart, Archive, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import CineVaultPlayerModal from "./CineVaultPlayerModal";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import type { TMDBMovie, TMDBTVDetails } from "@/lib/tmdb";

import { useAuth } from "@/components/AuthProvider";
import { toggleWatchlist, toggleVault } from "@/lib/sync";

interface MediaActionsProps {
  mediaId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number;
  genreIds: number[];
}

export default function MediaActions({
  mediaId,
  mediaType,
  title,
  posterPath,
  backdropPath,
  releaseYear,
  genreIds,
}: MediaActionsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [streamOpen, setStreamOpen] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [inVault, setInVault] = useState(false);

  const [isAdminOrFounder, setIsAdminOrFounder] = useState(false);
  const [hasPremiumLinks, setHasPremiumLinks] = useState(false);
  const [isRoutingReady, setIsRoutingReady] = useState(false);

  // Check Dexie for status
  useEffect(() => {
    const checkDb = async () => {
      const wishlisted = await db.watchlist.where("tmdbId").equals(mediaId).count();
      const vaulted = await db.watchedMovies.where("tmdbId").equals(mediaId).count();
      setInWishlist(wishlisted > 0);
      setInVault(vaulted > 0);
    };
    checkDb();
  }, [mediaId]);

  // Fetch User Role & Link Status (On Mount)
  useEffect(() => {
    let isMounted = true;
    
    const fetchRoutingData = async () => {
      // 1. Check if ANY premium links exist for this media
      const { data: linksData, error: linksError } = await supabase
        .from('global_links')
        .select('id')
        .eq('tmdb_id', String(mediaId))
        .eq('media_type', mediaType)
        .limit(1);

      if (isMounted) {
        setHasPremiumLinks(!linksError && linksData && linksData.length > 0);
      }

      // 2. Fetch User Role
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (isMounted) {
          const role = profileData?.role?.toLowerCase();
          setIsAdminOrFounder(role === 'founder' || role === 'admin' || user.email === "navodasrivihansa15@gmail.com");
        }
      } else {
        if (isMounted) setIsAdminOrFounder(false);
      }
      
      if (isMounted) setIsRoutingReady(true);
    };

    fetchRoutingData();

    return () => { isMounted = false; };
  }, [mediaId, mediaType, user]);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.dispatchEvent(new Event("open-auth-modal"));
      return;
    }
    const payload = {
      tmdbId: mediaId,
      title,
      posterPath,
      backdropPath,
      releaseYear,
      genreIds,
    };
    const success = await toggleWatchlist(payload, inWishlist);
    if (success) {
      setInWishlist(!inWishlist);
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
      tmdbId: mediaId,
      title,
      posterPath,
      backdropPath,
      releaseYear,
      genreIds,
    };
    const success = await toggleVault(payload, inVault);
    if (success) {
      setInVault(!inVault);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 md:gap-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!isRoutingReady) return;

            // 1. ADMIN / FOUNDER BEHAVIOR
            if (isAdminOrFounder) {
              setStreamOpen(true);
              return;
            }

            // 2. NORMAL USER BEHAVIOR
            if (hasPremiumLinks) {
              router.push(`/${mediaType}/${mediaId}/play?server=2`);
            } else {
              router.push(`/${mediaType}/${mediaId}/play?server=1`);
            }
          }}
          disabled={!isRoutingReady}
          className="btn-gold group px-4 py-2 md:px-6 md:py-3 text-sm md:text-base disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-200 group-hover:scale-110 fill-oled" />
          {isRoutingReady ? "Stream / Play" : "Loading..."}
        </button>

        <button
          onClick={handleWishlist}
          className={`btn-ghost group px-4 py-2 md:px-6 md:py-3 text-sm md:text-base ${inWishlist ? "text-gold border-gold/40" : ""}`}
        >
          {inWishlist ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Heart className="w-4 h-4 md:w-5 md:h-5" />}
          {inWishlist ? "In Wishlist" : "Wishlist"}
        </button>

        <button
          onClick={handleVault}
          className={`btn-ghost group px-4 py-2 md:px-6 md:py-3 text-sm md:text-base ${inVault ? "text-gold border-gold/40" : ""}`}
        >
          {inVault ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Archive className="w-4 h-4 md:w-5 md:h-5" />}
          {inVault ? "In Vault" : "Log to Vault"}
        </button>
      </div>

      <CineVaultPlayerModal
        isOpen={streamOpen}
        onClose={() => setStreamOpen(false)}
        tmdbId={mediaId}
        mediaType={mediaType}
      />
    </>
  );
}
