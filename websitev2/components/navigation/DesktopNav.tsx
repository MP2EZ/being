/**
 * Desktop Navigation - Horizontal top nav
 * Visible on screens ≥640px
 */

'use client';

import Link from 'next/link';
import BrainIcon from '@/components/shared/BrainIcon';

export default function DesktopNav() {
  return (
    <nav className="hidden sm:flex items-center justify-between px-6 py-4 bg-brand-off-white border-b border-gray-300">
      {/* Logo + Brand */}
      <Link href="/" className="flex items-center gap-3 text-brand-midnight hover:opacity-80 transition-opacity">
        <BrainIcon size={40} className="text-brand-midnight" />
        <span className="text-xl font-semibold">Being</span>
      </Link>

      {/* Main Navigation */}
      <div className="flex items-center gap-8">
        <Link href="/" className="text-brand-midnight hover:text-brand-blue-gray transition-colors">
          Home
        </Link>
        <Link href="/philosophy" className="text-brand-midnight hover:text-brand-blue-gray transition-colors">
          Philosophy
        </Link>
        <Link href="/features" className="text-brand-midnight hover:text-brand-blue-gray transition-colors">
          Features
        </Link>
        <Link href="/download" className="text-brand-midnight hover:text-brand-blue-gray transition-colors">
          Download
        </Link>
      </div>

      {/* 988 Crisis Button (calm styling, not alarm) */}
      <Link
        href="/crisis"
        className="px-4 py-2 bg-crisis-bg text-crisis-text border border-crisis-border rounded-md hover:bg-opacity-80 transition-all"
      >
        988 Crisis Support
      </Link>
    </nav>
  );
}
