"use client";

import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import { Maximize, Play, Pause, Volume2, VolumeX, AlertCircle } from "lucide-react";

export type PlayerType = "hls" | "youtube" | "iframe";

const Player = ReactPlayer as any;

interface UniversalPlayerProps {
  url: string;
  type: PlayerType;
  title: string;
}

export default function UniversalPlayer({ url, type, title }: UniversalPlayerProps) {
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Auto-detect YouTube ID if the URL is standard YouTube but type is set to iframe or youtube
  const getYouTubeId = (link: string) => {
    const match = link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(console.error);
    }
  };

  const ytId = type === "youtube" ? getYouTubeId(url) : null;

  return (
    <div 
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center bg-black group overflow-hidden rounded-2xl border border-white/5 shadow-cinematic"
    >
      {/* ── YouTube Embed ────────────────────────────── */}
      {type === "youtube" && ytId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&color=white`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      ) : 

      /* ── Secure Sandboxed Iframe ─────────────────── */
      type === "iframe" ? (
        <div className="h-full w-full relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-silver backdrop-blur-md">
            <AlertCircle size={14} className="text-gold" />
            Sandboxed Stream
          </div>
          <iframe
            src={url}
            // CRITICAL SECURITY: Sandboxing blocks popup ads and malicious redirects
            sandbox="allow-scripts allow-same-origin allow-forms"
            allowFullScreen
            className="h-full w-full border-0 bg-black"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-silver-dark animate-pulse">
              Connecting to secure vault server...
            </div>
          )}
        </div>
      ) : 

      /* ── HLS / Direct MP4 Stream ─────────────────── */
      type === "hls" ? (
        <div className="relative h-full w-full">
          {/* @ts-ignore */}
          <Player
            ref={playerRef}
            url={url}
            playing={playing}
            volume={volume}
            muted={muted}
            width="100%"
            height="100%"
            controls={false} // Disable default controls to use custom ones
            onReady={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
          
          {/* Custom Controls Overlay */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4">
              <h2 className="text-lg font-bold text-white drop-shadow-md">{title}</h2>
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center gap-4 p-4 text-silver">
              <button 
                onClick={() => setPlaying(!playing)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/90 text-oled transition-transform hover:scale-110 shadow-gold-sm"
              >
                {playing ? <Pause size={20} className="fill-oled" /> : <Play size={20} className="fill-oled ml-1" />}
              </button>

              <div className="flex items-center gap-2 group/vol">
                <button 
                  onClick={() => setMuted(!muted)}
                  className="text-silver hover:text-gold transition-colors"
                >
                  {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    setMuted(false);
                    setVolume(parseFloat(e.target.value));
                  }}
                  className="w-0 opacity-0 transition-all duration-300 group-hover/vol:w-20 group-hover/vol:opacity-100 accent-gold"
                />
              </div>

              <div className="flex-1" /> {/* Spacer */}

              <button 
                onClick={handleFullscreen}
                className="text-silver hover:text-gold transition-colors"
              >
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-silver-dark">
          <AlertCircle size={32} className="text-red-500/50" />
          <p>Unsupported Media Type</p>
        </div>
      )}
    </div>
  );
}
