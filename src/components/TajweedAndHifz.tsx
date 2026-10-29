import React, { useEffect, useState, useCallback } from "react";
import {
  Volume2,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  RotateCcw,
  Plus,
  Minus,
} from "lucide-react";
import type {
  AudioTrack,
  HifzStatus,
  HifzSurahProgress,
  SurahSummary,
  UILanguage,
  VerifiedAyahBundle,
} from "../types/quran";
import { UI_COPY, toArabicNumerals } from "../i18n/translations";
import { parseTajweedMarkup, TAJWEED_RULES, type TajweedRuleInfo } from "../utils/tajweedParser";
import { getTodayIsoDate } from "../hooks/useLocalStorageState";

interface TajweedAndHifzProps {
  uiLang: UILanguage;
  surahs: SurahSummary[];
  arabicFontSize: number;
  hifzMap: Record<number, HifzSurahProgress>;
  onUpdateHifz: (surahNumber: number, updater: (prev: HifzSurahProgress) => HifzSurahProgress) => void;
  onPracticeHifzInReader: (surahNumber: number) => void;
  activeAudioTrack: AudioTrack | null;
  isAudioPlaying: boolean;
  onPlayAyahAudio: (track: AudioTrack) => void;
}

const PRACTICE_REFERENCES = [
  { ref: "112:1", label: "Al-Ikhlas 112:1 (Qalqalah)" },
  { ref: "112:4", label: "Al-Ikhlas 112:4 (Idgham without Ghunnah)" },
  { ref: "114:1", label: "An-Nas 114:1 (Ghunnah)" },
  { ref: "1:7", label: "Al-Fatihah 1:7 (Madd Lazim 6 Counts)" },
  { ref: "105:4", label: "Al-Fil 105:4 (Ikhfa')" },
  { ref: "104:4", label: "Al-Humazah 104:4 (Iqlab)" },
  { ref: "2:255", label: "Ayat al-Kursi 2:255 (Multiple Rules)" },
];

