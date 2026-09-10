/**
 * PreScan Multilingual Profanity Lexicon
 * Structured vocabulary covering Indian and global languages across native scripts
 * and Romanized/Hinglish transliterations with contextual severity classifications.
 */

export interface LexiconEntry {
  id: string;
  canonical: string;
  language: string;
  languageCode: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'VULGAR_SEXUAL' | 'DEROGATORY_INSULT' | 'ABUSIVE_THREAT' | 'MILD_SLANG';
  regex: RegExp;
  contextNotes: string;
  falsePositiveGuards?: string[];
}

export class MultilingualLexicon {
  private static entries: LexiconEntry[] = [];

  static {
    this.initLexicon();
  }

  private static addEntry(
    id: string,
    canonical: string,
    language: string,
    languageCode: string,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    category: 'VULGAR_SEXUAL' | 'DEROGATORY_INSULT' | 'ABUSIVE_THREAT' | 'MILD_SLANG',
    pattern: string,
    contextNotes: string,
    falsePositiveGuards?: string[]
  ) {
    this.entries.push({
      id,
      canonical,
      language,
      languageCode,
      severity,
      category,
      regex: new RegExp(`(?:^|[^a-zA-Z0-9\u0900-\u0DFF])(?:${pattern})(?:$|[^a-zA-Z0-9\u0900-\u0DFF])`, 'i'),
      contextNotes,
      falsePositiveGuards,
    });
  }

