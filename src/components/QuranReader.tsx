import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Bookmark,
  Volume2,
  Pause,
  Compass,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  RefreshCw,
  Check,
  SlidersHorizontal,
  List,
  X,
} from "lucide-react";
import type {
  AudioTrack,
  AyahItem,
  BookmarkEntry,
  EditionsCatalog,
  LastReadPosition,
  SurahReaderPayload,
  SurahSummary,
  UILanguage,
} from "../types/quran";
import { UI_COPY, toArabicNumerals } from "../i18n/translations";
import { parseTajweedMarkup, TAJWEED_RULES } from "../utils/tajweedParser";

interface QuranReaderProps {
  uiLang: UILanguage;
  surahs: SurahSummary[];
  surahsError: string | null;
  onRetrySurahs: () => void;
  selectedSurahNumber: number;
  targetAyahNumber: number | null;
  onSelectSurah: (surahNum: number, ayahNum?: number) => void;
  editionsCatalog: EditionsCatalog | null;
  selectedUrduEdition: string;
  onChangeUrduEdition: (id: string) => void;
  selectedEnglishEdition: string;
  onChangeEnglishEdition: (id: string) => void;
  selectedReciter: string;
  arabicFontSize: number;
  onChangeArabicFontSize: (size: number) => void;
  bookmarks: BookmarkEntry[];
  onToggleBookmark: (ayah: AyahItem, surah: SurahSummary, note?: string) => void;
  lastRead: LastReadPosition | null;
  onSaveLastRead: (surah: SurahSummary, ayahNumber: number) => void;
  onRecordAyahRead: (reference: string) => void;
  onOpenTafsir: (surahNum: number, ayahNum: number) => void;
  activeAudioTrack: AudioTrack | null;
  isAudioPlaying: boolean;
  onPlayAyahAudio: (track: AudioTrack, allSurahTracks?: AudioTrack[]) => void;
  initialHifzMask?: boolean;
}