export const TajweedAndHifz: React.FC<TajweedAndHifzProps> = ({
  uiLang,
  surahs,
  arabicFontSize,
  hifzMap,
  onUpdateHifz,
  onPracticeHifzInReader,
  activeAudioTrack,
  isAudioPlaying,
  onPlayAyahAudio,
}) => {
  const copy = UI_COPY[uiLang];
  const [activeSubTab, setActiveSubTab] = useState<"tajweed" | "hifz">("tajweed");

  // Tajweed Studio State
  const [selectedRef, setSelectedRef] = useState("112:1");
  const [customRefInput, setCustomRefInput] = useState("");
  const [tajweedAyah, setTajweedAyah] = useState<VerifiedAyahBundle | null>(null);
  const [loadingAyah, setLoadingAyah] = useState(true);
  const [ayahError, setAyahError] = useState<string | null>(null);
  const [activeRule, setActiveRule] = useState<TajweedRuleInfo>(TAJWEED_RULES.q);

  // Hifz Filter State
  const [hifzFilter, setHifzFilter] = useState<"juz30" | "in_progress" | "needs_revision" | "memorized" | "all">("juz30");
  const [hifzSearch, setHifzSearch] = useState("");

  const loadTajweedExample = useCallback(async (refToLoad: string) => {
    setLoadingAyah(true);
    setAyahError(null);
    try {
      // Use Shaykh Mahmoud Khalil Al-Husary (`ar.husary`) for crystal-clear Tajweed study audio
      const res = await fetch(`/api/quran/ayah/${encodeURIComponent(refToLoad)}?reciter=ar.husary`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Could not load verified Tajweed Ayah.");
      }
      setTajweedAyah(json as VerifiedAyahBundle);
    } catch (err) {
      setAyahError(err instanceof Error ? err.message : "Unable to load verified Tajweed example.");
    } finally {
      setLoadingAyah(false);
    }
  }, []);

  useEffect(() => {
    loadTajweedExample(selectedRef);
  }, [selectedRef, loadTajweedExample]);

  // Hifz statistics
  const hifzValues = Object.values(hifzMap) as HifzSurahProgress[];
  const memorizedCount = hifzValues.filter((h) => h.status === "memorized").length;
  const inProgressCount = hifzValues.filter((h) => h.status === "in_progress").length;
  const revisionCount = hifzValues.filter((h) => h.status === "needs_revision").length;
  const totalMemorizedAyat = hifzValues.reduce((sum, h) => sum + (h.memorizedAyat || 0), 0);

  const filteredHifzSurahs = surahs.filter((s) => {
    const prog = hifzMap[s.number];
    const status = prog?.status || "not_started";
    if (hifzFilter === "juz30" && s.number < 78) return false;
    if (hifzFilter === "in_progress" && status !== "in_progress") return false;
    if (hifzFilter === "needs_revision" && status !== "needs_revision") return false;
    if (hifzFilter === "memorized" && status !== "memorized") return false;
    if (hifzSearch.trim()) {
      const q = hifzSearch.trim().toLowerCase();
      return (
        String(s.number) === q ||
        s.englishName.toLowerCase().includes(q) ||
        s.name.includes(hifzSearch.trim())
      );
    }
    return true;
  });

  const isPlayingTajweedAudio =
    Boolean(tajweedAyah) &&
    activeAudioTrack?.reference === tajweedAyah?.reference &&
    isAudioPlaying;

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Mode Switcher */}
      <section className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#8A6823] dark:text-[#D4AF5A]">
            Recitation Mastery & Local Memorization Journal
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
            Tajweed Studio & Hifz Companion
          </h1>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-[#FAF8F3] dark:bg-[#172821] border border-[#E6E1D6] dark:border-[#21352D] shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab("tajweed")}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeSubTab === "tajweed"
                ? "bg-[#0B5D46] text-white"
                : "text-[#57635D] dark:text-[#98AAA2] hover:text-[#18221E]"
            }`}
          >
            {copy.tajweedTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("hifz")}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeSubTab === "hifz"
                ? "bg-[#0B5D46] text-white"
                : "text-[#57635D] dark:text-[#98AAA2] hover:text-[#18221E]"
            }`}
          >
            {copy.hifzTab}
          </button>
        </div>
      </section>

      {activeSubTab === "tajweed" ? (
        <div className="space-y-8">
          {/* Interactive Verified Tajweed Ayah Inspector */}
          <section className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6E1D6] dark:border-[#21352D]">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                  Interactive Tajweed Ayah Inspector
                </h2>
                <p className="text-xs text-[#57635D] dark:text-[#98AAA2] mt-0.5">
                  Tap any underlined colored Arabic letter below to inspect its exact Tajweed rule and listen to Shaykh Al-Husary.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customRefInput.trim()) {
                    setSelectedRef(customRefInput.trim());
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={customRefInput}
                  onChange={(e) => setCustomRefInput(e.target.value)}
                  placeholder="Try Ayah (e.g. 36:1)…"
                  className="h-10 w-40 px-3 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] text-xs font-mono text-[#18221E] dark:text-[#F3EFE6]"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-[#0B5D46] hover:bg-[#084735] text-white text-xs font-medium whitespace-nowrap"
                >
                  Inspect Ayah
                </button>
              </form>
            </div>

            {/* Curated Rule Example Selector */}
            <div className="flex flex-wrap gap-2">
              {PRACTICE_REFERENCES.map((item) => (
                <button
                  key={item.ref}
                  type="button"
                  onClick={() => setSelectedRef(item.ref)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                    selectedRef === item.ref
                      ? "bg-[#0B5D46]/10 border-[#0B5D46] text-[#0B5D46] dark:text-[#34D399]"
                      : "bg-[#FAF8F3] dark:bg-[#172821] border-[#E6E1D6] dark:border-[#21352D] text-[#57635D] dark:text-[#98AAA2]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {loadingAyah ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#0B5D46] dark:text-[#34D399]" />
                <p className="text-xs text-[#57635D] dark:text-[#98AAA2]">
                  Loading verified Tanzil Tajweed notation…
                </p>
              </div>
            ) : ayahError ? (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3 text-xs text-red-800 dark:text-red-200">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ayahError}</span>
                </span>
                <button
                  type="button"
                  onClick={() => loadTajweedExample(selectedRef)}
                  className="px-3 py-1.5 rounded-lg bg-red-700 text-white font-medium"
                >
                  {copy.retry}
                </button>
              </div>
            ) : tajweedAyah ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-6 rounded-2xl bg-[#FAF8F3] dark:bg-[#0F1B16] border border-[#E6E1D6] dark:border-[#21352D] space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-mono tabular-nums text-[#57635D] dark:text-[#98AAA2]">
                        {tajweedAyah.surah.englishName} · {tajweedAyah.reference}
                      </span>
                      {tajweedAyah.audioUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            onPlayAyahAudio({
                              reference: tajweedAyah.reference,
                              surahNumber: tajweedAyah.surahNumber,
                              ayahNumber: tajweedAyah.ayahNumber,
                              surahEnglishName: `${tajweedAyah.surah.englishName} (Shaykh Al-Husary)`,
                              surahArabicName: tajweedAyah.surah.name,
                              audioUrl: tajweedAyah.audioUrl,
                              totalAyahsInSurah: tajweedAyah.surah.numberOfAyahs,
                            })
                          }
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0B5D46] hover:bg-[#084735] text-white text-xs font-medium inline-flex items-center gap-2 whitespace-nowrap"
                        >
                          {isPlayingTajweedAudio ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                          <span>Listen to Shaykh Al-Husary</span>
                        </button>
                      )}
                    </div>

                    <div
                      dir="rtl"
                      lang="ar"
                      style={{ fontSize: `${Math.max(32, arabicFontSize)}px` }}
                      className="font-quran-text text-right text-[#18221E] dark:text-[#F5F2EB]"
                    >
                      {parseTajweedMarkup(tajweedAyah.tajweedText || tajweedAyah.arabicText).map(
                        (seg, idx) =>
                          seg.rule ? (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveRule(seg.rule!)}
                              className={`inline font-quran-text px-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${seg.rule.colorClass}`}
                            >
                              {seg.text}
                            </button>
                          ) : (
                            <React.Fragment key={idx}>{seg.text}</React.Fragment>
                          )
                      )}{" "}
                      <span className="inline-block text-[#B58D3D] dark:text-[#D4AF5A] text-2xl mx-1 select-none">
                        ﴿{toArabicNumerals(tajweedAyah.ayahNumber)}﴾
                      </span>
                    </div>

                    <p
                      dir="rtl"
                      lang="ur"
                      className="font-urdu-text text-base text-right text-[#21302A] dark:text-[#E5E0D5] pt-3 border-t border-[#E6E1D6] dark:border-[#21352D]"
                    >
                      {tajweedAyah.urduText}
                    </p>
                    <p className="text-xs text-[#57635D] dark:text-[#98AAA2]">
                      {tajweedAyah.englishText}
                    </p>
                  </div>
                </div>

                {/* Selected Tajweed Rule Detail Box */}
                <div className="lg:col-span-5 rounded-2xl border border-[#D8CEB8] dark:border-[#2A4238] bg-[#FAF8F3] dark:bg-[#162620] p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-[#57635D] dark:text-[#98AAA2]">
                      <span className={`w-3 h-3 rounded-sm ${activeRule.badgeSwatchClass}`} />
                      <span>{activeRule.category}</span>
                    </span>
                    <span dir="rtl" lang="ar" className="font-quran-text text-2xl text-[#0B5D46] dark:text-[#34D399]">
                      {activeRule.nameAr}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                    {activeRule.nameEn}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#2B3732] dark:text-[#D8D3C8] leading-relaxed">
                    {activeRule.descriptionEn}
                  </p>

                  <p
                    dir="rtl"
                    lang="ur"
                    className="font-urdu-text text-base text-right text-[#21302A] dark:text-[#E5E0D5] pt-3 border-t border-[#E6E1D6] dark:border-[#253C33]"
                  >
                    {activeRule.nameUr}: {activeRule.descriptionUr}
                  </p>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#101C17] border border-[#E6E1D6] dark:border-[#21352D] text-xs space-y-1">
                    <div className="font-semibold text-[#0B5D46] dark:text-[#34D399]">
                      Articulation Tip (Makhraj & Timing):
                    </div>
                    <p className="text-[#57635D] dark:text-[#98AAA2] leading-relaxed">
                      {activeRule.howToPronounce}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Complete Tajweed Rule Reference Grid */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
              Essential Tajweed Rules Reference
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(TAJWEED_RULES).map((rule) => (
                <div
                  key={rule.code}
                  className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs text-[#57635D] dark:text-[#98AAA2]">
                        <span className={`w-3 h-3 rounded-sm ${rule.badgeSwatchClass}`} />
                        <span>{rule.category}</span>
                      </span>
                      <span dir="rtl" lang="ar" className="font-quran-text text-xl text-[#0B5D46] dark:text-[#34D399]">
                        {rule.nameAr}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                      {rule.nameEn}
                    </h3>
                    <p className="text-xs text-[#57635D] dark:text-[#98AAA2] leading-relaxed">
                      {rule.descriptionEn}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveRule(rule);
                      setSelectedRef(rule.exampleRef);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="min-h-[40px] w-full px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#172821] border border-[#E6E1D6] dark:border-[#21352D] text-xs font-medium text-[#0B5D46] dark:text-[#34D399] hover:border-[#0B5D46] transition-colors"
                  >
                    Load Verified Example ({rule.exampleRef})
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* HIFZ MEMORIZATION TRACKER */
        <div className="space-y-6">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-5">
              <div className="text-xs text-[#57635D] dark:text-[#98AAA2]">Surahs Memorized</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#0B5D46] dark:text-[#34D399] mt-1">
                {memorizedCount} <span className="text-xs font-normal text-[#57635D]">/ 114</span>
              </div>
            </div>
            <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-5">
              <div className="text-xs text-[#57635D] dark:text-[#98AAA2]">Currently Memorizing</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#18221E] dark:text-[#F3EFE6] mt-1">
                {inProgressCount}
              </div>
            </div>
            <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-5">
              <div className="text-xs text-[#57635D] dark:text-[#98AAA2]">Flagged for Revision</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#8A6823] dark:text-[#E2B866] mt-1">
                {revisionCount}
              </div>
            </div>
            <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-5">
              <div className="text-xs text-[#57635D] dark:text-[#98AAA2]">Total Ayat Memorized</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#18221E] dark:text-[#F3EFE6] mt-1">
                {totalMemorizedAyat} <span className="text-xs font-normal text-[#57635D]">/ 6,236</span>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "juz30", label: "Juz' 30 (Surahs 78–114)" },
                  { id: "all", label: "All 114 Surahs" },
                  { id: "in_progress", label: "In Progress" },
                  { id: "memorized", label: "Memorized" },
                  { id: "needs_revision", label: "Needs Revision" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHifzFilter(tab.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    hifzFilter === tab.id
                      ? "bg-[#0B5D46] text-white"
                      : "bg-[#FAF8F3] dark:bg-[#172821] text-[#57635D] dark:text-[#98AAA2]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={hifzSearch}
              onChange={(e) => setHifzSearch(e.target.value)}
              placeholder="Filter Surah…"
              className="h-10 w-full sm:w-56 px-3 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] text-xs text-[#18221E] dark:text-[#F3EFE6]"
            />
          </div>

          {/* Hifz Surah Tracker List */}
          <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] divide-y divide-[#E6E1D6] dark:divide-[#21352D]">
            {filteredHifzSurahs.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#57635D] dark:text-[#98AAA2]">
                No Surahs match this Hifz filter yet. Select &ldquo;Juz&apos; 30&rdquo; or &ldquo;All 114 Surahs&rdquo; to begin logging your memorization.
              </div>
            ) : (
              filteredHifzSurahs.map((surah) => {
                const entry: HifzSurahProgress = hifzMap[surah.number] || {
                  surahNumber: surah.number,
                  status: "not_started",
                  memorizedAyat: 0,
                };
                const pct = Math.round((entry.memorizedAyat / surah.numberOfAyahs) * 100);

                return (
                  <div
                    key={surah.number}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#FAF8F3] dark:bg-[#172821] text-xs font-mono tabular-nums font-semibold flex items-center justify-center text-[#18221E] dark:text-[#F3EFE6] shrink-0">
                        {surah.number}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                            {surah.englishName}
                          </span>
                          <span dir="rtl" lang="ar" className="font-quran-text text-lg text-[#0B5D46] dark:text-[#34D399]">
                            {surah.name.replace("سُورَةُ ", "")}
                          </span>
                        </div>
                        <div className="text-xs text-[#57635D] dark:text-[#98AAA2] tabular-nums">
                          {entry.memorizedAyat} / {surah.numberOfAyahs} Ayat ({pct}%)
                          {entry.lastRevisedDate ? ` · Last revised ${entry.lastRevisedDate}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Ayah Counter Controls */}
                      <div className="inline-flex items-center rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821]">
                        <button
                          type="button"
                          aria-label={`Decrease memorized Ayat for ${surah.englishName}`}
                          onClick={() =>
                            onUpdateHifz(surah.number, (prev) => {
                              const nextAyat = Math.max(0, (prev.memorizedAyat || 0) - 1);
                              return {
                                ...prev,
                                memorizedAyat: nextAyat,
                                status:
                                  nextAyat === 0
                                    ? "not_started"
                                    : nextAyat === surah.numberOfAyahs
                                    ? "memorized"
                                    : "in_progress",
                              };
                            })
                          }
                          className="min-w-[38px] min-h-[38px] flex items-center justify-center text-[#57635D] hover:text-[#18221E]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-mono tabular-nums text-[#18221E] dark:text-[#F3EFE6]">
                          {entry.memorizedAyat}/{surah.numberOfAyahs}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase memorized Ayat for ${surah.englishName}`}
                          onClick={() =>
                            onUpdateHifz(surah.number, (prev) => {
                              const nextAyat = Math.min(
                                surah.numberOfAyahs,
                                (prev.memorizedAyat || 0) + 1
                              );
                              return {
                                ...prev,
                                memorizedAyat: nextAyat,
                                status:
                                  nextAyat === surah.numberOfAyahs ? "memorized" : "in_progress",
                                lastRevisedDate: getTodayIsoDate(),
                              };
                            })
                          }
                          className="min-w-[38px] min-h-[38px] flex items-center justify-center text-[#57635D] hover:text-[#18221E]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status Selector */}
                      <select
                        aria-label={`Hifz status for ${surah.englishName}`}
                        value={entry.status}
                        onChange={(e) => {
                          const nextStatus = e.target.value as HifzStatus;
                          onUpdateHifz(surah.number, (prev) => ({
                            ...prev,
                            status: nextStatus,
                            memorizedAyat:
                              nextStatus === "memorized"
                                ? surah.numberOfAyahs
                                : nextStatus === "not_started"
                                ? 0
                                : prev.memorizedAyat,
                            lastRevisedDate: getTodayIsoDate(),
                          }));
                        }}
                        className="h-10 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-3 text-xs font-medium text-[#18221E] dark:text-[#F3EFE6]"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="memorized">Memorized</option>
                        <option value="needs_revision">Needs Revision</option>
                      </select>

                      {/* Log Revision Today */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHifz(surah.number, (prev) => ({
                            ...prev,
                            lastRevisedDate: getTodayIsoDate(),
                            status: prev.status === "needs_revision" ? "memorized" : prev.status,
                          }))
                        }
                        title="Log today's Muraja'ah (revision)"
                        className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] text-xs font-medium text-[#57635D] dark:text-[#98AAA2] hover:text-[#0B5D46] inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {entry.lastRevisedDate === getTodayIsoDate() ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#34D399]" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Revised Today</span>
                      </button>

                      {/* Practice with Hifz Mask in Reader */}
                      <button
                        type="button"
                        onClick={() => onPracticeHifzInReader(surah.number)}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0B5D46]/10 text-[#0B5D46] dark:text-[#34D399] hover:bg-[#0B5D46] hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Self-Test</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
