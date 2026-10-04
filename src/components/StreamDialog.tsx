"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { X, Play, Globe, HardDrive, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react";

// Helper to determine player type
function getPlayerType(url: string) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.endsWith(".m3u8") || url.endsWith(".mp4")) return "hls";
  return "iframe";
}

import { db, SavedStreamLink } from "@/lib/db";
import { supabase } from "@/lib/supabase";

interface GlobalLink {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  url: string;
  language_quality: string;
  created_at: string;
}

interface StreamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
}

export default function StreamDialog({ isOpen, onClose, tmdbId, mediaType, title }: StreamDialogProps) {
  const [globalLinks, setGlobalLinks] = useState<GlobalLink[]>([]);
  const [localLinks, setLocalLinks] = useState<SavedStreamLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingLocal, setAddingLocal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newProvider, setNewProvider] = useState("");
  const [newQuality, setNewQuality] = useState("1080p");
  
  const backdropRef = useRef<HTMLDivElement>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch from Supabase (Global)
      const { data: globalData, error } = await supabase
        .from("global_links")
        .select("*")
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType);

      if (error && error.code !== "42P01") {
        console.error("Supabase fetch error:", error);
      }
      
      setGlobalLinks(globalData || []);

      // 2. Fetch from Dexie (Local)
      const localData = await db.streamLinks.where("tmdbId").equals(tmdbId).toArray();
      setLocalLinks(localData);
    } catch (err) {
      console.error("Failed to fetch stream links", err);
    } finally {
      setLoading(false);
    }
  }, [tmdbId, mediaType]);

  useEffect(() => {
    if (isOpen) {
      fetchLinks();
      setAddingLocal(false);
      setNewUrl("");
      setNewProvider("");
    }
  }, [isOpen, fetchLinks]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const saveLocalLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newProvider) return;

    try {
      await db.streamLinks.add({
        tmdbId,
        providerName: newProvider,
        providerLogo: null,
        url: newUrl,
        quality: newQuality,
        isVerified: true,
        addedAt: new Date().toISOString(),
        syncId: null,
      });
      setAddingLocal(false);
      setNewUrl("");
      setNewProvider("");
      fetchLinks();
    } catch (err) {
      console.error("Failed to save local link", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-oled/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg animate-scale-in rounded-3xl border border-gold/10 bg-navy/90 backdrop-blur-2xl shadow-cinematic overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold-shimmer opacity-60" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-silver-dark transition-all duration-200 hover:border-gold/30 hover:text-gold hover:bg-gold/5"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-8 pb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Play size={20} className="text-gold" />
              Stream {title}
            </h2>
            <p className="text-sm text-silver-dark mt-1">
              Select a streaming source from global or personal links.
            </p>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          ) : (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
              {/* Global Links */}
              <div>
                <h3 className="text-sm font-semibold text-silver-light mb-3 flex items-center gap-2">
                  <Globe size={16} className="text-gold" />
                  Global Links
                </h3>
                {globalLinks.length > 0 ? (
                  <ul className="space-y-2">
                    {globalLinks.map((link) => (
                      <li key={link.id}>
                        <Link
                          href={`/player?url=${encodeURIComponent(link.url)}&type=${getPlayerType(link.url)}&title=${encodeURIComponent(title)}&mediaType=${mediaType}`}
                          className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:border-gold/30 hover:bg-white/[0.04]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold group-hover:bg-gold/20">
                              <Play size={18} className="fill-gold" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-silver-light group-hover:text-gold transition-colors">
                                Stream URL
                              </p>
                              <p className="text-xs text-silver-dark uppercase tracking-wider">
                                {link.language_quality}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-center text-sm text-silver-dark">
                    No global links found.
                  </div>
                )}
              </div>

              {/* Local Links */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-silver-light flex items-center gap-2">
                    <HardDrive size={16} className="text-gold" />
                    Personal Vault Links
                  </h3>
                  {!addingLocal && (
                    <button
                      onClick={() => setAddingLocal(true)}
                      className="text-xs font-medium text-gold hover:text-gold-light transition-colors"
                    >
                      + Add Link
                    </button>
                  )}
                </div>

                {addingLocal && (
                  <form onSubmit={saveLocalLink} className="mb-4 rounded-xl border border-gold/20 bg-gold/[0.02] p-4 space-y-3 animate-fade-in">
                    <input
                      type="url"
                      placeholder="Stream URL (e.g., https://...)"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      required
                      className="w-full rounded-lg border border-white/10 bg-navy/40 px-3 py-2 text-sm text-silver-light outline-none focus:border-gold/50"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Provider (e.g., Drive, Local)"
                        value={newProvider}
                        onChange={(e) => setNewProvider(e.target.value)}
                        required
                        className="flex-1 rounded-lg border border-white/10 bg-navy/40 px-3 py-2 text-sm text-silver-light outline-none focus:border-gold/50"
                      />
                      <input
                        type="text"
                        placeholder="Quality"
                        value={newQuality}
                        onChange={(e) => setNewQuality(e.target.value)}
                        required
                        className="w-24 rounded-lg border border-white/10 bg-navy/40 px-3 py-2 text-sm text-silver-light outline-none focus:border-gold/50"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setAddingLocal(false)}
                        className="px-3 py-1.5 text-xs text-silver-dark hover:text-silver-light"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-gold-shimmer px-4 py-1.5 text-xs font-semibold text-oled hover:brightness-110"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                {localLinks.length > 0 ? (
                  <ul className="space-y-2">
                    {localLinks.map((link) => (
                      <li key={link.id}>
                        <Link
                          href={`/player?url=${encodeURIComponent(link.url)}&type=${getPlayerType(link.url)}&title=${encodeURIComponent(title)}&mediaType=${mediaType}`}
                          className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:border-gold/30 hover:bg-white/[0.04]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-silver group-hover:text-gold">
                              <Play size={18} className="fill-silver group-hover:fill-gold" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-silver-light group-hover:text-gold transition-colors">
                                {link.providerName}
                              </p>
                              <p className="text-xs text-silver-dark uppercase tracking-wider">
                                {link.quality}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !addingLocal && (
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-center text-sm text-silver-dark">
                      No personal links added yet.
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
