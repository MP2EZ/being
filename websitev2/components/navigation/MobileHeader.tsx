/**
 * Mobile Header - Logo + 988 link
 * Visible on screens <640px (complements bottom tabs)
 */

'use client';

import Link from 'next/link';
import BrainIcon from '@/components/shared/BrainIcon';

export default function MobileHeader() {
  return (
    <header className="sm:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-brand-off-white border-b border-gray-300">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 text-brand-midnight">
        <BrainIcon size={32} className="text-brand-midnight" />
        <span className="text-lg font-semibold">Being</span>
      </Link>

      {/* 988 Link (compact for mobile) */}
      <Link
        href="/crisis"
        className="px-3 py-1.5 text-sm bg-crisis-bg text-crisis-text border border-crisis-border rounded-md"
      >
        988
      </Link>
    </header>
  );
}
