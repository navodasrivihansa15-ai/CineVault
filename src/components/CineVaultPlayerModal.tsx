"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Play, Shield, Loader2, Save, Check, ListVideo, SkipForward, Trash2, Plus, Pencil } from "lucide-react";
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
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      // If already an embed link, just return it
      if (url.includes("/embed/")) {
        // Optional: you can append ?autoplay=1 if you want, but returning as is is safest
        return url;
      }

      let videoId = "";
      let listId = "";

      try {
        const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
        if (url.includes("youtu.be/")) {
          videoId = urlObj.pathname.slice(1);
        } else {
          videoId = urlObj.searchParams.get("v") || "";
        }
        listId = urlObj.searchParams.get("list") || "";
      } catch (e) {
        if (url.includes("youtu.be/")) {
          videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
        }
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1${listId ? `&list=${listId}` : ''}`;
      } else if (listId) {
        return `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1&rel=0&modestbranding=1`;
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

const formatVideoUrl = (url: string, mode: 'single' | 'playlist'): string => {
  if (!url) return url;
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    if (url.includes("/embed/")) return url;
    
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      let videoId = "";
      const listId = urlObj.searchParams.get("list") || "";
      
      if (url.includes("youtu.be/")) {
        videoId = urlObj.pathname.slice(1);
      } else {
        videoId = urlObj.searchParams.get("v") || "";
      }

      if (mode === 'playlist' && listId) {
        return `https://www.youtube.com/embed/videoseries?list=${listId}`;
      } else if (videoId) {
        return `https://www.youtube.com/embed/${videoId}${listId ? `?list=${listId}` : ''}`;
      }
    } catch (e) {}
  }
  return url;
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
  
  const [addMode, setAddMode] = useState<'batch' | 'playlist' | 'manage'>('batch');
  const [editSeasonNum, setEditSeasonNum] = useState<number>(season ? Number(season) : 1);
  const [editSeasonName, setEditSeasonName] = useState(`Season ${season || 1}`);
  const [batchEpisodes, setBatchEpisodes] = useState<any[]>([{ id: Date.now(), seasonNum: season ? Number(season) : 1, seasonName: `Season ${season || 1}`, epNumber: episode ? Number(episode) : 1, title: `Episode ${episode || 1}`, url: '' }]);
  const [playlists, setPlaylists] = useState<any[]>([{ id: Date.now(), seasonNum: season ? Number(season) : 1, seasonName: `Season ${season || 1}`, url: '' }]);
  
  const [existingLinks, setExistingLinks] = useState<any[]>([]);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkData, setEditingLinkData] = useState<any>({});
  
  // TV Show Player UX State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allEpisodes, setAllEpisodes] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(season ? Number(season) : 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(episode ? Number(episode) : 1);
  
  const backdropRef = useRef<HTMLDivElement>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkAdmin = async () => {
      if (!user) {
        if (isMounted) setIsAdmin(false);
        return;
      }
      const role = (user as any)?.role || user?.user_metadata?.role;
      if (user.email === "navodasrivihansa15@gmail.com" || ["admin", "founder"].includes(role)) {
        if (isMounted) setIsAdmin(true);
        return;
      }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (isMounted && data && ["admin", "founder"].includes(data.role)) {
        setIsAdmin(true);
      } else if (isMounted) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
    return () => {
      isMounted = false;
    };
  }, [user]);

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
          .select("*")
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
          setAddMode('batch');
          setEditSeasonNum(epData.season_number);
          setEditSeasonName(epData.season_name || `Season ${epData.season_number}`);
          setBatchEpisodes([{
            id: Date.now(),
            seasonNum: epData.season_number,
            seasonName: epData.season_name || `Season ${epData.season_number}`,
            epNumber: epData.episode_number,
            title: epData.episode_name || `Episode ${epData.episode_number}`,
            url: epData.stream_url
          }]);
        } else {
          // Fallback to Season Playlist
          const { data: seasonData } = await supabase
            .from("global_links")
            .select("*")
            .eq("tmdb_id", String(tmdbId))
            .eq("media_type", "tv")
            .eq("season_number", Number(season))
            .eq("is_playlist", true)
            .limit(1)
            .single();
            
          if (seasonData?.stream_url) {
            setStreamUrl(seasonData.stream_url);
            setInputUrl(seasonData.stream_url);
            setAddMode('playlist');
            setEditSeasonNum(seasonData.season_number);
            setEditSeasonName(seasonData.season_name || `Season ${seasonData.season_number}`);
            setPlaylists([{ id: Date.now(), seasonNum: seasonData.season_number, seasonName: seasonData.season_name || `Season ${seasonData.season_number}`, url: seasonData.stream_url }]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch custom stream:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEpisodes = async () => {
    if (mediaType !== "tv") return;
    const { data } = await supabase
      .from("global_links")
      .select("*")
      .eq("tmdb_id", String(tmdbId))
      .eq("media_type", "tv")
      .eq("is_playlist", false)
      .order("season_number", { ascending: true })
      .order("episode_number", { ascending: true });
      
    if (data) {
      setAllEpisodes(data);
      if (season) setSelectedSeason(Number(season));
      if (episode) setCurrentEpisode(Number(episode));
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStreamLink();
      fetchAllEpisodes();
      setEditMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tmdbId, mediaType, season, episode]); // We trigger fetch on open

  // When currentEpisode/selectedSeason changes (via sidebar), update the stream URL instantly
  useEffect(() => {
    if (isOpen && !editMode && mediaType === "tv") {
      const epData = allEpisodes.find(ep => ep.season_number === selectedSeason && ep.episode_number === currentEpisode);
      if (epData) {
        setStreamUrl(epData.stream_url);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEpisode, selectedSeason, allEpisodes]);

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
      const sNum = mediaType === "tv" ? Number(editSeasonNum) : 0;
      
      if (mediaType === "movie") {
        const formattedUrl = formatVideoUrl(inputUrl, 'single');
        const isEmpty = !formattedUrl.trim();
        
        await supabase
          .from("global_links")
          .delete()
          .eq("tmdb_id", String(tmdbId))
          .eq("media_type", "movie");
          
        if (isEmpty) {
          alert("Premium stream link deleted successfully!");
          setStreamUrl(null);
          setEditMode(false);
        } else {
          const payload = {
            tmdb_id: String(tmdbId),
            media_type: mediaType,
            season_number: 0,
            episode_number: 0,
            is_playlist: false,
            stream_url: formattedUrl,
          };
          const { error } = await supabase.from("global_links").insert(payload);
          if (!error) {
            alert("Premium stream saved successfully!");
            setStreamUrl(formattedUrl);
            setEditMode(false);
          } else {
            alert("Failed to save stream: " + error.message);
          }
        }
      } else {
        if (addMode === 'batch') {
          const validEps = batchEpisodes.filter(ep => ep.url.trim() !== "");
          if (validEps.length === 0) {
            alert("No valid episodes found to save!");
            setSaving(false);
            return;
          }
          
          const payload = validEps.map(ep => {
            return {
              tmdb_id: String(tmdbId),
              media_type: "tv",
              season_number: Number(ep.seasonNum) || 1,
              season_name: ep.seasonName,
              episode_number: Number(ep.epNumber),
              episode_name: ep.title,
              is_playlist: false,
              stream_url: formatVideoUrl(ep.url, 'single'),
            };
          });
          
          const { error } = await supabase.from("global_links").insert(payload);
          if (!error) {
            alert("Batch saved successfully!");
            setStreamUrl(payload[0].stream_url);
            setEditMode(false);
            setBatchEpisodes([{ id: Date.now(), seasonNum: 1, seasonName: '', epNumber: '', title: '', url: '' }]);
            fetchAllEpisodes();
          } else {
            alert("Error saving: " + error.message);
          }
        } else {
          const validPlaylists = playlists.filter(p => p.url.trim() !== "");
          if (validPlaylists.length === 0) {
            alert("No valid playlists found to save!");
            setSaving(false);
            return;
          }

          const payload = validPlaylists.map(p => ({
            tmdb_id: String(tmdbId),
            media_type: "tv",
            season_number: Number(p.seasonNum) || 1,
            season_name: p.seasonName,
            episode_number: 0,
            episode_name: null,
            is_playlist: true,
            stream_url: formatVideoUrl(p.url, 'playlist'),
          }));
          
          const { error } = await supabase.from("global_links").insert(payload);
          if (!error) {
            alert("Playlists saved successfully!");
            setStreamUrl(payload[0].stream_url);
            setEditMode(false);
            setPlaylists([{ id: Date.now(), seasonNum: 1, seasonName: '', url: '' }]);
            fetchAllEpisodes();
          } else {
            alert("Error saving: " + error.message);
          }
        }
      }
    } catch (err: any) {
      console.error("Error saving global link", err);
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (confirm("Are you sure you want to delete this link?")) {
      await supabase.from('global_links').delete().eq('id', id);
      setExistingLinks(existingLinks.filter(l => l.id !== id));
      if (mediaType === "tv") fetchAllEpisodes();
    }
  };

  const handleSaveEdit = async () => {
    const isTv = editingLinkData.media_type === 'tv';
    const formattedUrl = formatVideoUrl(editingLinkData.stream_url, editingLinkData.is_playlist ? 'playlist' : 'single');
    
    const payload = isTv ? {
      season_number: Number(editingLinkData.season_number) || 1,
      season_name: editingLinkData.season_name,
      episode_number: Number(editingLinkData.episode_number) || 0,
      episode_name: editingLinkData.episode_name,
      stream_url: formattedUrl
    } : {
      stream_url: formattedUrl
    };

    const { error } = await supabase.from('global_links').update(payload).eq('id', editingLinkId);
    
    if (!error) {
      setExistingLinks(existingLinks.map(l => l.id === editingLinkId ? { ...editingLinkData, ...payload, stream_url: formattedUrl } : l));
      setEditingLinkId(null);
      if (mediaType === "tv") fetchAllEpisodes();
    } else {
      alert("Failed to update: " + error.message);
    }
  };

  useEffect(() => {
    if (addMode === 'manage' && isAdmin) {
      const loadLinks = async () => {
        const { data } = await supabase.from('global_links').select('*').eq('tmdb_id', String(tmdbId)).order('created_at', { ascending: false });
        if (data) setExistingLinks(data);
      };
      loadLinks();
    }
  }, [addMode, tmdbId, isAdmin]);

  if (!isOpen) return null;

  const isYouTube = streamUrl?.includes('youtube.com') || streamUrl?.includes('youtu.be') || streamUrl?.includes('youtube-nocookie.com');
  
  // Helper for TV Show UI
  const availableSeasons = Array.from(new Set(allEpisodes.map(ep => ep.season_number))).sort((a, b) => a - b);
  const episodesForSeason = allEpisodes.filter(ep => ep.season_number === selectedSeason);

  const playNextEpisode = () => {
    const nextEp = allEpisodes.find(ep => ep.season_number === selectedSeason && ep.episode_number === currentEpisode + 1);
    if (nextEp) {
      setCurrentEpisode(currentEpisode + 1);
    } else {
      // Try next season episode 1
      const nextSeasonEp = allEpisodes.find(ep => ep.season_number === selectedSeason + 1 && ep.episode_number === 1);
      if (nextSeasonEp) {
        setSelectedSeason(selectedSeason + 1);
        setCurrentEpisode(1);
      }
    }
  };

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
              {isAdmin && editMode ? (() => {
                const adminUI = (
                  <div className="rounded-2xl border border-gold/30 bg-gold/5 p-8 backdrop-blur-md shadow-inner">
                    <h3 className="text-xl font-bold text-gold flex items-center gap-2 mb-2">
                      <Shield size={22} /> Configure Premium Source
                    </h3>
                    <p className="text-sm text-silver-light mb-8">
                      Save a direct video stream URL to the global database. All users will see this stream instantly.
                    </p>
                    
                    <form onSubmit={handleSaveLink} className="space-y-6">
                      {(mediaType === "tv" || mediaType === "movie") && (
                        <div className="flex bg-[#12141D] p-1 rounded-xl border border-white/10 w-full mb-2">
                           {mediaType === "tv" && (
                             <>
                               <button type="button" onClick={() => setAddMode('batch')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addMode === 'batch' ? 'bg-gold text-black shadow-lg shadow-gold/20 scale-100' : 'text-silver-dark hover:text-white scale-95 hover:scale-100'}`}>Batch Single Episodes</button>
                               <button type="button" onClick={() => setAddMode('playlist')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addMode === 'playlist' ? 'bg-gold text-black shadow-lg shadow-gold/20 scale-100' : 'text-silver-dark hover:text-white scale-95 hover:scale-100'}`}>Season Playlist</button>
                             </>
                           )}
                           <button type="button" onClick={() => setAddMode('manage')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${addMode === 'manage' ? 'bg-gold text-black shadow-lg shadow-gold/20 scale-100' : 'text-silver-dark hover:text-white scale-95 hover:scale-100'}`}>Manage Links</button>
                        </div>
                      )}

                      {addMode === 'manage' && (
                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar p-2 bg-black/40 rounded-xl border border-white/5">
                          {existingLinks.length === 0 ? (
                             <p className="text-silver-dark text-center py-4">No links found for this title.</p>
                          ) : existingLinks.map(link => (
                            <div key={link.id} className="bg-[#12141D] border border-white/10 p-3 rounded-xl flex items-center justify-between gap-4">
                              {editingLinkId === link.id ? (
                                <div className="flex-1 flex flex-col gap-2">
                                  {link.media_type === 'tv' && (
                                    <div className="flex gap-2">
                                      <input type="number" value={editingLinkData.season_number || ''} onChange={e => setEditingLinkData({...editingLinkData, season_number: e.target.value})} placeholder="S#" className="w-16 bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm outline-none" />
                                      <input type="text" value={editingLinkData.season_name || ''} onChange={e => setEditingLinkData({...editingLinkData, season_name: e.target.value})} placeholder="Season Name" className="w-1/3 bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm outline-none" />
                                      {!link.is_playlist && (
                                        <>
                                          <input type="number" value={editingLinkData.episode_number || ''} onChange={e => setEditingLinkData({...editingLinkData, episode_number: e.target.value})} placeholder="Ep" className="w-16 bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm outline-none" />
                                          <input type="text" value={editingLinkData.episode_name || ''} onChange={e => setEditingLinkData({...editingLinkData, episode_name: e.target.value})} placeholder="Title" className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm outline-none" />
                                        </>
                                      )}
                                    </div>
                                  )}
                                  <input type="url" value={editingLinkData.stream_url || ''} onChange={e => setEditingLinkData({...editingLinkData, stream_url: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white font-mono text-sm outline-none" placeholder="Stream URL" />
                                  <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setEditingLinkId(null)} className="px-3 py-1.5 text-xs text-silver hover:text-white bg-white/5 rounded-lg transition-colors">Cancel</button>
                                    <button type="button" onClick={handleSaveEdit} className="px-3 py-1.5 text-xs text-black font-bold bg-gold rounded-lg shadow-gold-sm transition-all hover:brightness-110">Save</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-white mb-1 truncate">
                                      {link.media_type === 'movie' ? 'Movie Stream' : link.is_playlist ? `${link.season_name} (Playlist)` : `${link.season_name} - Ep ${link.episode_number}: ${link.episode_name || 'No Title'}`}
                                    </div>
                                    <div className="text-xs text-silver-dark font-mono truncate">{link.stream_url}</div>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <button type="button" onClick={() => { setEditingLinkId(link.id); setEditingLinkData(link); }} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"><Pencil size={16} /></button>
                                    <button type="button" onClick={() => handleDeleteLink(link.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {mediaType === "tv" && addMode === 'playlist' && (
                        <div className="space-y-4">
                          <label className="block text-sm font-bold text-gold mb-2">Season Playlists</label>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-3 p-2 bg-black/40 rounded-xl border border-white/5">
                            {playlists.map((p) => (
                              <div key={p.id} className="flex gap-2 items-center">
                                <input type="number" value={p.seasonNum} onChange={e => setPlaylists(playlists.map(x => x.id === p.id ? {...x, seasonNum: Number(e.target.value)} : x))} placeholder="S#" className="w-16 bg-[#12141D] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-gold text-sm" />
                                <input type="text" value={p.seasonName} onChange={e => setPlaylists(playlists.map(x => x.id === p.id ? {...x, seasonName: e.target.value} : x))} placeholder="Season Name" className="w-32 bg-[#12141D] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-gold text-sm" />
                                <input type="url" value={p.url} onChange={e => setPlaylists(playlists.map(x => x.id === p.id ? {...x, url: e.target.value} : x))} placeholder="Playlist URL (YouTube/Direct)" className="flex-1 bg-[#12141D] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-gold font-mono text-sm" />
                                <button type="button" onClick={() => setPlaylists(playlists.filter(x => x.id !== p.id))} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => {
                             const lastP = playlists[playlists.length - 1];
                             const nextS = lastP ? Number(lastP.seasonNum) + 1 : 1;
                             setPlaylists([...playlists, { id: Date.now(), seasonNum: nextS, seasonName: `Season ${nextS}`, url: '' }]);
                          }} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg border border-white/10 transition-colors text-sm flex items-center justify-center gap-2">
                             <Plus size={16} /> Add Another Season Playlist
                          </button>
                        </div>
                      )}

                      {mediaType === "movie" && (
                        <div>
                          <label className="block text-sm font-bold text-gold mb-2">Stream URL (Direct Link or YouTube)</label>
                          <input
                            type="url"
                            placeholder="https://... (Leave blank to delete)"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            className="w-full bg-[#12141D] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-gold transition-colors font-mono"
                          />
                        </div>
                      )}

                      {mediaType === "tv" && addMode === 'batch' && (
                        <div className="space-y-4">
                          <label className="block text-sm font-bold text-gold mb-2">Episodes List</label>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-3 p-2 bg-black/40 rounded-xl border border-white/5">
                            {batchEpisodes.map((ep) => (
                              <div key={ep.id} className="flex gap-2 items-center">
                                <input type="number" value={ep.seasonNum} onChange={e => setBatchEpisodes(batchEpisodes.map(x => x.id === ep.id ? {...x, seasonNum: Number(e.target.value)} : x))} placeholder="S#" className="w-16 bg-[#12141D] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-gold text-sm" />
                                <input type="text" value={ep.seasonName} onChange={e => setBatchEpisodes(batchEpisodes.map(x => x.id === ep.id ? {...x, seasonName: e.target.value} : x))} placeholder="Season Name" className="w-32 bg-[#12141D] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-gold text-sm" />
                                <input type="number" value={ep.epNumber} onChange={e => setBatchEpisodes(batchEpisodes.map(x => x.id === ep.id ? {...x, epNumber: e.target.value} : x))} placeholder="Ep" className="w-16 bg-[#12141D] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-gold text-sm" />
                                <input type="text" value={ep.title} onChange={e => setBatchEpisodes(batchEpisodes.map(x => x.id === ep.id ? {...x, title: e.target.value} : x))} placeholder="Title" className="w-32 bg-[#12141D] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-gold text-sm" />
                                <input type="url" value={ep.url} onChange={e => setBatchEpisodes(batchEpisodes.map(x => x.id === ep.id ? {...x, url: e.target.value} : x))} placeholder="URL (YouTube/Direct)" className="flex-1 bg-[#12141D] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-gold font-mono text-sm" />
                                <button type="button" onClick={() => setBatchEpisodes(batchEpisodes.filter(x => x.id !== ep.id))} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => {
                             const lastEp = batchEpisodes[batchEpisodes.length - 1];
                             const lastSeasonNum = lastEp ? lastEp.seasonNum : 1;
                             const lastSeason = lastEp ? lastEp.seasonName : '';
                             const nextEp = lastEp ? Number(lastEp.epNumber) + 1 : 1;
                             setBatchEpisodes([...batchEpisodes, { id: Date.now(), seasonNum: lastSeasonNum, seasonName: lastSeason, epNumber: nextEp, title: '', url: '' }]);
                          }} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg border border-white/10 transition-colors text-sm flex items-center justify-center gap-2">
                             <Plus size={16} /> Add Another Episode
                          </button>
                        </div>
                      )}

                      {addMode !== 'manage' ? (
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
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end pt-4 border-t border-white/10">
                          <button type="button" onClick={() => setEditMode(false)} className="px-6 py-3 text-sm font-medium text-silver-dark hover:text-white transition-colors">Close</button>
                        </div>
                      )}
                    </form>
                  </div>
                );

                return (
                  <>
                    <style>{`
                      @media (max-width: 768px) {
                        .mobile-admin-backdrop {
                          position: fixed; inset: 0; z-index: 99998; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
                        }
                        .mobile-admin-popup {
                          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                          z-index: 99999;
                          width: 92%; max-width: 400px; overflow-y: auto; max-height: 90vh;
                        }
                      }
                    `}</style>
                    {/* Desktop version */}
                    <div className="p-8 hidden md:block">
                      {adminUI}
                    </div>
                    {/* Mobile version */}
                    {mounted && createPortal(
                      <div className="md:hidden">
                        <div className="mobile-admin-backdrop" onClick={() => setEditMode(false)} />
                        <div className="mobile-admin-popup">
                          {adminUI}
                        </div>
                      </div>,
                      document.body
                    )}
                  </>
                );
              })() : streamUrl ? (
                /* The Player */
                <div className="relative aspect-video w-full bg-black group/player overflow-hidden">
                  <iframe
                    src={getEmbedUrl(streamUrl)}
                    className="absolute inset-0 h-full w-full border-0"
                    allowFullScreen={true}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    referrerPolicy={isYouTube ? undefined : "no-referrer"}
                    title="CineVault Premium Stream"
                  />
                  
                  {/* Floating Controls for TV Shows */}
                  {mediaType === "tv" && (
                    <div className="absolute bottom-6 right-6 z-40 flex items-center gap-3 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={playNextEpisode}
                        className="flex items-center gap-2 bg-[#0B0C10]/80 hover:bg-gold hover:text-black text-white px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10 transition-all font-medium text-sm shadow-xl"
                      >
                        <SkipForward size={18} /> Next Ep
                      </button>
                      <button 
                        onClick={() => setSidebarOpen(true)}
                        className="flex items-center gap-2 bg-[#0B0C10]/80 hover:bg-white hover:text-black text-white px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10 transition-all font-medium text-sm shadow-xl"
                      >
                        <ListVideo size={18} /> Episodes
                      </button>
                    </div>
                  )}

                  {/* Episodes Sidebar Modal/Overlay */}
                  {sidebarOpen && mediaType === "tv" && (
                    <div className="absolute inset-y-0 right-0 w-80 bg-[#0B0C10]/95 backdrop-blur-2xl z-50 border-l border-white/10 animate-fade-left flex flex-col shadow-2xl">
                      {/* Header */}
                      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <select 
                          value={selectedSeason} 
                          onChange={e => setSelectedSeason(Number(e.target.value))}
                          className="bg-transparent text-white font-bold text-lg outline-none cursor-pointer"
                        >
                          {availableSeasons.map(s => (
                            <option key={s} value={s} className="bg-[#0B0C10]">Season {s}</option>
                          ))}
                        </select>
                        <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1">
                          <X size={20} />
                        </button>
                      </div>
                      
                      {/* Episodes List */}
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
                         {episodesForSeason.length > 0 ? (
                           episodesForSeason.map(ep => {
                             const isPlaying = ep.episode_number === currentEpisode;
                             return (
                               <button 
                                  key={ep.episode_number} 
                                  onClick={() => setCurrentEpisode(ep.episode_number)}
                                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors group ${
                                    isPlaying 
                                      ? 'border-gold bg-gold/10' 
                                      : 'border-white/5 bg-white/5 hover:bg-white/10'
                                  }`}
                               >
                                  <span className={`text-sm font-bold ${isPlaying ? 'text-gold' : 'text-white group-hover:text-gold'}`}>
                                    {ep.episode_number}. {ep.episode_name || `Episode ${ep.episode_number}`}
                                  </span>
                                  {isPlaying && <span className="text-[10px] text-gold uppercase tracking-wider mt-1 font-semibold flex items-center gap-1"><Play size={10} className="fill-gold"/> Playing</span>}
                               </button>
                             );
                           })
                         ) : (
                           <div className="text-sm text-gray-500 text-center py-10">No episodes indexed for this season.</div>
                         )}
                      </div>
                    </div>
                  )}
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
