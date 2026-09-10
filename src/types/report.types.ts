export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DecisionStatus = 'LOW_RISK' | 'NEEDS_REVIEW' | 'HIGH_RISK' | 'POLICY_VIOLATION';
export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReviewStatus = 'OPEN' | 'REVIEWED' | 'NEEDS_EDIT' | 'NOT_APPLICABLE';

export interface FindingReviewRecord {
  id: string;
  scanId: string;
  findingId: string;
  organizationId: string;
  reviewStatus: ReviewStatus;
  creatorNote?: string;
  reviewedByUserId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreScanFinding {
  id: string;
  category: string;
  policy: string;
  policy_rule?: string;
  severity: FindingSeverity;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'CONFIRMED' | 'POTENTIAL';
  timestamp?: string;
  start_timestamp?: string;
  endTimestamp?: string;
  end_timestamp?: string;
  startSeconds?: number;
  endSeconds?: number;
  quote?: string;
  evidence_quote?: string;
  title?: string;
  detectedExpression?: string;
  canonical?: string;
  language?: string;
  languageCode?: string;
  visualContext?: string;
  reasoning: string;
  explanation?: string;
  reason?: string;
  recommendation: string;
  recommended_action?: string;
}

export interface PreScanCategoryAudit {
  risk_level: RiskLevel;
  score: number;
  findings_count: number;
  summary: string;
}

export interface PreScanOverallRisk {
  risk_level: RiskLevel;
  decision: DecisionStatus;
  safety_score: number;
  monetization_impact: 'FULLY_MONETIZABLE' | 'LIMITED_MONETIZATION' | 'NOT_MONETIZABLE' | 'DEMONETIZATION_RISK';
  summary: string;
}

export interface PreScanV1ReportData {
  preScanVersion: string;
  metadata: {
    scanId: string;
    title: string;
    category?: string;
    language?: string;
    sourceType?: string;
    analyzedAt: string;
    inferredGenre?: string;
    durationSeconds?: number;
  };
  videoInformation?: {
    videoId?: string;
    title?: string;
    description?: string;
    tags?: string[];
    tagsCount?: number;
    tagsUnavailable?: boolean;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    durationSeconds?: number;
    durationFormatted?: string;
    category?: string;
    thumbnailUrl?: string;
    defaultLanguage?: string;
    defaultAudioLanguage?: string;
    regionsAllowed?: string[];
  };
  languageDetails?: {
    primaryLanguage: string;
    languageCode: string;
    confidence: number;
    detectedLanguages: string[];
    isCodeSwitched?: boolean;
  };
  summaryStats?: {
    totalFindings: number;
    profanityCount: number;
    confirmedProfanityCount?: number;
    potentialProfanityCount?: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  overall: PreScanOverallRisk;
  overall_risk: PreScanOverallRisk;
  categories: {
    communityGuidelines: PreScanCategoryAudit;
    advertiserSuitability: PreScanCategoryAudit;
    copyrightSignals: PreScanCategoryAudit;
    metadataIntegrity: PreScanCategoryAudit;
    community_guidelines?: PreScanCategoryAudit;
    advertiser_suitability?: PreScanCategoryAudit;
    copyright_signals?: PreScanCategoryAudit;
    metadata_integrity?: PreScanCategoryAudit;
  };
  findings: PreScanFinding[];
  positiveObservations?: string[];
  creatorActionPlan?: string[];
  recommendedActions: string[];
  limitations?: string[];
  disclaimer: string;
}
