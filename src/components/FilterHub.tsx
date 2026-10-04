"use client";

import { useState } from "react";
import { ChevronDown, Compass } from "lucide-react";

/* ──────────────────────────────────────────────────────────
   FilterHub — Explore Header & Liquid Glass Filters
   ────────────────────────────────────────────────────────── */

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
  { code: "ml", name: "Malayalam" },
  { code: "ta", name: "Tamil" },
  { code: "si", name: "Sinhala" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "zh", name: "Chinese" },
];

const CATEGORIES = [
  { value: "movies", label: "Movies" },
  { value: "tv", label: "TV Shows" },
  { value: "trending", label: "Trending" }
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

interface FilterHubProps {
  onFilterChange: (filters: { category?: string; language?: string; year?: number }) => void;
}

export default function FilterHub({ onFilterChange }: FilterHubProps) {
  const [category, setCategory] = useState("movies");
  const [language, setLanguage] = useState("");
  const [year, setYear] = useState("");

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCategory(val);
    onFilterChange({ category: val, language: language || undefined, year: year ? Number(year) : undefined });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLanguage(val);
    onFilterChange({ category, language: val || undefined, year: year ? Number(year) : undefined });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setYear(val);
    onFilterChange({ category, language: language || undefined, year: val ? Number(val) : undefined });
  };

  return (
    <div className="sticky top-16 z-40 w-full bg-[#0B0C10]/60 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 max-w-7xl mx-auto w-full">
        {/* Left: Brand/Heading */}
        <div className="flex items-center gap-2 text-white font-bold text-xl whitespace-nowrap">
          <Compass size={24} className="text-gold" />
          <span>Explore</span>
        </div>

        {/* Right: Dropdowns */}
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          {/* Category Dropdown */}
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <select
              value={category}
              onChange={handleCategoryChange}
              className="
                w-full appearance-none rounded-xl border border-white/10
                bg-[#0B0C10] py-2.5 pl-4 pr-10 text-sm font-medium text-white
                outline-none transition-all duration-300
                hover:border-gold hover:shadow-[0_0_10px_rgba(212,175,55,0.2)]
                focus:border-gold focus:ring-1 focus:ring-gold/20
                cursor-pointer
              "
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-[#0B0C10] text-white">
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold" />
          </div>

          {/* Language Dropdown */}
          <div className="relative flex-1 sm:flex-none min-w-[150px]">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="
                w-full appearance-none rounded-xl border border-white/10
                bg-[#0B0C10] py-2.5 pl-4 pr-10 text-sm font-medium text-white
                outline-none transition-all duration-300
                hover:border-gold hover:shadow-[0_0_10px_rgba(212,175,55,0.2)]
                focus:border-gold focus:ring-1 focus:ring-gold/20
                cursor-pointer
              "
            >
              <option value="" className="bg-[#0B0C10] text-white">All Languages</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#0B0C10] text-white">
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold" />
          </div>

          {/* Year Dropdown */}
          <div className="relative flex-1 sm:flex-none min-w-[120px]">
            <select
              value={year}
              onChange={handleYearChange}
              className="
                w-full appearance-none rounded-xl border border-white/10
                bg-[#0B0C10] py-2.5 pl-4 pr-10 text-sm font-medium text-white
                outline-none transition-all duration-300
                hover:border-gold hover:shadow-[0_0_10px_rgba(212,175,55,0.2)]
                focus:border-gold focus:ring-1 focus:ring-gold/20
                cursor-pointer
              "
            >
              <option value="" className="bg-[#0B0C10] text-white">Any Year</option>
              {YEARS.map((y) => (
                <option key={y} value={y} className="bg-[#0B0C10] text-white">
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold" />
          </div>
        </div>
      </div>
    </div>
  );
}
