import React, { useState } from "react";
import { Search, BookOpen, Compass, RefreshCw, AlertCircle } from "lucide-react";
import type { SearchMatchItem, UILanguage } from "../types/quran";
import { UI_COPY, toArabicNumerals } from "../i18n/translations";

interface SearchScreenProps {
  uiLang: UILanguage;
  arabicFontSize: number;
  onOpenSurahAyah: (surah: number, ayah: number) => void;
  onOpenTafsir: (surah: number, ayah: number) => void;
}

const QUICK_SEARCH_CHIPS: Array<{ label: string; q: string; lang: UILanguage }> = [
  { label: "Ayat al-Kursi (2:255)", q: "2:255", lang: "en" },
  { label: "رحمت (Urdu · Jalandhry)", q: "رحمت", lang: "ur" },
  { label: "صبر (Urdu · Jalandhry)", q: "صبر", lang: "ur" },
  { label: "Mercy (English)", q: "mercy", lang: "en" },
  { label: "Patience (English)", q: "patience", lang: "en" },
  { label: "الرحمن (Arabic)", q: "الرحمن", lang: "ar" },
];

export const SearchScreen: React.FC<SearchScreenProps> = ({
  uiLang,
  arabicFontSize,
  onOpenSurahAyah,
  onOpenTafsir,
}) => {
  const copy = UI_COPY[uiLang];

  const [query, setQuery] = useState("");
  const [searchLang, setSearchLang] = useState<UILanguage>(uiLang);
  const [results, setResults] = useState<SearchMatchItem[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sourceAttribution, setSourceAttribution] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSearch = async (overrideQuery?: string, overrideLang?: UILanguage) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    const lang = overrideLang || searchLang;
    if (q.length < 2) {
      setError("Please enter at least 2 characters or a Surah:Ayah reference like 2:255.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/quran/search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Search could not be completed.");
      }
      setResults(data.results || []);
      setTotalCount(data.totalCount ?? 0);
      setSourceAttribution(data.source || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete search right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <section className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#8A6823] dark:text-[#D4AF5A]">
            Multilingual Verified Concordance · Direct Ayah Lookup
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
            {copy.searchTitle}
          </h1>
          <p className="text-sm text-[#57635D] dark:text-[#98AAA2] max-w-2xl leading-relaxed">
            {copy.searchSubtitle}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <select
            aria-label="Search edition language"
            value={searchLang}
            onChange={(e) => setSearchLang(e.target.value as UILanguage)}
            className="h-12 sm:w-56 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-3.5 text-xs sm:text-sm font-medium text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
          >
            <option value="en">English (Saheeh International)</option>
            <option value="ur">اردو (Fateh M. Jalandhry)</option>
            <option value="ar">العربية (Arabic Text)</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#57635D] dark:text-[#98AAA2] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              dir={searchLang === "ur" || searchLang === "ar" ? "rtl" : "ltr"}
              placeholder={copy.searchPlaceholder}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] text-sm text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 px-6 rounded-xl bg-[#0B5D46] hover:bg-[#084735] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{copy.searchButton}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs text-[#57635D] dark:text-[#98AAA2]">Try:</span>
          {QUICK_SEARCH_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setQuery(chip.q);
                setSearchLang(chip.lang);
                executeSearch(chip.q, chip.lang);
              }}
              className="min-h-[36px] px-3 py-1 rounded-lg bg-[#FAF8F3] dark:bg-[#172821] border border-[#E6E1D6] dark:border-[#21352D] hover:border-[#0B5D46] text-xs text-[#18221E] dark:text-[#F3EFE6] transition-colors whitespace-nowrap"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] py-16 text-center space-y-2">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#0B5D46] dark:text-[#34D399]" />
          <p className="text-sm text-[#57635D] dark:text-[#98AAA2]">
            Searching verified Quranic editions…
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6 flex items-center justify-between gap-4 text-sm text-red-900 dark:text-red-200">
          <span className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={() => executeSearch()}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-medium"
          >
            {copy.retry}
          </button>
        </div>
      ) : totalCount !== null ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57635D] dark:text-[#98AAA2] tabular-nums">
            <span>
              Found <strong className="text-[#18221E] dark:text-[#F3EFE6]">{totalCount}</strong> total occurrences
              {results.length < totalCount ? ` (displaying top ${results.length})` : ""}
            </span>
            <span>Source: {sourceAttribution}</span>
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] py-14 px-6 text-center space-y-2">
              <p className="text-base font-medium text-[#18221E] dark:text-[#F3EFE6]">
                No exact matches found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-[#57635D] dark:text-[#98AAA2]">
                Check the selected search language above (English, Urdu, or Arabic) or enter a direct Surah:Ayah reference such as 36:1.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((item) => (
                <article
                  key={`${item.reference}-${item.editionName}`}
                  className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6E1D6] dark:border-[#21352D]">
                    <div className="text-xs font-medium text-[#0B5D46] dark:text-[#34D399] tabular-nums">
                      {item.surahEnglishName} ({item.surahName.replace("سُورَةُ ", "")}) · Ayah{" "}
                      {item.reference}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenSurahAyah(item.surahNumber, item.ayahNumber)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0B5D46] hover:bg-[#084735] text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{copy.openInReader}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTafsir(item.surahNumber, item.ayahNumber)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#E6E1D6] dark:border-[#21352D] text-xs font-medium text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#FAF8F3] dark:hover:bg-[#172821] inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Compass className="w-3.5 h-3.5 text-[#8A6823] dark:text-[#D4AF5A]" />
                        <span>{copy.studyTafsir}</span>
                      </button>
                    </div>
                  </div>

                  {item.arabicText && (
                    <div
                      dir="rtl"
                      lang="ar"
                      style={{ fontSize: `${Math.max(26, arabicFontSize - 2)}px` }}
                      className="font-quran-text text-right text-[#18221E] dark:text-[#F5F2EB]"
                    >
                      {item.arabicText}{" "}
                      <span className="inline-block text-[#B58D3D] dark:text-[#D4AF5A] text-xl mx-1 select-none">
                        ﴿{toArabicNumerals(item.ayahNumber)}﴾
                      </span>
                    </div>
                  )}

                  {item.urduText && (
                    <p
                      dir="rtl"
                      lang="ur"
                      className="font-urdu-text text-lg text-right text-[#21302A] dark:text-[#E5E0D5]"
                    >
                      {item.urduText}
                    </p>
                  )}

                  {item.englishText && (
                    <p
                      dir="ltr"
                      lang="en"
                      className="text-sm leading-relaxed text-[#2B3732] dark:text-[#D8D3C8]"
                    >
                      {item.englishText}
                    </p>
                  )}

                  <p className="text-[11px] text-[#57635D] dark:text-[#98AAA2]">
                    Edition: {item.editionName}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};