  private static initLexicon() {
    // ==========================================
    // 1. HINDI & HINGLISH (Romanized + Devanagari)
    // ==========================================
    this.addEntry(
      'hi_mc',
      'madarchod',
      'Hindi',
      'hi',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'madar[\\s_\\-]*ch[o0]+d|mader[\\s_\\-]*ch[o0]+d|mother[\\s_\\-]*ch[o0]+d|मादर[\\s_\\-]*चोद|मादरचोद|\\bmc\\b',
      'Extreme abusive vulgarity targeting mother'
    );

    this.addEntry(
      'hi_bc',
      'bhenchod',
      'Hindi',
      'hi',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'b[eh]+en[\\s_\\-]*ch[o0]+d|behan[\\s_\\-]*ch[o0]+d|bhen[\\s_\\-]*ch[o0]+d|बहन[\\s_\\-]*चोद|बहनचोद|\\bbc\\b|\\bbkl\\b',
      'Extreme abusive vulgarity targeting sister'
    );

    this.addEntry(
      'hi_bsdk',
      'bhosdike',
      'Hindi',
      'hi',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'bh[o0]+s[a-z]*d[i1]+k[ea]+|bh[o0]+s[a-z]*d[i1]+w[a-z]+|भोसड़ीके|भोसडीके|\\bbsdk\\b',
      'Severely vulgar sexual insult'
    );

    this.addEntry(
      'hi_chutiya',
      'chutiya',
      'Hindi',
      'hi',
      'HIGH',
      'DEROGATORY_INSULT',
      'ch[u0]+t[i1]+y[a]+|ch[o0]+t[i1]+y[a]+|चूतिया|चुतिया|चूत्ये',
      'Vulgar derogatory insult'
    );

    this.addEntry(
      'hi_randi',
      'randi',
      'Hindi',
      'hi',
      'CRITICAL',
      'DEROGATORY_INSULT',
      'r[a]+nd[i1]+|r[a]+ndw[ea]+|रंडी|रांड',
      'Severely misogynistic slur'
    );

    this.addEntry(
      'hi_gaand',
      'gaand',
      'Hindi',
      'hi',
      'HIGH',
      'VULGAR_SEXUAL',
      'g[a]+nd[u0]+|g[a]+nd[i1]+|g[a]+nd|गांड|गांडू|गांडवे',
      'Vulgar anatomical profanity'
    );

    this.addEntry(
      'hi_lauda',
      'lauda',
      'Hindi',
      'hi',
      'HIGH',
      'VULGAR_SEXUAL',
      'l[ao0]wd?[a]+|l[ao0]wd?[e]+|l[o0]d[u0]+|लौड़ा|लौडे|लोडू',
      'Vulgar anatomical profanity'
    );

    this.addEntry(
      'hi_lund',
      'lund',
      'Hindi',
      'hi',
      'HIGH',
      'VULGAR_SEXUAL',
      'l[u0]+nd[a-z]*|लंड|लण्ड',
      'Vulgar anatomical profanity'
    );

    this.addEntry(
      'hi_chut',
      'chut',
      'Hindi',
      'hi',
      'HIGH',
      'VULGAR_SEXUAL',
      'ch[u0]+t|चूत',
      'Vulgar anatomical profanity',
      ['chutney']
    );

    this.addEntry(
      'hi_bhadwa',
      'bhadwa',
      'Hindi',
      'hi',
      'HIGH',
      'DEROGATORY_INSULT',
      'bh[a]+dw?[a-z]+|भड़वा|भड़वे',
      'Derogatory slur'
    );

    this.addEntry(
      'hi_harami',
      'harami',
      'Hindi',
      'hi',
      'MEDIUM',
      'DEROGATORY_INSULT',
      'h[a]+r[a]+m[i1]+|हरामी',
      'Mild-to-medium insult/derogatory term'
    );

    this.addEntry(
      'hi_kameena',
      'kameena',
      'Hindi',
      'hi',
      'MEDIUM',
      'DEROGATORY_INSULT',
      'k[a]+m[i1]+n[a-z]+|कमीना|कमीने',
      'Derogatory insult'
    );

    this.addEntry(
      'hi_saala',
      'saala',
      'Hindi',
      'hi',
      'LOW',
      'MILD_SLANG',
      's[a]+l[ea]+|साला|साले',
      'Mild colloquial slang / insult',
      ['saath', 'saal']
    );

    this.addEntry(
      'hi_kutte',
      'kutte',
      'Hindi',
      'hi',
      'LOW',
      'DEROGATORY_INSULT',
      'k[u0]+tt[ea]+|k[u0]+tt[i1]+y[a]+|कुत्ते|कुतिया',
      'Insulting animal epithet'
    );

    this.addEntry(
      'hi_teri_maa',
      'teri maa ki',
      'Hindi',
      'hi',
      'HIGH',
      'VULGAR_SEXUAL',
      'ter[i1][\\s_\\-]+m[a]+[\\s_\\-]+k[i1]|m[a]+[\\s_\\-]+k[i1][\\s_\\-]+ch[u0]+t|तेरी[\\s_\\-]+माँ[\\s_\\-]+की',
      'Abusive family-targeted profanity'
    );

    // ==========================================
    // 2. PUNJABI (Romanized + Gurmukhi)
    // ==========================================
    this.addEntry(
      'pa_kanjar',
      'kanjar',
      'Punjabi',
      'pa',
      'HIGH',
      'DEROGATORY_INSULT',
      'k[a]+nj[a]+r|ਕੰਜਰ',
      'Derogatory insult'
    );

    this.addEntry(
      'pa_gashti',
      'gashti',
      'Punjabi',
      'pa',
      'CRITICAL',
      'DEROGATORY_INSULT',
      'g[a]+sht[i1]+|ਗਸ਼ਤੀ',
      'Misogynistic slur'
    );

    this.addEntry(
      'pa_fittemuh',
      'fitte muh',
      'Punjabi',
      'pa',
      'LOW',
      'MILD_SLANG',
      'f[i1]+tt[e]+[\\s_\\-]+m[u0]+h|ਫਿੱਟੇ[\\s_\\-]+ਮੂੰਹ',
      'Mild colloquial curse'
    );

    // ==========================================
    // 3. BENGALI (Romanized + Bengali script)
    // ==========================================
    this.addEntry(
      'bn_khanki',
      'khanki',
      'Bengali',
      'bn',
      'CRITICAL',
      'DEROGATORY_INSULT',
      'kh[a]+nk[i1]+|খানকি',
      'Misogynistic slur'
    );

    this.addEntry(
      'bn_bokachoda',
      'bokachoda',
      'Bengali',
      'bn',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'b[o0]+k[a]+ch[o0]+d[a]+|বোকাচোদা',
      'Vulgar sexual insult'
    );

    this.addEntry(
      'bn_bal',
      'bal',
      'Bengali',
      'bn',
      'HIGH',
      'VULGAR_SEXUAL',
      '\\bbal\\b|বাল',
      'Vulgar anatomical profanity'
    );

    this.addEntry(
      'bn_shala',
      'shala',
      'Bengali',
      'bn',
      'LOW',
      'MILD_SLANG',
      'sh[a]+l[a]+|শালা',
      'Mild colloquial insult'
    );

    // ==========================================
    // 4. TAMIL (Romanized + Tamil script)
    // ==========================================
    this.addEntry(
      'ta_thevidiya',
      'thevidiya',
      'Tamil',
      'ta',
      'CRITICAL',
      'DEROGATORY_INSULT',
      'th[e]+v[i1]+d[i1]+y[a]+|தேவிடியா|தேவடியா',
      'Severely derogatory slur'
    );

    this.addEntry(
      'ta_otha',
      'otha',
      'Tamil',
      'ta',
      'CRITICAL',
      'VULGAR_SEXUAL',
      '\\bo[t]+h[a]+|ஒத்தா|ஓத்தா',
      'Vulgar sexual swear word'
    );

    this.addEntry(
      'ta_punda',
      'punda',
      'Tamil',
      'ta',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'p[u0]+nd[a]+|புண்டா',
      'Vulgar anatomical profanity'
    );

    this.addEntry(
      'ta_mayiru',
      'mayiru',
      'Tamil',
      'ta',
      'HIGH',
      'VULGAR_SEXUAL',
      'm[a]+y[i1]+r[u0]+|மயிரு',
      'Vulgar profanity'
    );

    this.addEntry(
      'ta_kena',
      'kena',
      'Tamil',
      'ta',
      'MEDIUM',
      'DEROGATORY_INSULT',
      'k[e]+n[a]+[\\s_\\-]+p[u0]+nd[a]+|k[e]+n[a]+|கெனா',
      'Derogatory insult'
    );

    // ==========================================
    // 5. TELUGU (Romanized + Telugu script)
    // ==========================================
    this.addEntry(
      'te_lanja',
      'lanja',
      'Telugu',
      'te',
      'CRITICAL',
      'DEROGATORY_INSULT',
      'l[a]+nj[a]+|లంజ|లంజకొడక',
      'Severely misogynistic slur'
    );

    this.addEntry(
      'te_dengu',
      'dengu',
      'Telugu',
      'te',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'd[e]+ng[u0]+|దెంగు|దెంగ',
      'Vulgar sexual swear word'
    );

    this.addEntry(
      'te_modda',
      'modda',
      'Telugu',
      'te',
      'HIGH',
      'VULGAR_SEXUAL',
      'm[o0]+dd[a]+|మొడ్డ',
      'Vulgar anatomical profanity'
    );

    this.addEntry(
      'te_puku',
      'puku',
      'Telugu',
      'te',
      'HIGH',
      'VULGAR_SEXUAL',
      'p[u0]+k[u0]+|పుకు',
      'Vulgar anatomical profanity'
    );

    this.addEntry(
      'te_gudha',
      'gudha',
      'Telugu',
      'te',
      'HIGH',
      'VULGAR_SEXUAL',
      'g[u0]+dh?[a]+|గుద్ద',
      'Vulgar profanity'
    );

    // ==========================================
    // 6. MARATHI (Romanized + Devanagari)
    // ==========================================
    this.addEntry(
      'mr_jhava',
      'zhavadya',
      'Marathi',
      'mr',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'zh[a]+v[a-z]+|jh[a]+v[a-z]+|झवाड्या',
      'Vulgar sexual profanity'
    );

    this.addEntry(
      'mr_aai_zhavli',
      'aai zhavli',
      'Marathi',
      'mr',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'aai[\\s_\\-]+zh[a]+vl[i1]+|आई[\\s_\\-]+झावली',
      'Severely abusive vulgarity'
    );

    // ==========================================
    // 7. GUJARATI (Romanized + Gujarati script)
    // ==========================================
    this.addEntry(
      'gu_bhennaloda',
      'bhen na loda',
      'Gujarati',
      'gu',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'bh[e]+n[\\s_\\-]+n[a]+[\\s_\\-]+l[o0]+d[a]+|ભેન[\\s_\\-]+ના[\\s_\\-]+લોડા',
      'Vulgar abusive profanity'
    );

    // ==========================================
    // 8. MALAYALAM (Romanized + Malayalam script)
    // ==========================================
    this.addEntry(
      'ml_myre',
      'myre',
      'Malayalam',
      'ml',
      'HIGH',
      'VULGAR_SEXUAL',
      'm[y]+r[e]+|മൈര്',
      'Vulgar profanity'
    );

    this.addEntry(
      'ml_thayoli',
      'thayoli',
      'Malayalam',
      'ml',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'th[a]+y[o0]+l[i1]+|തായോളി',
      'Severely abusive vulgarity'
    );

    // ==========================================
    // 9. KANNADA (Romanized + Kannada script)
    // ==========================================
    this.addEntry(
      'kn_soole',
      'soole',
      'Kannada',
      'kn',
      'CRITICAL',
      'DEROGATORY_INSULT',
      's[o0]+l[e]+|ಸೂಳೆ',
      'Misogynistic slur'
    );

    this.addEntry(
      'kn_thika',
      'thika',
      'Kannada',
      'kn',
      'HIGH',
      'VULGAR_SEXUAL',
      'th[i1]+k[a]+|ತಿಕ',
      'Vulgar profanity'
    );

    // ==========================================
    // 10. ENGLISH & GLOBAL PROFANITY
    // ==========================================
    this.addEntry(
      'en_fuck',
      'fuck',
      'English',
      'en',
      'HIGH',
      'VULGAR_SEXUAL',
      'f[u\\*#x0]+ck(?:ing|ed|er|ers|s)?|mother[\\s_\\-]*f[u\\*#x0]+ck(?:ing|er|ers)?|\\baf\\b',
      'Strong profanity affecting YouTube advertiser suitability'
    );

    this.addEntry(
      'en_shit',
      'shit',
      'English',
      'en',
      'MEDIUM',
      'VULGAR_SEXUAL',
      'sh[i\\*!1]+t(?:ty|s|ting)?|bull[\\s_\\-]*sh[i\\*!1]+t|dip[\\s_\\-]*sh[i\\*!1]+t',
      'Profanity affecting advertiser suitability'
    );

    this.addEntry(
      'en_bitch',
      'bitch',
      'English',
      'en',
      'HIGH',
      'DEROGATORY_INSULT',
      'b[i\\*!1]+tch(?:es|ing)?|son[\\s_\\-]+of[\\s_\\-]+a[\\s_\\-]+b[i\\*!1]+tch',
      'Derogatory misogynistic insult'
    );

    this.addEntry(
      'en_cunt',
      'cunt',
      'English',
      'en',
      'CRITICAL',
      'VULGAR_SEXUAL',
      'c[u\\*#0]+nt(?:s)?',
      'Extremely vulgar anatomical insult'
    );

    this.addEntry(
      'en_asshole',
      'asshole',
      'English',
      'en',
      'HIGH',
      'DEROGATORY_INSULT',
      'ass[\\s_\\-]*h[o0]+le(?:s)?|a[\\$s]{2}[\\s_\\-]*h[o0]+le',
      'Derogatory vulgar insult'
    );

    this.addEntry(
      'en_dick',
      'dick',
      'English',
      'en',
      'MEDIUM',
      'VULGAR_SEXUAL',
      '\\bd[i\\*!1]+ck(?:head|s)?\\b',
      'Vulgar anatomical profanity',
      ['dickens', 'dickinson']
    );

    this.addEntry(
      'en_pussy',
      'pussy',
      'English',
      'en',
      'HIGH',
      'VULGAR_SEXUAL',
      'p[u\\*0]+ss[y|i]+(?:es)?',
      'Vulgar anatomical profanity'
    );

    this.addEntry(
      'en_bastard',
      'bastard',
      'English',
      'en',
      'MEDIUM',
      'DEROGATORY_INSULT',
      'b[a]+st[a]+rd(?:s)?',
      'Derogatory insult'
    );

    this.addEntry(
      'en_whore_slut',
      'whore/slut',
      'English',
      'en',
      'HIGH',
      'DEROGATORY_INSULT',
      'wh[o0]+re(?:s)?|sl[u\\*0]+t(?:s)?',
      'Derogatory misogynistic slurs'
    );

    this.addEntry(
      'en_hate_slur',
      'hate slur',
      'English',
      'en',
      'CRITICAL',
      'DEROGATORY_INSULT',
      'n[i1]+gg[e3a]+r(?:s)?|n[i1]+gg[a]+(?:s)?|f[a]+gg[o0]+t(?:s)?|r[e]+t[a]+rd(?:ed|s)?',
      'Severe hate speech and discriminatory slurs'
    );

    this.addEntry(
      'en_damn_crap',
      'damn/crap',
      'English',
      'en',
      'LOW',
      'MILD_SLANG',
      '\\bd[a]+mn(?:ed)?\\b|\\bcr[a]+p\\b',
      'Mild colloquial expletives'
    );
  }

  public static getEntries(): LexiconEntry[] {
    return this.entries;
  }
}
