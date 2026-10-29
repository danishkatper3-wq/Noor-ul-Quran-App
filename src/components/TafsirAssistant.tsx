import React, { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Compass,
  RefreshCw,
  AlertCircle,
  Send,
  Volume2,
  Pause,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  AISynthesisPayload,
  AudioTrack,
  PublishedTafsirPayload,
  SurahSummary,
  TafsirEditionOption,
  UILanguage,
  VerifiedAyahBundle,
} from "../types/quran";
import { UI_COPY, toArabicNumerals } from "../i18n/translations";

interface TafsirAssistantProps {
  uiLang: UILanguage;
  surahs: SurahSummary[];
  tafsirEditions: TafsirEditionOption[];
  initialSurah: number;
  initialAyah: number;
  arabicFontSize: number;
  onOpenInReader: (surah: number, ayah: number) => void;
  activeAudioTrack: AudioTrack | null;
  isAudioPlaying: boolean;
  onPlayAyahAudio: (track: AudioTrack) => void;
}

const SUGGESTED_QUESTIONS: Record<UILanguage, string[]> = {
  en: [
    "What are the main themes and lessons highlighted in this Tafsir?",
    "Does the retrieved Tafsir mention any historical context (Sabab al-Nuzul)?",
    "What key Arabic phrases or linguistic nuances does the commentator explain?",
  ],
  ur: [
    "اس مستند تفسیر میں اس آیت کے کون سے اہم مضامین اور اسباق بیان ہوئے ہیں؟",
    "کیا اس تفسیر میں شانِ نزول یا تاریخی پس منظر کا ذکر موجود ہے؟",
    "مفسر نے کن اہم الفاظ یا تراکیب کی وضاحت فرمائی ہے؟",
  ],
  ar: [
    "ما هي أبرز المعاني والفوائد المذكورة في هذا التفسير؟",
    "هل يذكر المفسر سبب نزول أو سياقاً تاريخياً لهذه الآية؟",
    "ما اللطائف اللغوية أو التفسيرية التي أوضحها المفسر؟",
  ],
};

