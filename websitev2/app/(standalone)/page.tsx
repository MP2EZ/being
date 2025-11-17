/**
 * Coming Soon Page - Being
 * Single-focus email capture interstitial
 * Launch until app store availability
 */

'use client';

import { useState, FormEvent } from 'react';
import BrainIcon from '@/components/shared/BrainIcon';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to join waitlist');
      }

      setStatus('success');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg mx-auto text-center space-y-8">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <BrainIcon size={90} className="text-blue-950" />
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="
            text-4xl sm:text-5xl
            font-semibold text-blue-950
            leading-tight tracking-tight
          ">
            Being. is launching soon
          </h1>

          <p className="
            text-lg sm:text-xl text-gray-600
            leading-relaxed max-w-md mx-auto
          ">
            Ancient Stoic wisdom meets modern mental health practice.
            Be the first to know when we launch.
          </p>
        </div>

        {/* Email Capture Form */}
        {status === 'success' ? (
          <div className="
            rounded-xl border-2 border-accent-500 bg-accent-50
            px-6 py-8 space-y-2
          ">
            <p className="text-lg font-semibold text-accent-700">
              You're on the list
            </p>
            <p className="text-base text-accent-600">
              We'll notify you as soon as Being launches on the App Store and Google Play.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={status === 'submitting'}
                className="
                  flex-1 px-4 py-3
                  rounded-lg border-2 border-gray-300
                  text-base text-gray-900 placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-150
                  min-h-[48px]
                "
                aria-label="Email address"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="
                  px-6 py-3
                  bg-accent-600 text-white font-medium
                  rounded-lg min-h-[48px]
                  hover:bg-accent-700 active:bg-accent-700
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-150
                  whitespace-nowrap
                "
              >
                {status === 'submitting' ? 'Joining...' : 'Get Notified'}
              </button>
            </div>

            {status === 'error' && (
              <p className="text-sm text-error" role="alert">
                {errorMessage}
              </p>
            )}

            <p className="text-sm text-gray-500">
              We'll send you one email when Being launches.
              No spam, ever. Unsubscribe anytime.
            </p>
          </form>
        )}

        {/* Trust Signals */}
        <div className="pt-4 space-y-3">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              28-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Privacy-first
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-400 pt-8">
          Join thousands practicing Stoic Mindfulness
        </p>
      </div>
    </div>
  );
}
