export interface TajweedRuleInfo {
  code: string;
  key: string;
  nameEn: string;
  nameUr: string;
  nameAr: string;
  category: string;
  colorClass: string;
  badgeSwatchClass: string;
  descriptionEn: string;
  descriptionUr: string;
  howToPronounce: string;
  exampleRef: string;
}

export const TAJWEED_RULES: Record<string, TajweedRuleInfo> = {
  g: {
    code: "g",
    key: "ghunnah",
    nameEn: "Ghunnah (Nasalization)",
    nameUr: "غنہ (ناک میں آواز لے جانا)",
    nameAr: "غُنَّة",
    category: "Nasalization · 2 Counts",
    colorClass: "text-emerald-700 dark:text-emerald-400 underline decoration-emerald-500/50 decoration-2 underline-offset-8",
    badgeSwatchClass: "bg-emerald-600",
    descriptionEn:
      "A resonant nasal sound held for 2 vowel counts (harakat) on Noon Mushaddadah (نّ) or Meem Mushaddadah (مّ).",
    descriptionUr:
      "نون مشدد (نّ) اور میم مشدد (مّ) پر آواز کو ناک کے بانسے میں دو حرکت کے برابر ٹھہرا کر ادا کرنا۔",
    howToPronounce: "Hold the humming sound gently in the nasal passage (Khayshoom) for two steady beats.",
    exampleRef: "114:1",
  },
  q: {
    code: "q",
    key: "qalqalah",
    nameEn: "Qalqalah (Echoing Bounce)",
    nameUr: "قلقلہ (آواز کا لوٹنا)",
    nameAr: "قَلْقَلَة",
    category: "Articulation · 5 Letters (قطب جد)",
    colorClass: "text-sky-700 dark:text-sky-400 underline decoration-sky-500/50 decoration-2 underline-offset-8",
    badgeSwatchClass: "bg-sky-600",
    descriptionEn:
      "A slight echoing vibration when pronouncing one of the five letters ق ط ب ج د (Qutb Jad) when carrying a sukoon or when stopping at the end of an Ayah.",
    descriptionUr:
      "حروفِ قلقلہ (ق، ط، ب، ج، د) ساکن ہوں یا وقف کی صورت میں ساکن ہو جائیں تو مخرج میں جنبش دے کر آواز لوٹائی جاتی ہے۔",
    howToPronounce: "Release the articulation point crisply without adding an extra vowel (fathah/kasrah/dammah).",
    exampleRef: "112:1",
  },
  a: {
    code: "a",
    key: "idgham_ghunnah",
    nameEn: "Idgham with Ghunnah",
    nameUr: "ادغام مع الغنہ",
    nameAr: "إدغام بغنة",
    category: "Noon Sakinah & Tanween",
    colorClass: "text-teal-700 dark:text-teal-300 underline decoration-teal-500/50 decoration-2 underline-offset-8",
    badgeSwatchClass: "bg-teal-600",
    descriptionEn:
      "Merging a vowelless Noon (نْ) or Tanween into a following ي ن م و (Yanmu) letter accompanied by a 2-count nasalization.",
    descriptionUr:
      "نون ساکن یا تنوین کے بعد حروفِ ’ینمو‘ (ی، ن، م، و) میں سے کوئی حرف آئے تو غنہ کے ساتھ ملا کر پڑھنا۔",
    howToPronounce: "Blend smoothly into the next letter while sustaining a soft 2-beat nasal hum.",
    exampleRef: "2:255",
  },
  u: {
    code: "u",
    key: "idgham_no_ghunnah",
    nameEn: "Idgham without Ghunnah",
    nameUr: "ادغام بلا غنہ",
    nameAr: "إدغام بغير غنة",
    category: "Noon Sakinah & Tanween",
    colorClass: "text-indigo-700 dark:text-indigo-300 underline decoration-indigo-500/50 decoration-2 underline-offset-8",
    badgeSwatchClass: "bg-indigo-600",
    descriptionEn:
      "Complete merging of Noon Sakinah (نْ) or Tanween into Lam (ل) or Ra (ر) cleanly without nasalization.",
    descriptionUr:
      "نون ساکن یا تنوین کے بعد لام (ل) یا را (ر) آئے تو بغیر غنہ کے مکمل ادغام کرنا۔",
    howToPronounce: "Step directly from the preceding vowel into the Lam or Ra with zero nasal hold.",
    exampleRef: "112:4",
  },
  f: {
    code: "f",
    key: "ikhfa",
    nameEn: "Ikhfa' (Concealment)",
    nameUr: "اخفاء حقیقی",
    nameAr: "إخفاء",
    category: "Noon Sakinah & Tanween",
    colorClass: "text-amber-700 dark:text-amber-400 underline decoration-amber-500/50 decoration-2 underline-offset-8",
    badgeSwatchClass: "bg-amber-600",
    descriptionEn:
      "Partially concealing Noon Sakinah or Tanween between clear pronunciation (Izhar) and merging (Idgham) for 2 counts before 15 specific letters.",
    descriptionUr:
      "نون ساکن یا تنوین کو اظہار اور ادغام کی درمیانی کیفیت کے ساتھ دو حرکت تک غنہ کرتے ہوئے پڑھنا۔",
    howToPronounce: "Hover the tongue near (not touching) the next letter's articulation point while holding a 2-beat nasal sound.",
    exampleRef: "105:4",
  },
  i: {
    code: "i",
    key: "iqlab",
    nameEn: "Iqlab (Conversion to Meem)",
    nameUr: "اقلاب (میم سے بدلنا)",
    nameAr: "إقلاب",
    category: "Noon Sakinah & Tanween",
    colorClass: "text-purple-700 dark:text-purple-300 underline decoration-purple-500/50 decoration-2 underline-offset-8",
    badgeSwatchClass: "bg-purple-600",
    descriptionEn:
      "Converting Noon Sakinah or Tanween into a soft hidden Meem (م) with 2 counts of Ghunnah when followed by the letter Ba (ب).",
    descriptionUr:
      "نون ساکن یا تنوین کے بعد حرف ’ب‘ آئے تو نون کی آواز کو میم سے بدل کر غنہ کے ساتھ ادا کرنا۔",
    howToPronounce: "Bring the lips lightly together into a soft Meem with a 2-count nasal hum before pronouncing Ba.",
    exampleRef: "104:4",
  },
  o: {
    code: "o",
    key: "madd_obligatory",
    nameEn: "Madd Wajib / Lazim (4–6 Counts)",
    nameUr: "مدِ واجب / لازم (۴ تا ۶ حرکات)",
    nameAr: "مد واجب / لازم",
    category: "Elongation (Madd)",
    colorClass: "text-rose-700 dark:text-rose-400 underline decoration-rose-500/50 decoration-2 underline-offset-8",
    badgeSwatchClass: "bg-rose-600",
    descriptionEn:
      "Extended elongation of a long vowel for 4 to 5 counts (when followed by Hamzah) or 6 counts (when followed by Sukoon/Shaddah).",
    descriptionUr:
      "حرفِ مد کے بعد ہمزہ یا سکون آنے کی صورت میں آواز کو چار سے چھ حرکات تک کھینچ کر پڑھنا۔",
    howToPronounce: "Sustain the vowel smoothly and evenly for 4–5 beats without wavering pitch.",
    exampleRef: "1:7",
  },
  p: {
    code: "p",
    key: "madd_permissible",
    nameEn: "Madd Ja'iz / Arid (2, 4, or 6 Counts)",
    nameUr: "مدِ جائز / عارض",
    nameAr: "مد جائز",
    category: "Elongation (Madd)",
    colorClass: "text-orange-700 dark:text-orange-300 underline decoration-orange-500/50 decoration-2 underline-offset-8",
    badgeSwatchClass: "bg-orange-600",
    descriptionEn:
      "Permissible elongation held consistently for 2, 4, or 6 vowel counts—commonly occurring before a pause at the end of an Ayah.",
    descriptionUr:
      "وقفی سکون یا ہمزہ منفصلہ کی صورت میں دو، چار یا چھ حرکات تک کھینچ کر پڑھنے کی اجازت۔",
    howToPronounce: "Extend the vowel smoothly for 2, 4, or 6 counts when stopping on the verse ending.",
    exampleRef: "1:2",
  },
  n: {
    code: "n",
    key: "madd_normal",
    nameEn: "Madd Tabi'i (Natural 2 Counts)",
    nameUr: "مدِ طبیعی (دو حرکات)",
    nameAr: "مد طبيعي",
    category: "Elongation (Madd)",
    colorClass: "text-[#9A6F21] dark:text-[#E2B866]",
    badgeSwatchClass: "bg-[#B58D3D]",
    descriptionEn:
      "Natural two-count elongation on Alif, Waw, or Ya (including miniature dagger Alif ـٰ).",
    descriptionUr:
      "الف، واو، یا یائے مدہ اور کھڑی حرکات کو قدرتی طور پر دو حرکت کے برابر کھینچنا۔",
    howToPronounce: "Give the vowel exactly two balanced counts—neither clipped short nor overstretched.",
    exampleRef: "1:4",
  },
  h: {
    code: "h",
    key: "hamzat_wasl",
    nameEn: "Hamzat ul-Wasl & Silent Letters",
    nameUr: "ہمزۃ الوصل (ملانے والا ہمزہ)",
    nameAr: "همزة الوصل",
    category: "Connecting Script",
    colorClass: "text-stone-400 dark:text-stone-500",
    badgeSwatchClass: "bg-stone-500",
    descriptionEn:
      "Pronounced only when starting recitation on the word; elided (dropped silently) when reading continuously from the preceding word.",
    descriptionUr:
      "ابتداء میں پڑھا جاتا ہے لیکن پچھلے کلمے سے ملا کر پڑھتے وقت تلفظ میں ساقط ہو جاتا ہے۔",
    howToPronounce: "Connect the vowel of the previous word directly to the consonant after Hamzat ul-Wasl.",
    exampleRef: "1:2",
  },
};

