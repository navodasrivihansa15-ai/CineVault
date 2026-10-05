"use client";

import { useState, useEffect } from "react";
import { Server, MonitorPlay, Film, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [premiumUrl, setPremiumUrl] = useState<string | null>(null);

  const getDefaultStreamUrl = (server: ServerOption) => {
    switch (server) {
      case "Server 1":
        // VidSrc
        return mediaType === "movie"
          ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
          : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
      
      case "Server 2":
        if (premiumUrl) return premiumUrl;
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

  useEffect(() => {
    if (!tmdbId) return;
    // Next.js hydration guard for TV shows
    if (mediaType?.toLowerCase() === 'tv' && !season) return;

    let isMounted = true;
    setIsLoading(true);

    const loadPlayerSource = async () => {
      try {
        // 1. Broad Fetch: Only match tmdb_id (convert to string to be safe)
        const { data, error } = await supabase
          .from('global_links')
          .select('*')
          .eq('tmdb_id', String(tmdbId));

        if (!isMounted) return;

        const fallbackSrc = getDefaultStreamUrl(activeServer);

        if (error || !data || data.length === 0) {
          console.log('No links found in DB. Using default server.');
          setPremiumUrl(null);
          setVideoSrc(getDefaultStreamUrl("Server 1"));
          setActiveServer("Server 1");
          setIsLoading(false);
          return;
        }

        // 2. JS-Level Filter: Case-insensitive match for media_type
        const mediaLinks = data.filter(link => 
          link.media_type?.toLowerCase() === mediaType?.toLowerCase()
        );

        if (mediaLinks.length === 0) {
          setPremiumUrl(null);
          setVideoSrc(getDefaultStreamUrl("Server 1"));
          setActiveServer("Server 1");
          setIsLoading(false);
          return;
        }

        // 3. Assignment Logic
        let foundUrl = null;

        if (mediaType?.toLowerCase() === 'movie') {
          console.log('Movie Link Loaded from DB');
          foundUrl = mediaLinks[0].stream_url || mediaLinks[0].url;
        } 
        else if (mediaType?.toLowerCase() === 'tv') {
          const cleanSeason = String(season).replace(/\D/g, '');
          const cleanEp = String(episode || '1').replace(/\D/g, ''); // Default to 1 if undefined

          const isPlaylistTrue = (val: any) => val === true || val === 'true' || val === 1 || val === '1';

          // Advanced Season Matcher: Checks BOTH season_name (string) and season_number (int)
          const matchesSeason = (link: any) => {
            const sNameMatch = link.season_name ? String(link.season_name).replace(/\D/g, '') === cleanSeason : false;
            const sNumMatch = link.season_number ? String(link.season_number) === cleanSeason : false;
            return sNameMatch || sNumMatch;
          };

          // 1. PRIORITY CHECK: Is there a Playlist for this Season?
          const playlistLink = mediaLinks.find(link => matchesSeason(link) && isPlaylistTrue(link.is_playlist));

          // 2. SECONDARY CHECK: Is there an Exact Episode?
          const exactLink = mediaLinks.find(link =>
            matchesSeason(link) &&
            String(link.episode_number).replace(/\D/g, '') === cleanEp &&
            !isPlaylistTrue(link.is_playlist)
          );

          if (playlistLink) {
            console.log('✅ Playlist Loaded from DB');
            foundUrl = playlistLink.stream_url || playlistLink.url;
          } else if (exactLink) {
            console.log('✅ Exact Episode Loaded from DB');
            foundUrl = exactLink.stream_url || exactLink.url;
          } else {
            console.log('❌ No DB Match. Using default server.');
          }
        }

        if (foundUrl) {
          setPremiumUrl(foundUrl);
          setActiveServer("Server 2");
          setVideoSrc(foundUrl);
        } else {
          setPremiumUrl(null);
          setActiveServer("Server 1");
          setVideoSrc(getDefaultStreamUrl("Server 1"));
        }
      } catch (err) {
        console.error('Player Fetch Error:', err);
        if (isMounted) {
          setPremiumUrl(null);
          setActiveServer("Server 1");
          setVideoSrc(getDefaultStreamUrl("Server 1"));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPlayerSource();

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId, mediaType, season, episode]);

  // Update fallback URL if user switches server manually
  useEffect(() => {
    if (!isLoading) {
      setVideoSrc(getDefaultStreamUrl(activeServer));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeServer, premiumUrl, isLoading]);

  const servers: { id: ServerOption; label: string; icon: any }[] = [
    { id: "Server 1", label: "VidSrc", icon: Server },
    { id: "Server 2", label: premiumUrl ? "CineVault (Premium)" : "AutoEmbed", icon: MonitorPlay },
    { id: "Server 3", label: "MultiEmbed", icon: Film },
  ];

  return (
    <div className="w-full space-y-4 animate-fade-up">
      {/* 16:9 Video Container */}
      <div className="relative w-full aspect-video rounded-none md:rounded-2xl shadow-2xl overflow-hidden bg-black border-y md:border border-white/10">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <Loader2 className="h-10 w-10 animate-spin text-gold" />
            <p className="mt-4 text-sm font-medium text-silver-light animate-pulse">
              Finding best stream...
            </p>
          </div>
        ) : (
          <iframe
            src={videoSrc}
            className="absolute inset-0 h-full w-full border-0"
            allowFullScreen
            title={`${mediaType} player`}
          />
        )}
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
