import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  Download,
  Share2,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Switch,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  Dropdown,
  Tooltip,
  Tabs,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  Progress,
  Skeleton,
  Alert,
  EmptyState,
  PageHeader,
  SectionHeader,
  Breadcrumb,
  StatusIndicator,
  useToast,
} from '../components/ui';
import { RiskLevel } from '../types';

interface DesignSystemPageProps {
  onNavigate: (route: string) => void;
}

export const DesignSystemPage: React.FC<DesignSystemPageProps> = ({ onNavigate }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('components');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioSelected, setRadioSelected] = useState('option1');
  const [progressVal, setProgressVal] = useState(65);

  return (
    <div className="space-y-10 pb-16">
      <PageHeader
        title="Design System & Component Library"
        description="Interactive reference catalog of reusable UI components, tokens, and semantic states constructed in Phase 01."
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate('/app/dashboard') },
              { label: 'Design System & UI' },
            ]}
          />
        }
        badge={
          <Badge variant="default">
            Phase 01 Tokens
          </Badge>
        }
      />

      <Tabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pills"
        tabs={[
          { id: 'components', label: 'Component Catalog', icon: <Layers className="w-4 h-4" /> },
          { id: 'risks', label: 'Semantic Risk Colors', icon: <Shield className="w-4 h-4" /> },
          { id: 'states', label: 'State Design Matrix', icon: <CheckCircle2 className="w-4 h-4" /> },
        ]}
      />

      {activeTab === 'components' && (
        <div className="space-y-12">
          {/* Section 1: Buttons & Actions */}
          <div>
            <SectionHeader
              title="Buttons & Interactive Controls"
              description="Standardized variants with accessible focus rings, loading states, and icon support."
            />
            <Card>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                    Button Variants
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary">Primary Action</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="primary" isLoading>
                      Processing
                    </Button>
                    <Button variant="outline" disabled>
                      Disabled
                    </Button>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                    Sizes & Icons
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Small Button
                    </Button>
                    <Button size="md" leftIcon={<Download className="w-4 h-4" />}>
                      Medium Button
                    </Button>
                    <Button size="lg" rightIcon={<Share2 className="w-4 h-4" />}>
                      Large Button
                    </Button>
                    <IconButton ariaLabel="Delete" variant="destructive" size="md">
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                    <IconButton ariaLabel="Help" variant="outline" size="md">
                      <HelpCircle className="w-4 h-4" />
                    </IconButton>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Section 2: Form & Input Primitives */}
          <div>
            <SectionHeader
              title="Form Controls & Inputs"
              description="Accessible input primitives with label bindings, validation errors, and descriptions."
            />
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Standard Text Input"
                  placeholder="Enter video title..."
                  helperText="Supports descriptive guidance text"
                />

                <Input
                  label="Input with Error State"
                  defaultValue="Invalid url schema"
                  error="Please enter a valid YouTube draft URL"
                />

                <Select
                  label="Select Dropdown"
                  options={[
                    { value: 'std', label: 'Standard Evaluation' },
                    { value: 'strict', label: 'Strict Review' },
                    { value: 'custom', label: 'Custom Parameter Set' },
                  ]}
                />

                <div className="space-y-4">
                  <Switch
                    label="Toggle Switch"
                    description="Immediate configuration change"
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                  />

                  <Checkbox
                    label="Checkbox item"
                    description="Multiple option selector"
                    checked={checkboxChecked}
                    onChange={(e) => setCheckboxChecked(e.target.checked)}
                  />

                  <div className="flex items-center gap-4">
                    <Radio
                      label="Option A"
                      checked={radioSelected === 'option1'}
                      onChange={() => setRadioSelected('option1')}
                    />
                    <Radio
                      label="Option B"
                      checked={radioSelected === 'option2'}
                      onChange={() => setRadioSelected('option2')}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Textarea
                    label="Textarea with Character Counter"
                    placeholder="Provide full description context..."
                    showCount
                    maxLength={500}
                    defaultValue="PreScan analyzes this text for advertiser-safety signals and copyright citations."
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Section 3: Feedback, Modals, Toasts & Tooltips */}
          <div>
            <SectionHeader
              title="Feedback, Modals & Overlays"
              description="Popups, tooltips, toasts, and dialogs designed for non-intrusive creator feedback."
            />
            <Card>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
                  Open Modal Dialog
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      type: 'success',
                      title: 'Scan Initialized',
                      description: 'Task #102 has been sent to the worker queue.',
                    })
                  }
                >
                  Trigger Success Toast
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      type: 'error',
                      title: 'Validation Error',
                      description: 'Media file exceeds 2GB ceiling for this tier.',
                    })
                  }
                >
                  Trigger Error Toast
                </Button>

                <Tooltip content="Tooltip helper text on hover or focus">
                  <Button variant="ghost" leftIcon={<HelpCircle className="w-4 h-4 text-neutral-500" />}>
                    Hover For Tooltip
                  </Button>
                </Tooltip>

                <Dropdown
                  trigger={
                    <Button variant="outline">
                      Dropdown Menu
                    </Button>
                  }
                  items={[
                    { id: '1', label: 'Export Report (PDF)', onClick: () => {} },
                    { id: '2', label: 'Copy Share Link', onClick: () => {} },
                    { id: '3', label: 'Delete Scan', destructive: true, onClick: () => {} },
                  ]}
                />
              </div>
            </Card>

            <Dialog
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              title="Example Accessible Modal"
              description="Accessible dialog container supporting Escape-key dismissal and backdrop focus trap."
              footer={
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setIsDialogOpen(false)}>
                    Confirm Action
                  </Button>
                </>
              }
            >
              <p className="text-xs text-neutral-600 leading-relaxed">
                This dialog demonstrates modular modal encapsulation without external UI bloat. It can host confirmation prompts, video player overlays, or export dialogues in future phases.
              </p>
            </Dialog>
          </div>

          {/* Section 4: Data Display (Tables, Progress, Skeletons) */}
          <div>
            <SectionHeader
              title="Data Display & Loading"
              description="Tables, progress bars, avatars, and skeleton placeholders."
            />
            <Card className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Avatar fallback="PreScan Studio" size="md" />
                  <Avatar fallback="Himanshu" size="md" />
                  <Avatar fallback="Alex Editor" size="sm" />
                </div>

                <div className="flex-1 max-w-xs space-y-1">
                  <Progress value={progressVal} showLabel />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>Audio Transcription</span>
                    <span>{progressVal}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Skeleton Loading Placeholders
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Skeleton variant="text" className="h-6" />
                  <Skeleton variant="text" className="h-6" />
                  <Skeleton variant="text" className="h-6" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Standard Data Table
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dimension</TableHead>
                      <TableHead>Evaluation Engine</TableHead>
                      <TableHead>Standard Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Community Guidelines</TableCell>
                      <TableCell className="font-mono text-xs">Audio + Speech Analyzer</TableCell>
                      <TableCell><StatusIndicator level={RiskLevel.LOW} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Advertiser Suitability</TableCell>
                      <TableCell className="font-mono text-xs">Opening Hook Classifier</TableCell>
                      <TableCell><StatusIndicator level={RiskLevel.REVIEW_REQUIRED} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Copyright Signals</TableCell>
                      <TableCell className="font-mono text-xs">Audio Fingerprint Matrix</TableCell>
                      <TableCell><StatusIndicator level={RiskLevel.IMPORTANT} /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-6">
          <SectionHeader
            title="Semantic Risk Color System"
            description="Four deliberate, accessible risk levels paired with high-contrast text labels."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-emerald-200 bg-emerald-50/30">
              <div className="flex items-start justify-between mb-3">
                <Badge riskLevel={RiskLevel.LOW} />
                <span className="text-xs font-mono text-emerald-800">GREEN</span>
              </div>
              <h4 className="text-sm font-bold text-emerald-950 mb-1">Low Risk / Positive</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                No policy violations, advertiser red flags, or copyright reference signals detected. Safe to publish according to current checks.
              </p>
            </Card>

            <Card className="border-amber-200 bg-amber-50/30">
              <div className="flex items-start justify-between mb-3">
                <Badge riskLevel={RiskLevel.REVIEW_REQUIRED} />
                <span className="text-xs font-mono text-amber-800">YELLOW</span>
              </div>
              <h4 className="text-sm font-bold text-amber-950 mb-1">Review Required</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Potential monetization risk, borderline profanity in opening segment, or sensitive themes that may limit advertiser distribution.
              </p>
            </Card>

            <Card className="border-rose-200 bg-rose-50/30">
              <div className="flex items-start justify-between mb-3">
                <Badge riskLevel={RiskLevel.IMPORTANT} />
                <span className="text-xs font-mono text-rose-800">RED</span>
              </div>
              <h4 className="text-sm font-bold text-rose-950 mb-1">Important Review</h4>
              <p className="text-xs text-rose-800 leading-relaxed">
                High-confidence Community Guidelines violation signal or unlicensed copyright segment that would trigger a strike or claim.
              </p>
            </Card>

            <Card className="border-neutral-200 bg-neutral-50/50">
              <div className="flex items-start justify-between mb-3">
                <Badge riskLevel={RiskLevel.INSUFFICIENT_DATA} />
                <span className="text-xs font-mono text-neutral-600">GRAY</span>
              </div>
              <h4 className="text-sm font-bold text-neutral-900 mb-1">Insufficient Data / Not Analyzed</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Dimension was excluded from scan configuration or media did not contain relevant audio/text tracks for analysis.
              </p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'states' && (
        <div className="space-y-6">
          <SectionHeader
            title="Standardized State Patterns"
            description="Every view in PreScan supports Loading, Empty, Error, and Success states."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Inline Alert States</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="info" title="Information Alert">
                  Workspace configuration is saved automatically.
                </Alert>
                <Alert variant="success" title="Success State">
                  PreScan verified 0 critical copyright claims.
                </Alert>
                <Alert variant="warning" title="Warning State">
                  Audio contains profanity in the opening 15 seconds.
                </Alert>
                <Alert variant="error" title="Error State">
                  Failed to fetch YouTube draft metadata. Token expired.
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Empty State Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={<Sparkles className="w-5 h-5 text-neutral-600" />}
                  title="Zero state representation"
                  description="Standard empty state container directing creator to primary action."
                  primaryAction={{
                    label: 'Primary CTA',
                    onClick: () => {},
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
