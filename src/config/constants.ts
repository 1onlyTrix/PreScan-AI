import { Plan, PlanTier } from '../types';

export const APP_INFO = {
  name: 'PreScan',
  tagline: 'Know what to review before you publish.',
  description: 'AI-powered pre-upload quality assurance for YouTube creators.',
  phase: 'Production Marketing & App Shell (Phase 02)',
  copyright: '© 2026 PreScan',
};

export interface CapabilityInfo {
  id: string;
  name: string;
  shortDescription: string;
  details: string;
  coverageList: string[];
}

export const CAPABILITIES: CapabilityInfo[] = [
  {
    id: 'community-guidelines',
    name: 'Community Guidelines',
    shortDescription: 'Surface content that may deserve a policy review.',
    details: 'Pre-screens spoken dialogue and audio cues against YouTube Community Guidelines, including harassment, hate speech, dangerous acts, harmful misinformation, and child safety.',
    coverageList: [
      'Violence & dangerous acts indicators',
      'Harassment & hate speech flags',
      'Harmful misinformation signals',
      'Child safety & age-restricted themes',
      'Spam, scams & deceptive practices',
    ],
  },
  {
    id: 'advertiser-suitability',
    name: 'Advertiser Suitability',
    shortDescription: 'Identify content that may affect ad suitability.',
    details: 'Evaluates spoken dialogue, profanity frequency, adult themes, sensitive topics, and substance references against advertiser-friendly content guidelines.',
    coverageList: [
      'Opening 30-second profanity check',
      'Repeated strong profanity frequency',
      'Sensitive topics & controversy flags',
      'Adult themes & suggestive context',
      'Drug & substance references',
    ],
  },
  {
    id: 'copyright-signals',
    name: 'Copyright References',
    shortDescription: 'Catch verbal references to third-party copyrighted material.',
    details: 'Identifies spoken and verbal references to third-party copyrighted media, song lyrics, and intellectual property requiring creator clearance.',
    coverageList: [
      'Spoken song title & lyric references',
      'Commercial media & movie quote cues',
      'Third-party brand & audio mentions',
      'Clearance reminder timestamps',
    ],
  },
  {
    id: 'metadata-integrity',
    name: 'Metadata',
    shortDescription: 'Check whether your title and description accurately represent your content.',
    details: 'Checks whether your title, description, and tags accurately represent your content without overstating claims or introducing misleading signals.',
    coverageList: [
      'Title-to-audio content alignment',
      'Description context & link safety',
      'Tag relevance & keyword stuffing signals',
      'Sponsor disclosure & disclaimer checks',
    ],
  },
];

export const FOUNDATION_PLANS: Plan[] = [
  {
    id: 'plan_free',
    tier: PlanTier.FREE,
    name: 'Free',
    description: 'For testing PreScan and pre-screening short creator videos.',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    monthlyScanLimit: 5,
    maxVideoDurationMinutes: 10,
    maxTeamMembers: 3,
    features: [
      '5 video pre-scans per month',
      'Up to 10-minute video duration',
      'Community Guidelines review',
      'Advertiser Suitability review',
      'Verbal Copyright signal checks',
      'Metadata & Title alignment',
      'Up to 3 team members',
      'Standard processing queue',
    ],
  },
  {
    id: 'plan_pro',
    tier: PlanTier.PRO,
    name: 'Pro',
    description: 'For active creators, podcasters, and growing YouTube channels.',
    monthlyPriceCents: 1900,
    annualPriceCents: 19000,
    monthlyScanLimit: 100,
    maxVideoDurationMinutes: 60,
    maxTeamMembers: 10,
    isPopular: true,
    features: [
      '100 video pre-scans per month',
      'Up to 60-minute video duration',
      'All 4 analysis categories',
      'Gemini Multimodal AI analysis',
      'Timestamped evidence & quotes',
      'Up to 10 workspace team seats',
      'Full scan history & report exports',
      'Fast-track priority queue',
    ],
  },
  {
    id: 'plan_business',
    tier: PlanTier.STUDIO,
    name: 'Business',
    description: 'For high-volume channels, production agencies, and media teams.',
    monthlyPriceCents: 4900,
    annualPriceCents: 49000,
    monthlyScanLimit: 500,
    maxVideoDurationMinutes: 180,
    maxTeamMembers: 25,
    features: [
      '500 video pre-scans per month',
      'Up to 180-minute (3 hours) video duration',
      'All 4 analysis categories',
      'Gemini Multimodal AI analysis',
      'Up to 25 workspace team seats',
      'Role-based access control (RBAC)',
      'Dedicated highest-priority queue',
      'Audit log data exports',
    ],
  },
];

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

