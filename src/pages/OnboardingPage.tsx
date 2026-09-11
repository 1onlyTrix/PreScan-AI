import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Video,
  Layers,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../router/routes';

interface OnboardingPageProps {
  onNavigate: (route: string) => void;
}

const CREATOR_TYPES = [
  { id: 'solo_creator', label: 'Solo Creator / YouTuber', desc: 'I record, edit, and manage my own YouTube channel.' },
  { id: 'video_editor', label: 'Video Editor / Post-Producer', desc: 'I review footage and cut videos for creators and channels.' },
  { id: 'channel_manager', label: 'Channel Manager / Producer', desc: 'I oversee release schedules, monetization, and compliance.' },
  { id: 'agency', label: 'Production Agency / Studio', desc: 'We produce and publish content for multiple creator clients.' },
  { id: 'media_brand', label: 'Media Brand / Corporate Team', desc: 'Enterprise content division pre-screening public releases.' },
  { id: 'other', label: 'Other Content Specialist', desc: 'Custom QA workflow for specialized media.' },
];

const CONTENT_CATEGORIES = [
  { id: 'gaming', label: 'Gaming & Streaming', icon: '🎮' },
  { id: 'education', label: 'Education & How-To', icon: '📚' },
  { id: 'tech', label: 'Tech & Reviews', icon: '💻' },
  { id: 'commentary', label: 'Video Essays & Commentary', icon: '🎙️' },
  { id: 'entertainment', label: 'Entertainment & Comedy', icon: '🎭' },
  { id: 'news', label: 'News & Current Affairs', icon: '📰' },
  { id: 'vlogs', label: 'Vlogs & Lifestyle', icon: '📹' },
  { id: 'business', label: 'Business & Finance', icon: '📈' },
  { id: 'music', label: 'Music & Podcasting', icon: '🎵' },
  { id: 'other', label: 'Other Topics', icon: '✨' },
];

