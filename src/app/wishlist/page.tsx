"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2, Clapperboard, Star, Check } from "lucide-react";
import { db, type WatchlistEntity } from "@/lib/db";
import { getFullImageUrl, removeFromWatchlist, moveToVault } from "@/lib/sync";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    try {
      const items = await db.watchlist.orderBy("addedAt").reverse().toArray();
      setWatchlist(items);
    } catch (error) {
      console.error("Failed to fetch watchlist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleRemove = async (e: React.MouseEvent, tmdbId?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tmdbId) return;
    
    const success = await removeFromWatchlist(tmdbId);
    if (success) {
      alert("Removed successfully from Watchlist");
      fetchWatchlist(); // Refresh the list
    }
  };

  const handleMoveToVault = async (e: React.MouseEvent, item: WatchlistEntity) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await moveToVault(item);
    if (success) {
      alert("Moved to Vault successfully");
      fetchWatchlist(); // Refresh the list
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-oled pb-20">
        <div className="text-gold animate-pulse text-sm font-medium">Loading Wishlist...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-oled pb-20">
      {/* Cinematic Header */}
      <section className="relative h-[40vh] min-h-[300px] w-full overflow-hidden flex items-end">
        <div className="absolute inset-0 bg-navy-light/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-oled via-oled/80 to-transparent" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 md:px-12 lg:px-16 pb-12">
          <div className="flex items-center gap-4 animate-fade-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/10 ring-1 ring-gold/30 shadow-gold-md backdrop-blur-md">
              <Heart className="text-gold fill-gold/20" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Your Wishlist
              </h1>
              <p className="mt-2 text-silver-light">Movies and shows you want to watch next.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Content */}
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 md:px-12 lg:px-16 -mt-4">
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/[0.02] border border-white/5 mb-6">
              <Clapperboard size={40} className="text-silver-dark" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Your wishlist is empty</h2>
            <p className="text-silver-dark max-w-md mb-8">
              Start exploring our vast collection and save the movies and shows you don't want to miss!
            </p>
            <Link
              href="/"
              className="rounded-xl bg-gold-shimmer px-8 py-3 text-sm font-semibold text-oled transition-all hover:brightness-110 shadow-gold-sm"
            >
              Start Exploring
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {watchlist.map((item) => (
              <Link
                key={item.id}
                href={`/movie/${item.tmdbId}`} // Defaulting to movie, could check type if stored
                className="group relative flex flex-col gap-3 animate-fade-up"
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/[0.06] transition-all duration-400 group-hover:border-gold/30 group-hover:shadow-gold-md group-hover:scale-[1.03]">
                  {item.posterPath ? (
                    <Image
                      src={getFullImageUrl(item.posterPath, "w500") || ""}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-navy-light text-silver-dark text-xs">
                      No Poster
                    </div>
                  )}

                    <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-black/40">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => handleMoveToVault(e, item)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-gold/20 hover:text-gold hover:border hover:border-gold/50"
                          title="Mark as Watched"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={(e) => handleRemove(e, item.tmdbId)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/80 text-white backdrop-blur-md transition-transform hover:scale-110 hover:bg-red-500"
                          title="Remove from Wishlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                </div>

                {/* Meta */}
                <div className="px-1">
                  <p className="text-sm font-medium text-silver-light line-clamp-1 group-hover:text-gold transition-colors">
                    {item.title}
                  </p>
                  <p className="text-2xs text-silver-dark mt-0.5">
                    {item.releaseYear || "Unknown Year"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
