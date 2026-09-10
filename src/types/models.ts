/**
 * Domain Models for PreScan Platform Foundation
 * All models enforce multi-tenant isolation and strict relational contracts.
 */

import {
  MembershipRole,
  RiskLevel,
  FindingCategory,
  ScanStatus,
  PlanTier,
  SubscriptionStatus,
  InvitationStatus,
  YouTubeConnectionStatus,
  NotificationType,
  AuditAction,
} from './enums';

/**
 * Global User Model
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  displayName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  defaultOrganizationId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Canonical Application User Profile Model
 */
export interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Multi-Tenant Organization / Workspace Model
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  ownerId?: string;
  createdById: string;
  status?: 'ACTIVE' | 'DEACTIVATED';
  role?: MembershipRole | string;
  memberCount?: number;
  owner?: Partial<User>;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type Workspace = Organization;

/**
 * User Membership in an Organization with Role-Based Access
 */
export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole | 'OWNER' | 'ADMIN' | 'MEMBER' | 'EDITOR' | 'VIEWER';
  status?: 'ACTIVE' | 'SUSPENDED';
  invitedBy?: string;
  user?: Partial<User>;
  isOwner?: boolean;
  joinedAt: string;
  createdAt?: string;
  updatedAt: string;
}

export type WorkspaceMember = Membership;

/**
 * Team Invitation Model
 */
export interface TeamInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRole | 'ADMIN' | 'MEMBER';
  token?: string;
  status: InvitationStatus | 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
  invitedById?: string;
  invitedBy?: Partial<User>;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface WorkspaceAuditLog {
  id: string;
  organizationId: string;
  actorUserId: string;
  action: string;
  targetResourceType?: string;
  targetResourceId?: string;
  metadataJson?: string;
  actor?: Partial<User>;
  createdAt: string;
}

/**
 * Project Workspace grouping video scans
 */
export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  defaultLanguage: string;
  color?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Scan Source Identification Types (Phase 02 Modification)
 */
export type ScanSourceType = 'file' | 'youtube_url' | 'youtube_connection';

export interface ScanSourceFile {
  type: 'file';
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface ScanSourceYoutubeUrl {
  type: 'youtube_url';
  url: string;
  videoId?: string;
}

export interface ScanSourceYoutubeConnection {
  type: 'youtube_connection';
  channelId?: string;
  videoId?: string;
}

export type ScanSource = ScanSourceFile | ScanSourceYoutubeUrl | ScanSourceYoutubeConnection;

/**
 * Video Resource representation (Metadata and Media container)
 */
export interface Video {
  id: string;
  organizationId: string;
  projectId?: string;
  title: string;
  description?: string;
  tags: string[];
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  storageKey?: string;
  youtubeVideoId?: string;
  sourceType?: ScanSourceType;
  source?: ScanSource;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Media Information metadata
 */
export interface MediaInfo {
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  channelTitle?: string;
  resolution?: string;
  storagePath?: string;
  format?: string;
  checksum?: string;
}

/**
 * Scan Configuration parameters
 */
export interface ScanConfig {
  checkCommunityGuidelines: boolean;
  checkAdvertiserSuitability: boolean;
  checkCopyrightSignals: boolean;
  checkMetadataIntegrity: boolean;
  targetCategory?: string;
  targetLanguage?: string;
  sensitivityLevel: 'STANDARD' | 'STRICT';
}

/**
 * Ingestion Log Event
 */
export interface IngestionLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

/**
 * Ingestion Job for Tracking Media Validation and Ingestion Pipeline
 */
export interface IngestionJob {
  id: string;
  scanId: string;
  organizationId: string;
  status: 'QUEUED' | 'VALIDATING' | 'INGESTING' | 'READY_FOR_ANALYSIS' | 'FAILED' | 'CANCELLED';
  sourceType: ScanSourceType;
  sourceDetails: {
    fileName?: string;
    fileSizeBytes?: number;
    mimeType?: string;
    youtubeUrl?: string;
    youtubeVideoId?: string;
    storagePath?: string;
  };
  progressPercent: number;
  currentStep: string;
  logs: IngestionLog[];
  errorDetails?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * PreScan Execution Instance
 */
export interface Scan {
  id: string;
  organizationId: string;
  videoId?: string;
  projectId?: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  madeForKids?: boolean;
  language?: string;
  status: ScanStatus;
  stage?: string;
  config: ScanConfig;
  sourceType?: ScanSourceType;
  source?: ScanSource;
  mediaInfo?: MediaInfo;
  ingestionJobId?: string;
  progressPercent: number;
  currentStepMessage?: string;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: {
    code: string;
    message: string;
    reason?: string;
    action?: string;
    retryable?: boolean;
  };
  attempts?: number;
  overallRisk: RiskLevel;
  initiatedById: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Granular Finding identified during a scan
 */
export interface Finding {
  id: string;
  scanId: string;
  organizationId: string;
  category: FindingCategory;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  evidenceQuote?: string;
  timestampStartSeconds?: number;
  timestampEndSeconds?: number;
  suggestedAction: string;
  policyReferenceUrl?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedById?: string;
  createdAt: string;
}

/**
 * Comprehensive Scan Report Summary
 */
export interface Report {
  id: string;
  scanId: string;
  organizationId: string;
  videoId: string;
  summaryText: string;
  communityGuidelinesRisk: RiskLevel;
  advertiserSuitabilityRisk: RiskLevel;
  copyrightSignalsRisk: RiskLevel;
  metadataIntegrityRisk: RiskLevel;
  totalFindingsCount: number;
  importantCount: number;
  reviewRequiredCount: number;
  lowRiskCount: number;
  shareableToken?: string;
  isPubliclyShared: boolean;
  generatedAt: string;
  updatedAt: string;
}

/**
 * Pricing Plan Definition
 */
export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  monthlyScanLimit: number;
  maxVideoDurationMinutes: number;
  maxTeamMembers: number;
  features: string[];
  isPopular?: boolean;
}

/**
 * Organization Subscription State
 */
export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Organization Usage Tracking State
 */
export interface Usage {
  id: string;
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  scansUsed: number;
  scansLimit: number;
  minutesProcessed: number;
  minutesLimit: number;
  storageBytesUsed: number;
  updatedAt: string;
}

/**
 * YouTube Channel Connection Metadata
 */
export interface YouTubeConnection {
  id: string;
  organizationId: string;
  channelId: string;
  channelTitle: string;
  customUrl?: string;
  thumbnailUrl?: string;
  status: YouTubeConnectionStatus;
  connectedById: string;
  connectedAt: string;
  lastSyncedAt?: string;
}

/**
 * Real-time In-App Notification
 */
export interface Notification {
  id: string;
  userId: string;
  organizationId?: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Security & Compliance Audit Log
 */
export interface AuditLog {
  id: string;
  organizationId: string;
  actorUserId: string;
  action: AuditAction;
  targetResourceType?: string;
  targetResourceId?: string;
  metadataJson?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
