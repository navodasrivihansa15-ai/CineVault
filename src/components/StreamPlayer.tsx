"use client";

import { useState } from "react";
import { Server, MonitorPlay, Film } from "lucide-react";

export interface StreamPlayerProps {
  tmdbId: string | number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
}

type ServerOption = "Server 1" | "Server 2" | "Server 3";

export default function StreamPlayer({
  tmdbId,
  mediaType,
  season = 1,
  episode = 1,
}: StreamPlayerProps) {
  const [activeServer, setActiveServer] = useState<ServerOption>("Server 1");

  // Generate URL based on selected server
  const getStreamUrl = () => {
    switch (activeServer) {
      case "Server 1":
        // VidSrc
        return mediaType === "movie"
          ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
          : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
      
      case "Server 2":
        // AutoEmbed
        return mediaType === "movie"
          ? `https://autoembed.to/movie/tmdb/${tmdbId}`
          : `https://autoembed.to/tv/tmdb/${tmdbId}-${season}-${episode}`;
          
      case "Server 3":
        // MultiEmbed
        return mediaType === "movie"
          ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
          : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`;
          
      default:
        return "";
    }
  };

  const servers: { id: ServerOption; label: string; icon: any }[] = [
    { id: "Server 1", label: "VidSrc", icon: Server },
    { id: "Server 2", label: "AutoEmbed", icon: MonitorPlay },
    { id: "Server 3", label: "MultiEmbed", icon: Film },
  ];

  return (
    <div className="w-full space-y-4 animate-fade-up">
      {/* 16:9 Video Container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-cinematic">
        <iframe
          src={getStreamUrl()}
          className="absolute inset-0 h-full w-full border-0"
          allowFullScreen
          title={`${mediaType} player`}
        />
      </div>

      {/* Server Switcher */}
      <div className="flex flex-wrap items-center gap-3">
        {servers.map((server) => {
          const Icon = server.icon;
          const isActive = activeServer === server.id;

          return (
            <button
              key={server.id}
              onClick={() => setActiveServer(server.id)}
              className={`
                flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300
                ${
                  isActive
                    ? "bg-gold text-oled shadow-gold-sm"
                    : "border border-white/10 bg-white/[0.03] text-silver-light hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
                }
              `}
            >
              <Icon size={16} className={isActive ? "text-oled" : ""} />
              {server.id} ({server.label})
            </button>
          );
        })}
      </div>
    </div>
  );
}