export const MARKETING_FAQS: FaqItem[] = [
  {
    question: 'What does PreScan analyze?',
    answer: 'PreScan analyzes your video’s audio dialogue and metadata (title, description, and tags) across four categories: Community Guidelines, Advertiser Suitability, verbal Copyright References, and Metadata consistency. It surfaces timestamped findings for creator review.',
  },
  {
    question: 'Does PreScan guarantee monetization or approval?',
    answer: 'No. PreScan does not guarantee monetization, green ad icons, policy compliance, copyright clearance, or absence of violations. YouTube makes all final enforcement and monetization decisions independently. PreScan is a pre-publish review layer to help you identify what deserves human review before you upload.',
  },
  {
    question: 'Can I scan a YouTube video by sharing its link?',
    answer: 'PreScan is designed to support YouTube video URLs as a scan source. Actual URL retrieval and analysis will depend on the implemented YouTube workflow and available access. PreScan does not bypass YouTube access controls.',
  },
  {
    question: 'Does PreScan detect copyright infringement?',
    answer: 'PreScan can identify spoken and verbal references to third-party copyrighted material (such as song titles, artist mentions, or broadcast media cues) in audio dialogue. However, PreScan does not perform Content ID audio matching or determine legal infringement. Rights determination always requires human review.',
  },
  {
    question: 'Does PreScan analyze video visuals?',
    answer: 'In the current version, PreScan focuses specifically on audio dialogue and metadata. Visual video content is not analyzed.',
  },
  {
    question: 'Can PreScan replace YouTube’s official policies?',
    answer: 'No. YouTube’s policies and guidelines are governed solely by YouTube and Google. PreScan provides an independent pre-screening heuristic based on public guidelines, but it is not affiliated with or endorsed by YouTube.',
  },
  {
    question: 'Who is PreScan designed for?',
    answer: 'PreScan is built for solo creators, video editors, talent agencies, and multi-member content teams who want a consistent, repeatable quality-assurance step in their post-production workflow.',
  },
  {
    question: 'How long does a pre-scan take?',
    answer: 'Audio extraction and model evaluation typically complete in a fraction of the media’s playback duration, delivering a structured report with approximate timestamps in 1 to 3 minutes for standard video lengths.',
  },
  {
    question: 'What happens to my uploaded media files?',
    answer: 'PreScan is designed with tenant isolation and strict privacy principles. Audio segments processed for transcription and heuristic evaluation are transiently handled and not used to train public models.',
  },
];

export const USE_CASES = [
  {
    title: 'Gaming',
    badge: 'Context Aware',
    description: 'Context matters in fast-paced gaming content. Excitement, high energy, and casual competitive banter are not automatically treated as high-risk policy violations.',
  },
  {
    title: 'Commentary & Essay',
    badge: 'Deep Analysis',
    description: 'Catch subtle tonal shifts, third-party media citations, and sensitive policy topics before publishing detailed critical essays or news commentaries.',
  },
  {
    title: 'Education & Documentaries',
    badge: 'Nuanced Review',
    description: 'Sensitive historical or scientific topics can be discussed in an educational context without automatically being flagged as unsafe.',
  },
  {
    title: 'News & Current Affairs',
    badge: 'Fact & Policy Balance',
    description: 'Review potentially sensitive geopolitical or public health discussions against advertiser-suitability criteria before going live.',
  },
  {
    title: 'Entertainment & Comedy',
    badge: 'Profanity & Tone Check',
    description: 'Pinpoint opening 30-second profanity frequency and adult-themed punchlines that could trigger yellow-icon ad restrictions.',
  },
  {
    title: 'Vlogs & Daily Content',
    badge: 'Rapid Turnaround',
    description: 'Run quick, automated checks on casual unscripted conversations to avoid accidental sponsor disclosure misses or brand mentions.',
  },
];

