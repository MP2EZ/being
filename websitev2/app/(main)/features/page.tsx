/**
 * Features Page - Being app capabilities
 * Professional SaaS Design
 * Showcases daily check-ins, clinical tools, crisis support, privacy
 */

import BrainIcon from '@/components/shared/BrainIcon';
import Button from '@/components/shared/Button';

export default function FeaturesPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="px-6 py-16 sm:py-24 bg-white flex items-center justify-center min-h-[500px] sm:min-h-[600px]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <BrainIcon size={48} className="text-blue-950" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-semibold text-blue-950 leading-tight tracking-tight">
            App Features
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Being combines ancient Stoic wisdom with modern mental health science. Daily check-ins,
            clinical assessments, and crisis support—all with HIPAA-level privacy.
          </p>
        </div>
      </section>

      {/* Daily Check-Ins */}
      <section className="px-6 py-20 sm:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900">
              Daily Check-Ins
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              Three mindful moments each day, grounded in Stoic philosophy. Build a consistent
              practice that fits your natural rhythm.
            </p>
          </div>

          <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
            {/* Morning */}
            <div className="bg-white p-12 rounded-xl shadow-sm">
              <div className="text-3xl opacity-60 mb-6">🌅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Morning</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Start your day with intention. Body scan, emotion recognition, and setting
                your values-aligned goals.
              </p>
              <ul className="space-y-4 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Body awareness check-in</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Emotional state recognition</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Dream journaling (optional)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Set daily intention aligned with virtues</span>
                </li>
              </ul>
            </div>

            {/* Midday */}
            <div className="bg-white p-12 rounded-xl shadow-sm">
              <div className="text-3xl opacity-60 mb-6">☀️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Midday</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Pause and recalibrate. Check progress on your intention, practice gratitude,
                and maintain mindful awareness.
              </p>
              <ul className="space-y-4 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Awareness of present moment</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Gratitude practice</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Intention progress check</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Brief breathing exercise (60s)</span>
                </li>
              </ul>
            </div>

            {/* Evening */}
            <div className="bg-white p-12 rounded-xl shadow-sm">
              <div className="text-3xl opacity-60 mb-6">🌙</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Evening</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Reflect on your day. Review virtue practice, identify thought patterns,
                and prepare for tomorrow.
              </p>
              <ul className="space-y-4 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Day review and reflection</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Virtue instances (where did you succeed?)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Thought pattern observation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Prepare tomorrow's intention</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Assessments */}
      <section className="px-6 py-20 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900">
              Clinical Mental Health Tracking
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              Evidence-based assessments help you monitor your mental health over time.
              All data encrypted and stored locally on your device.
            </p>
          </div>

          <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* PHQ-9 */}
            <div className="bg-gray-50 p-12 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">PHQ-9 (Depression)</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                The Patient Health Questionnaire-9 is a clinically validated tool for measuring
                depression severity. Being uses exact PHQ-9 wording and scoring.
              </p>
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>9 questions, 2-minute completion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Track scores over time</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Auto-detects severe depression (PHQ-9 ≥20)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Crisis support triggered automatically</span>
                </li>
              </ul>
            </div>

            {/* GAD-7 */}
            <div className="bg-gray-50 p-12 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">GAD-7 (Anxiety)</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                The Generalized Anxiety Disorder-7 scale measures anxiety symptoms. Clinical-grade
                assessment with precise scoring.
              </p>
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>7 questions, 90-second completion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Monitor anxiety trends</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Auto-detects severe anxiety (GAD-7 ≥15)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Integrated with crisis protocols</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Crisis Support */}
      <section className="px-6 py-20 sm:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900">
              24/7 Crisis Support
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Your safety is our top priority. Immediate access to crisis resources from every screen.
            </p>
          </div>

          <div className="mt-12 bg-info text-white p-10 rounded-xl">
            <h3 className="text-2xl font-semibold mb-4">988 Suicide & Crisis Lifeline</h3>
            <p className="text-lg leading-relaxed mb-6 text-blue-100">
              One tap to connect with trained crisis counselors. Available 24/7/365.
              Completely confidential.
            </p>
            <div className="space-y-3 text-blue-100">
              <p className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Less than 3 seconds from any screen to 988</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Auto-triggered on PHQ-9 ≥20 or GAD-7 ≥15</span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Crisis button always visible in app</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Security */}
      <section className="px-6 py-20 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900">
              Privacy & Security
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Your mental health data is yours. We protect it with HIPAA-level encryption
              and local-first storage.
            </p>
          </div>

          <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 max-w-4xl mx-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Local-First Storage</h3>
              <p className="text-gray-600 leading-relaxed">
                All your data is encrypted and stored on your device. You own it.
                No cloud storage required (though optional cloud backup is available).
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">AES-256 Encryption</h3>
              <p className="text-gray-600 leading-relaxed">
                Military-grade encryption protects your check-ins, assessments, and journal entries.
                Even if your device is compromised, your data remains secure.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">No Data Selling</h3>
              <p className="text-gray-600 leading-relaxed">
                We don't sell, share, or monetize your mental health data. Ever.
                Your privacy is not for sale.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Works Offline</h3>
              <p className="text-gray-600 leading-relaxed">
                100% functional without internet after initial download. Your practice
                continues even when you're disconnected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-10 sm:py-16 bg-white border-t-2 border-gray-200">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900">
            Ready to begin?
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Experience Stoic Mindfulness with clinical-grade mental health tracking.
            Start your 28-day free trial today.
          </p>
          <div className="mt-8">
            <Button href="/download" size="large">
              Download Being
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
