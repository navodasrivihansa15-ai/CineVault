"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Loader2, ShieldAlert } from "lucide-react";

export default function AdminClient() {
  const [tmdbId, setTmdbId] = useState("");
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [url, setUrl] = useState("");
  const [langQuality, setLangQuality] = useState("EN 1080p");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmdbId || !url) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.from("global_links").insert({
        tmdb_id: Number(tmdbId),
        media_type: mediaType,
        url: url,
        language_quality: langQuality,
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Global link added successfully!" });
      setTmdbId("");
      setUrl("");
    } catch (err: any) {
      console.error("Admin save error:", err);
      setMessage({ type: "error", text: err.message || "Failed to add link." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-navy/40 p-6 sm:p-8 backdrop-blur-md shadow-cinematic">
      <h2 className="mb-6 text-lg font-semibold text-silver-light flex items-center gap-2">
        <Plus size={18} className="text-gold" />
        Add New Stream Link
      </h2>

      {message && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm animate-fade-in ${message.type === "success"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-silver-dark uppercase tracking-wider">TMDB ID</label>
            <input
              type="number"
              required
              value={tmdbId}
              onChange={(e) => setTmdbId(e.target.value)}
              placeholder="e.g. 550"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-silver-light outline-none transition-all focus:border-gold/30 focus:bg-white/[0.05] focus:shadow-gold-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-silver-dark uppercase tracking-wider">Media Type</label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as "movie" | "tv")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-silver-light outline-none transition-all focus:border-gold/30 focus:bg-white/[0.05] focus:shadow-gold-sm appearance-none"
            >
              <option value="movie">Movie</option>
              <option value="tv">TV Show</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-silver-dark uppercase tracking-wider">Stream URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-silver-light outline-none transition-all focus:border-gold/30 focus:bg-white/[0.05] focus:shadow-gold-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-silver-dark uppercase tracking-wider">Language / Quality</label>
          <input
            type="text"
            required
            value={langQuality}
            onChange={(e) => setLangQuality(e.target.value)}
            placeholder="e.g. EN 1080p, ES 4K"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-silver-light outline-none transition-all focus:border-gold/30 focus:bg-white/[0.05] focus:shadow-gold-sm"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-shimmer py-3.5 text-sm font-semibold text-oled shadow-gold-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : "Publish Global Link"}
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-xl border border-gold/10 bg-gold/5 p-4 flex gap-3 text-xs text-silver">
        <ShieldAlert className="text-gold flex-shrink-0" size={16} />
        <p>
          Links added here are synced instantly to all users via Supabase. Make sure the links are verified and stable.
          <br />
          <strong>Required Table Schema:</strong> <code className="bg-oled px-1.5 py-0.5 rounded text-gold">global_links</code> (id, tmdb_id, media_type, url, language_quality, created_at).
        </p>
      </div>
    </div>
  );
}