const PUBLISH_FREQUENCIES = [
  { id: 'daily', label: 'Daily', desc: 'High-frequency uploads (Shorts or daily long-form)' },
  { id: 'several_per_week', label: '2–4 videos per week', desc: 'Standard consistent creator cadence' },
  { id: 'weekly', label: 'Weekly', desc: '1 polished upload every week' },
  { id: 'biweekly', label: '2–3 videos per month', desc: 'In-depth research or longer production cycles' },
  { id: 'monthly', label: 'Monthly or as ready', desc: 'High-budget documentary or episodic work' },
];

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onNavigate }) => {
  const { user, onboarding, updateOnboardingStep, completeOnboarding } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(onboarding?.step || 1);
  const [creatorType, setCreatorType] = useState<string>(onboarding?.creatorType || '');
  const [contentTypes, setContentTypes] = useState<string[]>(onboarding?.contentTypes || []);
  const [publishFrequency, setPublishFrequency] = useState<string>(onboarding?.publishFrequency || '');
  
  // Default workspace name based on user's name
  const defaultWsName = onboarding?.workspaceName || (user?.fullName ? `${user.fullName.split(' ')[0]}'s Workspace` : 'Main Workspace');
  const [workspaceName, setWorkspaceName] = useState<string>(defaultWsName);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if onboarding loads later
  useEffect(() => {
    if (onboarding) {
      if (onboarding.step && onboarding.step !== currentStep) {
        setCurrentStep(onboarding.step);
      }
      if (onboarding.creatorType && !creatorType) setCreatorType(onboarding.creatorType);
      if (onboarding.contentTypes && contentTypes.length === 0) setContentTypes(onboarding.contentTypes);
      if (onboarding.publishFrequency && !publishFrequency) setPublishFrequency(onboarding.publishFrequency);
      if (onboarding.workspaceName && !workspaceName) setWorkspaceName(onboarding.workspaceName);
    }
  }, [onboarding]);

  const toggleContentType = (id: string) => {
    if (contentTypes.includes(id)) {
      setContentTypes(contentTypes.filter((t) => t !== id));
    } else {
      setContentTypes([...contentTypes, id]);
    }
  };

  const handleNext = async () => {
    setError(null);

    if (currentStep === 1 && !creatorType) {
      setError('Please select the role that best describes you.');
      return;
    }
    if (currentStep === 2 && contentTypes.length === 0) {
      setError('Please select at least one content category.');
      return;
    }
    if (currentStep === 3 && !publishFrequency) {
      setError('Please select your target upload frequency.');
      return;
    }

    if (currentStep < 4) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      try {
        await updateOnboardingStep({
          step: nextStep,
          creatorType,
          contentTypes,
          publishFrequency,
          workspaceName,
        });
      } catch (err) {
        // Non-blocking background save
      }
    } else {
      // Step 4 Completion
      if (!workspaceName.trim()) {
        setError('Please enter a workspace name.');
        return;
      }

      try {
        setLoading(true);
        await completeOnboarding({
          workspaceName: workspaceName.trim(),
          creatorType,
          contentTypes,
          publishFrequency,
        });
        onNavigate(ROUTES.DASHBOARD);
      } catch (err: any) {
        setError(err.message || 'Failed to complete workspace setup.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateOnboardingStep({ step: prevStep }).catch(() => {});
    }
  };

  const progressPercent = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6 text-neutral-900">
      <div className="w-full max-w-xl space-y-6">
        {/* Navigation back to public home screen */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate(ROUTES.HOME)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors py-1 px-2 -ml-2 rounded-md hover:bg-neutral-200/50"
            aria-label="Return to Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </div>

        {/* Header Branding & Progress */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-sm mx-auto">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Welcome to PreScan
          </h1>
          <p className="text-xs text-neutral-500">
            Let's configure your YouTube quality assurance workspace.
          </p>

          <div className="pt-3 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium mb-1.5">
              <span>Step {currentStep} of 4</span>
              <span>{Math.round(progressPercent)}% completed</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-900 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="error" title="Setup Notice">
            {error}
          </Alert>
        )}

        <Card className="bg-white shadow-sm border-neutral-200">
          <CardContent className="pt-6 sm:p-8">
            {/* STEP 1: Creator Role */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    What best describes your role?
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    We personalize policy thresholds and compliance scans to your workflow.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {CREATOR_TYPES.map((type) => {
                    const isSelected = creatorType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setCreatorType(type.id);
                          if (error) setError(null);
                        }}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 text-neutral-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                            {type.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className={`text-[11px] leading-tight ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {type.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Content Types */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    What kind of content do you create?
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select all that apply. PreScan tailors copyright, profanity, and advertiser filters to your niche.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                  {CONTENT_CATEGORIES.map((cat) => {
                    const isSelected = contentTypes.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          toggleContentType(cat.id);
                          if (error) setError(null);
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs font-semibold'
                            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs truncate flex-1">{cat.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: Cadence */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    How often do you publish?
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Helps optimize scan turn-around speed and alert queuing.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {PUBLISH_FREQUENCIES.map((freq) => {
                    const isSelected = publishFrequency === freq.id;
                    return (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => {
                          setPublishFrequency(freq.id);
                          if (error) setError(null);
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                            : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 text-neutral-900'
                        }`}
                      >
                        <div>
                          <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                            {freq.label}
                          </p>
                          <p className={`text-[11px] ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {freq.desc}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: Workspace Name */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    Name your creator workspace
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Your workspace isolates your video scans, report histories, and review queues.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <Input
                    label="Workspace Name"
                    placeholder="e.g. Creator Studios, Apex Gaming, Morgan Media"
                    value={workspaceName}
                    onChange={(e) => {
                      setWorkspaceName(e.target.value);
                      if (error) setError(null);
                    }}
                    helperText="You will be assigned the Workspace Owner role. You can invite team members later."
                    required
                    autoFocus
                  />

                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-2 text-xs text-neutral-600">
                    <div className="flex items-center gap-2 font-semibold text-neutral-900">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Workspace Isolation & Provisioning Guarantee</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Your workspace will be initialized with dedicated tenant partitioning. All subsequent scans, reports, and team collaborations will be scoped exclusively to this organization.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between p-4 sm:px-8 border-t border-neutral-100 bg-neutral-50/50">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="md"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              isLoading={loading}
              disabled={loading}
              rightIcon={currentStep < 4 ? <ArrowRight className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            >
              {currentStep < 4 ? 'Continue' : 'Finish Setup & Enter'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
