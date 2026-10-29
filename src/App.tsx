/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Home,
  BookOpen,
  Compass,
  GraduationCap,
  Search,
  Sun,
  Moon,
  Minus,
  Plus,
} from "lucide-react";
import type {
  AppScreen,
  AudioTrack,
  AyahItem,
  BookmarkEntry,
  EditionsCatalog,
  HifzSurahProgress,
  LastReadPosition,
  ReadingGoalState,
  SurahSummary,
  UILanguage,
} from "./types/quran";
import { UI_COPY, isRtlLanguage } from "./i18n/translations";
import { useLocalStorageState, getTodayIsoDate } from "./hooks/useLocalStorageState";
import { HomeDashboard } from "./components/HomeDashboard";
import { QuranReader } from "./components/QuranReader";
import { TafsirAssistant } from "./components/TafsirAssistant";
import { TajweedAndHifz } from "./components/TajweedAndHifz";
import { SearchScreen } from "./components/SearchScreen";
import { AudioPlayerBar } from "./components/AudioPlayerBar";

export default function App() {
  // Persistent User Preferences (Stored locally without login)
  const [darkMode, setDarkMode] = useLocalStorageState<boolean>("noor_dark_mode", false);
  const [uiLang, setUiLang] = useLocalStorageState<UILanguage>("noor_ui_lang", "en");
  const [arabicFontSize, setArabicFontSize] = useLocalStorageState<number>("noor_ar_font_size", 34);
  const [selectedUrduEdition, setSelectedUrduEdition] = useLocalStorageState<string>(
    "noor_urdu_edition",
    "ur.jalandhry"
  );
  const [selectedEnglishEdition, setSelectedEnglishEdition] = useLocalStorageState<string>(
    "noor_english_edition",
    "en.sahih"
  );
  const [selectedReciter, setSelectedReciter] = useLocalStorageState<string>(
    "noor_reciter",
    "ar.alafasy"
  );

  // Persistent Bookmarks, Last Read, Reading Goals & Hifz Progress
  const [bookmarks, setBookmarks] = useLocalStorageState<BookmarkEntry[]>("noor_bookmarks", []);
  const [lastRead, setLastRead] = useLocalStorageState<LastReadPosition | null>(
    "noor_last_read",
    null
  );
  const [readingGoal, setReadingGoal] = useLocalStorageState<ReadingGoalState>("noor_reading_goal", {
    dailyTargetAyat: 20,
    historyByDate: {},
    readReferencesToday: [],
    todayDate: getTodayIsoDate(),
  });
  const [hifzMap, setHifzMap] = useLocalStorageState<Record<number, HifzSurahProgress>>(
    "noor_hifz_map",
    {}
  );

  // Navigation & Reader State
  const [activeScreen, setActiveScreen] = useState<AppScreen>("home");
  const [readerSurah, setReaderSurah] = useState<number>(1);
  const [readerTargetAyah, setReaderTargetAyah] = useState<number | null>(1);
  const [readerHifzMaskInit, setReaderHifzMaskInit] = useState<boolean>(false);

  const [tafsirSurah, setTafsirSurah] = useState<number>(1);
  const [tafsirAyah, setTafsirAyah] = useState<number>(1);

  // Shared Verified Metadata from Server
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [surahsError, setSurahsError] = useState<string | null>(null);
  const [editionsCatalog, setEditionsCatalog] = useState<EditionsCatalog | null>(null);

  // Shared Audio Recitation State
  const [activeAudioTrack, setActiveAudioTrack] = useState<AudioTrack | null>(null);
  const [surahPlaylist, setSurahPlaylist] = useState<AudioTrack[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [autoAdvanceAudio, setAutoAdvanceAudio] = useState<boolean>(true);

  // Sync Dark Mode class & RTL direction on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const today = getTodayIsoDate();
    if (readingGoal.todayDate !== today) {
      setReadingGoal((prev) => ({
        ...prev,
        todayDate: today,
        readReferencesToday: [],
      }));
    }
  }, [readingGoal.todayDate, setReadingGoal]);

  const loadSurahsAndEditions = useCallback(async () => {
    setSurahsError(null);
    try {
      const [surahsRes, editionsRes] = await Promise.all([
        fetch("/api/quran/surahs"),
        fetch("/api/quran/editions"),
      ]);
      const surahsJson = await surahsRes.json();
      if (!surahsRes.ok) {
        throw new Error(surahsJson.error || "Failed to load Surah directory.");
      }
      setSurahs(surahsJson.surahs || []);

      if (editionsRes.ok) {
        const editionsJson = await editionsRes.json();
        setEditionsCatalog(editionsJson as EditionsCatalog);
      }
    } catch (err) {
      setSurahsError(
        err instanceof Error ? err.message : "Could not load verified Surah list."
      );
    }
  }, []);

  useEffect(() => {
    loadSurahsAndEditions();
  }, [loadSurahsAndEditions]);

  const copy = UI_COPY[uiLang];
  const rtl = isRtlLanguage(uiLang);

  // Handlers
  const handleOpenSurahAyah = (surahNum: number, ayahNum = 1, enableHifzMask = false) => {
    setReaderSurah(surahNum);
    setReaderTargetAyah(ayahNum);
    setReaderHifzMaskInit(enableHifzMask);
    setActiveScreen("reader");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenTafsir = (surahNum: number, ayahNum: number) => {
    setTafsirSurah(surahNum);
    setTafsirAyah(ayahNum);
    setActiveScreen("tafsir");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveLastRead = (surah: SurahSummary, ayahNumber: number) => {
    setLastRead({
      surahNumber: surah.number,
      ayahNumber,
      surahEnglishName: surah.englishName,
      surahArabicName: surah.name,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRecordAyahRead = (reference: string) => {
    const today = getTodayIsoDate();
    setReadingGoal((prev) => {
      const refsToday = prev.todayDate === today ? prev.readReferencesToday : [];
      if (refsToday.includes(reference)) return prev;
      const updatedCount = (prev.historyByDate[today] || 0) + 1;
      return {
        ...prev,
        todayDate: today,
        readReferencesToday: [...refsToday, reference],
        historyByDate: {
          ...prev.historyByDate,
          [today]: updatedCount,
        },
      };
    });
  };

  const handleIncrementGoalManually = () => {
    const today = getTodayIsoDate();
    setReadingGoal((prev) => ({
      ...prev,
      todayDate: today,
      historyByDate: {
        ...prev.historyByDate,
        [today]: (prev.historyByDate[today] || 0) + 1,
      },
    }));
  };

  const handleToggleBookmark = (ayah: AyahItem, surah: SurahSummary, note = "") => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.reference === ayah.reference);
      if (exists && note === exists.note) {
        return prev.filter((b) => b.reference !== ayah.reference);
      }
      const entry: BookmarkEntry = {
        reference: ayah.reference,
        surahNumber: surah.number,
        ayahNumber: ayah.numberInSurah,
        surahEnglishName: surah.englishName,
        surahArabicName: surah.name,
        arabicSnippet: ayah.arabicText.slice(0, 120),
        urduSnippet: ayah.urduText.slice(0, 140),
        englishSnippet: ayah.englishText.slice(0, 140),
        note,
        savedAt: new Date().toISOString(),
      };
      if (exists) {
        return prev.map((b) => (b.reference === ayah.reference ? entry : b));
      }
      return [entry, ...prev];
    });
  };

  const handleRemoveBookmark = (reference: string) => {
    setBookmarks((prev) => prev.filter((b) => b.reference !== reference));
  };

  const handleUpdateHifz = (
    surahNumber: number,
    updater: (prev: HifzSurahProgress) => HifzSurahProgress
  ) => {
    setHifzMap((prev) => {
      const current = prev[surahNumber] || {
        surahNumber,
        status: "not_started",
        memorizedAyat: 0,
      };
      return {
        ...prev,
        [surahNumber]: updater(current),
      };
    });
  };

  // Audio handlers
  const handlePlayAyahAudio = (track: AudioTrack, playlist?: AudioTrack[]) => {
    if (playlist && playlist.length > 0) {
      setSurahPlaylist(playlist);
    }
    if (activeAudioTrack?.reference === track.reference && activeAudioTrack.audioUrl === track.audioUrl) {
      setIsAudioPlaying((p) => !p);
    } else {
      setActiveAudioTrack(track);
      setIsAudioPlaying(true);
    }
  };

  const handleStepAyahAudio = async (delta: -1 | 1) => {
    if (!activeAudioTrack) return;
    const nextAyahNum = activeAudioTrack.ayahNumber + delta;
    if (nextAyahNum < 1 || nextAyahNum > activeAudioTrack.totalAyahsInSurah) {
      setIsAudioPlaying(false);
      return;
    }

    const fromPlaylist = surahPlaylist.find(
      (t) => t.surahNumber === activeAudioTrack.surahNumber && t.ayahNumber === nextAyahNum
    );
    if (fromPlaylist) {
      setActiveAudioTrack(fromPlaylist);
      setIsAudioPlaying(true);
      handleRecordAyahRead(fromPlaylist.reference);
      return;
    }

    // Fetch single Ayah audio URL on-demand if played outside full Surah playlist
    try {
      const ref = `${activeAudioTrack.surahNumber}:${nextAyahNum}`;
      const res = await fetch(
        `/api/quran/ayah/${ref}?reciter=${encodeURIComponent(selectedReciter)}`
      );
      if (res.ok) {
        const data = await res.json();
        const nextTrack: AudioTrack = {
          reference: data.reference,
          surahNumber: data.surahNumber,
          ayahNumber: data.ayahNumber,
          surahEnglishName: data.surah.englishName,
          surahArabicName: data.surah.name,
          audioUrl: data.audioUrl,
          totalAyahsInSurah: data.surah.numberOfAyahs,
        };
        setActiveAudioTrack(nextTrack);
        setIsAudioPlaying(true);
        handleRecordAyahRead(nextTrack.reference);
      }
    } catch {
      setIsAudioPlaying(false);
    }
  };

  const handleReciterChange = async (newReciterId: string) => {
    setSelectedReciter(newReciterId);
    if (activeAudioTrack) {
      try {
        const res = await fetch(
          `/api/quran/ayah/${activeAudioTrack.reference}?reciter=${encodeURIComponent(newReciterId)}`
        );
        if (res.ok) {
          const data = await res.json();
          setActiveAudioTrack((prev) =>
            prev ? { ...prev, audioUrl: data.audioUrl } : null
          );
          setSurahPlaylist([]);
        }
      } catch {
        // Keep current track if network hiccups
      }
    }
  };

  const navItems: Array<{ id: AppScreen; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "home", label: copy.navHome, icon: Home },
    { id: "reader", label: copy.navQuran, icon: BookOpen },
    { id: "tafsir", label: copy.navTafsir, icon: Compass },
    { id: "tajweed-hifz", label: copy.navTajweedHifz, icon: GraduationCap },
    { id: "search", label: copy.navSearch, icon: Search },
  ];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#FAF8F3] dark:bg-[#0C1512] text-[#18221E] dark:text-[#F3EFE6] dark:tracking-[0.01em] transition-colors flex flex-col"
    >
      {/* DESKTOP TOP BAR (Strict 3-Zone Single-Row Contract) */}
      <header className="hidden md:flex items-center justify-between gap-8 px-6 lg:px-10 h-16 border-b border-[#E6E1D6] dark:border-[#21352D] bg-white/90 dark:bg-[#101C17]/90 backdrop-blur-md sticky top-0 z-30">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setActiveScreen("home");
          }}
          className="font-serif text-2xl font-bold tracking-tight text-[#0B5D46] dark:text-[#34D399] whitespace-nowrap shrink-0"
        >
          {copy.appName}
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav aria-label="Primary Navigation" className="flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => {
            const active = activeScreen === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveScreen(item.id);
                }}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? "border-[#0B5D46] dark:border-[#34D399] text-[#0B5D46] dark:text-[#34D399] font-semibold"
                    : "border-transparent text-[#57635D] dark:text-[#98AAA2] hover:text-[#18221E] dark:hover:text-[#F3EFE6]"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() =>
              lastRead
                ? handleOpenSurahAyah(lastRead.surahNumber, lastRead.ayahNumber)
                : handleOpenSurahAyah(1, 1)
            }
            className="px-4 py-2 text-xs font-medium text-white bg-[#0B5D46] hover:bg-[#084735] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {lastRead ? `${copy.resumeReading} (${lastRead.surahNumber}:${lastRead.ayahNumber})` : copy.startReading}
          </button>
        </div>
      </header>

      {/* MOBILE COMPACT TOP BAR (<= 52px height) */}
      <header className="md:hidden sticky top-0 z-30 h-13 px-4 flex items-center justify-between border-b border-[#E6E1D6] dark:border-[#21352D] bg-white/90 dark:bg-[#101C17]/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveScreen("home")}
          className="font-serif text-xl font-bold text-[#0B5D46] dark:text-[#34D399] whitespace-nowrap shrink-0"
        >
          {copy.appName}
        </button>

        <div className="flex items-center gap-1.5">
          <select
            aria-label="Interface Language"
            value={uiLang}
            onChange={(e) => setUiLang(e.target.value as UILanguage)}
            className="h-9 rounded-lg border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-2 text-xs font-medium text-[#18221E] dark:text-[#F3EFE6]"
          >
            <option value="en">EN</option>
            <option value="ur">اردو</option>
            <option value="ar">عربي</option>
          </select>

          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-[#18221E] dark:text-[#F3EFE6] hover:bg-[#FAF8F3] dark:hover:bg-[#172821]"
          >
            {darkMode ? <Sun className="w-4 h-4 text-[#E2B866]" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* WORKSPACE UTILITY TOOLBAR (Below <header>, houses Language, Font Size & Theme cleanly) */}
      <div className="hidden md:block border-b border-[#E6E1D6]/70 dark:border-[#21352D]/80 bg-[#F5F1E8]/70 dark:bg-[#0F1B16]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-2 flex items-center justify-between gap-4 text-xs">
          <div className="text-[#57635D] dark:text-[#98AAA2]">
            {copy.verifiedSourceNotice}
          </div>

          <div className="flex items-center gap-4">
            {/* Interface Language Switcher (LTR / RTL) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#57635D] dark:text-[#98AAA2]">Interface:</span>
              {(
                [
                  { id: "en", label: "English" },
                  { id: "ur", label: "اردو" },
                  { id: "ar", label: "العربية" },
                ] as const
              ).map((langOpt) => (
                <button
                  key={langOpt.id}
                  type="button"
                  onClick={() => setUiLang(langOpt.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    uiLang === langOpt.id
                      ? "bg-[#0B5D46] text-white"
                      : "text-[#57635D] dark:text-[#98AAA2] hover:text-[#18221E] dark:hover:text-[#F3EFE6]"
                  }`}
                >
                  {langOpt.label}
                </button>
              ))}
            </div>

            {/* Quick Arabic Font Size Stepper */}
            <div className="flex items-center gap-1 border-x border-[#E6E1D6] dark:border-[#21352D] px-3">
              <span className="text-[#57635D] dark:text-[#98AAA2]">{copy.arabicFontSize}:</span>
              <button
                type="button"
                aria-label="Decrease Arabic font size"
                onClick={() => setArabicFontSize((s) => Math.max(26, s - 2))}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono tabular-nums w-9 text-center">{arabicFontSize}px</span>
              <button
                type="button"
                aria-label="Increase Arabic font size"
                onClick={() => setArabicFontSize((s) => Math.min(50, s + 2))}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-[#18221E] dark:text-[#F3EFE6] hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#E2B866]" />
                  <span>{copy.lightMode}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#0B5D46]" />
                  <span>{copy.darkMode}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main
        className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 ${
          activeAudioTrack ? "pb-44 md:pb-28" : "pb-24 md:pb-12"
        }`}
      >
        {activeScreen === "home" && (
          <HomeDashboard
            uiLang={uiLang}
            surahs={surahs}
            lastRead={lastRead}
            bookmarks={bookmarks}
            onRemoveBookmark={handleRemoveBookmark}
            readingGoal={readingGoal}
            onUpdateGoalTarget={(target) =>
              setReadingGoal((prev) => ({ ...prev, dailyTargetAyat: target }))
            }
            onIncrementGoalManually={handleIncrementGoalManually}
            hifzMap={hifzMap}
            onOpenSurahAyah={(s, a) => handleOpenSurahAyah(s, a, false)}
            onOpenTafsir={handleOpenTafsir}
            onNavigateScreen={setActiveScreen}
            selectedReciter={selectedReciter}
            activeAudioTrack={activeAudioTrack}
            isAudioPlaying={isAudioPlaying}
            onPlayAyahAudio={(t) => handlePlayAyahAudio(t)}
          />
        )}

        {activeScreen === "reader" && (
          <QuranReader
            uiLang={uiLang}
            surahs={surahs}
            surahsError={surahsError}
            onRetrySurahs={loadSurahsAndEditions}
            selectedSurahNumber={readerSurah}
            targetAyahNumber={readerTargetAyah}
            onSelectSurah={(s, a = 1) => {
              setReaderSurah(s);
              setReaderTargetAyah(a);
            }}
            editionsCatalog={editionsCatalog}
            selectedUrduEdition={selectedUrduEdition}
            onChangeUrduEdition={setSelectedUrduEdition}
            selectedEnglishEdition={selectedEnglishEdition}
            onChangeEnglishEdition={setSelectedEnglishEdition}
            selectedReciter={selectedReciter}
            arabicFontSize={arabicFontSize}
            onChangeArabicFontSize={setArabicFontSize}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            lastRead={lastRead}
            onSaveLastRead={handleSaveLastRead}
            onRecordAyahRead={handleRecordAyahRead}
            onOpenTafsir={handleOpenTafsir}
            activeAudioTrack={activeAudioTrack}
            isAudioPlaying={isAudioPlaying}
            onPlayAyahAudio={handlePlayAyahAudio}
            initialHifzMask={readerHifzMaskInit}
          />
        )}

        {activeScreen === "tafsir" && (
          <TafsirAssistant
            uiLang={uiLang}
            surahs={surahs}
            tafsirEditions={
              editionsCatalog?.tafsirs || [
                {
                  id: 169,
                  name: "Tafsir Ibn Kathir (Abridged)",
                  author: "Hafiz Ibn Kathir",
                  language: "en",
                  languageLabel: "English",
                  slug: "en-tafisr-ibn-kathir",
                  provider: "Quran.com API v4",
                },
              ]
            }
            initialSurah={tafsirSurah}
            initialAyah={tafsirAyah}
            arabicFontSize={arabicFontSize}
            onOpenInReader={(s, a) => handleOpenSurahAyah(s, a, false)}
            activeAudioTrack={activeAudioTrack}
            isAudioPlaying={isAudioPlaying}
            onPlayAyahAudio={(t) => handlePlayAyahAudio(t)}
          />
        )}

        {activeScreen === "tajweed-hifz" && (
          <TajweedAndHifz
            uiLang={uiLang}
            surahs={surahs}
            arabicFontSize={arabicFontSize}
            hifzMap={hifzMap}
            onUpdateHifz={handleUpdateHifz}
            onPracticeHifzInReader={(surahNum) => handleOpenSurahAyah(surahNum, 1, true)}
            activeAudioTrack={activeAudioTrack}
            isAudioPlaying={isAudioPlaying}
            onPlayAyahAudio={(t) => handlePlayAyahAudio(t)}
          />
        )}

        {activeScreen === "search" && (
          <SearchScreen
            uiLang={uiLang}
            arabicFontSize={arabicFontSize}
            onOpenSurahAyah={(s, a) => handleOpenSurahAyah(s, a, false)}
            onOpenTafsir={handleOpenTafsir}
          />
        )}
      </main>

      {/* PERSISTENT AUDIO RECITATION PLAYER */}
      <AudioPlayerBar
        track={activeAudioTrack}
        isPlaying={isAudioPlaying}
        onPlayPause={() => setIsAudioPlaying((p) => !p)}
        onPrevAyah={() => handleStepAyahAudio(-1)}
        onNextAyah={() => handleStepAyahAudio(1)}
        onClose={() => {
          setIsAudioPlaying(false);
          setActiveAudioTrack(null);
        }}
        reciters={
          editionsCatalog?.reciters || [
            {
              id: "ar.alafasy",
              name: "Mishary Rashid Alafasy",
              nativeName: "مشاري راشد العفاسي",
              provider: "Islamic Network Audio CDN",
            },
          ]
        }
        selectedReciter={selectedReciter}
        onChangeReciter={handleReciterChange}
        autoAdvance={autoAdvanceAudio}
        onToggleAutoAdvance={() => setAutoAdvanceAudio((a) => !a)}
      />

      {/* MOBILE BOTTOM TAB BAR (5 Touch-Ergonomic Destinations >= 44px Hitboxes) */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#101C17]/95 backdrop-blur-md border-t border-[#E6E1D6] dark:border-[#21352D] pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveScreen(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? "text-[#0B5D46] dark:text-[#34D399]"
                    : "text-[#57635D] dark:text-[#98AAA2]"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight truncate max-w-[68px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
