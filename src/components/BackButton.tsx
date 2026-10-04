"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="fixed left-4 top-24 z-40 p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:border-gold hover:text-gold text-white transition-all shadow-lg hover:shadow-gold-sm group hidden md:flex items-center justify-center"
      aria-label="Go back"
    >
      <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
    </button>
  );
}