export const TafsirAssistant: React.FC<TafsirAssistantProps> = ({
  uiLang,
  surahs,
  tafsirEditions,
  initialSurah,
  initialAyah,
  arabicFontSize,
  onOpenInReader,
  activeAudioTrack,
  isAudioPlaying,
  onPlayAyahAudio,
}) => {
  const copy = UI_COPY[uiLang];

  const [selectedSurah, setSelectedSurah] = useState<number>(initialSurah || 1);
  const [selectedAyah, setSelectedAyah] = useState<number>(initialAyah || 1);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(
    uiLang === "ur" ? 160 : uiLang === "ar" ? 16 : 169
  );
  const [aiResponseLang, setAiResponseLang] = useState<UILanguage>(uiLang);

  const [ayahBundle, setAyahBundle] = useState<VerifiedAyahBundle | null>(null);
  const [publishedTafsir, setPublishedTafsir] = useState<PublishedTafsirPayload | null>(null);
  const [loadingSource, setLoadingSource] = useState(true);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [expandFullTafsir, setExpandFullTafsir] = useState(false);

  const [questionInput, setQuestionInput] = useState("");
  const [aiResult, setAiResult] = useState<AISynthesisPayload | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSurah(initialSurah);
    setSelectedAyah(initialAyah);
  }, [initialSurah, initialAyah]);

  useEffect(() => {
    setAiResponseLang(uiLang);
  }, [uiLang]);

  const currentSurahMeta = surahs.find((s) => s.number === selectedSurah);
  const maxAyahs = currentSurahMeta?.numberOfAyahs || 286;

  const loadPrimaryTafsirSource = useCallback(async () => {
    setLoadingSource(true);
    setSourceError(null);
    setAiResult(null);
    setAiError(null);
    try {
      const res = await fetch(
        `/api/tafsir/source/${selectedSurah}/${selectedAyah}?tafsirId=${selectedTafsirId}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to retrieve published Tafsir source.");
      }
      setAyahBundle(data.ayah as VerifiedAyahBundle);
      setPublishedTafsir(data.tafsir as PublishedTafsirPayload);
    } catch (err) {
      setSourceError(
        err instanceof Error
          ? err.message
          : "Published Tafsir commentary could not be retrieved right now."
      );
    } finally {
      setLoadingSource(false);
    }
  }, [selectedSurah, selectedAyah, selectedTafsirId]);

  useEffect(() => {
    loadPrimaryTafsirSource();
  }, [loadPrimaryTafsirSource]);

  const requestGroundedAiExplanation = async (customQuestion?: string) => {
    if (!publishedTafsir) return;
    setLoadingAi(true);
    setAiError(null);
    const qToUse = customQuestion !== undefined ? customQuestion : questionInput;
    try {
      const res = await fetch("/api/tafsir/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surah: selectedSurah,
          ayah: selectedAyah,
          tafsirId: selectedTafsirId,
          question: qToUse,
          responseLanguage: aiResponseLang,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate grounded study summary.");
      }
      setAiResult(json as AISynthesisPayload);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Unable to generate AI study synthesis right now. The published Tafsir remains available."
      );
    } finally {
      setLoadingAi(false);
    }
  };

  const isPlayingThis =
    Boolean(ayahBundle) &&
    activeAudioTrack?.reference === ayahBundle?.reference &&
    isAudioPlaying;

  return (
    <div className="space-y-8 pb-16">
      {/* Screen Header & Selector Controls */}
      <section className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#8A6823] dark:text-[#D4AF5A]">
            Source-First Exegesis · Verified Primary Commentaries + Separate Grounded Study Guide
          </p>
          <h1
            className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#18221E] dark:text-[#F3EFE6]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {copy.tafsirScreenTitle}
          </h1>
          <p className="text-sm text-[#57635D] dark:text-[#98AAA2] max-w-3xl leading-relaxed">
            {copy.tafsirScreenSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E6E1D6] dark:border-[#21352D]">
          {/* Surah Selector */}
          <div>
            <label className="block text-xs font-medium text-[#57635D] dark:text-[#98AAA2] mb-1.5">
              Surah (1–114)
            </label>
            <select
              value={selectedSurah}
              onChange={(e) => {
                setSelectedSurah(Number(e.target.value));
                setSelectedAyah(1);
              }}
              className="w-full h-11 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-3 text-xs sm:text-sm text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
            >
              {surahs.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.englishName} ({s.name.replace("سُورَةُ ", "")})
                </option>
              ))}
            </select>
          </div>

          {/* Ayah Selector */}
          <div>
            <label className="block text-xs font-medium text-[#57635D] dark:text-[#98AAA2] mb-1.5">
              Ayah (1–{maxAyahs})
            </label>
            <select
              value={selectedAyah}
              onChange={(e) => setSelectedAyah(Number(e.target.value))}
              className="w-full h-11 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-3 text-xs sm:text-sm font-mono tabular-nums text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
            >
              {Array.from({ length: maxAyahs }, (_, idx) => idx + 1).map((num) => (
                <option key={num} value={num}>
                  Ayah {selectedSurah}:{num}
                </option>
              ))}
            </select>
          </div>

          {/* Published Tafsir Edition Selector */}
          <div>
            <label className="block text-xs font-medium text-[#57635D] dark:text-[#98AAA2] mb-1.5">
              Published Classical Tafsir Edition
            </label>
            <select
              value={selectedTafsirId}
              onChange={(e) => setSelectedTafsirId(Number(e.target.value))}
              className="w-full h-11 rounded-xl border border-[#E6E1D6] dark:border-[#21352D] bg-[#FAF8F3] dark:bg-[#172821] px-3 text-xs sm:text-sm text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
            >
              {tafsirEditions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.author} [{t.languageLabel}]
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loadingSource ? (
        <div className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] py-20 text-center space-y-3">
          <RefreshCw className="w-7 h-7 mx-auto animate-spin text-[#0B5D46] dark:text-[#34D399]" />
          <p className="text-sm font-medium text-[#18221E] dark:text-[#F3EFE6]">
            Retrieving verified Ayah and published classical Tafsir commentary…
          </p>
        </div>
      ) : sourceError ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6 space-y-4">
          <div className="flex items-start gap-3 text-red-900 dark:text-red-200">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-base">Published Tafsir Source Unavailable</h2>
              <p className="text-sm mt-1">{sourceError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadPrimaryTafsirSource}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-medium inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{copy.retry}</span>
          </button>
        </div>
      ) : ayahBundle && publishedTafsir ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1: VERBATIM SACRED TEXT & PUBLISHED TAFSIR (PRIMARY SOURCE) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Verbatim Ayah Card */}
            <article className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6E1D6] dark:border-[#21352D]">
                <div className="text-xs font-medium text-[#0B5D46] dark:text-[#34D399] tabular-nums">
                  {ayahBundle.surah.englishName} · Ayah {ayahBundle.reference} · Juz {ayahBundle.juz}
                </div>
                <div className="flex items-center gap-2">
                  {ayahBundle.audioUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onPlayAyahAudio({
                          reference: ayahBundle.reference,
                          surahNumber: ayahBundle.surahNumber,
                          ayahNumber: ayahBundle.ayahNumber,
                          surahEnglishName: ayahBundle.surah.englishName,
                          surahArabicName: ayahBundle.surah.name,
                          audioUrl: ayahBundle.audioUrl,
                          totalAyahsInSurah: ayahBundle.surah.numberOfAyahs,
                        })
                      }
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#FAF8F3] dark:bg-[#172821] border border-[#E6E1D6] dark:border-[#21352D] text-xs font-medium text-[#18221E] dark:text-[#F3EFE6] inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{isPlayingThis ? copy.pauseRecitation : copy.playRecitation}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenInReader(ayahBundle.surahNumber, ayahBundle.ayahNumber)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0B5D46]/10 text-[#0B5D46] dark:text-[#34D399] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{copy.openInReader}</span>
                  </button>
                </div>
              </div>

              <div
                dir="rtl"
                lang="ar"
                style={{ fontSize: `${arabicFontSize}px` }}
                className="font-quran-text text-right text-[#18221E] dark:text-[#F5F2EB] bg-[#FAF8F3] dark:bg-[#0F1B16] p-5 rounded-xl border border-[#E6E1D6]/70 dark:border-[#21352D]"
              >
                {ayahBundle.arabicText}{" "}
                <span className="inline-block text-[#B58D3D] dark:text-[#D4AF5A] text-2xl mx-1 select-none">
                  ﴿{toArabicNumerals(ayahBundle.ayahNumber)}﴾
                </span>
              </div>

              <div className="space-y-1">
                <p dir="rtl" lang="ur" className="font-urdu-text text-lg text-right text-[#21302A] dark:text-[#E5E0D5]">
                  {ayahBundle.urduText}
                </p>
                <p className="text-[11px] text-[#57635D] dark:text-[#98AAA2] text-right">
                  {ayahBundle.sources.urdu}
                </p>
              </div>

              <div className="space-y-1 pt-3 border-t border-[#E6E1D6] dark:border-[#21352D]">
                <p dir="ltr" lang="en" className="text-sm leading-relaxed text-[#2B3732] dark:text-[#D8D3C8]">
                  {ayahBundle.englishText}
                </p>
                <p className="text-[11px] text-[#57635D] dark:text-[#98AAA2]">
                  {ayahBundle.sources.english}
                </p>
              </div>
            </article>

            {/* Verbatim Published Classical Tafsir Card */}
            <article className="rounded-2xl border border-[#E6E1D6] dark:border-[#21352D] bg-white dark:bg-[#13201B] p-6 sm:p-7 space-y-5">
              <div className="space-y-1 pb-4 border-b border-[#E6E1D6] dark:border-[#21352D]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0B5D46] dark:text-[#34D399]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{copy.publishedTafsirHeading}</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                  {publishedTafsir.name}
                </h2>
                <p className="text-xs text-[#57635D] dark:text-[#98AAA2] tabular-nums">
                  Author: {publishedTafsir.author} · Covers Ayat:{" "}
                  {publishedTafsir.coveredVerses.join(", ")} · Source: {publishedTafsir.provider}
                </p>
              </div>

              {publishedTafsir.plainText ? (
                <div className="space-y-4">
                  <div
                    dir={publishedTafsir.language === "ur" || publishedTafsir.language === "ar" ? "rtl" : "ltr"}
                    lang={publishedTafsir.language}
                    className={`${
                      publishedTafsir.language === "ur"
                        ? "font-urdu-text text-base sm:text-lg text-right"
                        : publishedTafsir.language === "ar"
                        ? "font-quran-text text-xl sm:text-2xl text-right"
                        : "text-sm sm:text-[0.95rem] leading-relaxed"
                    } text-[#22302B] dark:text-[#E2DDD2] whitespace-pre-line ${
                      !expandFullTafsir && publishedTafsir.plainText.length > 1400
                        ? "max-h-[420px] overflow-hidden relative"
                        : ""
                    }`}
                  >
                    {expandFullTafsir
                      ? publishedTafsir.plainText
                      : publishedTafsir.plainText.slice(0, 1400) +
                        (publishedTafsir.plainText.length > 1400 ? "…" : "")}
                  </div>

                  {publishedTafsir.plainText.length > 1400 && (
                    <button
                      type="button"
                      onClick={() => setExpandFullTafsir((v) => !v)}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#172821] border border-[#E6E1D6] dark:border-[#21352D] text-xs font-medium text-[#0B5D46] dark:text-[#34D399] inline-flex items-center gap-1.5"
                    >
                      {expandFullTafsir ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Collapse Full Commentary</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>Read Complete Verbatim Tafsir ({Math.ceil(publishedTafsir.plainText.length / 900)} min read)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#57635D] dark:text-[#98AAA2]">
                  No commentary text was returned for this specific Ayah in {publishedTafsir.name}. Try checking the preceding Ayah (classical Tafsirs often group consecutive Ayat together) or select another edition above.
                </p>
              )}
            </article>
          </div>

          {/* COLUMN 2: SEPARATE SOURCE-GROUNDED AI STUDY SYNTHESIS */}
          <aside className="lg:col-span-5 rounded-2xl border border-[#D8CEB8] dark:border-[#2A4238] bg-[#FAF8F3] dark:bg-[#162620] p-6 space-y-5 sticky top-20">
            <div className="space-y-1.5 pb-4 border-b border-[#E6E1D6] dark:border-[#253C33]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8A6823] dark:text-[#E2B866]">
                <Compass className="w-4 h-4 shrink-0" />
                <span>AI-Generated Study Synthesis · Not Primary Tafsir</span>
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                {copy.aiCompanionHeading}
              </h2>
              <p className="text-xs text-[#57635D] dark:text-[#98AAA2] leading-relaxed">
                Summarizes only the retrieved commentary on the left ({publishedTafsir.name}). Never generates Quranic text, invents citations, or issues religious rulings (fatawa).
              </p>
            </div>

            {/* Output Language Switcher */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#57635D] dark:text-[#98AAA2]">
                Explanation Language
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white dark:bg-[#101C17] border border-[#E6E1D6] dark:border-[#21352D]">
                {(
                  [
                    { id: "en", label: "English" },
                    { id: "ur", label: "اردو" },
                    { id: "ar", label: "العربية" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAiResponseLang(opt.id)}
                    className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                      aiResponseLang === opt.id
                        ? "bg-[#0B5D46] text-white"
                        : "text-[#57635D] dark:text-[#98AAA2] hover:text-[#18221E]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Study Question Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestGroundedAiExplanation();
              }}
              className="space-y-3"
            >
              <textarea
                rows={2}
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder={copy.askQuestionPlaceholder}
                className="w-full rounded-xl border border-[#E6E1D6] dark:border-[#253C33] bg-white dark:bg-[#101C17] p-3 text-xs sm:text-sm text-[#18221E] dark:text-[#F3EFE6] focus:outline-none focus:ring-2 focus:ring-[#0B5D46]"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={loadingAi || !publishedTafsir.plainText}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0B5D46] hover:bg-[#084735] disabled:opacity-45 text-white text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  {loadingAi ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{questionInput.trim() ? copy.askButton : copy.generateStudySummary}</span>
                </button>
              </div>
            </form>

            {/* Quick Comprehension Prompts */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-[#57635D] dark:text-[#98AAA2]">
                Suggested Grounded Study Prompts:
              </p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTED_QUESTIONS[aiResponseLang].map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={loadingAi}
                    onClick={() => {
                      setQuestionInput(q);
                      requestGroundedAiExplanation(q);
                    }}
                    className="text-left p-2.5 rounded-lg bg-white dark:bg-[#111E19] border border-[#E6E1D6] dark:border-[#21352D] hover:border-[#0B5D46] text-xs text-[#2B3732] dark:text-[#D8D3C8] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Error State */}
            {aiError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-2.5 text-xs text-red-800 dark:text-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{aiError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => requestGroundedAiExplanation()}
                  className="px-3 py-1.5 rounded-lg bg-red-700 text-white font-medium"
                >
                  {copy.retry}
                </button>
              </div>
            )}

            {/* Structured AI Synthesis Output */}
            {aiResult && (
              <div
                dir={aiResult.responseLanguage === "ur" || aiResult.responseLanguage === "ar" ? "rtl" : "ltr"}
                lang={aiResult.responseLanguage}
                className="space-y-4 pt-4 border-t border-[#E6E1D6] dark:border-[#253C33]"
              >
                <div className="p-4 rounded-xl bg-white dark:bg-[#101C17] border border-[#E6E1D6] dark:border-[#21352D] space-y-2">
                  <h3 className="text-xs font-semibold text-[#0B5D46] dark:text-[#34D399]">
                    Commentary Overview
                  </h3>
                  <p
                    className={`${
                      aiResult.responseLanguage === "ur"
                        ? "font-urdu-text text-base"
                        : "text-xs sm:text-sm leading-relaxed"
                    } text-[#18221E] dark:text-[#F3EFE6]`}
                  >
                    {aiResult.synthesis.overview}
                  </p>
                </div>

                {questionInput.trim() && aiResult.synthesis.questionAnswer && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#101C17] border border-[#B58D3D]/40 space-y-2">
                    <h3 className="text-xs font-semibold text-[#8A6823] dark:text-[#E2B866]">
                      Direct Answer from Retrieved Tafsir
                    </h3>
                    <p
                      className={`${
                        aiResult.responseLanguage === "ur"
                          ? "font-urdu-text text-base"
                          : "text-xs sm:text-sm leading-relaxed"
                      } text-[#18221E] dark:text-[#F3EFE6]`}
                    >
                      {aiResult.synthesis.questionAnswer}
                    </p>
                  </div>
                )}

                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                    Key Themes & Cited Sources
                  </h3>
                  {aiResult.synthesis.keyThemes.map((theme, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white dark:bg-[#101C17] border border-[#E6E1D6] dark:border-[#21352D] space-y-1.5"
                    >
                      <div className="text-xs font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                        {theme.title}
                      </div>
                      <p
                        className={`${
                          aiResult.responseLanguage === "ur"
                            ? "font-urdu-text text-sm"
                            : "text-xs leading-relaxed"
                        } text-[#2B3732] dark:text-[#D8D3C8]`}
                      >
                        {theme.explanation}
                      </p>
                      <p className="text-[11px] text-[#8A6823] dark:text-[#D4AF5A]">
                        Reference: {theme.sourceReference}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#101C17] border border-[#E6E1D6] dark:border-[#21352D] space-y-1">
                  <div className="text-xs font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                    Historical & Linguistic Notes
                  </div>
                  <p
                    className={`${
                      aiResult.responseLanguage === "ur"
                        ? "font-urdu-text text-sm"
                        : "text-xs leading-relaxed"
                    } text-[#57635D] dark:text-[#98AAA2]`}
                  >
                    {aiResult.synthesis.historicalOrLinguisticNotes}
                  </p>
                </div>

                {/* Verified Grounding Sources Footnote */}
                <div dir="ltr" className="p-3.5 rounded-xl bg-[#EFECE2] dark:bg-[#0D1713] text-[11px] text-[#57635D] dark:text-[#98AAA2] space-y-1.5">
                  <div className="font-semibold text-[#18221E] dark:text-[#F3EFE6]">
                    Retrieved Primary Sources Used for Grounding:
                  </div>
                  {aiResult.retrievedSources.map((src) => (
                    <div key={src.id}>
                      • {src.name} by {src.author} (Ayat {src.coveredVerses.join(", ")}) — {src.provider}
                    </div>
                  ))}
                  <p className="pt-1 italic">{aiResult.synthesis.scholarlyDisclaimer}</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
};
