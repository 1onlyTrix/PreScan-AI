/**
 * PreScan Text Normalizer & Transliteration Cleaner
 * Prepares dialogue strings for precise multilingual profanity and slurs matching
 * while preventing false positives on benign words.
 */

export class TextNormalizer {
  // Common Cyrillic & Greek homoglyphs used to evade filters
  private static readonly HOMOGLYPH_MAP: Record<string, string> = {
    'а': 'a', 'а́': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
    'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l',
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'p', 'с': 'c', 'т': 't',
    'у': 'y', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'і': 'i', 'ј': 'j', 'Α': 'a', 'Β': 'b', 'Ε': 'e', 'Η': 'h', 'Ι': 'i',
    'Κ': 'k', 'Μ': 'm', 'Ν': 'n', 'Ο': 'o', 'Ρ': 'p', 'Τ': 't', 'Υ': 'y',
    'Χ': 'x', 'α': 'a', 'β': 'b', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ν': 'v',
    'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x',
  };

  /**
   * Normalizes leetspeak, homoglyphs, repeated letters, and obfuscations
   */
  public static normalize(text: string): string {
    if (!text || typeof text !== 'string') return '';

    // 1. Unicode NFKD normalization to separate base characters from accents
    let s = text.normalize('NFKD').toLowerCase();

    // 2. Replace homoglyphs
    s = s.replace(/[\u0400-\u04FF\u0370-\u03FF]/g, (ch) => this.HOMOGLYPH_MAP[ch] || ch);

    // 3. Remove zero-width spaces and non-printing format characters
    s = s.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

    // 4. De-obfuscate punctuation inside words (e.g., "f*ck" -> "fck", "f***ing" -> "fucking", "s.h.i.t" -> "shit")
    // Replace symbol insertions when surrounded by letters:
    s = s.replace(/([a-z0-9])[\*\#\_\.\-\+\/\\]+([a-z0-9])/gi, '$1$2');

    // 5. Replace standard leetspeak symbols with letters
    s = s.replace(/@/g, 'a')
         .replace(/\$/g, 's')
         .replace(/!/g, 'i')
         .replace(/0/g, 'o')
         .replace(/1/g, 'i')
         .replace(/3/g, 'e')
         .replace(/5/g, 's')
         .replace(/7/g, 't')
         .replace(/8/g, 'b');

    // 6. Collapse 3 or more repeated letters to 1 (e.g., "fuuuuck" -> "fuck", "chuuutttiiyaaa" -> "chutiya")
    s = s.replace(/([a-z])\1{2,}/gi, '$1');

    return s.trim();
  }

  /**
   * Tokenizes text into distinct words, preserving original boundaries
   */
  public static tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .split(/[\s,.;:!?()\[\]{}"'“”‘’`~<>|\/\\+=]+/)
      .filter((w) => w.length > 0);
  }

  /**
   * Tests whether a word is in a false-positive whitelist
   */
  public static isWhitelisted(candidate: string, fullSentence: string): boolean {
    const lowerSentence = fullSentence.toLowerCase();
    const lowerWord = candidate.toLowerCase();

    // Whitelist patterns for common benign words that contain profanity substrings
    const BENIGN_PATTERNS = [
      /\banalys(?:is|t|ts|ing|ed)?\b/,
      /\bclass(?:ic|ical|es|room|y)?\b/,
      /\bassist(?:ant|ance|ants|ed|ing)?\b/,
      /\basset(?:s)?\b/,
      /\bpass(?:word|port|ed|ing|es)?\b/,
      /\bcompass\b/,
      /\bglass(?:es)?\b/,
      /\bgrass\b/,
      /\bbrass\b/,
      /\bmass(?:ive|es)?\b/,
      /\bhello\b/,
      /\bshell\b/,
      /\bdocument(?:s|ed|ing)?\b/,
      /\bcucumber(?:s)?\b/,
      /\bcumulative\b/,
      /\bcumulus\b/,
      /\btitular\b/,
      /\btitle(?:s|d)?\b/,
      /\bentity\b/,
      /\bidentity\b/,
      /\bbutter(?:fly|ed)?\b/,
      /\bbutton(?:s)?\b/,
      /\bspicy\b/,
      /\bpicnic\b/,
      /\bchutney\b/,
      /\bbhoot\b/,
      /\bsaath\b/,
      /\bsaal\b/,
      /\bpeacock\b/,
      /\bcockpit\b/,
      /\bcocktail\b/,
      /\bdickens\b/,
      /\bdickinson\b/,
    ];

    return BENIGN_PATTERNS.some((p) => p.test(lowerWord) || p.test(lowerSentence));
  }
}
