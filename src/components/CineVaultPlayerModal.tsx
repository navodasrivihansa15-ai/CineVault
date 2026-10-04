"use client";

import { useState, useEffect, useRef } from "react";
import { X, Play, Shield, Loader2, Save, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const getEmbedUrl = (url: string | null): string | undefined => {
  if (!url) return undefined;
  
  try {
    // Google Drive
    if (url.includes("drive.google.com/file/d/")) {
      return url.replace(/\/view.*$/, "/preview");
    }
    
    // YouTube
    if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) {
      let videoId = "";
      if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0];
      } else {
        const urlParams = new URL(url).searchParams;
        videoId = urlParams.get("v") || "";
      }
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
      }
    }
    
    // Facebook
    if (url.includes("facebook.com") || url.includes("fb.watch")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=100%`;
    }
    
    // Bilibili
    if (url.includes("bilibili.com/video/")) {
      const bvidMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
      if (bvidMatch && bvidMatch[1]) {
        return `https://player.bilibili.com/player.html?bvid=${bvidMatch[1]}&high_quality=1&danmaku=0`;
      }
    }
    
    // Default (CineSubz, MP4, VidSrc, etc.)
    return url;
  } catch (e) {
    return url;
  }
};

export interface CineVaultPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: string | number;
  mediaType: "movie" | "tv";
  season?: number | null;
  episode?: number | null;
}

