import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ALQURAN_API_BASE = "https://api.alquran.cloud/v1";
const QURAN_COM_API_BASE = "https://api.quran.com/api/v4";

// Simple bounded in-memory cache for verified upstream Quran & Tafsir responses
const apiCache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    apiCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown): void {
  if (apiCache.size > 400) {
    const oldestKey = apiCache.keys().next().value;
    if (oldestKey) apiCache.delete(oldestKey);
  }
  apiCache.set(key, { timestamp: Date.now(), data });
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "NoorAlQuran-Server/1.0",
      },
    });
    if (!res.ok) {
      throw new Error(`Upstream provider returned HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// Strip only leading UTF-8 BOM (\uFEFF) if present while keeping 100% of Arabic script & diacritics verbatim
function cleanBomOnly(text: string): string {
  if (typeof text !== "string") return "";
  return text.replace(/^\uFEFF/, "");
}

// Safely clean Quran.com HTML Tafsir text for frontend display (allow only structural tags)
function sanitizeTafsirHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function stripHtmlToPlainText(rawHtml: string): string {
  if (!rawHtml) return "";
  return rawHtml
    .replace(/<\/(p|div|h1|h2|h3|h4|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const VERIFIED_URDU_EDITIONS = [
  {
    id: "ur.jalandhry",
    name: "Fateh Muhammad Jalandhry",
    nativeName: "فتح محمد جالندھری",
    provider: "AlQuran Cloud · Tanzil Project",
    recommended: true,
  },
  {
    id: "ur.junagarhi",
    name: "Muhammad Junagarhi",
    nativeName: "محمد جوناگڑھی",
    provider: "AlQuran Cloud · Tanzil Project",
    recommended: false,
  },
  {
    id: "ur.maududi",
    name: "Abul A'ala Maududi",
    nativeName: "سید ابوالاعلیٰ مودودی",
    provider: "AlQuran Cloud · Tanzil Project",
    recommended: false,
  },
  {
    id: "ur.kanzuliman",
    name: "Ahmed Raza Khan (Kanz ul Iman)",
    nativeName: "احمد رضا خان (کنز الایمان)",
    provider: "AlQuran Cloud · Tanzil Project",
    recommended: false,
  },
];

const VERIFIED_ENGLISH_EDITIONS = [
  {
    id: "en.sahih",
    name: "Saheeh International",
    nativeName: "Saheeh International",
    provider: "AlQuran Cloud · Tanzil Project",
    recommended: true,
  },
  {
    id: "en.pickthall",
    name: "Mohammed Marmaduke Pickthall",
    nativeName: "M. M. Pickthall",
    provider: "AlQuran Cloud · Tanzil Project",
    recommended: false,
  },
  {
    id: "en.yusufali",
    name: "Abdullah Yusuf Ali",
    nativeName: "Abdullah Yusuf Ali",
    provider: "AlQuran Cloud · Tanzil Project",
    recommended: false,
  },
  {
    id: "en.asad",
    name: "Muhammad Asad",
    nativeName: "Muhammad Asad",
    provider: "AlQuran Cloud · Tanzil Project",
    recommended: false,
  },
];

const VERIFIED_RECITERS = [
  {
    id: "ar.alafasy",
    name: "Mishary Rashid Alafasy",
    nativeName: "مشاري راشد العفاسي",
    style: "Murattal",
    provider: "Islamic Network Audio CDN",
  },
  {
    id: "ar.abdurrahmaansudais",
    name: "Abdurrahmaan As-Sudais",
    nativeName: "عبدالرحمن السديس",
    style: "Murattal",
    provider: "Islamic Network Audio CDN",
  },
  {
    id: "ar.husary",
    name: "Mahmoud Khalil Al-Husary",
    nativeName: "محمود خليل الحصري",
    style: "Murattal (Ideal for Tajweed & Hifz)",
    provider: "Islamic Network Audio CDN",
  },
  {
    id: "ar.abdulsamad",
    name: "AbdulBaset AbdulSamad",
    nativeName: "عبدالباسط عبدالصمد",
    style: "Murattal",
    provider: "Islamic Network Audio CDN",
  },
  {
    id: "ar.shaatree",
    name: "Abu Bakr Ash-Shaatree",
    nativeName: "أبو بكر الشاطري",
    style: "Murattal",
    provider: "Islamic Network Audio CDN",
  },
  {
    id: "ar.ahmedajamy",
    name: "Ahmed ibn Ali al-Ajamy",
    nativeName: "أحمد بن علي العجمي",
    style: "Murattal",
    provider: "Islamic Network Audio CDN",
  },
];

const VERIFIED_TAFSIRS = [
  {
    id: 169,
    name: "Tafsir Ibn Kathir (Abridged)",
    author: "Hafiz Ibn Kathir",
    language: "en",
    languageLabel: "English",
    slug: "en-tafisr-ibn-kathir",
    provider: "Quran.com API v4 (Quran Foundation)",
  },
  {
    id: 168,
    name: "Ma'arif al-Qur'an",
    author: "Mufti Muhammad Shafi",
    language: "en",
    languageLabel: "English",
    slug: "en-tafsir-maarif-ul-quran",
    provider: "Quran.com API v4 (Quran Foundation)",
  },
  {
    id: 160,
    name: "Tafsir Ibn Kathir (Urdu)",
    author: "Hafiz Ibn Kathir",
    language: "ur",
    languageLabel: "اردو (Urdu)",
    slug: "tafseer-ibn-e-kaseer-urdu",
    provider: "Quran.com API v4 (Quran Foundation)",
  },
  {
    id: 159,
    name: "Bayan ul Quran",
    author: "Dr. Israr Ahmad",
    language: "ur",
    languageLabel: "اردو (Urdu)",
    slug: "tafsir-bayan-ul-quran",
    provider: "Quran.com API v4 (Quran Foundation)",
  },
  {
    id: 16,
    name: "Al-Tafsir Al-Muyassar",
    author: "King Fahd Glorious Quran Printing Complex",
    language: "ar",
    languageLabel: "العربية (Arabic)",
    slug: "ar-tafsir-muyassar",
    provider: "Quran.com API v4 (Quran Foundation)",
  },
  {
    id: 14,
    name: "Tafsir Ibn Kathir (Arabic)",
    author: "Hafiz Ibn Kathir",
    language: "ar",
    languageLabel: "العربية (Arabic)",
    slug: "ar-tafsir-ibn-kathir",
    provider: "Quran.com API v4 (Quran Foundation)",
  },
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface AlQuranAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | Record<string, unknown>;
  audio?: string;
}

interface AlQuranSurahEdition {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: AlQuranAyah[];
  edition: {
    identifier: string;
    language: string;
    name: string;
    englishName: string;
    format: string;
    type: string;
  };
}

async function fetchVerifiedAyahBundle(
  surah: number,
  ayah: number,
  urduEdition = "ur.jalandhry",
  englishEdition = "en.sahih",
  reciter = "ar.alafasy"
) {
  const ref = `${surah}:${ayah}`;
  const cacheKey = `ayah:${ref}:${urduEdition}:${englishEdition}:${reciter}`;
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const url = `${ALQURAN_API_BASE}/ayah/${ref}/editions/quran-uthmani,${urduEdition},${englishEdition},quran-tajweed,${reciter}`;
  const json = await fetchJsonWithTimeout<{
    code: number;
    status: string;
    data: Array<{
      number: number;
      text: string;
      numberInSurah: number;
      juz: number;
      page: number;
      audio?: string;
      surah: {
        number: number;
        name: string;
        englishName: string;
        englishNameTranslation: string;
        revelationType: string;
        numberOfAyahs: number;
      };
      edition: {
        identifier: string;
        name: string;
        englishName: string;
      };
    }>;
  }>(url);

  if (!json.data || json.data.length < 5) {
    throw new Error("Incomplete verified Ayah response from AlQuran Cloud API.");
  }

  const [arData, urData, enData, tajweedData, audioData] = json.data;
  if (!arData?.text || !urData?.text || !enData?.text) {
    throw new Error("Missing verified sacred text or translation from provider.");
  }

  const result = {
    reference: `${arData.surah.number}:${arData.numberInSurah}`,
    globalNumber: arData.number,
    surahNumber: arData.surah.number,
    ayahNumber: arData.numberInSurah,
    juz: arData.juz,
    page: arData.page,
    surah: arData.surah,
    arabicText: cleanBomOnly(arData.text),
    tajweedText: cleanBomOnly(tajweedData?.text || ""),
    urduText: cleanBomOnly(urData.text),
    englishText: cleanBomOnly(enData.text),
    audioUrl: audioData?.audio || "",
    sources: {
      arabic: `${arData.edition.englishName} (${arData.edition.identifier}) · Tanzil Project via AlQuran Cloud`,
      urdu: `${urData.edition.englishName} (${urData.edition.identifier}) · AlQuran Cloud`,
      english: `${enData.edition.englishName} (${enData.edition.identifier}) · AlQuran Cloud`,
      audio: `${audioData.edition.englishName} (${audioData.edition.identifier})`,
    },
  };

  setCached(cacheKey, result);
  return result;
}

async function fetchVerifiedTafsirSource(surah: number, ayah: number, tafsirId: number) {
  const validTafsir = VERIFIED_TAFSIRS.find((t) => t.id === tafsirId) || VERIFIED_TAFSIRS[0];
  const cacheKey = `tafsir:${surah}:${ayah}:${validTafsir.id}`;
  const cached = getCached<{
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
  }>(cacheKey);
  if (cached) return cached;

  const url = `${QURAN_COM_API_BASE}/tafsirs/${validTafsir.id}/by_ayah/${surah}:${ayah}`;
  const json = await fetchJsonWithTimeout<{
    tafsir?: {
      resource_id: number;
      resource_name: string;
      slug: string;
      text: string;
      verses?: Record<string, unknown>;
    };
  }>(url);

  if (!json.tafsir || typeof json.tafsir.text !== "string") {
    throw new Error(`Published Tafsir (${validTafsir.name}) was unavailable for ${surah}:${ayah}.`);
  }

  const htmlContent = sanitizeTafsirHtml(json.tafsir.text);
  const plainText = stripHtmlToPlainText(json.tafsir.text);
  const coveredVerses = Object.keys(json.tafsir.verses || {});

  const result = {
    id: validTafsir.id,
    name: validTafsir.name,
    author: validTafsir.author,
    language: validTafsir.language,
    languageLabel: validTafsir.languageLabel,
    slug: validTafsir.slug,
    verseKey: `${surah}:${ayah}`,
    coveredVerses: coveredVerses.length > 0 ? coveredVerses : [`${surah}:${ayah}`],
    htmlContent,
    plainText,
    provider: validTafsir.provider,
  };

  setCached(cacheKey, result);
  return result;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // 1. Health & configuration check (never exposes secrets)
  app.get("/api/health", (_req: Request, res: Response) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
      ok: true,
      geminiConfigured: Boolean(key && key !== "MY_GEMINI_API_KEY"),
      providers: {
        quranTextAndTranslations: "AlQuran Cloud API v1 (Tanzil Project Uthmani & Verified Translations)",
        publishedTafsir: "Quran.com API v4 (Quran Foundation)",
      },
    });
  });

  // 2. Verified Editions & Reciters metadata
  app.get("/api/quran/editions", (_req: Request, res: Response) => {
    res.json({
      arabicEdition: {
        id: "quran-uthmani",
        name: "Uthmani Script (Tanzil Project)",
        provider: "AlQuran Cloud API v1",
      },
      urduEditions: VERIFIED_URDU_EDITIONS,
      englishEditions: VERIFIED_ENGLISH_EDITIONS,
      reciters: VERIFIED_RECITERS,
      tafsirs: VERIFIED_TAFSIRS,
    });
  });

  // 3. Complete 114 Surahs list
  app.get("/api/quran/surahs", async (_req: Request, res: Response) => {
    try {
      const cacheKey = "surahs:all";
      const cached = getCached<unknown>(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      const json = await fetchJsonWithTimeout<{
        code: number;
        status: string;
        data: Array<{
          number: number;
          name: string;
          englishName: string;
          englishNameTranslation: string;
          numberOfAyahs: number;
          revelationType: string;
        }>;
      }>(`${ALQURAN_API_BASE}/surah`);

      if (!Array.isArray(json.data) || json.data.length !== 114) {
        throw new Error("Could not verify complete 114-Surah index from provider.");
      }

      const payload = {
        surahs: json.data,
        source: "AlQuran Cloud API v1 · Tanzil Project Metadata",
      };
      setCached(cacheKey, payload);
      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch Surah directory.";
      res.status(502).json({
        error: "Unable to load the verified Surah list from the Quran data provider. Please check your connection and try again.",
        details: message,
      });
    }
  });

  // 4. Complete Surah Reader endpoint (Arabic Uthmani + Urdu + English + Audio + optional Tajweed)
  app.get("/api/quran/surah/:number", async (req: Request, res: Response) => {
    try {
      const surahNum = Number(req.params.number);
      if (!Number.isInteger(surahNum) || surahNum < 1 || surahNum > 114) {
        res.status(400).json({ error: "Invalid Surah number. Must be between 1 and 114." });
        return;
      }

      const urduId = String(req.query.urduEdition || "ur.jalandhry");
      const englishId = String(req.query.englishEdition || "en.sahih");
      const reciterId = String(req.query.reciter || "ar.alafasy");
      const includeTajweed = req.query.tajweed === "true";

      const validUrdu = VERIFIED_URDU_EDITIONS.some((e) => e.id === urduId) ? urduId : "ur.jalandhry";
      const validEnglish = VERIFIED_ENGLISH_EDITIONS.some((e) => e.id === englishId) ? englishId : "en.sahih";
      const validReciter = VERIFIED_RECITERS.some((r) => r.id === reciterId) ? reciterId : "ar.alafasy";

      const cacheKey = `surah:${surahNum}:${validUrdu}:${validEnglish}:${validReciter}:${includeTajweed}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      const editionsList = ["quran-uthmani", validUrdu, validEnglish, validReciter];
      if (includeTajweed) {
        editionsList.push("quran-tajweed");
      }

      const url = `${ALQURAN_API_BASE}/surah/${surahNum}/editions/${editionsList.join(",")}`;
      const json = await fetchJsonWithTimeout<{
        code: number;
        status: string;
        data: AlQuranSurahEdition[];
      }>(url, 15000);

      if (!Array.isArray(json.data) || json.data.length < editionsList.length) {
        throw new Error("Incomplete multi-edition Surah response from AlQuran Cloud.");
      }

      const arabicEd = json.data[0];
      const urduEd = json.data[1];
      const englishEd = json.data[2];
      const audioEd = json.data[3];
      const tajweedEd = includeTajweed ? json.data[4] : null;

      if (
        !arabicEd?.ayahs?.length ||
        arabicEd.ayahs.length !== urduEd?.ayahs?.length ||
        arabicEd.ayahs.length !== englishEd?.ayahs?.length
      ) {
        throw new Error("Edition verse count mismatch detected; refusing to serve unverified alignment.");
      }

      const ayahs = arabicEd.ayahs.map((arAyah, idx) => {
        const urAyah = urduEd.ayahs[idx];
        const enAyah = englishEd.ayahs[idx];
        const auAyah = audioEd?.ayahs?.[idx];
        const tjAyah = tajweedEd?.ayahs?.[idx];

        return {
          number: arAyah.number,
          numberInSurah: arAyah.numberInSurah,
          reference: `${arabicEd.number}:${arAyah.numberInSurah}`,
          juz: arAyah.juz,
          page: arAyah.page,
          ruku: arAyah.ruku,
          hizbQuarter: arAyah.hizbQuarter,
          sajda: Boolean(arAyah.sajda),
          arabicText: cleanBomOnly(arAyah.text),
          tajweedText: tjAyah ? cleanBomOnly(tjAyah.text) : undefined,
          urduText: cleanBomOnly(urAyah.text),
          englishText: cleanBomOnly(enAyah.text),
          audioUrl: auAyah?.audio || "",
        };
      });

      const payload = {
        surah: {
          number: arabicEd.number,
          name: arabicEd.name,
          englishName: arabicEd.englishName,
          englishNameTranslation: arabicEd.englishNameTranslation,
          revelationType: arabicEd.revelationType,
          numberOfAyahs: arabicEd.numberOfAyahs,
        },
        ayahs,
        sources: {
          arabic: {
            id: arabicEd.edition.identifier,
            name: "Tanzil Uthmani Script",
            provider: "AlQuran Cloud API v1 · Tanzil.net",
          },
          urdu: {
            id: urduEd.edition.identifier,
            name: urduEd.edition.englishName,
            nativeName: urduEd.edition.name,
            provider: "AlQuran Cloud API v1 · Tanzil.net",
          },
          english: {
            id: englishEd.edition.identifier,
            name: englishEd.edition.englishName,
            provider: "AlQuran Cloud API v1 · Tanzil.net",
          },
          audio: {
            id: audioEd.edition.identifier,
            name: audioEd.edition.englishName,
            provider: "Islamic Network Audio CDN",
          },
          tajweed: tajweedEd
            ? {
                id: tajweedEd.edition.identifier,
                name: "Tanzil Uthmani Tajweed Markup",
                provider: "AlQuran Cloud API v1",
              }
            : null,
        },
      };

      setCached(cacheKey, payload);
      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upstream error";
      res.status(502).json({
        error:
          "Verified Quran text or published translation could not be retrieved right now. No text is ever generated or substituted.",
        details: message,
      });
    }
  });

  // 5. Single Verified Ayah endpoint (used for Featured Ayah, Tajweed Studio, Quick Lookup)
  app.get("/api/quran/ayah/:reference", async (req: Request, res: Response) => {
    try {
      const rawRef = String(req.params.reference || "").trim();
      const match = /^(\d{1,3}):(\d{1,3})$/.exec(rawRef);
      if (!match) {
        res.status(400).json({ error: "Reference must be formatted as Surah:Ayah (for example, 2:255)." });
        return;
      }
      const surah = Number(match[1]);
      const ayah = Number(match[2]);
      if (surah < 1 || surah > 114 || ayah < 1 || ayah > 286) {
        res.status(400).json({ error: "Surah or Ayah number is out of valid bounds." });
        return;
      }

      const reciter = String(req.query.reciter || "ar.alafasy");
      const validReciter = VERIFIED_RECITERS.some((r) => r.id === reciter) ? reciter : "ar.alafasy";
      const data = await fetchVerifiedAyahBundle(surah, ayah, "ur.jalandhry", "en.sahih", validReciter);
      res.json(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load verified Ayah.";
      res.status(502).json({
        error: "Could not retrieve the verified Ayah from the Quran API. Please check the reference or retry.",
        details: message,
      });
    }
  });

  // 6. Multilingual Verified Quran Search (Urdu, English, Arabic, or Surah:Ayah Reference)
  app.get("/api/quran/search", async (req: Request, res: Response) => {
    try {
      const query = String(req.query.q || "").trim();
      const lang = String(req.query.lang || "en");

      if (!query || query.length < 2) {
        res.status(400).json({ error: "Please enter at least 2 characters or a Surah:Ayah reference (e.g., 2:255)." });
        return;
      }

      // Direct Surah:Ayah reference jump (e.g., "2:255")
      const refMatch = /^(\d{1,3}):(\d{1,3})$/.exec(query);
      if (refMatch) {
        const surah = Number(refMatch[1]);
        const ayah = Number(refMatch[2]);
        const bundle = await fetchVerifiedAyahBundle(surah, ayah);
        res.json({
          query,
          language: lang,
          totalCount: 1,
          source: "Direct Verified Ayah Lookup · AlQuran Cloud API v1",
          results: [
            {
              reference: bundle.reference,
              surahNumber: bundle.surahNumber,
              ayahNumber: bundle.ayahNumber,
              surahName: (bundle.surah as { name: string }).name,
              surahEnglishName: (bundle.surah as { englishName: string }).englishName,
              arabicText: bundle.arabicText,
              urduText: bundle.urduText,
              englishText: bundle.englishText,
              matchedText: lang === "ur" ? bundle.urduText : bundle.englishText,
              editionName: "Uthmani + Fateh Muhammad Jalandhry + Saheeh International",
            },
          ],
        });
        return;
      }

      const cacheKey = `search:${lang}:${query.toLowerCase()}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      if (lang === "ar") {
        // Use Quran.com v4 search for diacritic-tolerant Arabic search, then load verbatim verified Ayat
        const searchUrl = `${QURAN_COM_API_BASE}/search?q=${encodeURIComponent(query)}&size=10`;
        const qcom = await fetchJsonWithTimeout<{
          search?: {
            total_results: number;
            results: Array<{ verse_key: string; text: string }>;
          };
        }>(searchUrl);

        const rawResults = qcom.search?.results || [];
        const enriched = await Promise.all(
          rawResults.slice(0, 8).map(async (item) => {
            const [sStr, aStr] = item.verse_key.split(":");
            try {
              const bundle = await fetchVerifiedAyahBundle(Number(sStr), Number(aStr));
              return {
                reference: bundle.reference as string,
                surahNumber: bundle.surahNumber as number,
                ayahNumber: bundle.ayahNumber as number,
                surahName: (bundle.surah as { name: string }).name,
                surahEnglishName: (bundle.surah as { englishName: string }).englishName,
                arabicText: bundle.arabicText as string,
                urduText: bundle.urduText as string,
                englishText: bundle.englishText as string,
                matchedText: bundle.arabicText as string,
                editionName: "Tanzil Uthmani Script + Fateh Muhammad Jalandhry",
              };
            } catch {
              return null;
            }
          })
        );

        const payload = {
          query,
          language: "ar",
          totalCount: qcom.search?.total_results || 0,
          source: "Quran.com Search Index + AlQuran Cloud Verified Editions",
          results: enriched.filter(Boolean),
        };
        setCached(cacheKey, payload);
        res.json(payload);
        return;
      }

      // Urdu (Fateh Muhammad Jalandhry) or English (Saheeh International) via AlQuran Cloud Search
      const edition = lang === "ur" ? "ur.jalandhry" : "en.sahih";
      const searchUrl = `${ALQURAN_API_BASE}/search/${encodeURIComponent(query)}/all/${edition}`;

      let matches: Array<{
        number: number;
        text: string;
        numberInSurah: number;
        surah: {
          number: number;
          name: string;
          englishName: string;
        };
        edition: {
          englishName: string;
          identifier: string;
        };
      }> = [];
      let totalCount = 0;

      try {
        const searchJson = await fetchJsonWithTimeout<{
          code: number;
          data?: {
            count: number;
            matches: typeof matches;
          };
        }>(searchUrl, 14000);
        matches = searchJson.data?.matches || [];
        totalCount = searchJson.data?.count || matches.length;
      } catch {
        // AlQuran Cloud returns 404 when 0 matches are found; treat cleanly as empty result
        matches = [];
        totalCount = 0;
      }

      // Enrich top 8 matches with full verified Arabic + Urdu + English bundle
      const topSlice = matches.slice(0, 8);
      const restSlice = matches.slice(8, 24);

      const enrichedTop = await Promise.all(
        topSlice.map(async (m) => {
          try {
            const bundle = await fetchVerifiedAyahBundle(m.surah.number, m.numberInSurah);
            return {
              reference: bundle.reference as string,
              surahNumber: bundle.surahNumber as number,
              ayahNumber: bundle.ayahNumber as number,
              surahName: m.surah.name,
              surahEnglishName: m.surah.englishName,
              arabicText: bundle.arabicText as string,
              urduText: bundle.urduText as string,
              englishText: bundle.englishText as string,
              matchedText: cleanBomOnly(m.text),
              editionName: `${m.edition.englishName} (${m.edition.identifier})`,
            };
          } catch {
            return {
              reference: `${m.surah.number}:${m.numberInSurah}`,
              surahNumber: m.surah.number,
              ayahNumber: m.numberInSurah,
              surahName: m.surah.name,
              surahEnglishName: m.surah.englishName,
              arabicText: "",
              urduText: lang === "ur" ? cleanBomOnly(m.text) : "",
              englishText: lang === "en" ? cleanBomOnly(m.text) : "",
              matchedText: cleanBomOnly(m.text),
              editionName: `${m.edition.englishName} (${m.edition.identifier})`,
            };
          }
        })
      );

      const remainingFormatted = restSlice.map((m) => ({
        reference: `${m.surah.number}:${m.numberInSurah}`,
        surahNumber: m.surah.number,
        ayahNumber: m.numberInSurah,
        surahName: m.surah.name,
        surahEnglishName: m.surah.englishName,
        arabicText: "",
        urduText: lang === "ur" ? cleanBomOnly(m.text) : "",
        englishText: lang === "en" ? cleanBomOnly(m.text) : "",
        matchedText: cleanBomOnly(m.text),
        editionName: `${m.edition.englishName} (${m.edition.identifier})`,
      }));

      const payload = {
        query,
        language: lang,
        totalCount,
        source:
          lang === "ur"
            ? "Fateh Muhammad Jalandhry (ur.jalandhry) · AlQuran Cloud API v1"
            : "Saheeh International (en.sahih) · AlQuran Cloud API v1",
        results: [...enrichedTop, ...remainingFormatted],
      };

      setCached(cacheKey, payload);
      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search request failed.";
      res.status(502).json({
        error: "Unable to complete verified Quran search right now. Please try again.",
        details: message,
      });
    }
  });

  // 7. Published Classical Tafsir Retrieval Endpoint (No AI generation — strictly primary source)
  app.get("/api/tafsir/source/:surah/:ayah", async (req: Request, res: Response) => {
    try {
      const surah = Number(req.params.surah);
      const ayah = Number(req.params.ayah);
      const tafsirId = Number(req.query.tafsirId || 169);

      if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) {
        res.status(400).json({ error: "Invalid Surah or Ayah number." });
        return;
      }

      const [ayahData, tafsirData] = await Promise.all([
        fetchVerifiedAyahBundle(surah, ayah),
        fetchVerifiedTafsirSource(surah, ayah, tafsirId),
      ]);

      res.json({
        ayah: ayahData,
        tafsir: tafsirData,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch published Tafsir.";
      res.status(502).json({
        error:
          "Could not retrieve the verified Ayah or published Tafsir commentary from the provider. Please try again or choose another Tafsir edition.",
        details: message,
      });
    }
  });

  // 8. Source-Grounded AI Tafsir Study Assistant (Retrieves published Tafsir FIRST, then synthesizes)
  app.post("/api/tafsir/ai-explain", async (req: Request, res: Response) => {
    try {
      const surah = Number(req.body?.surah);
      const ayah = Number(req.body?.ayah);
      const tafsirId = Number(req.body?.tafsirId || 169);
      const userQuestion = String(req.body?.question || "").trim();
      const responseLanguage = ["en", "ur", "ar"].includes(req.body?.responseLanguage)
        ? (req.body.responseLanguage as "en" | "ur" | "ar")
        : "en";

      if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) {
        res.status(400).json({ error: "Valid Surah and Ayah numbers are required." });
        return;
      }

      // Mandatory Step 1: Retrieve identifiable published Tafsir & verified translations FIRST
      const [ayahData, primaryTafsir] = await Promise.all([
        fetchVerifiedAyahBundle(surah, ayah),
        fetchVerifiedTafsirSource(surah, ayah, tafsirId),
      ]);

      // Also fetch a secondary English classical Tafsir (Ma'arif al-Qur'an or Ibn Kathir) for richer grounding if available
      const secondaryTafsirId = primaryTafsir.id === 169 ? 168 : 169;
      let secondaryTafsir: Awaited<ReturnType<typeof fetchVerifiedTafsirSource>> | null = null;
      try {
        secondaryTafsir = await fetchVerifiedTafsirSource(surah, ayah, secondaryTafsirId);
      } catch {
        secondaryTafsir = null;
      }

      if (!primaryTafsir.plainText || primaryTafsir.plainText.length < 20) {
        res.status(422).json({
          error:
            "The selected published Tafsir edition returned an empty passage for this Ayah. AI synthesis is disabled when a primary Tafsir text cannot be verified.",
        });
        return;
      }

      const ai = getGeminiClient();

      const languageLabel =
        responseLanguage === "ur" ? "Urdu (اردو)" : responseLanguage === "ar" ? "Arabic (العربية)" : "English";

      const systemInstruction = `You are a respectful, scholarly Islamic Tafsir study assistant inside "Noor Al-Quran".
You MUST adhere to these strict sacred-text and scholarly integrity rules without exception:
1. NEVER generate, reconstruct, rewrite, paraphrase as scripture, or translate Quranic Ayat on your own. The verbatim Uthmani Arabic and published translations are already displayed separately to the user. Refer to verses by Surah:Ayah number (e.g., Q. ${surah}:${ayah}).
2. Base your entire explanation STRICTLY on the retrieved published Tafsir sources provided in the prompt (${primaryTafsir.name} by ${primaryTafsir.author}${secondaryTafsir ? `, and ${secondaryTafsir.name} by ${secondaryTafsir.author}` : ""}).
3. NEVER invent citations, Hadith numbers, narrator chains, or scholarly opinions that do not explicitly appear in the retrieved Tafsir text below.
4. NEVER issue religious rulings (fatawa), personal halal/haram legal verdicts, or sectarian polemics. If asked for a religious ruling or personal legal verdict, politely explain that this assistant only summarizes retrieved classical Tafsir commentary and advise consulting a qualified Islamic scholar (Mufti/Alim).
5. Clearly distinguish your response as an AI-generated study summary of the retrieved classical Tafsir.
6. Write your explanation clearly in ${languageLabel}. Keep the response thorough yet concise and accessible to a beginner student.`;

      const promptContext = `TARGET VERSE: Surah ${(ayahData.surah as { englishName: string }).englishName} (${surah}:${ayah})
VERIFIED PUBLISHED ENGLISH TRANSLATION (${(ayahData.sources as { english: string }).english}):
"""
${ayahData.englishText}
"""

VERIFIED PUBLISHED URDU TRANSLATION (${(ayahData.sources as { urdu: string }).urdu}):
"""
${ayahData.urduText}
"""

RETRIEVED PUBLISHED TAFSIR SOURCE 1:
Title: ${primaryTafsir.name}
Author: ${primaryTafsir.author}
Provider: ${primaryTafsir.provider} (Slug: ${primaryTafsir.slug}, Covers Ayat: ${primaryTafsir.coveredVerses.join(", ")})
Verbatim Extracted Text:
"""
${primaryTafsir.plainText.slice(0, 14000)}
"""
${
  secondaryTafsir && secondaryTafsir.plainText
    ? `
RETRIEVED PUBLISHED TAFSIR SOURCE 2 (Cross-Reference):
Title: ${secondaryTafsir.name}
Author: ${secondaryTafsir.author}
Provider: ${secondaryTafsir.provider} (Slug: ${secondaryTafsir.slug}, Covers Ayat: ${secondaryTafsir.coveredVerses.join(", ")})
Verbatim Extracted Text:
"""
${secondaryTafsir.plainText.slice(0, 8000)}
"""`
    : ""
}

USER STUDY QUESTION:
${userQuestion ? `"${userQuestion}"` : "Provide a structured beginner-friendly study synthesis of what the retrieved Tafsir explains about this Ayah."}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: promptContext,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: {
                type: Type.STRING,
                description: "Clear summary of the commentary's main explanation of this Ayah, strictly grounded in the retrieved Tafsir.",
              },
              keyThemes: {
                type: Type.ARRAY,
                description: "2 to 4 key lessons or points explicitly discussed in the retrieved Tafsir.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    sourceReference: {
                      type: Type.STRING,
                      description: "Exact name and author of the retrieved Tafsir source where this point appears.",
                    },
                  },
                  required: ["title", "explanation", "sourceReference"],
                },
              },
              historicalOrLinguisticNotes: {
                type: Type.STRING,
                description: "Context of revelation (Sabab al-Nuzul) or linguistic insight ONLY if explicitly stated in the retrieved Tafsir; otherwise state honestly that none is mentioned in this retrieved passage.",
              },
              questionAnswer: {
                type: Type.STRING,
                description: "Direct answer to the user's question based strictly on the retrieved Tafsir, or an honest note if the retrieved Tafsir does not address it.",
              },
              scholarlyDisclaimer: {
                type: Type.STRING,
                description: "Brief reminder in the target language that this is an AI study synthesis of published Tafsir, not a primary religious text or fatwa.",
              },
            },
            required: [
              "overview",
              "keyThemes",
              "historicalOrLinguisticNotes",
              "questionAnswer",
              "scholarlyDisclaimer",
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error("Empty response from Gemini model.");
      }

      const parsed = JSON.parse(rawText);

      res.json({
        surah,
        ayah,
        responseLanguage,
        retrievedSources: [
          {
            id: primaryTafsir.id,
            name: primaryTafsir.name,
            author: primaryTafsir.author,
            slug: primaryTafsir.slug,
            coveredVerses: primaryTafsir.coveredVerses,
            provider: primaryTafsir.provider,
          },
          ...(secondaryTafsir
            ? [
                {
                  id: secondaryTafsir.id,
                  name: secondaryTafsir.name,
                  author: secondaryTafsir.author,
                  slug: secondaryTafsir.slug,
                  coveredVerses: secondaryTafsir.coveredVerses,
                  provider: secondaryTafsir.provider,
                },
              ]
            : []),
        ],
        synthesis: parsed,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      if (errMsg === "GEMINI_API_KEY_NOT_CONFIGURED") {
        res.status(503).json({
          code: "GEMINI_KEY_MISSING",
          error:
            "AI study synthesis requires a configured GEMINI_API_KEY in Settings > Secrets. The verbatim published Tafsir on this screen remains fully available without any key.",
        });
        return;
      }

      if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID")) {
        res.status(403).json({
          code: "GEMINI_AUTH_ERROR",
          error:
            "Gemini API key verification failed. Please check your GEMINI_API_KEY in the Settings > Secrets panel.",
        });
        return;
      }

      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({
          code: "GEMINI_RATE_LIMIT",
          error:
            "Gemini API quota limit reached. Please wait a moment and retry, or select a billing-enabled API key in Settings > Secrets.",
        });
        return;
      }

      res.status(500).json({
        error: "Unable to generate the source-grounded Tafsir study summary right now. Please retry.",
        details: errMsg,
      });
    }
  });

  // Mount Vite dev middleware in development or serve built SPA in production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Noor Al-Quran server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Noor Al-Quran server:", err);
  process.exit(1);
});
