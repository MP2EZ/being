/**
 * Privacy Policy Page
 * NOTE: REQUIRES ATTORNEY REVIEW BEFORE LAUNCH
 * Target: 5,000-7,000 words comprehensive privacy policy
 */

export default function PrivacyPage() {
  return (
    <div className="bg-brand-off-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-brand-midnight mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-700">
            <strong>Last Updated:</strong> [DATE - TO BE DETERMINED]
          </p>
          <p className="text-sm text-gray-600 mt-2">
            ⚠️ This is a draft privacy policy. Attorney review required before publication.
          </p>
        </header>

        {/* Table of Contents */}
        <nav className="bg-white p-6 rounded-lg border border-gray-300 mb-12">
          <h2 className="text-xl font-semibold text-brand-midnight mb-4">
            Table of Contents
          </h2>
          <ol className="space-y-2 text-brand-sage">
            <li><a href="#introduction" className="hover:underline">1. Introduction</a></li>
            <li><a href="#information-we-collect" className="hover:underline">2. Information We Collect</a></li>
            <li><a href="#how-we-use" className="hover:underline">3. How We Use Your Information</a></li>
            <li><a href="#data-storage" className="hover:underline">4. Data Storage & Security</a></li>
            <li><a href="#data-sharing" className="hover:underline">5. Data Sharing & Third Parties</a></li>
            <li><a href="#your-rights" className="hover:underline">6. Your Privacy Rights</a></li>
            <li><a href="#data-retention" className="hover:underline">7. Data Retention</a></li>
            <li><a href="#children" className="hover:underline">8. Children's Privacy</a></li>
            <li><a href="#international" className="hover:underline">9. International Users</a></li>
            <li><a href="#changes" className="hover:underline">10. Changes to This Policy</a></li>
            <li><a href="#contact" className="hover:underline">11. Contact Us</a></li>
          </ol>
        </nav>

        {/* Content Sections */}
        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section id="introduction" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being ("we," "us," or "our") is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, store, and protect your personal information
              when you use our mobile application and website (collectively, "Services").
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Our Privacy Philosophy:</strong>
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Local-First:</strong> Your mental health data stays on your device by default</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Never Sold:</strong> We will never sell your personal information to third parties</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>HIPAA-Level Security:</strong> We voluntarily adopt HIPAA-level practices (AES-256 encryption) even though we're not legally required</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>You're in Control:</strong> Export, delete, or transfer your data at any time</span>
              </li>
            </ul>
          </section>

          {/* Information We Collect */}
          <section id="information-we-collect" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              2.1 Information You Provide
            </h3>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Check-In Data:</strong> Daily mindfulness check-ins, mood tracking, journal entries</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Wellness Assessments:</strong> PHQ-9 and GAD-7 responses and scores (for self-monitoring, not clinical diagnosis)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Account Information:</strong> Email, username (optional for cloud backup)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Emergency Contacts:</strong> Contact information for crisis support (stored locally only)</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              2.2 Automatically Collected Information
            </h3>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Device Information:</strong> Device type, OS version (for app compatibility)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Usage Data:</strong> App usage patterns, feature engagement (anonymized)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Technical Data:</strong> Crash reports, performance data (no personal info included)</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              2.3 Information We Do NOT Collect
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Location data or GPS tracking</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Contacts or address book access</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Camera or microphone access (except for optional features you explicitly enable)</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">✗</span>
                <span>Third-party advertising identifiers</span>
              </li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section id="how-we-use" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use your information solely to provide and improve the Being app:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Core Functionality:</strong> Enable mindfulness check-ins, mood tracking, and progress visualization</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Wellness Tools:</strong> Calculate PHQ-9 and GAD-7 scores for self-monitoring, recommend crisis resources when wellness screening thresholds are reached</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Safety Features:</strong> Provide crisis support resources when wellness screening thresholds are met</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>App Improvement:</strong> Analyze anonymized usage patterns to improve user experience</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Technical Support:</strong> Debug issues, provide customer support</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Legal Compliance:</strong> Comply with applicable laws and regulations</span>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-brand-off-white rounded border-l-4 border-brand-sage">
              <p className="text-sm text-gray-700">
                <strong>We will NEVER:</strong> Use your data for advertising, sell your information
                to third parties, or train AI models on your mental health data.
              </p>
            </div>
          </section>

          {/* Data Storage & Security */}
          <section id="data-storage" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              4. Data Storage & Security
            </h2>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              4.1 Local-First Architecture
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              All your mental health data is stored locally on your device by default. We use
              AES-256 encryption to protect your data at rest.
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              4.2 Optional Cloud Backup
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may optionally enable encrypted cloud backup to sync data across devices. Cloud
              backups are:
            </p>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Encrypted end-to-end (we cannot read your data)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Stored on secure cloud infrastructure with HIPAA-level security practices</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Deletable at any time from your account settings</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              4.3 Security Measures
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>AES-256 encryption for data at rest</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>TLS 1.3 encryption for data in transit</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Regular security audits and penetration testing</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Limited employee access to encrypted data</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Two-factor authentication for accounts</span>
              </li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section id="data-sharing" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              5. Data Sharing & Third Parties
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>We do not sell your personal information.</strong> We only share data in the
              following limited circumstances:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>With Your Explicit Consent:</strong> If you choose to export and share your data with healthcare providers</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Service Providers:</strong> Cloud infrastructure (AWS/Google Cloud), crash reporting (anonymized), payment processing (no health data shared)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Legal Requirements:</strong> When required by law, court order, or to protect rights and safety</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Business Transfers:</strong> In the event of merger/acquisition (your privacy rights remain protected)</span>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-red-50 rounded border-l-4 border-red-400">
              <p className="text-sm text-gray-700">
                <strong>No Advertising Partners:</strong> We do not share data with advertising
                networks, data brokers, or marketing platforms. Ever.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section id="your-rights" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              6. Your Privacy Rights
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Access:</strong> Request a copy of your data at any time</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Correction:</strong> Update or correct your information</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Deletion:</strong> Delete your account and all associated data</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Export:</strong> Download your data in portable JSON format</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Opt-Out:</strong> Disable cloud backup, analytics, or crash reporting</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-6">
              To exercise these rights, email{' '}
              <a href="mailto:privacy@being.fyi" className="text-brand-sage hover:underline font-medium">
                privacy@being.fyi
              </a>{' '}
              or use the in-app settings.
            </p>
          </section>

          {/* Data Retention */}
          <section id="data-retention" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              7. Data Retention
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We retain your information as follows:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Local Data:</strong> Stored on your device until you delete the app or clear data</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Cloud Backup:</strong> Retained until you delete your account or disable backup</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Account Deletion:</strong> All data permanently deleted within 30 days</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Legal/Financial Records:</strong> May be retained longer to comply with legal obligations</span>
              </li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section id="children" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              8. Children's Privacy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Being is intended for users age 18 and older. We do not knowingly collect personal
              information from children under 18. If you believe we have inadvertently collected
              data from a minor, please contact us immediately at{' '}
              <a href="mailto:privacy@being.fyi" className="text-brand-sage hover:underline font-medium">
                privacy@being.fyi
              </a>.
            </p>
          </section>

          {/* International Users */}
          <section id="international" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              9. International Users
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being is based in the United States. If you access our Services from outside the U.S.,
              your data may be transferred to and processed in the U.S. or other countries where our
              service providers operate.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>GDPR Compliance:</strong> For European users, we comply with GDPR requirements,
              including data portability, right to erasure, and lawful processing bases.
            </p>
          </section>

          {/* Changes to Policy */}
          <section id="changes" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material
              changes via email (if you provided one) or in-app notification. Your continued use
              of Being after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section id="contact" className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              11. Contact Us
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our privacy practices:
            </p>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@being.fyi" className="text-brand-sage hover:underline">
                  privacy@being.fyi
                </a>
              </p>
              <p className="text-sm text-gray-600 italic">
                (Being is a wellness app, not a healthcare provider. We voluntarily adopt HIPAA-level privacy practices as a best practice choice.)
              </p>
              <p>
                <strong>Mailing Address:</strong> [TO BE DETERMINED]
              </p>
            </div>
          </section>
        </div>

        {/* Attorney Review Notice */}
        <div className="mt-12 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p className="text-sm text-gray-800">
            <strong>⚠️ DRAFT DOCUMENT:</strong> This privacy policy is a draft and requires
            comprehensive attorney review before publication. Estimated legal review cost: $5,000-10,000.
            Do not publish without legal clearance.
          </p>
        </div>
      </div>
    </div>
  );
}
