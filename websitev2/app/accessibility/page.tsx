/**
 * Accessibility Statement Page
 * Being's commitment to WCAG 2.1 AA compliance
 */

export default function AccessibilityPage() {
  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Accessibility Statement
          </h1>
          <p className="text-gray-700">
            <strong>Last Updated:</strong> [DATE - TO BE DETERMINED]
          </p>
        </header>

        <div className="prose prose-lg max-w-none">
          {/* Our Commitment */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Commitment to Accessibility
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being is committed to ensuring that our website and mobile application are accessible
              to all users, including those with disabilities. We believe mental health support
              should be universally accessible.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We strive to meet <strong>WCAG 2.1 Level AA</strong> standards and continuously work
              to improve accessibility across all of our digital properties.
            </p>
          </section>

          {/* Accessibility Features */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Accessibility Features
            </h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Mobile App
            </h3>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Screen Reader Support:</strong> Full VoiceOver (iOS) and TalkBack (Android) compatibility</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Dynamic Type:</strong> Supports system font size adjustments up to 200%</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>High Contrast Mode:</strong> Respects system high contrast settings</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Reduced Motion:</strong> Animations respect prefers-reduced-motion setting</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Haptic Feedback:</strong> Alternative feedback for visual cues</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Color Contrast:</strong> WCAG AA compliant (4.5:1 for text, 3:1 for UI)</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Touch Targets:</strong> Minimum 44pt tap targets for all interactive elements</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Semantic Labels:</strong> All UI elements properly labeled for assistive tech</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Website (www.being.fyi)
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Keyboard Navigation:</strong> Full keyboard access to all features</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Skip Links:</strong> Skip to main content for screen reader users</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>ARIA Landmarks:</strong> Proper semantic HTML and ARIA labels</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Focus Indicators:</strong> Visible focus states for keyboard navigation</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Responsive Design:</strong> Works at 200% zoom without horizontal scroll</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">✓</span>
                <span><strong>Alt Text:</strong> Descriptive alternative text for all images</span>
              </li>
            </ul>
          </section>

          {/* Known Limitations */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Known Limitations
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We are actively working to improve the following areas:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">⚠</span>
                <span>Some third-party content (e.g., app store pages) may not meet full WCAG AA standards</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">⚠</span>
                <span>Certain data visualizations may be challenging for screen reader users (alternative text descriptions provided)</span>
              </li>
            </ul>
          </section>

          {/* Standards We Follow */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Standards We Follow
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>WCAG 2.1 Level AA:</strong> Web Content Accessibility Guidelines</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Section 508:</strong> U.S. federal accessibility requirements</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>iOS Accessibility:</strong> Apple Human Interface Guidelines</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Android Accessibility:</strong> Material Design accessibility standards</span>
              </li>
            </ul>
          </section>

          {/* Testing & Compliance */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Testing & Compliance
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We regularly test Being's accessibility through:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Automated accessibility testing with aXe and Lighthouse</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Manual testing with VoiceOver, TalkBack, and NVDA screen readers</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Keyboard-only navigation testing</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Color contrast validation</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>User testing with people who rely on assistive technologies</span>
              </li>
            </ul>
          </section>

          {/* Feedback & Support */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Feedback & Support
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We welcome your feedback on accessibility. If you encounter accessibility barriers
              or have suggestions for improvement, please contact us:
            </p>
            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:accessibility@being.fyi" className="text-accent-600 hover:underline">
                  accessibility@being.fyi
                </a>
              </p>
              <p>
                <strong>Response Time:</strong> We strive to respond within 2 business days
              </p>
              <p>
                <strong>Alternative Formats:</strong> Need content in a different format?
                Let us know and we'll accommodate your request.
              </p>
            </div>
          </section>

          {/* Third-Party Content */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Third-Party Content
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Being may link to third-party websites and services (e.g., 988 Lifeline, app stores).
              We do not control the accessibility of these external sites. If you encounter
              accessibility issues with third-party content, please contact the respective provider
              and notify us at{' '}
              <a href="mailto:accessibility@being.fyi" className="text-accent-600 hover:underline">
                accessibility@being.fyi
              </a>.
            </p>
          </section>

          {/* Continuous Improvement */}
          <section className="bg-gray-50 p-8 rounded-lg border-l-4 border-accent-600 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Commitment to Continuous Improvement
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Accessibility is an ongoing effort. We regularly review and update our app and
              website based on user feedback, evolving standards, and technological advancements.
              Your input helps us build a more inclusive product for everyone.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
