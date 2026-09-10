import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Sparkles, Building, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { ROUTES } from '../router/routes';

interface PublicContactPageProps {
  onNavigate: (route: string) => void;
}

export const PublicContactPage: React.FC<PublicContactPageProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all required fields (Name, Email, and Message).');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  const categoryOptions = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Product Support' },
    { value: 'partnership', label: 'Creator / Agency Partnership' },
    { value: 'enterprise', label: 'Enterprise / High Volume' },
    { value: 'feedback', label: 'Feature Request & Feedback' },
  ];

  return (
    <MarketingLayout
      title="Contact PreScan — Get in Touch with Our Team"
      description="Have questions about PreScan's pre-upload QA capabilities, custom agency volumes, or feedback? Reach out to our team."
      currentRoute={ROUTES.CONTACT}
      onNavigate={onNavigate}
    >
      {/* Header */}
      <section className="py-16 sm:py-20 bg-linear-to-b from-neutral-50/80 via-white to-white border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
            <Mail className="w-3.5 h-3.5 text-neutral-700" />
            <span>Direct Communications</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900">
            Get in touch with PreScan
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto leading-relaxed">
            Have questions about analysis scopes, studio volume, or feature suggestions? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {submitted ? (
            <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-200 text-center space-y-4 shadow-xs animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                Message Received (Preview Mode)
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{name}</strong>. Your form submission has passed frontend validation. As part of the Phase 02 preview release, automated transactional mail delivery is queued for backend integration.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                >
                  Send another message
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate(ROUTES.HOME)}
                >
                  Return to Home
                </Button>
              </div>
            </div>
          ) : (
            <Card className="bg-white shadow-sm border-neutral-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-neutral-900">
                  Send a Message
                </CardTitle>
                <p className="text-xs text-neutral-500">
                  Fill out the form below and our team will get back to you.
                </p>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {error && (
                    <Alert variant="error" title="Submission Error">
                      {error}
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Name *"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <Input
                      label="Email Address *"
                      type="email"
                      placeholder="jane@channel.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Channel or Organization Name"
                      placeholder="@YourChannel (Optional)"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                    />
                    <Select
                      label="Reason for Contact *"
                      options={categoryOptions}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>

                  <Textarea
                    label="Message *"
                    placeholder="Tell us about your publishing schedule, team size, or questions..."
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                    rightIcon={<Send className="w-4 h-4" />}
                  >
                    Submit Message
                  </Button>

                  <div className="text-center text-[11px] text-neutral-400 pt-2">
                    Phase 02 validation active • Backend routing scheduled for future release
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
};
