/**
 * HIPAA Notice Page
 * NOTE: REQUIRES ATTORNEY REVIEW BEFORE LAUNCH
 * Explains HIPAA-level privacy practices (Being is not a covered entity)
 */

export default function HIPAAPage() {
  return (
    <div className="bg-brand-off-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-brand-midnight mb-4">
            HIPAA Notice
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            ⚠️ Draft document - Attorney review required
          </p>
        </header>

        <div className="prose prose-lg max-w-none">
          {/* Important Distinction */}
          <section className="bg-yellow-50 p-8 rounded-lg border-2 border-yellow-400 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Important: Being is NOT a HIPAA Covered Entity
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              <strong>Being is a wellness application, not a healthcare provider.</strong> We are not a
              healthcare provider, health plan, or healthcare clearinghouse. Therefore, Being is
              <strong> not legally subject to HIPAA regulations</strong>.
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              HIPAA applies to "covered entities" (healthcare providers, health plans, healthcare clearinghouses)
              and their "business associates." Being does not fall into either category because we provide
              wellness tools and self-monitoring resources, not medical services.
            </p>
            <p className="text-gray-800 leading-relaxed">
              <strong>We voluntarily choose to adopt HIPAA-level security and privacy standards</strong> because
              we deeply care about protecting your mental health data. This is our commitment to you, not a
              legal obligation. We believe wellness data deserves the same protection as medical data.
            </p>
          </section>

          {/* Our Commitment */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              Our Voluntary Commitment to HIPAA-Level Privacy
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>We choose to adopt HIPAA-equivalent practices because we care about your privacy.</strong>
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Even though HIPAA does not legally apply to Being (we're a wellness app, not a healthcare
              provider), we voluntarily implement the following HIPAA-inspired safeguards to protect your
              mental health information:
            </p>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              Administrative Safeguards
            </h3>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Privacy and security policies reviewed regularly</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Employee training on data privacy and security</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Limited access to user data (least privilege principle)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Incident response plan for data breaches</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              Physical Safeguards
            </h3>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Secure cloud infrastructure with restricted physical access</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Data center security controls and monitoring</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Secure disposal of electronic media</span>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-brand-midnight mb-3">
              Technical Safeguards
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Encryption:</strong> AES-256 at rest, TLS 1.3 in transit</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Access Controls:</strong> Multi-factor authentication, role-based access</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Audit Logging:</strong> Comprehensive logging of data access</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Automatic Logoff:</strong> Session timeouts for inactive users</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Data Integrity:</strong> Validation and verification of data accuracy</span>
              </li>
            </ul>
          </section>

          {/* Your Protected Health Information */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              What Information We Protect
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We voluntarily protect the following wellness information with HIPAA-level security
              (even though we're not legally required to do so):
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Wellness assessments (PHQ-9, GAD-7 scores and responses for self-monitoring)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Daily check-in data (mood, emotions, thoughts)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Journal entries and personal reflections</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Progress tracking and historical data</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Any personally identifiable information (email, name)</span>
              </li>
            </ul>
          </section>

          {/* When We May Disclose Information */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              When We May Disclose Your Information
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Following HIPAA-inspired principles (by choice, not legal requirement), we limit disclosure
              of your information to:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">1.</span>
                <span><strong>With Your Authorization:</strong> When you explicitly request to share
                data with healthcare providers</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">2.</span>
                <span><strong>For Treatment, Payment, Operations:</strong> To provide our services,
                process payments, and improve the app (de-identified data only)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">3.</span>
                <span><strong>As Required by Law:</strong> When compelled by valid legal process
                (subpoena, court order)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">4.</span>
                <span><strong>Public Health & Safety:</strong> To prevent serious threat to health
                or safety (rare, emergency situations only)</span>
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              Your Privacy Rights
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Inspired by HIPAA principles (which we voluntarily adopt), you have the right to:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Access:</strong> Request and receive a copy of your health information</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Amendment:</strong> Request corrections to inaccurate information</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Accounting:</strong> Request a list of disclosures we've made</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Restriction:</strong> Request limits on how we use your information</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Confidential Communication:</strong> Request communication via specific methods</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Portability:</strong> Export your data in portable format</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span><strong>Deletion:</strong> Request deletion of your account and all data</span>
              </li>
            </ul>
          </section>

          {/* Breach Notification */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              Breach Notification
            </h2>
            <p className="text-gray-700 leading-relaxed">
              In the unlikely event of a data breach affecting your protected information, we will
              notify you within 60 days via email and/or in-app notification, following HIPAA breach
              notification standards (even though we're not legally required to comply with HIPAA).
              The notification will include:
            </p>
            <ul className="space-y-2 text-gray-700 mt-4">
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Description of what happened</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Types of information involved</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Steps you should take to protect yourself</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-sage mr-2">•</span>
                <span>Steps we're taking to investigate and prevent future breaches</span>
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-brand-midnight mb-4">
              Questions or Concerns?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about our voluntary HIPAA-level privacy practices:
            </p>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Privacy Officer:</strong>{' '}
                <a href="mailto:privacy@being.fyi" className="text-brand-sage hover:underline">
                  privacy@being.fyi
                </a>
              </p>
              <p>
                <strong>Mailing Address:</strong> [TO BE DETERMINED]
              </p>
            </div>
          </section>

          {/* Effective Date */}
          <section className="bg-gray-100 p-6 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Effective Date:</strong> [TO BE DETERMINED]<br />
              <strong>Last Reviewed:</strong> [TO BE DETERMINED]
            </p>
          </section>
        </div>

        {/* Attorney Review Notice */}
        <div className="mt-12 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p className="text-sm text-gray-800">
            <strong>⚠️ DRAFT DOCUMENT:</strong> This HIPAA Notice requires attorney review before
            publication. Note: Being is NOT legally subject to HIPAA (we're a wellness app, not a
            healthcare provider), but we voluntarily adopt HIPAA-level practices. Attorney should
            review to ensure accurate representation of this voluntary commitment.
          </p>
        </div>
      </div>
    </div>
  );
}
