/**
 * Cookie Policy Page
 * Being's minimal cookie usage (we don't use cookies!)
 */

export default function CookiesPage() {
  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Cookie Policy
          </h1>
          <p className="text-gray-700">
            <strong>Last Updated:</strong> [DATE - TO BE DETERMINED]
          </p>
        </header>

        <div className="prose prose-lg max-w-none">
          {/* The Good News */}
          <section className="bg-green-50 p-8 rounded-lg border-2 border-green-400 mb-8">
            <h2 className="text-2xl font-bold text-green-900 mb-4">
              Good News: We Don't Use Cookies
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              Being's website (<strong>www.being.fyi</strong>) does not use cookies, tracking
              pixels, or similar technologies. We don't track you across the web, and we don't
              use third-party advertising or analytics cookies.
            </p>
            <p className="text-gray-800 leading-relaxed">
              This page exists to clarify what minimal data collection occurs and why.
            </p>
          </section>

          {/* What Are Cookies? */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              What Are Cookies?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Cookies are small text files stored on your device by websites you visit. They're
              commonly used to:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-gray-500 mr-2">•</span>
                <span>Remember login information</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-500 mr-2">•</span>
                <span>Track user behavior across websites</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-500 mr-2">•</span>
                <span>Serve targeted advertising</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-500 mr-2">•</span>
                <span>Analyze website traffic and usage</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              <strong>Being does none of these things on our website.</strong>
            </p>
          </section>

          {/* What We Don't Use */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              What We Don't Use
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span><strong>No Advertising Cookies:</strong> We don't serve ads or use ad networks</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span><strong>No Analytics Cookies:</strong> No Google Analytics, Facebook Pixel, or similar tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span><strong>No Social Media Cookies:</strong> No social media widgets or share buttons with tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span><strong>No Third-Party Cookies:</strong> No external services that set cookies</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span><strong>No Session Cookies:</strong> Our website doesn't require login, so no session management</span>
              </li>
            </ul>
          </section>

          {/* Mobile App */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Mobile App Data Storage
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Being mobile app stores data locally on your device using secure, encrypted
              storage (not cookies):
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Local Storage:</strong> Your check-ins, assessments, and journal entries (AES-256 encrypted)</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>User Preferences:</strong> App settings, theme preferences, notification settings</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Authentication Tokens:</strong> If you enable cloud backup (securely stored)</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              This data is stored locally on your device and never sent to third parties. See our{' '}
              <a href="/privacy" className="text-accent-600 hover:underline font-medium">
                Privacy Policy
              </a>{' '}
              for details.
            </p>
          </section>

          {/* Server Logs */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Server Logs (Minimal Data Collection)
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our web server collects minimal technical information for security and performance:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>IP Address:</strong> To prevent abuse and ensure security (automatically deleted after 30 days)</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Request URL:</strong> Which page you visited (no tracking across sessions)</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>User Agent:</strong> Browser type (to ensure compatibility)</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Timestamp:</strong> When the request occurred</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              This data is not used for tracking, profiling, or advertising. It's retained for
              security purposes and automatically deleted after 30 days.
            </p>
          </section>

          {/* Your Choices */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Choices
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Since we don't use cookies, you don't need to accept a cookie banner or manage
              cookie preferences.
            </p>
            <p className="text-gray-700 leading-relaxed">
              If you have concerns about server logs or mobile app data storage, please see our{' '}
              <a href="/privacy" className="text-accent-600 hover:underline font-medium">
                Privacy Policy
              </a>{' '}
              or contact{' '}
              <a href="mailto:privacy@being.fyi" className="text-accent-600 hover:underline">
                privacy@being.fyi
              </a>.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Changes to This Policy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              If we ever decide to use cookies in the future (unlikely), we will update this policy
              and notify you prominently on our website. We are committed to transparency and will
              always respect your privacy choices.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Questions?
            </h3>
            <p className="text-gray-700">
              Contact us at{' '}
              <a href="mailto:privacy@being.fyi" className="text-accent-600 hover:underline font-medium">
                privacy@being.fyi
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
