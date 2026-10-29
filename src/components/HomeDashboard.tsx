import React, { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Bookmark,
  Volume2,
  Pause,
  RefreshCw,
  ArrowRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Compass,
} from "lucide-react";
import type {
  AppScreen,
  BookmarkEntry,
  HifzSurahProgress,
  LastReadPosition,
  ReadingGoalState,
  SurahSummary,
  UILanguage,
  VerifiedAyahBundle,
  AudioTrack,
} from "../types/quran";
import { UI_COPY, toArabicNumerals } from "../i18n/translations";

const CURATED_REFLECTION_REFERENCES = [
  "2:255", // Ayat al-Kursi
  "24:35", // Verse of Light
  "55:13", // Ar-Rahman
  "94:5", // Ash-Sharh
  "13:28", // Ar-Ra'd
  "3:190", // Ali 'Imran
  "39:53", // Az-Zumar
];

interface HomeDashboardProps {
  uiLang: UILanguage;
  surahs: SurahSummary[];
  lastRead: LastReadPosition | null;
  bookmarks: BookmarkEntry[];
  onRemoveBookmark: (ref: string) => void;
  readingGoal: ReadingGoalState;
  onUpdateGoalTarget: (target: number) => void;
  onIncrementGoalManually: () => void;
  hifzMap: Record<number, HifzSurahProgress>;
  onOpenSurahAyah: (surah: number, ayah: number) => void;
  onOpenTafsir: (surah: number, ayah: number) => void;
  onNavigateScreen: (screen: AppScreen) => void;
  selectedReciter: string;
  activeAudioTrack: AudioTrack | null;
  isAudioPlaying: boolean;
  onPlayAyahAudio: (track: AudioTrack) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  uiLang,
  surahs,
  lastRead,
  bookmarks,
  onRemoveBookmark,
  readingGoal,
  onUpdateGoalTarget,
  onIncrementGoalManually,
  hifzMap,
  onOpenSurahAyah,
  onOpenTafsir,
  onNavigateScreen,
  selectedReciter,
  activeAudioTrack,
  isAudioPlaying,
  onPlayAyahAudio,
}) => {
  const copy = UI_COPY[uiLang];
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredAyah, setFeaturedAyah] = useState<VerifiedAyahBundle | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [tajweedImgFailed, setTajweedImgFailed] = useState(false);
  const [hifzImgFailed, setHifzImgFailed] = useState(false);

  const currentRef = CURATED_REFLECTION_REFERENCES[featuredIndex % CURATED_REFLECTION_REFERENCES.length];

  const loadFeaturedAyah = useCallback(async () => {
    setLoadingFeatured(true);
    setFeaturedError(null);
    try {
      const res = await fetch(
        `/api/quran/ayah/${encodeURIComponent(currentRef)}?reciter=${encodeURIComponent(selectedReciter)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not retrieve verified Ayah.");
      }
      setFeaturedAyah(data as VerifiedAyahBundle);
    } catch (err) {
      setFeaturedError(
        err instanceof Error
          ? err.message
          : "Unable to load verified Ayah from provider. No text is generated as a fallback."
      );
    } finally {
      setLoadingFeatured(false);
    }
  }, [currentRef, selectedReciter]);

  useEffect(() => {
    loadFeaturedAyah();
  }, [loadFeaturedAyah]);

  // Reading goal math
  const todayCount = readingGoal.historyByDate[readingGoal.todayDate] || 0;
  const targetCount = Math.max(1, readingGoal.dailyTargetAyat);
  const goalPct = Math.min(100, Math.round((todayCount / targetCount) * 100));
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference - (goalPct / 100) * ringCircumference;

  // Hifz summary counts
  const hifzEntries = Object.values(hifzMap) as HifzSurahProgress[];
  const memorizedSurahsCount = hifzEntries.filter((h) => h.status === "memorized").length;
  const inProgressSurahsCount = hifzEntries.filter((h) => h.status === "in_progress").length;
  const totalMemorizedAyat = hifzEntries.reduce((acc, h) => acc + (h.memorizedAyat || 0), 0);

  // Quick-access popular Surahs
  const quickSurahNumbers = [1, 18, 36, 55, 67, 112];
  const quickSurahs = quickSurahNumbers
    .map((num) => surahs.find((s) => s.number === num))
    .filter((s): s is SurahSummary => Boolean(s));

  const isFeaturedPlaying =
    Boolean(featuredAyah) &&
    activeAudioTrack?.reference === featuredAyah?.reference &&
    isAudioPlaying;

  return (
    <div className="space-y-10 pb-12">
      {/* 1. Hero Architectural Split Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div className="space-y-4">
            <p className="text-xs font-medium text-[#8A6823] dark:text-[#D4AF5A] tracking-wide">
              {copy.heroKicker}
            </p>
            <h1
              className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold leading-[1.15] text-[#18221E] dark:text-[#F3EFE6] max-w-2xl"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {copy.heroTitle}
            </h1>
            <p className="text-sm sm:text-base text-[#57635D] dark:text-[#98AAA2] leading-relaxed max-w-xl">
              {copy.heroSubtitle}
            </p>
          </div>

          <div className="pt-8 mt-6 border-t border-[#E6E1D6] dark:border-[#21352D] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  lastRead
                    ? onOpenSurahAyah(lastRead.surahNumber, lastRead.ayahNumber)
                    : onOpenSurahAyah(1, 1)
                }
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0B5D46] hover:bg-[#084735] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                <span>
                  {lastRead
                    ? `${copy.resumeReading} (${lastRead.surahEnglishName} ${lastRead.surahNumber}:${lastRead.ayahNumber})`
                    : copy.startReading}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateScreen("tafsir")}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] hover:bg-[#F1ECE0] dark:hover:bg-[#1E332B] text-sm font-medium text-[#18221E] dark:text-[#F3EFE6] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Compass className="w-4 h-4 text-[#0B5D46] dark:text-[#34D399]" />
                <span>{copy.studyTafsir}</span>
              </button>
            </div>

            <div className="text-xs text-[#57635D] dark:text-[#98AAA2] tabular-nums">
              114 Surahs · 6,236 Ayat · Local Privacy
            </div>
          </div>
        </div>

        {/* Hero Sanctuary Visual Card with Measured Scrim & Resilient Fallback */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#E6E1D6] dark:border-[#21352D] min-h-[260px] lg:min-h-full bg-gradient-to-br from-[#0B5D46] via-[#093A2C] to-[#12221D]">
          {!heroImgFailed && (
            <img
              src="/src/assets/images/hero_islamic_arch_1793247757588.jpg"
              alt="Sunlit limestone Islamic courtyard archway with geometric mashrabiya shadows and emerald cypress trees"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-6 flex flex-col justify-end">
            <p className="text-xs text-[#E8D39E] font-medium mb-1">
              {copy.lastReadTitle}
            </p>
            {lastRead ? (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {lastRead.surahEnglishName} · Ayah {lastRead.ayahNumber}
                  </h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    Surah {lastRead.surahNumber} · Saved automatically on this device
                  </p>
                </div>
                <p
                  dir="rtl"
                  lang="ar"
                  className="font-quran-text text-2xl text-[#F5E6C4] shrink-0"
                >
                  {lastRead.surahArabicName}
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Surah Al-Fatihah · The Opening
                </h2>
                <p className="text-xs text-white/80 mt-0.5">
                  Your reading position saves automatically without an account
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Surah Strip */}
      {quickSurahs.length > 0 && (
        <section aria-label="Frequently Read Surahs" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#18221E] dark:text-[#F3EFE6]">
              Frequently Recited Surahs
            </h2>
            <button
              type="button"
              onClick={() => onNavigateScreen("reader")}
              className="text-xs font-medium text-[#0B5D46] dark:text-[#34D399] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>All 114 Surahs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickSurahs.map((s) => (
              <button
                key={s.number}
                type="button"
                onClick={() => onOpenSurahAyah(s.number, 1)}
                className="min-h-[68px] text-left p-3.5 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] hover:border-[#0B5D46] dark:hover:border-[#34D399] transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-xs font-mono tabular-nums text-[#8A6823] dark:text-[#D4AF5A]">
                    {String(s.number).padStart(2, "0")}
                  </span>
                  <span
                    dir="rtl"
                    lang="ar"
                    className="font-quran-text text-lg text-[#0B5D46] dark:text-[#34D399] leading-none"
                  >
                    {s.name.replace("سُورَةُ ", "")}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-sm font-semibold text-[#18221E] dark:text-[#F3EFE6] truncate">
                    {s.englishName}
                  </div>
                  <div className="text-[11px] text-[#57635D] dark:text-[#98AAA2] tabular-nums truncate">
                    {s.numberOfAyahs} Ayat · {s.revelationType}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 2. Verified Ayah of Reflection + Daily Reading Goal */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Verified Ayah Card */}
        <div className="lg:col-span-8 rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6E1D6] dark:border-[#21352D]">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                {copy.verseOfReflection}
              </h2>
              {featuredAyah && (
                <p className="text-xs text-[#57635D] dark:text-[#98AAA2] mt-0.5 tabular-nums">
                  {featuredAyah.surah.englishName} ({featuredAyah.surah.englishNameTranslation}) · Ayah{" "}
                  {featuredAyah.reference} · Juz {featuredAyah.juz}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {featuredAyah?.audioUrl && (
                <button
                  type="button"
                  onClick={() =>
                    onPlayAyahAudio({
                      reference: featuredAyah.reference,
                      surahNumber: featuredAyah.surahNumber,
                      ayahNumber: featuredAyah.ayahNumber,
                      surahEnglishName: featuredAyah.surah.englishName,
                      surahArabicName: featuredAyah.surah.name,
                      audioUrl: featuredAyah.audioUrl,
                      totalAyahsInSurah: featuredAyah.surah.numberOfAyahs,
                    })
                  }
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0B5D46]/10 dark:bg-[#10B981]/15 text-[#0B5D46] dark:text-[#34D399] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#0B5D46]/20 transition-colors whitespace-nowrap shrink-0"
                >
                  {isFeaturedPlaying ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isFeaturedPlaying ? copy.pauseRecitation : copy.playRecitation}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setFeaturedIndex((i) => i + 1)}
                className="min-h-[40px] px-3.5 py-2 rounded-lg border border-[#E6E1D6] dark:border-[#21352D] text-xs font-medium text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#FAF8F3] dark:hover:bg-[#1A2C25] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFeatured ? "animate-spin" : ""}`} />
                <span>{copy.anotherVerse}</span>
              </button>
            </div>
          </div>

          {loadingFeatured ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#0B5D46] dark:text-[#34D399]" />
              <p className="text-sm text-[#57635D] dark:text-[#98AAA2]">{copy.loadingSacredText}</p>
            </div>
          ) : featuredError ? (
            <div className="p-5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-3">
              <div className="flex items-start gap-2.5 text-sm text-red-800 dark:text-red-300">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Verified Ayah Unavailable</p>
                  <p className="text-xs mt-1">{featuredError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadFeaturedAyah}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-medium hover:bg-red-800"
              >
                {copy.retry}
              </button>
            </div>
          ) : featuredAyah ? (
            <div className="space-y-6">
              {/* Verbatim Uthmani Arabic */}
              <div
                dir="rtl"
                lang="ar"
                className="font-quran-text text-3xl sm:text-4xl text-right text-[#18221E] dark:text-[#F5F2EB] bg-[#FAF8F3] dark:bg-[#0F1B16] p-5 sm:p-6 rounded-xl border border-[#E6E1D6]/80 dark:border-[#21352D]"
              >
                {featuredAyah.arabicText}{" "}
                <span className="inline-block text-[#B58D3D] dark:text-[#D4AF5A] text-2xl mx-1 select-none">
                  ﴿{toArabicNumerals(featuredAyah.ayahNumber)}﴾
                </span>
              </div>

              {/* Verbatim Fateh Muhammad Jalandhry Urdu */}
              <div className="space-y-1.5">
                <p
                  dir="rtl"
                  lang="ur"
                  className="font-urdu-text text-lg sm:text-xl text-right text-[#1F2D27] dark:text-[#E5E0D5]"
                >
                  {featuredAyah.urduText}
                </p>
                <p className="text-[11px] text-[#57635D] dark:text-[#98AAA2] text-right">
                  Source: {featuredAyah.sources.urdu}
                </p>
              </div>

              {/* Verbatim Saheeh International English */}
              <div className="space-y-1.5 pt-4 border-t border-[#E6E1D6] dark:border-[#21352D]">
                <p
                  dir="ltr"
                  lang="en"
                  className="text-sm sm:text-base leading-relaxed text-[#2B3732] dark:text-[#D8D3C8]"
                >
                  {featuredAyah.englishText}
                </p>
                <p className="text-[11px] text-[#57635D] dark:text-[#98AAA2]">
                  Source: {featuredAyah.sources.english} · Arabic: {featuredAyah.sources.arabic}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenSurahAyah(featuredAyah.surahNumber, featuredAyah.ayahNumber)}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0B5D46] hover:bg-[#084735] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{copy.openInReader}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTafsir(featuredAyah.surahNumber, featuredAyah.ayahNumber)}
                  className="min-h-[40px] px-4 py-2 rounded-lg border border-[#E6E1D6] dark:border-[#21352D] text-xs font-medium text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#FAF8F3] dark:hover:bg-[#1A2C25] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Compass className="w-3.5 h-3.5 text-[#8A6823] dark:text-[#D4AF5A]" />
                  <span>{copy.studyTafsir}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Daily Reading Goal Tracker Card */}
        <div className="lg:col-span-4 rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E6E1D6] dark:border-[#21352D] pb-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                {copy.dailyGoalTitle}
              </h2>
              <p className="text-xs text-[#57635D] dark:text-[#98AAA2] mt-0.5">
                Stored privately on your browser
              </p>
            </div>
            {goalPct >= 100 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0B5D46] dark:text-[#34D399]">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </span>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
                <circle
                  cx="48"
                  cy="48"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-[#EDE8DC] dark:text-[#1D3028]"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashOffset}
                  className="text-[#0B5D46] dark:text-[#10B981] transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono tabular-nums text-[#18221E] dark:text-[#F3EFE6]">
                  {goalPct}%
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-2xl font-bold font-mono tabular-nums text-[#18221E] dark:text-[#F3EFE6]">
                {todayCount} <span className="text-sm font-normal text-[#57635D] dark:text-[#98AAA2]">/ {targetCount}</span>
              </div>
              <p className="text-xs text-[#57635D] dark:text-[#98AAA2]">{copy.ayatCompletedToday}</p>
              <button
                type="button"
                onClick={onIncrementGoalManually}
                className="mt-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#FAF8F3] dark:bg-[#192B24] border border-[#E6E1D6] dark:border-[#263E34] text-xs font-medium text-[#0B5D46] dark:text-[#34D399] hover:bg-[#EFECE3] transition-colors whitespace-nowrap shrink-0"
              >
                {copy.logAyahRead}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#E6E1D6] dark:border-[#21352D]">
            <label className="block text-xs font-medium text-[#57635D] dark:text-[#98AAA2]">
              {copy.dailyGoalTarget} (Ayat per day)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onUpdateGoalTarget(val)}
                  className={`min-h-[40px] rounded-lg text-xs font-mono tabular-nums font-medium border transition-colors ${
                    readingGoal.dailyTargetAyat === val
                      ? "bg-[#0B5D46] text-white border-[#0B5D46]"
                      : "bg-[#FAF8F3] dark:bg-[#172821] border-[#E6E1D6] dark:border-[#21352D] text-[#18221E] dark:text-[#F3EFE6] hover:border-[#0B5D46]"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bookmarks & Learning Sanctuary Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Saved Bookmarks */}
        <div className="lg:col-span-6 rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D6] dark:border-[#21352D]">
              <h2 className="font-serif text-xl font-semibold text-[#18221E] dark:text-[#F3EFE6] flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#B58D3D] dark:text-[#D4AF5A]" />
                <span>{copy.bookmarksTitle}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-[#57635D] dark:text-[#98AAA2]">
                {bookmarks.length} saved
              </span>
            </div>

            {bookmarks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm text-[#57635D] dark:text-[#98AAA2] max-w-sm mx-auto">
                  {copy.noBookmarksYet}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E6E1D6] dark:divide-[#21352D] max-h-[300px] overflow-y-auto pr-1">
                {bookmarks.slice(0, 6).map((b) => (
                  <div key={b.reference} className="py-3 flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenSurahAyah(b.surahNumber, b.ayahNumber)}
                      className="text-left flex-1 min-w-0 group"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-[#0B5D46] dark:text-[#34D399]">
                        <span>{b.surahEnglishName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{b.reference}</span>
                      </div>
                      <p
                        dir="rtl"
                        lang="ar"
                        className="font-quran-text text-xl text-[#18221E] dark:text-[#F3EFE6] truncate mt-1 group-hover:text-[#0B5D46] dark:group-hover:text-[#34D399]"
                      >
                        {b.arabicSnippet}
                      </p>
                      {b.note && (
                        <p className="text-xs text-[#8A6823] dark:text-[#D4AF5A] mt-1 truncate">
                          Note: {b.note}
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(b.reference)}
                      aria-label={`Remove bookmark ${b.reference}`}
                      className="min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-[#57635D] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E6E1D6] dark:border-[#21352D] text-xs text-[#57635D] dark:text-[#98AAA2]">
            {copy.verifiedSourceNotice}
          </div>
        </div>

        {/* Tajweed & Hifz Companion Feature Cards */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Tajweed Card */}
          <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] overflow-hidden flex flex-col justify-between">
            <div>
              <div className="h-36 bg-gradient-to-br from-[#0B5D46] to-[#1F3A31] overflow-hidden">
                {!tajweedImgFailed && (
                  <img
                    src="/src/assets/images/tajweed_manuscript_still_1793247759737.jpg"
                    alt="Emerald geometric leather bookbinding with brushed brass bookmark on limestone desk"
                    referrerPolicy="no-referrer"
                    onError={() => setTajweedImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-5 space-y-2">
                <p className="text-xs text-[#8A6823] dark:text-[#D4AF5A] font-medium">
                  Interactive Pronunciation Guide
                </p>
                <h3 className="font-serif text-xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                  {copy.tajweedTab}
                </h3>
                <p className="text-xs text-[#57635D] dark:text-[#98AAA2] leading-relaxed">
                  Explore Ghunnah, Qalqalah, Ikhfa, Idgham, and Madd with color-coded verified Uthmani Ayat and Qari audio.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => onNavigateScreen("tajweed-hifz")}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#192B24] border border-[#E6E1D6] dark:border-[#284237] text-xs font-medium text-[#18221E] dark:text-[#F3EFE6] hover:border-[#0B5D46] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <GraduationCap className="w-4 h-4 text-[#0B5D46] dark:text-[#34D399]" />
                <span>Open Tajweed Studio</span>
              </button>
            </div>
          </div>

          {/* Hifz Card */}
          <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] overflow-hidden flex flex-col justify-between">
            <div>
              <div className="h-36 bg-gradient-to-br from-[#233830] to-[#0B5D46] overflow-hidden">
                {!hifzImgFailed && (
                  <img
                    src="/src/assets/images/hifz_lantern_courtyard_1793247760736.jpg"
                    alt="Handcrafted brass geometric lantern glowing beside emerald tilework on stone alcove"
                    referrerPolicy="no-referrer"
                    onError={() => setHifzImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-5 space-y-2">
                <p className="text-xs text-[#8A6823] dark:text-[#D4AF5A] font-medium tabular-nums">
                  {memorizedSurahsCount} Memorized · {inProgressSurahsCount} Active · {totalMemorizedAyat} Ayat
                </p>
                <h3 className="font-serif text-xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                  {copy.hifzTab}
                </h3>
                <p className="text-xs text-[#57635D] dark:text-[#98AAA2] leading-relaxed">
                  Track Surah memorization, schedule revision cycles, and test recall using Hifz Verse Masking & Audio Loop.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => onNavigateScreen("tajweed-hifz")}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0B5D46] hover:bg-[#084735] text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>Track Hifz Progress</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
