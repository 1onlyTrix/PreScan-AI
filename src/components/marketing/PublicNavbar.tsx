import React, { useState, useEffect } from 'react';
import { Sparkles, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { ROUTES } from '../../router/routes';

interface PublicNavbarProps {
  currentRoute?: string;
  onNavigate: (route: string) => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ currentRoute, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleNav = (route: string) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  const navLinks = [
    { label: 'Features', route: ROUTES.FEATURES },
    { label: 'How it works', route: ROUTES.HOW_IT_WORKS },
    { label: 'Pricing', route: ROUTES.PRICING },
    { label: 'Security', route: ROUTES.SECURITY },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-md transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          onClick={() => handleNav(ROUTES.HOME)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleNav(ROUTES.HOME);
          }}
          aria-label="PreScan Home"
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-neutral-800 transition-colors">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-bold text-base tracking-tight text-neutral-900">
            Pre<span className="text-neutral-500">Scan</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
          {navLinks.map((link) => {
            const isActive = currentRoute === link.route;
            return (
              <button
                key={link.route}
                onClick={() => handleNav(link.route)}
                className={`transition-colors py-1 hover:text-neutral-900 ${
                  isActive ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900 -mb-[2px]' : ''
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNav(ROUTES.LOGIN)}
            className="text-neutral-700 hover:text-neutral-900"
          >
            Log in
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleNav(ROUTES.SIGNUP)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Start scanning free
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleNav(ROUTES.SIGNUP)}
            className="text-xs px-3 py-1.5"
          >
            Start free
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-neutral-900/40 backdrop-blur-xs md:hidden animate-in fade-in">
          <div className="bg-white border-b border-neutral-200 p-6 space-y-5 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <button
                  key={link.route}
                  onClick={() => handleNav(link.route)}
                  className={`text-left py-2 px-3 rounded-lg text-base font-medium transition-colors ${
                    currentRoute === link.route
                      ? 'bg-neutral-100 text-neutral-900 font-semibold'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-neutral-200 flex flex-col gap-3">
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center"
                onClick={() => handleNav(ROUTES.LOGIN)}
              >
                Log in
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={() => handleNav(ROUTES.SIGNUP)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Start scanning free
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