// Map secondary AlQuran Cloud Tajweed codes onto our primary educational rules
const CODE_ALIAS: Record<string, string> = {
  m: "o", // Madd Lazim -> Madd 4-6
  c: "f", // Ikhfa Shafawi -> Ikhfa family
  w: "a", // Idgham Shafawi -> Idgham with Ghunnah family
  d: "u", // Idgham Mutajanisayn
  b: "u", // Idgham Mutaqaribayn
  l: "h", // Lam Shamsiyyah (assimilated/unpronounced Lam)
  s: "h", // Silent letter
};

export interface ParsedTajweedSegment {
  text: string;
  rule: TajweedRuleInfo | null;
}

/**
 * Parses verbatim AlQuran Cloud `quran-tajweed` notation (`[code:id[text]]` or `[code[text]]`)
 * without ever modifying or dropping any Arabic character or diacritic.
 */
export function parseTajweedMarkup(tajweedMarkup: string): ParsedTajweedSegment[] {
  if (!tajweedMarkup) return [];

  const segments: ParsedTajweedSegment[] = [];
  const regex = /\[([a-z])(?::\d+)?\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(tajweedMarkup)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: tajweedMarkup.slice(lastIndex, match.index),
        rule: null,
      });
    }

    const rawCode = match[1];
    const innerArabic = match[2];
    const mappedCode = CODE_ALIAS[rawCode] || rawCode;
    const rule = TAJWEED_RULES[mappedCode] || null;

    segments.push({
      text: innerArabic,
      rule,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < tajweedMarkup.length) {
    segments.push({
      text: tajweedMarkup.slice(lastIndex),
      rule: null,
    });
  }

  return segments;
}
