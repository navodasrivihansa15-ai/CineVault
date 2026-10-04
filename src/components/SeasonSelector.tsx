"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Play } from "lucide-react";

interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string;
  overview: string;
}

interface SeasonSelectorProps {
  seasons: Season[];
  currentSeason?: number;
}

export default function SeasonSelector({ seasons, currentSeason }: SeasonSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Default to season 1 if available, else season 0
  const validSeasons = seasons.filter((s) => s.season_number > 0);
  const fallbackSeason = validSeasons.length > 0 ? validSeasons[0] : seasons[0];
  
  const [selectedSeason, setSelectedSeason] = useState<number>(
    currentSeason || fallbackSeason?.season_number || 1
  );

  const activeSeason = seasons.find((s) => s.season_number === selectedSeason);

  if (!activeSeason) return null;

  const currentEpisode = Number(searchParams.get("e")) || 1;
  const isPlayingSeason = currentSeason === selectedSeason;

  const handleEpisodeClick = (episodeNum: number) => {
    router.replace(`${pathname}?s=${selectedSeason}&e=${episodeNum}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-heading">Episodes</h2>
        <div className="relative">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="
              appearance-none rounded-xl border border-white/10
              bg-navy/40 py-2 pl-4 pr-10 text-sm font-medium text-silver-light
              outline-none transition-all duration-300
              hover:border-gold/30 hover:bg-navy/60
              focus:border-gold focus:ring-1 focus:ring-gold/20
              cursor-pointer
            "
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.season_number}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-silver-dark"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-sm text-silver">
        <p className="mb-2 text-silver-light font-medium flex justify-between">
          <span>{activeSeason.episode_count} Episodes</span>
          <span className="text-silver-dark">{activeSeason.air_date}</span>
        </p>
        <p className="text-silver-dark">
          {activeSeason.overview || "No overview available for this season."}
        </p>
        
        {/* Placeholder for episodes grid if we fetched them from TMDB episode endpoint */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: Math.min(activeSeason.episode_count, 24) }).map((_, i) => {
            const episodeNum = i + 1;
            const isPlaying = isPlayingSeason && currentEpisode === episodeNum;

            return (
              <div 
                key={i} 
                onClick={() => handleEpisodeClick(episodeNum)}
                className={`
                  rounded-xl border p-4 transition-all duration-300 cursor-pointer group flex items-center justify-between
                  ${isPlaying 
                    ? "border-gold/40 bg-gold/10 text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]" 
                    : "border-white/5 bg-navy-light/50 hover:border-gold/20 text-silver-light hover:text-gold"
                  }
                `}
              >
                <span className="font-medium">Episode {episodeNum}</span>
                {isPlaying && <Play size={14} className="fill-gold" />}
              </div>
            );
          })}
          {activeSeason.episode_count > 24 && (
            <div className="rounded-xl border border-dashed border-white/10 p-4 flex items-center justify-center text-silver-dark text-xs">
              + {activeSeason.episode_count - 24} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