export default function CineVaultPlayerModal({
  isOpen,
  onClose,
  tmdbId,
  mediaType,
  season = null,
  episode = null,
}: CineVaultPlayerModalProps) {
  const { user } = useAuth();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Admin states
  const [editMode, setEditMode] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPlaylist, setIsPlaylist] = useState(false);
  
  const backdropRef = useRef<HTMLDivElement>(null);
  
  const isAdmin = user?.email === "navodasrivihansa15@gmail.com";

  // Fetch Stream Link
  const fetchStreamLink = async () => {
    setLoading(true);
    setStreamUrl(null);
    setInputUrl("");
    
    try {
      if (mediaType === "movie") {
        const { data, error } = await supabase
          .from("global_links")
          .select("stream_url")
          .eq("tmdb_id", String(tmdbId))
          .eq("media_type", "movie")
          .limit(1)
          .single();
          
        if (data?.stream_url) {
          setStreamUrl(data.stream_url);
          setInputUrl(data.stream_url);
        }
      } else if (mediaType === "tv") {
        // First try exact episode
        const { data: epData, error: epError } = await supabase
          .from("global_links")
          .select("stream_url")
          .eq("tmdb_id", String(tmdbId))
          .eq("media_type", "tv")
          .eq("season_number", Number(season))
          .eq("episode_number", Number(episode))
          .eq("is_playlist", false)
          .limit(1)
          .single();
          
        if (epData?.stream_url) {
          setStreamUrl(epData.stream_url);
          setInputUrl(epData.stream_url);
          setIsPlaylist(false);
        } else {
          // Fallback to Season Playlist
          const { data: seasonData } = await supabase
            .from("global_links")
            .select("stream_url")
            .eq("tmdb_id", String(tmdbId))
            .eq("media_type", "tv")
            .eq("season_number", Number(season))
            .eq("is_playlist", true)
            .limit(1)
            .single();
            
          if (seasonData?.stream_url) {
            setStreamUrl(seasonData.stream_url);
            setInputUrl(seasonData.stream_url);
            setIsPlaylist(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch custom stream:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStreamLink();
      setEditMode(false);
    }
  }, [isOpen, tmdbId, mediaType, season, episode]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKey);
    }
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const sNum = mediaType === "tv" ? Number(season) : 0;
      const eNum = mediaType === "tv" && !isPlaylist ? Number(episode) : 0;
      const playlistFlag = mediaType === "tv" ? isPlaylist : false;
      const isEmpty = !inputUrl.trim();
      
      // Always delete existing to avoid primary key conflicts or completely remove it
      await supabase
        .from("global_links")
        .delete()
        .eq("tmdb_id", String(tmdbId))
        .eq("media_type", mediaType)
        .eq("season_number", sNum)
        .eq("episode_number", eNum)
        .eq("is_playlist", playlistFlag);
        
      if (isEmpty) {
        alert("Premium stream link deleted successfully!");
        setStreamUrl(null);
        setEditMode(false);
      } else {
        const { error } = await supabase
          .from("global_links")
          .insert({
            tmdb_id: String(tmdbId),
            media_type: mediaType,
            season_number: sNum,
            episode_number: eNum,
            is_playlist: playlistFlag,
            stream_url: inputUrl,
          });

        if (!error) {
          alert("Premium stream saved successfully!");
          setStreamUrl(inputUrl);
          setEditMode(false);
        } else {
          alert("Failed to save stream: " + error.message);
        }
      }
    } catch (err: any) {
      console.error("Error saving global link", err);
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isYouTube = streamUrl?.includes('youtube.com') || streamUrl?.includes('youtu.be') || streamUrl?.includes('youtube-nocookie.com');

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
    >
      <div className="absolute inset-0 bg-oled/95 backdrop-blur-xl" />

      <div className="relative z-10 w-full max-w-6xl animate-scale-in rounded-3xl border border-gold/30 bg-black/80 backdrop-blur-2xl shadow-[0_0_80px_rgba(212,175,55,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-shimmer to-transparent opacity-100" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold/10 px-6 py-4 bg-gradient-to-b from-gold/5 to-transparent">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold ring-1 ring-gold/30">
              <Play size={16} className="fill-gold" />
            </div>
            CineVault Premium Player
          </h2>
          
          <div className="flex items-center gap-3">
            {isAdmin && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 rounded-lg bg-gold/10 border border-gold/40 px-4 py-1.5 text-sm font-semibold text-gold transition-all hover:bg-gold hover:text-black hover:shadow-gold-sm"
              >
                <Shield size={16} />
                Admin: Edit Source
              </button>
            )}
            
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-silver-dark transition-all duration-200 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-gold" />
                <span className="text-gold font-medium animate-pulse">Establishing secure connection...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Admin Edit UI */}
              {isAdmin && editMode ? (
                <div className="p-8">
                  <div className="rounded-2xl border border-gold/30 bg-gold/5 p-8 backdrop-blur-md shadow-inner">
                    <h3 className="text-xl font-bold text-gold flex items-center gap-2 mb-2">
                      <Shield size={22} /> Configure Premium Source
                    </h3>
                    <p className="text-sm text-silver-light mb-8">
                      Save a direct video stream URL to the global database. All users will see this stream instantly.
                    </p>
                    
                    <form onSubmit={handleSaveLink} className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-gold mb-2">Stream URL (Iframe / Direct Link)</label>
                        <input
                          type="url"
                          placeholder="https://... (Leave blank to delete)"
                          value={inputUrl}
                          onChange={(e) => setInputUrl(e.target.value)}
                          className="w-full rounded-xl border border-gold/20 bg-black/60 px-5 py-4 text-sm text-white outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-all placeholder:text-white/20 font-mono"
                        />
                      </div>

                      {mediaType === "tv" && (
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/40">
                          <button
                            type="button"
                            onClick={() => setIsPlaylist(!isPlaylist)}
                            className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                              isPlaylist ? "border-gold bg-gold text-black" : "border-white/20 bg-transparent text-transparent"
                            }`}
                          >
                            <Check size={14} strokeWidth={4} />
                          </button>
                          <div>
                            <p className="text-sm font-bold text-white">Save as Season Playlist</p>
                            <p className="text-xs text-silver-dark">Check this if the URL contains a player that handles all episodes for Season {season}.</p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setEditMode(false)}
                          className="px-6 py-3 text-sm font-medium text-silver-dark hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-2 rounded-xl bg-gold-shimmer px-8 py-3 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed shadow-gold-md"
                        >
                          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          Save Stream
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : streamUrl ? (
                /* The Player */
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    src={getEmbedUrl(streamUrl)}
                    className="absolute inset-0 h-full w-full border-0"
                    allowFullScreen={true}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    referrerPolicy={isYouTube ? undefined : "no-referrer"}
                    title="CineVault Premium Stream"
                  />
                </div>
              ) : (
                /* No Stream Found */
                <div className="flex flex-col items-center justify-center p-12 text-center h-64 sm:h-[60vh]">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold/5 border border-gold/20 mb-8 relative">
                    <div className="absolute inset-0 rounded-full border border-gold/10 animate-ping" />
                    <Play size={40} className="text-gold/50 ml-2" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Premium Stream Not Available</h3>
                  <p className="text-silver-dark text-lg max-w-lg mx-auto mb-8">
                    This {mediaType === "tv" ? "episode" : "movie"} hasn't been uploaded to the CineVault premium servers yet.
                  </p>
                  <button 
                    onClick={onClose}
                    className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-lg"
                  >
                    Return to Details
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
