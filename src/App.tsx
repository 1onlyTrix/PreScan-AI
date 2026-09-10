import React from 'react';
import { Router } from './router/Router';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Router />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
