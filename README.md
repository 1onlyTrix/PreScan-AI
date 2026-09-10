# PreScan — Phase 01: Production SaaS Foundation, Architecture & Design System

> **"Know what to review before you publish."**
> AI-powered pre-upload quality assurance for YouTube creators.

---

## 1. Project Overview

PreScan is a specialized B2B SaaS platform designed to help YouTube creators, editors, and multi-channel networks pre-screen video/audio media and metadata before publishing. It identifies potential risks across:
1. **Community Guidelines** (Hate speech, harassment, dangerous content, restricted goods)
2. **Advertiser Suitability** (Opening-hook profanity, yellow-dollar monetization risk, sensitive topics)
3. **Copyright Signals** (Background audio references, proprietary soundbites, attribution notes)
4. **Metadata Integrity** (Title/description alignment, tag stuffing, missing sponsor disclosures)

### Scope of Phase 01
This repository represents **Phase 01 ONLY**. It establishes the complete engineering architecture, domain models, service boundaries, routing structure, responsive application shell, and reusable design system tokens. **No fake analytics, fake scans, or simulated backend data are rendered.**

---

## 2. Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with custom design tokens
- **Icons**: Lucide React
- **Animations & Transitions**: Motion
- **Build Tool**: Vite 6
- **Runtime Environment**: Google AI Studio Container (Node.js ESM)

---

## 3. Project Structure

```
├── .env.example                     # Environment declaration boundary
├── metadata.json                    # Platform metadata & capabilities
├── index.html                       # Entry point with web font imports
├── package.json                     # Dependency manifests & scripts
├── tsconfig.json                    # Strict TypeScript configuration
├── vite.config.ts                   # Vite build & Tailwind plugin config
├── README.md                        # Phase 01 architectural documentation
└── src/
    ├── types/                       # Core domain models, enums & API types
    │   ├── enums.ts                 # MembershipRole, RiskLevel, FindingCategory, ScanStatus, PlanTier
    │   ├── models.ts                # User, Organization, Membership, Project, Video, Scan, Finding, Report, etc.
    │   ├── api.ts                   # Standard API response & pagination types
    │   └── index.ts                 # Types barrel export
    ├── config/                      # Application constants & tokens
    │   ├── constants.ts             # Capabilities & Foundation Plan specifications
    │   ├── theme.ts                 # Semantic risk mappings & neutral palette tokens
    │   └── env.ts                   # Client environment validation boundaries
    ├── services/                    # Architectural service interface boundaries
    │   ├── auth.interface.ts        # IAuthService (Sign-in, session, RBAC)
    │   ├── billing.interface.ts     # IBillingService (Plans, subscriptions, quota checks)
    │   ├── ai.interface.ts          # IPreScanAnalysisService (Audio & metadata analysis engine)
    │   ├── storage.interface.ts     # IStorageService (Presigned uploads & media isolation)
    │   └── index.ts                 # Services barrel export
    ├── components/
    │   ├── ui/                      # 24+ Atomic & Molecular Design System components
    │   │   ├── Button.tsx           # Primary, secondary, outline, ghost, destructive, loading
    │   │   ├── IconButton.tsx       # Accessible icon buttons
    │   │   ├── Input.tsx            # Form text input with label & error states
    │   │   ├── Textarea.tsx         # Textarea with character counter
    │   │   ├── Select.tsx           # Accessible select dropdown
    │   │   ├── Checkbox.tsx         # Custom styled checkbox
    │   │   ├── Radio.tsx            # Radio button with focus ring
    │   │   ├── Switch.tsx           # Accessible toggle switch
    │   │   ├── Badge.tsx            # Semantic badges with risk indicator integration
    │   │   ├── Card.tsx             # Card primitive family (Header, Title, Content, Footer)
    │   │   ├── Dialog.tsx           # Accessible modal with backdrop & escape handling
    │   │   ├── Dropdown.tsx         # Popup action menus
    │   │   ├── Tooltip.tsx          # Focus & hover tooltips
    │   │   ├── Tabs.tsx             # Underline and pill tab switchers
    │   │   ├── Table.tsx            # Data table primitives
    │   │   ├── Avatar.tsx           # User & workspace avatar with initials fallback
    │   │   ├── Progress.tsx         # Progress bar with percentage display
    │   │   ├── Skeleton.tsx         # Content loading placeholder
    │   │   ├── Toast.tsx            # Toast notification context provider
    │   │   ├── Alert.tsx            # Inline informative, success, warning, and error alerts
    │   │   ├── EmptyState.tsx       # Standardized zero-state container
    │   │   ├── StatusIndicator.tsx  # Semantic colored dot + accessible label
    │   │   ├── PageHeader.tsx       # Top-level page header with actions & breadcrumbs
    │   │   ├── SectionHeader.tsx    # Section title with actions
    │   │   ├── Breadcrumb.tsx       # Accessible breadcrumb trail
    │   │   └── index.ts             # UI components barrel export
    │   ├── layout/                  # Application Shell layout
    │   │   ├── AppShell.tsx         # Top-level layout container
    │   │   ├── Sidebar.tsx          # Responsive collapsible left navigation
    │   │   ├── Topbar.tsx           # Top status bar & quick actions
    │   │   ├── WorkspaceSwitcher.tsx# Multi-tenant workspace selector placeholder
    │   │   └── AccountMenu.tsx      # Neutral unauthenticated account boundary
    │   └── feedback/
    │       ├── ErrorBoundary.tsx    # Application error boundary with recovery UI
    │       └── StateView.tsx        # Standardized loading/empty/error state switcher
    ├── pages/                       # Route views
    │   ├── DashboardPage.tsx        # First-use state dashboard with 4 core capabilities
    │   ├── NewScanPage.tsx          # Step-by-step scan configuration workflow foundation
    │   ├── ScansPage.tsx            # Historical scan registry (intentional empty state)
    │   ├── ReportsPage.tsx          # Compliance reports index (intentional empty state)
    │   ├── ProjectsPage.tsx         # Projects organizer (intentional empty state)
    │   ├── TeamPage.tsx             # Team & RBAC architecture representation
    │   ├── IntegrationsPage.tsx     # YouTube Studio connection card & scopes
    │   ├── BillingPage.tsx          # Plan comparison & tier foundation
    │   ├── SettingsPage.tsx         # Workspace settings & security rules
    │   ├── DesignSystemPage.tsx     # Interactive Component & Token inspection view
    │   ├── PublicLandingPage.tsx    # Public landing page (/)
    │   ├── PublicPricingPage.tsx    # Public pricing page (/pricing)
    │   ├── PublicFeaturesPage.tsx   # Public features page (/features)
    │   └── PublicAuthPage.tsx       # Public authentication views (/login, /signup)
    ├── router/                      # Client-side router
    │   ├── routes.ts                # Route constants & path mappings
    │   └── Router.tsx               # Popstate & hash routing engine
    ├── utils/                       # Utility functions
    │   ├── cn.ts                    # Classname combiner
    │   ├── validation.ts            # Form and schema validation helpers
    │   └── formatters.ts            # Currency, bytes, and duration formatters
    ├── App.tsx                      # Root component
    ├── main.tsx                     # React DOM bootstrap
    └── index.css                    # Base styles and font declarations
```

