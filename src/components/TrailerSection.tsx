"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";

export default function TrailerSection({ videos }: { videos: any[] }) {
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null);

  const closeTrailer = () => setActiveTrailer(null);

  if (!videos || videos.length === 0) return null;

  return (
    <>
      <section>
        <h2 className="section-heading mb-6">Trailers & Clips</h2>
        <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
          {videos.map((video: any) => (
            <div 
              key={video.id} 
              className="w-80 flex-shrink-0 group cursor-pointer"
              onClick={() => setActiveTrailer(video.key)}
            >
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 relative mb-3 bg-navy transition-all group-hover:border-gold/30">
                <Image
                  src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`}
                  alt={video.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/90 text-oled backdrop-blur-sm shadow-gold-sm transition-transform duration-300 group-hover:scale-110">
                    <Play size={20} className="fill-oled ml-1" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-silver-light line-clamp-1 group-hover:text-gold transition-colors">
                {video.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cinematic YouTube Modal */}
      {activeTrailer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12 animate-in fade-in duration-300">
          {/* Blurred overlay */}
          <div 
            className="absolute inset-0 bg-[#0B0C10]/95 backdrop-blur-3xl cursor-pointer"
            onClick={closeTrailer}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.1)] border border-white/10">
            {/* Close Button */}
            <button
              onClick={closeTrailer}
              className="absolute -top-12 right-0 sm:top-4 sm:right-4 z-20 p-2 bg-black/50 hover:bg-gold hover:text-oled text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X size={24} />
            </button>
            
            <iframe
              src={`https://www.youtube.com/embed/${activeTrailer}?autoplay=1`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </>
  );
}
