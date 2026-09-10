import React, { useEffect } from 'react';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

interface MarketingLayoutProps {
  title?: string;
  description?: string;
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export const MarketingLayout: React.FC<MarketingLayoutProps> = ({
  title = 'PreScan — Know What to Review Before You Publish',
  description = 'PreScan helps YouTube creators review potential policy, advertiser-suitability, copyright-reference, and metadata risks before publishing.',
  currentRoute,
  onNavigate,
  children,
}) => {
  // Update document metadata dynamically for SEO & route synchronization
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = title.includes('PreScan') ? title : `${title} | PreScan`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', title);
      }
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute('content', description);
      }

      // Scroll to top on navigation
      window.scrollTo(0, 0);
    }
  }, [title, description, currentRoute]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col antialiased selection:bg-neutral-900 selection:text-white">
      <PublicNavbar currentRoute={currentRoute} onNavigate={onNavigate} />
      <main className="flex-1 w-full">{children}</main>
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
};