export const QuranReader: React.FC<QuranReaderProps> = ({
  uiLang,
  surahs,
  surahsError,
  onRetrySurahs,
  selectedSurahNumber,
  targetAyahNumber,
  onSelectSurah,
  editionsCatalog,
  selectedUrduEdition,
  onChangeUrduEdition,
  selectedEnglishEdition,
  onChangeEnglishEdition,
  selectedReciter,
  arabicFontSize,
  onChangeArabicFontSize,
  bookmarks,
  onToggleBookmark,
  lastRead,
  onSaveLastRead,
  onRecordAyahRead,
  onOpenTafsir,
  activeAudioTrack,
  isAudioPlaying,
  onPlayAyahAudio,
  initialHifzMask = false,
}) => {
  const copy = UI_COPY[uiLang];

  const [surahData, setSurahData] = useState<SurahReaderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [surahSearch, setSurahSearch] = useState("");
  const [revelationFilter, setRevelationFilter] = useState<"all" | "Meccan" | "Medinan">("all");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  const [showUrdu, setShowUrdu] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showTajweed, setShowTajweed] = useState(false);
  const [hifzMaskEnabled, setHifzMaskEnabled] = useState(initialHifzMask);
  const [revealedAyahRefs, setRevealedAyahRefs] = useState<Record<string, boolean>>({});
  const [editingNoteRef, setEditingNoteRef] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const ayahRefsMap = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    if (initialHifzMask) {
      setHifzMaskEnabled(true);
    }
  }, [initialHifzMask]);

  const fetchSurah = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        urduEdition: selectedUrduEdition,
        englishEdition: selectedEnglishEdition,
        reciter: selectedReciter,
        tajweed: showTajweed ? "true" : "false",
      });
      const res = await fetch(`/api/quran/surah/${selectedSurahNumber}?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to retrieve verified Surah.");
      }
      setSurahData(json as SurahReaderPayload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verified Quran text could not be loaded right now. No text is generated or substituted."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedSurahNumber, selectedUrduEdition, selectedEnglishEdition, selectedReciter, showTajweed]);

  useEffect(() => {
    fetchSurah();
    setRevealedAyahRefs({});
  }, [fetchSurah]);

  // Scroll to target Ayah when loaded or when audio advances
  useEffect(() => {
    if (!loading && surahData && targetAyahNumber) {
      const node = ayahRefsMap.current[targetAyahNumber];
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [loading, surahData, targetAyahNumber]);

  useEffect(() => {
    if (activeAudioTrack && activeAudioTrack.surahNumber === selectedSurahNumber && isAudioPlaying) {
      const node = ayahRefsMap.current[activeAudioTrack.ayahNumber];
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeAudioTrack, selectedSurahNumber, isAudioPlaying]);

  const filteredSurahs = surahs.filter((s) => {
    if (revelationFilter !== "all" && s.revelationType !== revelationFilter) return false;
    if (!surahSearch.trim()) return true;
    const q = surahSearch.trim().toLowerCase();
    return (
      String(s.number) === q ||
      s.englishName.toLowerCase().includes(q) ||
      s.englishNameTranslation.toLowerCase().includes(q) ||
      s.name.includes(surahSearch.trim())
    );
  });

  const buildAllSurahAudioTracks = (): AudioTrack[] => {
    if (!surahData) return [];
    return surahData.ayahs.map((a) => ({
      reference: a.reference,
      surahNumber: surahData.surah.number,
      ayahNumber: a.numberInSurah,
      surahEnglishName: surahData.surah.englishName,
      surahArabicName: surahData.surah.name,
      audioUrl: a.audioUrl,
      totalAyahsInSurah: surahData.surah.numberOfAyahs,
    }));
  };

  const handlePlayAyah = (ayah: AyahItem) => {
    if (!surahData) return;
    const allTracks = buildAllSurahAudioTracks();
    const targetTrack = allTracks.find((t) => t.ayahNumber === ayah.numberInSurah);
    if (targetTrack) {
      onPlayAyahAudio(targetTrack, allTracks);
      onSaveLastRead(surahData.surah, ayah.numberInSurah);
      onRecordAyahRead(ayah.reference);
    }
  };

  const shouldRenderSeparateBismillah =
    surahData &&
    surahData.surah.number !== 1 &&
    surahData.surah.number !== 9 &&
    surahData.ayahs.length > 0 &&
    !surahData.ayahs[0].arabicText.startsWith("بِسْمِ");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-16">
      {/* Desktop Surah Directory Sidebar */}
      <aside
        aria-label="Surah Navigation List"
        className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] overflow-hidden sticky top-20 max-h-[calc(100vh-6.5rem)]"
      >
        <div className="p-4 border-b border-[#E6E1D6] dark:border-[#21352D] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#57635D] dark:text-[#98AAA2] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={surahSearch}
              onChange={(e) => setSurahSearch(e.target.value)}
              placeholder="Filter Surah (e.g. Yaseen, 36, يس)…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] text-xs text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#FAF8F3] dark:bg-[#172821]">
            {(["all", "Meccan", "Medinan"] as const).map((rev) => (
              <button
                key={rev}
                type="button"
                onClick={() => setRevelationFilter(rev)}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  revelationFilter === rev
                    ? "bg-white dark:bg-[#101C17] text-[#0B5D46] dark:text-[#34D399] shadow-sm"
                    : "text-[#57635D] dark:text-[#98AAA2] hover:text-[#18221E]"
                }`}
              >
                {rev === "all" ? "All (114)" : rev}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto divide-y divide-[#E6E1D6]/60 dark:divide-[#21352D]/60 flex-1">
          {surahsError ? (
            <div className="p-4 text-xs text-red-700 dark:text-red-300 space-y-2">
              <p>{surahsError}</p>
              <button
                type="button"
                onClick={onRetrySurahs}
                className="px-3 py-1.5 rounded-lg bg-red-700 text-white font-medium"
              >
                {copy.retry}
              </button>
            </div>
          ) : (
            filteredSurahs.map((s) => {
              const active = s.number === selectedSurahNumber;
              return (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => onSelectSurah(s.number, 1)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors ${
                    active
                      ? "bg-[#0B5D46]/10 dark:bg-[#10B981]/15"
                      : "hover:bg-[#FAF8F3] dark:hover:bg-[#172821]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg text-xs font-mono tabular-nums flex items-center justify-center shrink-0 ${
                        active
                          ? "bg-[#0B5D46] text-white font-semibold"
                          : "bg-[#FAF8F3] dark:bg-[#1A2D25] text-[#57635D] dark:text-[#98AAA2]"
                      }`}
                    >
                      {s.number}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#18221E] dark:text-[#F3EFE6] truncate">
                        {s.englishName}
                      </div>
                      <div className="text-[11px] text-[#57635D] dark:text-[#98AAA2] truncate tabular-nums">
                        {s.englishNameTranslation} · {s.numberOfAyahs} Ayat
                      </div>
                    </div>
                  </div>
                  <span
                    dir="rtl"
                    lang="ar"
                    className="font-quran-text text-xl text-[#0B5D46] dark:text-[#34D399] shrink-0"
                  >
                    {s.name.replace("سُورَةُ ", "")}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Mobile Surah Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/50 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white dark:bg-[#13201B] rounded-t-3xl max-h-[82vh] flex flex-col overflow-hidden border-t border-[#E6E1D6] dark:border-[#21352D]">
            <div className="w-10 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-3" />
            <div className="p-4 border-b border-[#E6E1D6] dark:border-[#21352D] flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                Select Surah (1–114)
              </h2>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#57635D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b border-[#E6E1D6] dark:border-[#21352D]">
              <input
                type="search"
                value={surahSearch}
                onChange={(e) => setSurahSearch(e.target.value)}
                placeholder="Search Surah name or number…"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] text-sm text-[#18221E] dark:text-[#F3EFE6]"
              />
            </div>
            <div className="overflow-y-auto divide-y divide-[#E6E1D6]/60 dark:divide-[#21352D]/60 flex-1 pb-safe">
              {filteredSurahs.map((s) => (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => {
                    onSelectSurah(s.number, 1);
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full min-h-[58px] px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-[#FAF8F3] dark:hover:bg-[#172821]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#FAF8F3] dark:bg-[#1A2D25] text-xs font-mono tabular-nums flex items-center justify-center">
                      {s.number}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                        {s.englishName}
                      </div>
                      <div className="text-xs text-[#57635D] dark:text-[#98AAA2] tabular-nums">
                        {s.englishNameTranslation} · {s.numberOfAyahs} Ayat
                      </div>
                    </div>
                  </div>
                  <span dir="rtl" lang="ar" className="font-quran-text text-xl text-[#0B5D46] dark:text-[#34D399]">
                    {s.name.replace("سُورَةُ ", "")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Reader Column */}
      <div className="lg:col-span-8 xl:col-span-9 space-y-6">
        {/* Reader Controls Toolbar */}
        <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mobile Surah Picker Trigger + Ayah Jump */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#172821] border border-[#E6E1D6] dark:border-[#21352D] text-xs font-semibold text-[#18221E] dark:text-[#F3EFE6] inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <List className="w-4 h-4 text-[#0B5D46] dark:text-[#34D399]" />
                <span>
                  {surahData ? `${surahData.surah.number}. ${surahData.surah.englishName}` : copy.surahList}
                </span>
              </button>

              {surahData && (
                <div className="flex items-center gap-2">
                  <label htmlFor="ayah-jump-select" className="text-xs font-medium text-[#57635D] dark:text-[#98AAA2]">
                    {copy.jumpToAyah}:
                  </label>
                  <select
                    id="ayah-jump-select"
                    value={targetAyahNumber || 1}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      onSelectSurah(selectedSurahNumber, num);
                    }}
                    className="h-10 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-3 text-xs font-mono tabular-nums text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
                  >
                    {surahData.ayahs.map((a) => (
                      <option key={a.numberInSurah} value={a.numberInSurah}>
                        Ayah {a.numberInSurah}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Translation, Tajweed & Hifz Quick Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUrdu((v) => !v)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  showUrdu
                    ? "bg-[#0B5D46]/10 border-[#0B5D46]/40 text-[#0B5D46] dark:text-[#34D399]"
                    : "border-[#E6E1D6] dark:border-[#21352D] text-[#57635D] dark:text-[#98AAA2]"
                }`}
              >
                اردو · Urdu
              </button>

              <button
                type="button"
                onClick={() => setShowEnglish((v) => !v)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  showEnglish
                    ? "bg-[#0B5D46]/10 border-[#0B5D46]/40 text-[#0B5D46] dark:text-[#34D399]"
                    : "border-[#E6E1D6] dark:border-[#21352D] text-[#57635D] dark:text-[#98AAA2]"
                }`}
              >
                English
              </button>

              <button
                type="button"
                onClick={() => setShowTajweed((v) => !v)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  showTajweed
                    ? "bg-[#B58D3D]/15 border-[#B58D3D]/50 text-[#8A6823] dark:text-[#E2B866]"
                    : "border-[#E6E1D6] dark:border-[#21352D] text-[#57635D] dark:text-[#98AAA2]"
                }`}
              >
                {copy.tajweedColors}
              </button>

              <button
                type="button"
                onClick={() => setHifzMaskEnabled((v) => !v)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  hifzMaskEnabled
                    ? "bg-[#0B5D46] border-[#0B5D46] text-white"
                    : "border-[#E6E1D6] dark:border-[#21352D] text-[#57635D] dark:text-[#98AAA2]"
                }`}
              >
                {hifzMaskEnabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{copy.hifzMask}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDisplaySettings((v) => !v)}
                aria-expanded={showDisplaySettings}
                className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#E6E1D6] dark:border-[#21352D] text-xs font-medium text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#FAF8F3] dark:hover:bg-[#1A2C25] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Editions & Font</span>
              </button>
            </div>
          </div>

          {/* Expandable Edition & Font Size Drawer */}
          {showDisplaySettings && (
            <div className="pt-4 border-t border-[#E6E1D6] dark:border-[#21352D] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57635D] dark:text-[#98AAA2] mb-1.5">
                  {copy.urduEditionLabel}
                </label>
                <select
                  value={selectedUrduEdition}
                  onChange={(e) => onChangeUrduEdition(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-3 text-xs text-[#18221E] dark:text-[#F3EFE6]"
                >
                  {(editionsCatalog?.urduEditions || []).map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.name} ({ed.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57635D] dark:text-[#98AAA2] mb-1.5">
                  {copy.englishEditionLabel}
                </label>
                <select
                  value={selectedEnglishEdition}
                  onChange={(e) => onChangeEnglishEdition(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-3 text-xs text-[#18221E] dark:text-[#F3EFE6]"
                >
                  {(editionsCatalog?.englishEditions || []).map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57635D] dark:text-[#98AAA2] mb-1.5 tabular-nums">
                  {copy.arabicFontSize}: {arabicFontSize}px
                </label>
                <input
                  type="range"
                  min={26}
                  max={50}
                  step={2}
                  value={arabicFontSize}
                  onChange={(e) => onChangeArabicFontSize(Number(e.target.value))}
                  className="w-full h-2 mt-2 accent-[#0B5D46] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Compact Tajweed Legend when active */}
          {showTajweed && (
            <div className="pt-3 border-t border-[#E6E1D6] dark:border-[#21352D] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="font-semibold text-[#18221E] dark:text-[#F3EFE6]">Tajweed Key:</span>
              {Object.values(TAJWEED_RULES)
                .slice(0, 7)
                .map((r) => (
                  <span key={r.code} className="inline-flex items-center gap-1.5 text-[#57635D] dark:text-[#98AAA2]">
                    <span className={`w-2.5 h-2.5 rounded-sm ${r.badgeSwatchClass}`} />
                    <span>{r.nameEn.split(" (")[0]}</span>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Loading, Error, or Verified Surah Content */}
        {loading ? (
          <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] py-20 px-6 text-center space-y-3">
            <RefreshCw className="w-7 h-7 mx-auto animate-spin text-[#0B5D46] dark:text-[#34D399]" />
            <p className="text-sm font-medium text-[#18221E] dark:text-[#F3EFE6]">
              {copy.loadingSacredText}
            </p>
            <p className="text-xs text-[#57635D] dark:text-[#98AAA2]">
              Source: AlQuran Cloud API v1 · Tanzil Uthmani & Fateh Muhammad Jalandhry
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6 sm:p-8 space-y-4">
            <div className="flex items-start gap-3 text-red-900 dark:text-red-200">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="font-semibold text-base">Verified Quran Text Unavailable</h2>
                <p className="text-sm leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchSurah}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-medium inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{copy.retry}</span>
            </button>
          </div>
        ) : surahData ? (
          <>
            {/* Surah Ornamental Header Banner */}
            <header className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-gradient-to-br from-[#0B5D46] via-[#094836] to-[#112A22] text-white p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-[#E8D39E] font-mono tabular-nums">
                    Surah {surahData.surah.number} · {surahData.surah.revelationType} ·{" "}
                    {surahData.surah.numberOfAyahs} Ayat
                  </p>
                  <h1 className="font-serif text-3xl sm:text-4xl font-semibold">
                    {surahData.surah.englishName} — {surahData.surah.englishNameTranslation}
                  </h1>
                  <p className="text-xs text-white/80 pt-1">
                    Arabic: {surahData.sources.arabic.name} · Urdu: {surahData.sources.urdu.name} · English:{" "}
                    {surahData.sources.english.name}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <p dir="rtl" lang="ar" className="font-quran-text text-4xl text-[#F5E6C4]">
                    {surahData.surah.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (surahData.ayahs[0]) handlePlayAyah(surahData.ayahs[0]);
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="w-4 h-4 text-[#F5E6C4]" />
                    <span>Recite Surah from Ayah 1</span>
                  </button>
                </div>
              </div>

              {shouldRenderSeparateBismillah && (
                <div className="mt-6 pt-6 border-t border-white/15 text-center">
                  <p dir="rtl" lang="ar" className="font-quran-text text-3xl text-[#F5E6C4]">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </p>
                </div>
              )}
            </header>

            {/* Ayat Stream */}
            <div className="space-y-4">
              {surahData.ayahs.map((ayah) => {
                const isBookmarked = bookmarks.some((b) => b.reference === ayah.reference);
                const existingBookmark = bookmarks.find((b) => b.reference === ayah.reference);
                const isLastRead =
                  lastRead?.surahNumber === surahData.surah.number &&
                  lastRead?.ayahNumber === ayah.numberInSurah;
                const isPlayingThis =
                  activeAudioTrack?.reference === ayah.reference && isAudioPlaying;
                const isMasked = hifzMaskEnabled && !revealedAyahRefs[ayah.reference];

                return (
                  <article
                    key={ayah.reference}
                    ref={(el) => {
                      ayahRefsMap.current[ayah.numberInSurah] = el;
                    }}
                    className={`rounded-2xl border p-5 sm:p-7 transition-colors ${
                      isPlayingThis
                        ? "border-[#0B5D46] dark:border-[#34D399] bg-[#F4F9F6] dark:bg-[#152821]"
                        : "border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B]"
                    }`}
                  >
                    {/* Ayah Action & Metadata Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-[#E6E1D6]/70 dark:border-[#21352D]">
                      <div className="flex items-center gap-2 text-xs text-[#57635D] dark:text-[#98AAA2] tabular-nums">
                        <span className="font-mono font-semibold text-[#0B5D46] dark:text-[#34D399]">
                          {ayah.reference}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Juz {ayah.juz}</span>
                        <span aria-hidden="true">·</span>
                        <span>Page {ayah.page}</span>
                        {ayah.sajda && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#8A6823] dark:text-[#D4AF5A] font-medium">
                              Sajdah Tilawah
                            </span>
                          </>
                        )}
                        {isLastRead && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#0B5D46] dark:text-[#34D399] font-medium">
                              Last Read
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePlayAyah(ayah)}
                          aria-label={`Play recitation for Ayah ${ayah.reference}`}
                          className={`min-w-[40px] min-h-[40px] px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
                            isPlayingThis
                              ? "bg-[#0B5D46] text-white"
                              : "text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#FAF8F3] dark:hover:bg-[#1A2D25]"
                          }`}
                        >
                          {isPlayingThis ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onToggleBookmark(ayah, surahData.surah, existingBookmark?.note || "");
                          }}
                          aria-label={
                            isBookmarked
                              ? `Remove bookmark for ${ayah.reference}`
                              : `Bookmark Ayah ${ayah.reference}`
                          }
                          className={`min-w-[40px] min-h-[40px] px-2.5 rounded-lg inline-flex items-center justify-center transition-colors ${
                            isBookmarked
                              ? "text-[#B58D3D] dark:text-[#E2B866] bg-[#B58D3D]/10"
                              : "text-[#57635D] dark:text-[#98AAA2] hover:bg-[#FAF8F3] dark:hover:bg-[#1A2D25]"
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                        </button>

                        {isBookmarked && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteRef(
                                editingNoteRef === ayah.reference ? null : ayah.reference
                              );
                              setNoteDraft(existingBookmark?.note || "");
                            }}
                            className="min-h-[40px] px-2.5 rounded-lg text-xs font-medium text-[#8A6823] dark:text-[#D4AF5A] hover:bg-[#FAF8F3] dark:hover:bg-[#1A2D25] whitespace-nowrap"
                          >
                            {existingBookmark?.note ? "Edit Note" : "+ Note"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onSaveLastRead(surahData.surah, ayah.numberInSurah);
                            onRecordAyahRead(ayah.reference);
                          }}
                          title="Mark as Last Read & count toward daily goal"
                          className={`min-h-[40px] px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                            isLastRead
                              ? "text-[#0B5D46] dark:text-[#34D399] bg-[#0B5D46]/10"
                              : "text-[#57635D] dark:text-[#98AAA2] hover:bg-[#FAF8F3] dark:hover:bg-[#1A2D25]"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isLastRead ? "Saved" : "Mark Read"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenTafsir(surahData.surah.number, ayah.numberInSurah)}
                          className="min-h-[40px] px-3 rounded-lg text-xs font-medium text-[#0B5D46] dark:text-[#34D399] hover:bg-[#0B5D46]/10 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Tafsir</span>
                        </button>
                      </div>
                    </div>

                    {/* Bookmark Personal Note Editor */}
                    {editingNoteRef === ayah.reference && (
                      <div className="mb-4 p-3 rounded-xl bg-[#FAF8F3] dark:bg-[#172821] border border-[#E6E1D6] dark:border-[#21352D] flex items-center gap-2">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Personal reflection note (stored locally)…"
                          className="flex-1 h-9 px-3 rounded-lg border border-[#E6E1D6] dark:border-[#284237] bg-white dark:bg-[#101C17] text-xs text-[#18221E] dark:text-[#F3EFE6]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onToggleBookmark(ayah, surahData.surah, noteDraft);
                            setEditingNoteRef(null);
                          }}
                          className="h-9 px-3.5 rounded-lg bg-[#0B5D46] text-white text-xs font-medium whitespace-nowrap"
                        >
                          Save Note
                        </button>
                      </div>
                    )}

                    {/* Verbatim Arabic Script (with optional Tajweed color segments or Hifz Self-Check Mask) */}
                    <div className="relative">
                      <div
                        dir="rtl"
                        lang="ar"
                        style={{ fontSize: `${arabicFontSize}px` }}
                        onClick={() => {
                          if (isMasked) {
                            setRevealedAyahRefs((prev) => ({ ...prev, [ayah.reference]: true }));
                          }
                        }}
                        className={`font-quran-text text-right text-[#18221E] dark:text-[#F5F2EB] transition-all ${
                          isMasked ? "blur-md select-none cursor-pointer" : ""
                        }`}
                      >
                        {showTajweed && ayah.tajweedText
                          ? parseTajweedMarkup(ayah.tajweedText).map((seg, i) =>
                              seg.rule ? (
                                <span
                                  key={i}
                                  title={`${seg.rule.nameEn} — ${seg.rule.howToPronounce}`}
                                  className={`${seg.rule.colorClass} cursor-help`}
                                >
                                  {seg.text}
                                </span>
                              ) : (
                                <React.Fragment key={i}>{seg.text}</React.Fragment>
                              )
                            )
                          : ayah.arabicText}{" "}
                        <span
                          className="inline-block text-[#B58D3D] dark:text-[#D4AF5A] mx-1.5 select-none"
                          style={{ fontSize: `${Math.max(20, Math.round(arabicFontSize * 0.72))}px` }}
                        >
                          ﴿{toArabicNumerals(ayah.numberInSurah)}﴾
                        </span>
                      </div>

                      {isMasked && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedAyahRefs((prev) => ({ ...prev, [ayah.reference]: true }))
                            }
                            className="min-h-[36px] px-3 py-1 rounded-lg bg-[#0B5D46]/10 text-[#0B5D46] dark:text-[#34D399] text-xs font-medium"
                          >
                            Tap to Reveal Ayah {ayah.reference}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Published Urdu Translation */}
                    {showUrdu && (
                      <div className="mt-5 pt-4 border-t border-[#E6E1D6]/60 dark:border-[#21352D]/70 space-y-1">
                        <p
                          dir="rtl"
                          lang="ur"
                          className={`font-urdu-text text-lg sm:text-[1.22rem] text-right text-[#21302A] dark:text-[#E5E0D5] ${
                            isMasked ? "blur-sm select-none" : ""
                          }`}
                        >
                          {ayah.urduText}
                        </p>
                        <p className="text-[11px] text-[#57635D] dark:text-[#98AAA2] text-right">
                          Urdu: {surahData.sources.urdu.name}
                        </p>
                      </div>
                    )}

                    {/* Published English Translation */}
                    {showEnglish && (
                      <div className="mt-4 pt-4 border-t border-[#E6E1D6]/60 dark:border-[#21352D]/70 space-y-1">
                        <p
                          dir="ltr"
                          lang="en"
                          className={`text-sm sm:text-[0.975rem] leading-relaxed text-[#2B3732] dark:text-[#D8D3C8] ${
                            isMasked ? "blur-sm select-none" : ""
                          }`}
                        >
                          {ayah.englishText}
                        </p>
                        <p className="text-[11px] text-[#57635D] dark:text-[#98AAA2]">
                          English: {surahData.sources.english.name}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Previous / Next Surah Footer + Provenance Attribution */}
            <footer className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={surahData.surah.number <= 1}
                  onClick={() => onSelectSurah(surahData.surah.number - 1, 1)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] text-xs sm:text-sm font-medium text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#FAF8F3] dark:hover:bg-[#1A2D25] disabled:opacity-35 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Surah</span>
                </button>

                <span className="text-xs font-mono tabular-nums text-[#57635D] dark:text-[#98AAA2]">
                  Surah {surahData.surah.number} / 114
                </span>

                <button
                  type="button"
                  disabled={surahData.surah.number >= 114}
                  onClick={() => onSelectSurah(surahData.surah.number + 1, 1)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B5D46] hover:bg-[#084735] text-white text-xs sm:text-sm font-medium disabled:opacity-35 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Next Surah</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-4 border-t border-[#E6E1D6] dark:border-[#21352D] text-xs text-[#57635D] dark:text-[#98AAA2] leading-relaxed">
                <strong>Verified Text Provenance & Licences:</strong> Arabic text ({surahData.sources.arabic.id}) is sourced verbatim from the Tanzil Project (CC BY-ND 3.0 — unmodified script and diacritics) via AlQuran Cloud API v1. Published Urdu translation ({surahData.sources.urdu.name}, {surahData.sources.urdu.id}) and English translation ({surahData.sources.english.name}, {surahData.sources.english.id}) are served verbatim without AI modification.
              </div>
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
};
