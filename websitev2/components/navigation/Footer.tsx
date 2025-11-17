/**
 * Footer - Legal links + 988 always visible
 * Calm styling, informative (not alarming)
 */

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-midnight text-white py-12 px-6 sm:px-8 mb-16 sm:mb-0">
      <div className="max-w-6xl mx-auto">
        {/* Crisis Disclaimer (calm, informative) */}
        <div className="mb-8 p-4 bg-crisis-bg bg-opacity-10 border border-crisis-border border-opacity-20 rounded-md">
          <p className="text-sm text-gray-200">
            <strong>In crisis?</strong> Call{' '}
            <Link href="/crisis" className="underline hover:text-crisis-border">
              988 Suicide & Crisis Lifeline
            </Link>{' '}
            (24/7, free, confidential). Being is a wellness tool, not an emergency service.
          </p>
        </div>

        {/* Legal Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div>
            <h3 className="font-semibold mb-2 text-sm text-gray-300">Legal</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/hipaa" className="text-gray-400 hover:text-white transition-colors">
                  HIPAA Notice
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm text-gray-300">Resources</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/crisis" className="text-gray-400 hover:text-white transition-colors">
                  Crisis Resources
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="text-gray-400 hover:text-white transition-colors">
                  Accessibility
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm text-gray-300">Support</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="mailto:support@being.fyi" className="text-gray-400 hover:text-white transition-colors">
                  support@being.fyi
                </a>
              </li>
              <li>
                <a href="mailto:accessibility@being.fyi" className="text-gray-400 hover:text-white transition-colors">
                  accessibility@being.fyi
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm text-gray-300">About</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/philosophy" className="text-gray-400 hover:text-white transition-colors">
                  Stoic Mindfulness
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-gray-400 hover:text-white transition-colors">
                  App Features
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>© {currentYear} Being. Stoic Mindfulness for modern life.</p>
        </div>
      </div>
    </footer>
  );
}
