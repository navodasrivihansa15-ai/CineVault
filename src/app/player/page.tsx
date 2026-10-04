import { redirect } from "next/navigation";
import { Server, Settings2, PlayCircle, MonitorPlay, ShieldAlert } from "lucide-react";
import UniversalPlayer, { PlayerType } from "@/components/UniversalPlayer";

/* ──────────────────────────────────────────────────────────
   Universal Media Player Page
   URL Params: ?url=...&type=...&title=...
   ────────────────────────────────────────────────────────── */

interface PlayerPageProps {
  searchParams: {
    url?: string;
    type?: string;
    title?: string;
    mediaType?: string; // "movie" or "tv"
    tmdbId?: string;
  };
}

export default function PlayerPage({ searchParams }: PlayerPageProps) {
  const { url, type, title, mediaType = "movie" } = searchParams;

  if (!url || !type) {
    redirect("/");
  }

  const decodedUrl = decodeURIComponent(url);
  const playerType = type as PlayerType;
  const displayTitle = title ? decodeURIComponent(title) : "Unknown Media";

  return (
    <div className="flex h-screen w-full flex-col bg-oled overflow-hidden pt-16">
      
      {/* ── Main Layout: Player (Left) + Sidebar (Right) ────────── */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden p-4 sm:p-6 gap-6">
        
        {/* ── Player Area ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 bg-black rounded-3xl border border-white/5 shadow-cinematic overflow-hidden relative group">
          <UniversalPlayer url={decodedUrl} type={playerType} title={displayTitle} />
          
          {/* Security Toast Overlay for Sandbox */}
          {playerType === "iframe" && (
            <div className="absolute top-4 right-4 z-50 animate-fade-in opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 backdrop-blur-md shadow-lg">
                <ShieldAlert size={14} />
                Sandbox Active
              </div>
            </div>
          )}
        </div>

        {/* ── Dark Navy Sidebar ─────────────────────────────── */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
          
          {/* Info Card */}
          <div className="rounded-2xl border border-white/5 bg-navy-light/40 backdrop-blur-lg p-5">
            <h1 className="text-xl font-bold text-silver-light mb-1 line-clamp-2">{displayTitle}</h1>
            <div className="flex items-center gap-3 text-xs font-medium text-silver-dark uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <MonitorPlay size={14} className="text-gold" />
                {playerType}
              </span>
              <span>•</span>
              <span>{mediaType}</span>
            </div>
          </div>

          {/* Servers / Quality Selection */}
          <div className="rounded-2xl border border-white/5 bg-navy/60 p-5 shadow-inner-gold">
            <h3 className="text-sm font-semibold text-silver-light mb-4 flex items-center gap-2">
              <Server size={16} className="text-gold" />
              Available Servers
            </h3>
            
            <div className="space-y-2.5">
              {/* Active Server */}
              <button className="w-full flex items-center justify-between rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm transition-all hover:bg-gold/20 cursor-default">
                <span className="font-medium text-gold flex items-center gap-2">
                  <PlayCircle size={16} />
                  Vault Primary
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/40 text-gold-light">
                  1080p
                </span>
              </button>

              {/* Mock Alternate Servers */}
              <button className="w-full flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm transition-all hover:border-gold/20 hover:bg-white/[0.04] group">
                <span className="font-medium text-silver group-hover:text-silver-light">
                  UpCloud
                </span>
                <span className="text-xs font-medium text-silver-dark">
                  720p
                </span>
              </button>
              
              <button className="w-full flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm transition-all hover:border-gold/20 hover:bg-white/[0.04] group">
                <span className="font-medium text-silver group-hover:text-silver-light">
                  VidSrc Backup
                </span>
                <span className="text-xs font-medium text-silver-dark">
                  Auto
                </span>
              </button>
            </div>
          </div>

          {/* TV Show Episodes UI (Only visible if mediaType is 'tv') */}
          {mediaType === "tv" && (
            <div className="rounded-2xl border border-white/5 bg-navy/60 p-5 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-silver-light flex items-center gap-2">
                  <Settings2 size={16} className="text-gold" />
                  Episodes
                </h3>
                <span className="text-xs text-silver-dark">Season 1</span>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                {Array.from({ length: 8 }).map((_, i) => (
                  <button 
                    key={i}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      i === 0 
                        ? "border-gold/20 bg-gold/5 shadow-gold-sm" 
                        : "border-white/5 bg-white/[0.01] hover:border-gold/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      i === 0 ? "bg-gold text-oled" : "bg-navy-light text-silver-dark"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="overflow-hidden">
                      <p className={`text-sm font-medium truncate ${i === 0 ? "text-gold" : "text-silver"}`}>
                        Episode {i + 1}
                      </p>
                      <p className="text-2xs text-silver-dark truncate mt-0.5">
                        45 min • English
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
