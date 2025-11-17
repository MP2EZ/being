/**
 * Terms of Service Page
 * NOTE: REQUIRES ATTORNEY REVIEW BEFORE LAUNCH
 * Target: 4,000-6,000 words comprehensive terms
 */

export default function TermsPage() {
  return (
    <div className="bg-brand-off-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-brand-midnight mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-700">
            <strong>Last Updated:</strong> [DATE - TO BE DETERMINED]
          </p>
          <p className="text-sm text-gray-600 mt-2">
            ⚠️ This is a draft terms of service. Attorney review required before publication.
          </p>
        </header>

        {/* Table of Contents */}
        <nav className="bg-white p-6 rounded-lg border border-gray-300 mb-12">
          <h2 className="text-xl font-semibold text-brand-midnight mb-4">
            Table of Contents
          </h2>
          <ol className="space-y-2 text-brand-sage">
            <li><a href="#acceptance" className="hover:underline">1. Acceptance of Terms</a></li>
            <li><a href="#description" className="hover:underline">2. Description of Service</a></li>
            <li><a href="#medical-disclaimer" className="hover:underline">3. Medical Disclaimer</a></li>
            <li><a href="#eligibility" className="hover:underline">4. Eligibility</a></li>
            <li><a href="#account" className="hover:underline">5. User Accounts</a></li>
            <li><a href="#subscription" className="hover:underline">6. Subscription & Payment</a></li>
            <li><a href="#acceptable-use" className="hover:underline">7. Acceptable Use Policy</a></li>
            <li><a href="#intellectual-property" className="hover:underline">8. Intellectual Property</a></li>
            <li><a href="#user-content" className="hover:underline">9. User Content & Data</a></li>
            <li><a href="#termination" className="hover:underline">10. Termination</a></li>
            <li><a href="#disclaimers" className="hover:underline">11. Disclaimers</a></li>
            <li><a href="#limitation" className="hover:underline">12. Limitation of Liability</a></li>
            <li><a href="#indemnification" className="hover:underline">13. Indemnification</a></li>
            <li><a href="#dispute-resolution" className="hover:underline">14. Dispute Resolution</a></li>
            <li><a href="#miscellaneous" className="hover:underline">15. Miscellaneous</a></li>
          </ol>
        </nav>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          {/* Acceptance */}
          <section id="acceptance" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using Being's mobile application and website ("Services"), you agree
              to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms,
              do not use our Services. These Terms constitute a legally binding agreement between
              you and Being.
            </p>
          </section>

          {/* Description of Service */}
          <section id="description" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being is a mindfulness and wellness application that combines Stoic philosophy with
              modern mental health practices. Our Services include:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Daily mindfulness check-ins (morning, midday, evening)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Wellness assessment tools (PHQ-9, GAD-7 for self-monitoring)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Crisis support resources and 988 integration</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Educational content on Stoic philosophy and mindfulness</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Progress tracking and mood visualization</span>
              </li>
            </ul>
          </section>

          {/* Medical Disclaimer */}
          <section id="medical-disclaimer" className="bg-red-50 p-8 rounded-lg border-2 border-red-400 mb-8">
            <h2 className="text-2xl font-bold text-red-900 mb-4">
              3. Medical Disclaimer
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              <strong>IMPORTANT: Being is a wellness tool, NOT a medical service, therapy, or crisis intervention tool.</strong>
            </p>
            <ul className="space-y-2 text-gray-800">
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>Being is a mindfulness and wellness application, not a healthcare provider</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>Being does not provide medical advice, diagnosis, or treatment</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>Our Services are not a substitute for professional medical care</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>PHQ-9 and GAD-7 assessments are for self-monitoring only, not diagnosis</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>In crisis, use 988 or 911—do not rely solely on Being</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>Always consult licensed healthcare providers for medical concerns</span>
              </li>
            </ul>
            <p className="text-sm text-gray-700 mt-4">
              By using Being, you acknowledge that you understand and agree to this Medical Disclaimer.
            </p>
          </section>

          {/* Eligibility */}
          <section id="eligibility" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              4. Eligibility
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To use Being, you must:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Be at least 18 years old</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Have the legal capacity to enter into a binding agreement</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Not be prohibited from using our Services under applicable law</span>
              </li>
            </ul>
          </section>

          {/* User Accounts */}
          <section id="account" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              5. User Accounts
            </h2>
            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              5.1 Account Creation
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may use Being without creating an account (local-only mode). To enable cloud
              backup, you must create an account with a valid email address.
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              5.2 Account Security
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Maintaining the confidentiality of your login credentials</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>All activities that occur under your account</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Notifying us immediately of unauthorized access</span>
              </li>
            </ul>
          </section>

          {/* Subscription & Payment */}
          <section id="subscription" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              6. Subscription & Payment
            </h2>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              6.1 Free Trial
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being offers a 28-day free trial. No credit card is required. At the end of the trial,
              you may choose to subscribe or continue with limited free features.
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              6.2 Subscription Plans
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being offers two subscription options:
            </p>
            <ul className="space-y-2 text-gray-700 mb-4">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Monthly:</strong> $9.99/month</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Annual:</strong> $79.99/year (save 33%)</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              All fees are in USD and subject to applicable taxes.
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              6.3 Payment Processing
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Payments are processed through Apple App Store or Google Play Store. Your subscription
              will automatically renew unless you cancel before the renewal date.
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              6.4 Cancellation & Refunds
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>You may cancel your subscription at any time through your app store account</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Cancellation takes effect at the end of your current billing period</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Refunds are handled according to Apple/Google refund policies</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>You retain access to your local data after subscription ends</span>
              </li>
            </ul>
          </section>

          {/* Acceptable Use */}
          <section id="acceptable-use" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              7. Acceptable Use Policy
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree NOT to:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Reverse engineer, decompile, or disassemble the app</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Use Being for any illegal or unauthorized purpose</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Interfere with or disrupt the Services</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Share your account credentials with others</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Attempt to gain unauthorized access to any portion of the Services</span>
              </li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section id="intellectual-property" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              8. Intellectual Property
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              All content, features, and functionality of Being—including text, graphics, logos,
              icons, images, audio, video, and software—are owned by Being and protected by
              copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You may not copy, modify, distribute, sell, or lease any part of our Services without
              our express written permission.
            </p>
          </section>

          {/* User Content */}
          <section id="user-content" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              9. User Content & Data
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>You own your data.</strong> All check-ins, assessments, journal entries, and
              other content you create remains yours. By using Being, you grant us a limited license
              to store and process your data solely to provide our Services.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You may export or delete your data at any time. See our Privacy Policy for details
              on how we handle your information.
            </p>
          </section>

          {/* Termination */}
          <section id="termination" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              10. Termination
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may suspend or terminate your access to Being at any time, with or without cause,
              with or without notice, if we believe you have violated these Terms. Upon termination:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Your right to use Being immediately ceases</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>You retain your local data stored on your device</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Cloud backups may be deleted after 30 days</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>No refunds will be provided for remaining subscription time</span>
              </li>
            </ul>
          </section>

          {/* Disclaimers */}
          <section id="disclaimers" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              11. Disclaimers
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                BEING IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="leading-relaxed">
                We do not warrant that Being will be uninterrupted, error-free, secure, or free of
                viruses or other harmful components.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section id="limitation" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              12. Limitation of Liability
            </h2>
            <p className="text-gray-700 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BEING SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
              REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL,
              OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF OUR SERVICES.
            </p>
          </section>

          {/* Indemnification */}
          <section id="indemnification" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              13. Indemnification
            </h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Being and its officers, directors,
              employees, and agents from any claims, liabilities, damages, losses, and expenses
              arising out of or related to your use of our Services or violation of these Terms.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section id="dispute-resolution" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              14. Dispute Resolution
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Governing Law:</strong> These Terms are governed by the laws of the State of Washington,
              without regard to conflict of law principles.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Arbitration:</strong> Any disputes arising from these Terms shall be resolved
              through binding arbitration in accordance with the American Arbitration Association rules,
              with arbitration proceedings conducted in Washington State.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Class Action Waiver:</strong> You agree to resolve disputes on an individual
              basis and waive any right to participate in class action lawsuits.
            </p>
          </section>

          {/* Miscellaneous */}
          <section id="miscellaneous" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              15. Miscellaneous
            </h2>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              Changes to Terms
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes via email or in-app notification. Continued use after changes constitutes acceptance.
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              Severability
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining
              provisions will remain in full force and effect.
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              Entire Agreement
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and Being regarding use of our Services.
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              Contact Information
            </h3>
            <p className="text-gray-700 leading-relaxed">
              For questions about these Terms, contact us at:{' '}
              <a href="mailto:legal@being.fyi" className="text-brand-sage hover:underline">
                legal@being.fyi
              </a>
            </p>
          </section>
        </div>

        {/* Attorney Review Notice */}
        <div className="mt-12 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p className="text-sm text-gray-800">
            <strong>⚠️ DRAFT DOCUMENT:</strong> This Terms of Service is a draft and requires
            comprehensive attorney review before publication. Estimated legal review cost: $5,000-10,000.
            Do not publish without legal clearance.
          </p>
        </div>
      </div>
    </div>
  );
}