---

## 4. Multi-Tenant Architecture

All organization resources are structured around strict multi-tenant boundaries:
```
User ────► Membership (Role: Owner | Admin | Editor | Viewer)
               │
               ▼
         Organization (Workspace)
               ├── Projects
               │     └── Videos
               │           └── Scans
               │                 ├── Findings
               │                 └── Report
               ├── Subscriptions & Usage Limits
               ├── YouTube Connections
               └── Audit Logs
```
Every resource includes an immutable `organizationId` foreign key. Cross-tenant querying is strictly disallowed.

---

## 5. Architectural Service Boundaries

The following interfaces are defined in `src/services/` to provide clear contracts for future implementation phases:

1. **`IAuthService`** (`src/services/auth.interface.ts`):
   - `getCurrentUser()`
   - `signIn(credentials)`
   - `signUp(data)`
   - `signOut()`
   - `switchOrganization(organizationId)`

2. **`IBillingService`** (`src/services/billing.interface.ts`):
   - `getCurrentSubscription(organizationId)`
   - `getAvailablePlans()`
   - `getUsage(organizationId)`
   - `canRunScan(organizationId)`
   - `createCheckoutSessionUrl(organizationId, planTier)`

3. **`IPreScanAnalysisService`** (`src/services/ai.interface.ts`):
   - `analyzeAudio(request)`
   - `analyzeMetadata(request)`
   - `generateReport(scanId, findings, metadata)`

4. **`IStorageService`** (`src/services/storage.interface.ts`):
   - `getPresignedUploadUrl(organizationId, fileName, mimeType, fileSizeBytes)`
   - `getDownloadUrl(storageKey)`

---

## 6. Design System & Semantic Color Tokens

### Color Palette
- **Neutrals**: Deep slate (`#0f172a`), clean off-white background (`#f8fafc`), crisp white surface cards (`#ffffff`), subtle borders (`#e2e8f0`).
- **Semantic Risk Tokens**:
  - `RiskLevel.LOW` (Green): Emerald-50 / Emerald-700 / Emerald-500 indicator.
  - `RiskLevel.REVIEW_REQUIRED` (Yellow): Amber-50 / Amber-800 / Amber-500 indicator.
  - `RiskLevel.IMPORTANT` (Red): Rose-50 / Rose-700 / Rose-500 indicator.
  - `RiskLevel.INSUFFICIENT_DATA` (Gray): Neutral-100 / Neutral-600 / Neutral-400 indicator.

An interactive component catalog is available inside the application at **`/app/design-system`**.

---

## 7. Environment Variables

Defined in `.env.example`:
```bash
# Server-side API key for Gemini analysis (injected in Phase 07)
GEMINI_API_KEY=

# Public host URL
APP_URL=
```
*No secrets are stored or exposed on the client.*

---

## 8. Future Implementation Phases

- **Phase 02**: Authentication System (Google OAuth, email/password session verification)
- **Phase 03**: Organization & Workspace RBAC Management
- **Phase 04**: Project & Media Asset Hierarchy
- **Phase 05**: YouTube Partner / Data API Integration & OAuth
- **Phase 06**: Secure Direct-to-Cloud Media Upload Pipeline
- **Phase 07**: Gemini Multimodal Analysis Engine & Prompt Engineering
- **Phase 08**: Interactive Scan Report Viewer & Video Timestamp Player
- **Phase 09**: Stripe Subscriptions & Metered Usage Enforcement
- **Phase 10**: Team Invitations, Real-time Alerts & PDF Export

---

## 9. Security Notes

- All client inputs are sanitized and validated with structured schemas before dispatch.
- The UI contains zero simulated or fake user records.
- Server-side secrets are isolated and never bundled in client code.
