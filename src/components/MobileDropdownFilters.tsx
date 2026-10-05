"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Check, Calendar } from "lucide-react";
import { MEDIA_TYPES, GENRES } from "./Navbar";
import { LANGUAGES } from "@/lib/languages";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1970 + 1 }, (_, i) => currentYear - i);

function MobileDropdownFiltersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get("type") || "all";
  const genre = searchParams.get("genre") || "";
  const lang = searchParams.get("lang") || "";
  const year = searchParams.get("year") || "";

  const [activeDropdown, setActiveDropdown] = useState<"type" | "genre" | "lang" | "year" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    let newType = type;
    let newGenre = genre;
    let newLang = lang;
    let newYear = year;

    if (key === "type") newType = value;
    if (key === "genre") newGenre = value;
    if (key === "lang") newLang = value;
    if (key === "year") newYear = value;

    const newParams = new URLSearchParams();
    if (newType && newType !== "all") newParams.set("type", newType);
    if (newGenre) newParams.set("genre", newGenre);
    if (newLang) newParams.set("lang", newLang);
    if (newYear) newParams.set("year", newYear);

    setActiveDropdown(null);
    router.push(`/explore?${newParams.toString()}`);
  };

  const getTypeLabel = () => {
    if (type === "all") return "Type: All";
    const match = MEDIA_TYPES.find(m => m.value === type);
    return match ? match.label : "Type: All";
  };

  const getGenreLabel = () => {
    if (!genre) return "Cat: All";
    const match = GENRES.find(g => g.value === genre);
    return match ? match.label : "Cat: All";
  };

  const getLangLabel = () => {
    if (!lang) return "Lang: All";
    const match = LANGUAGES.find(l => l.code === lang);
    return match ? match.name : "Lang: All";
  };

  const getYearLabel = () => {
    if (!year) return "Year";
    return year;
  };

  return (
    <div className="fixed top-14 w-full z-40 bg-[#0B0C10]/95 backdrop-blur-xl border-b border-white/10 md:hidden" ref={containerRef}>
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide p-2 w-full">
        {/* Type Button */}
        <button 
          onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
          className={`shrink-0 flex items-center justify-between py-2 px-3 rounded-lg border text-xs font-medium transition-all ${activeDropdown === "type" ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]" : type !== "all" ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}`}
        >
          <span className="truncate">{getTypeLabel()}</span>
          <ChevronDown size={14} className={`shrink-0 ml-1 transition-transform ${activeDropdown === "type" ? "rotate-180" : ""}`} />
        </button>

        {/* Category (Genre) Button */}
        <button 
          onClick={() => setActiveDropdown(activeDropdown === "genre" ? null : "genre")}
          className={`shrink-0 flex items-center justify-between py-2 px-3 rounded-lg border text-xs font-medium transition-all ${activeDropdown === "genre" ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]" : genre !== "" ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}`}
        >
          <span className="truncate">{getGenreLabel()}</span>
          <ChevronDown size={14} className={`shrink-0 ml-1 transition-transform ${activeDropdown === "genre" ? "rotate-180" : ""}`} />
        </button>

        {/* Language Button */}
        <button 
          onClick={() => setActiveDropdown(activeDropdown === "lang" ? null : "lang")}
          className={`shrink-0 flex items-center justify-between py-2 px-3 rounded-lg border text-xs font-medium transition-all ${activeDropdown === "lang" ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]" : lang !== "" ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}`}
        >
          <span className="truncate">{getLangLabel()}</span>
          <ChevronDown size={14} className={`shrink-0 ml-1 transition-transform ${activeDropdown === "lang" ? "rotate-180" : ""}`} />
        </button>

        {/* Year Button */}
        <button 
          onClick={() => setActiveDropdown(activeDropdown === "year" ? null : "year")}
          className={`shrink-0 flex items-center justify-between py-2 px-3 rounded-lg border text-xs font-medium transition-all ${activeDropdown === "year" ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]" : year !== "" ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"}`}
        >
          <Calendar size={14} className="shrink-0 mr-1.5" />
          <span className="truncate">{getYearLabel()}</span>
          <ChevronDown size={14} className={`shrink-0 ml-1 transition-transform ${activeDropdown === "year" ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Dropdown Menus */}
      {activeDropdown && (
        <div className="absolute top-full left-0 w-full bg-[#0B0C10]/95 backdrop-blur-2xl border-b border-[#D4AF37]/20 shadow-2xl max-h-[60vh] overflow-y-auto z-50 transition-all">
          <div className="p-2 space-y-1">
            {activeDropdown === "type" && MEDIA_TYPES.map(m => (
              <button
                key={m.value}
                onClick={() => handleFilterChange("type", m.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${type === m.value || (type === "all" && m.value === "all") ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5"}`}
              >
                {m.label === "All" ? "All Types" : m.label}
                {(type === m.value || (type === "all" && m.value === "all")) && <Check size={16} />}
              </button>
            ))}

            {activeDropdown === "genre" && GENRES.map(g => (
              <button
                key={g.value}
                onClick={() => handleFilterChange("genre", g.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${genre === g.value ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5"}`}
              >
                {g.label || "All Categories"}
                {genre === g.value && <Check size={16} />}
              </button>
            ))}

            {activeDropdown === "lang" && (
              <>
                <button
                  onClick={() => handleFilterChange("lang", "")}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${lang === "" ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5"}`}
                >
                  All Languages
                  {lang === "" && <Check size={16} />}
                </button>
                {LANGUAGES.filter(l => l.code !== "").map(l => (
                  <button
                    key={l.code}
                    onClick={() => handleFilterChange("lang", l.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${lang === l.code ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5"}`}
                  >
                    {l.name}
                    {lang === l.code && <Check size={16} />}
                  </button>
                ))}
              </>
            )}

            {activeDropdown === "year" && (
              <>
                <button
                  onClick={() => handleFilterChange("year", "")}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${year === "" ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5"}`}
                >
                  All Years
                  {year === "" && <Check size={16} />}
                </button>
                {YEARS.map(y => (
                  <button
                    key={y}
                    onClick={() => handleFilterChange("year", y.toString())}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${year === y.toString() ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-gray-300 hover:bg-white/5"}`}
                  >
                    {y}
                    {year === y.toString() && <Check size={16} />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobileDropdownFilters() {
  return (
    <Suspense fallback={<div className="h-12 w-full fixed top-14 bg-[#0B0C10]/95 z-40 border-b border-white/10 md:hidden"></div>}>
      <MobileDropdownFiltersContent />
    </Suspense>
  );
}
