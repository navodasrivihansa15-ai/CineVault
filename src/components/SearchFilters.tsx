"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => currentYear - i);

export default function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";
  const year = searchParams.get("year") || "";
  const lang = searchParams.get("lang") || "";

  const [languageSearch, setLanguageSearch] = useState("");
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLanguageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    
    let newType = type;
    let newYear = year;
    let newLang = lang;

    if (key === "type") newType = value;
    if (key === "year") newYear = value;
    if (key === "lang") newLang = value;

    if (newType && newType !== "all") params.set("type", newType);
    if (newYear) params.set("year", newYear);
    if (newLang) params.set("lang", newLang);

    // Reset page to 1 on filter change
    params.set("page", "1");

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8 bg-[#0B0C10]/50 p-4 rounded-xl border border-white/10">
      <div className="text-sm font-medium text-gray-400 mr-2 w-full md:w-auto mb-2 md:mb-0">Filter By:</div>
      
      {/* Type */}
      <div className="relative w-40">
        <select
          value={type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className="w-full appearance-none rounded-lg border border-white/10 bg-[#0B0C10] py-2 pl-4 pr-10 text-sm font-medium text-gray-300 outline-none transition-all hover:border-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
        >
          <option value="all">All</option>
          <option value="movie">Movies</option>
          <option value="tv">TV Shows</option>
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
      </div>

      {/* Year */}
      <div className="relative w-40">
        <select
          value={year}
          onChange={(e) => handleFilterChange("year", e.target.value)}
          className="w-full appearance-none rounded-lg border border-white/10 bg-[#0B0C10] py-2 pl-4 pr-10 text-sm font-medium text-gray-300 outline-none transition-all hover:border-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
        >
          <option value="">Any Year</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none" />
      </div>

      {/* Language */}
      <div className="relative w-48" ref={langRef}>
        <button
          type="button"
          onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
          className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-[#0B0C10] py-2 pl-4 pr-3 text-sm font-medium text-gray-300 outline-none transition-all hover:border-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
        >
          <span className="truncate">{LANGUAGES.find((l) => l.code === lang)?.name || "All Languages"}</span>
          <ChevronDown size={16} className="text-[#D4AF37] shrink-0 ml-2" />
        </button>

        {isLanguageDropdownOpen && (
          <div className="absolute top-full mt-2 w-full min-w-[200px] z-50 rounded-lg border border-white/10 bg-[#0B0C10]/95 backdrop-blur-xl shadow-lg overflow-hidden flex flex-col max-h-[300px]">
            <div className="p-2 border-b border-[#D4AF37]/50 sticky top-0 bg-[#0B0C10]/95 flex items-center gap-2">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search language..."
                value={languageSearch}
                onChange={(e) => setLanguageSearch(e.target.value)}
                className="w-full bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {LANGUAGES.filter((l) => l.name.toLowerCase().includes(languageSearch.toLowerCase())).map((l) => (
                <button
                  key={l.code}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${lang === l.code ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                  onClick={() => {
                    handleFilterChange("lang", l.code);
                    setIsLanguageDropdownOpen(false);
                    setLanguageSearch("");
                  }}
                >
                  {l.name}
                </button>
              ))}
              {LANGUAGES.filter((l) => l.name.toLowerCase().includes(languageSearch.toLowerCase())).length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-gray-500">No languages found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
