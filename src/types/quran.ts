export type UILanguage = "en" | "ur" | "ar";

export type AppScreen = "home" | "reader" | "tafsir" | "tajweed-hifz" | "search";

export interface SurahSummary {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan" | string;
}

export interface AyahItem {
  number: number;
  numberInSurah: number;
  reference: string;
  juz: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  arabicText: string;
  tajweedText?: string;
  urduText: string;
  englishText: string;
  audioUrl: string;
}

export interface SurahReaderPayload {
  surah: SurahSummary;
  ayahs: AyahItem[];
  sources: {
    arabic: { id: string; name: string; provider: string };
    urdu: { id: string; name: string; nativeName?: string; provider: string };
    english: { id: string; name: string; provider: string };
    audio: { id: string; name: string; provider: string };
    tajweed?: { id: string; name: string; provider: string } | null;
  };
}

export interface VerifiedAyahBundle {
  reference: string;
  globalNumber: number;
  surahNumber: number;
  ayahNumber: number;
  juz: number;
  page: number;
  surah: SurahSummary;
  arabicText: string;
  tajweedText: string;
  urduText: string;
  englishText: string;
  audioUrl: string;
  sources: {
    arabic: string;
    urdu: string;
    english: string;
    audio: string;
  };
}

export interface EditionOption {
  id: string;
  name: string;
  nativeName: string;
  provider: string;
  recommended?: boolean;
  style?: string;
}

export interface TafsirEditionOption {
  id: number;
  name: string;
  author: string;
  language: "en" | "ur" | "ar";
  languageLabel: string;
  slug: string;
  provider: string;
}

export interface EditionsCatalog {
  arabicEdition: { id: string; name: string; provider: string };
  urduEditions: EditionOption[];
  englishEditions: EditionOption[];
  reciters: EditionOption[];
  tafsirs: TafsirEditionOption[];
}

export interface BookmarkEntry {
  reference: string; // e.g. "2:255"
  surahNumber: number;
  ayahNumber: number;
  surahEnglishName: string;
  surahArabicName: string;
  arabicSnippet: string;
  urduSnippet: string;
  englishSnippet: string;
  note: string;
  savedAt: string;
}

export interface LastReadPosition {
  surahNumber: number;
  ayahNumber: number;
  surahEnglishName: string;
  surahArabicName: string;
  updatedAt: string;
}

export interface ReadingGoalState {
  dailyTargetAyat: number;
  historyByDate: Record<string, number>; // YYYY-MM-DD -> ayat read count
  readReferencesToday: string[];
  todayDate: string;
}

export type HifzStatus = "not_started" | "in_progress" | "memorized" | "needs_revision";

export interface HifzSurahProgress {
  surahNumber: number;
  status: HifzStatus;
  memorizedAyat: number;
  lastRevisedDate?: string;
}

export interface PublishedTafsirPayload {
  id: number;
  name: string;
  author: string;
  language: string;
  languageLabel: string;
  slug: string;
  verseKey: string;
  coveredVerses: string[];
  htmlContent: string;
  plainText: string;
  provider: string;
}

export interface AISynthesisPayload {
  surah: number;
  ayah: number;
  responseLanguage: UILanguage;
  retrievedSources: Array<{
    id: number;
    name: string;
    author: string;
    slug: string;
    coveredVerses: string[];
    provider: string;
  }>;
  synthesis: {
    overview: string;
    keyThemes: Array<{
      title: string;
      explanation: string;
      sourceReference: string;
    }>;
    historicalOrLinguisticNotes: string;
    questionAnswer: string;
    scholarlyDisclaimer: string;
  };
}

export interface SearchMatchItem {
  reference: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  surahEnglishName: string;
  arabicText: string;
  urduText: string;
  englishText: string;
  matchedText: string;
  editionName: string;
}

export interface AudioTrack {
  reference: string;
  surahNumber: number;
  ayahNumber: number;
  surahEnglishName: string;
  surahArabicName: string;
  audioUrl: string;
  totalAyahsInSurah: number;
}
