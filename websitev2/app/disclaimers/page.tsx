/**
 * Disclaimers Page
 * General disclaimers for Being services
 */

export default function DisclaimersPage() {
  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Disclaimers
          </h1>
          <p className="text-gray-700">
            <strong>Last Updated:</strong> [DATE - TO BE DETERMINED]
          </p>
        </header>

        <div className="prose prose-lg max-w-none">
          {/* General Disclaimer */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              General Disclaimer
            </h2>
            <p className="text-gray-700 leading-relaxed">
              The information provided by Being ("we," "us," or "our") through our mobile application
              and website (collectively, "Services") is for general informational and educational
              purposes only. All information is provided in good faith; however, we make no
              representation or warranty of any kind, express or implied, regarding the accuracy,
              adequacy, validity, reliability, availability, or completeness of any information
              on our Services.
            </p>
          </section>

          {/* Medical Disclaimer */}
          <section className="bg-red-50 p-8 rounded-lg border-2 border-red-400 mb-8">
            <h2 className="text-2xl font-bold text-red-900 mb-4">
              Medical & Mental Health Disclaimer
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              <strong>BEING IS A WELLNESS TOOL, NOT A MEDICAL SERVICE OR CLINICAL APPLICATION.</strong>
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">
              Being is not a substitute for professional medical care, therapy, or clinical treatment.
            </p>
            <ul className="space-y-3 text-gray-800">
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
                <span>The content in Being is not intended to be a substitute for professional
                medical advice, diagnosis, or treatment</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>Always seek the advice of your physician, psychiatrist, therapist, or other
                qualified health provider with any questions regarding a medical or mental health condition</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>Never disregard professional medical advice or delay seeking it because of
                something you read or experienced in Being</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span>If you think you may have a medical emergency, call 911 or your local
                emergency number immediately</span>
              </li>
            </ul>
            <p className="text-gray-800 leading-relaxed mt-4">
              <strong>Crisis Support:</strong> Being provides access to crisis resources like
              988 Suicide & Crisis Lifeline, but Being itself is not a crisis intervention service.
              In a mental health crisis, use 988 or 911.
            </p>
          </section>

          {/* Assessment Tools Disclaimer */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Assessment Tools Disclaimer
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being includes wellness assessment tools (PHQ-9 for depression screening, GAD-7 for anxiety screening).
              <strong> These are self-monitoring tools, not clinical assessments.</strong>
            </p>
            <ul className="space-y-2 text-gray-700 mb-4">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>For Self-Monitoring Only:</strong> Not for diagnosis or treatment decisions</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Not Clinician-Administered:</strong> Being does not provide clinical services;
                results should be reviewed with a healthcare provider</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Screening Tools:</strong> Indicate possible symptoms, not definitive diagnoses</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span><strong>Wellness Purpose:</strong> Designed to support personal reflection and awareness,
                not replace professional assessment</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              If your assessment scores indicate moderate to severe symptoms, we strongly encourage
              you to consult with a licensed mental health professional. Being's crisis detection
              features are safeguards to connect you with professional resources, not replacements
              for professional clinical judgment.
            </p>
          </section>

          {/* Philosophical Content Disclaimer */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Philosophical Content Disclaimer
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being's Stoic philosophy content is educational and interpretive in nature. While we
              strive for accuracy in representing Stoic texts and principles:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Interpretations of ancient texts may vary among scholars</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Our content represents one approach to Stoic practice</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Stoicism is a philosophical framework, not psychological treatment</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>We encourage consulting primary sources and multiple perspectives</span>
              </li>
            </ul>
          </section>

          {/* No Warranty */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No Warranty
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either
              express or implied, including but not limited to:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>Implied warranties of merchantability</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>Fitness for a particular purpose</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>Non-infringement</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>Uninterrupted, error-free, or secure operation</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>Specific results or outcomes</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We do not warrant that Being will meet your requirements, be available at all times,
              or be free from viruses or other harmful components.
            </p>
          </section>

          {/* Third-Party Links */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Third-Party Links & Services
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Being may contain links to third-party websites, services, or resources (including
              988 Lifeline, app stores, and educational resources). These links are provided for
              your convenience only.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>We do not endorse, warrant, or guarantee third-party content</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>We are not responsible for the availability, accuracy, or content of
                third-party services</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>Your use of third-party services is at your own risk</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-600 mr-2">•</span>
                <span>Third-party privacy policies and terms apply to their services</span>
              </li>
            </ul>
          </section>

          {/* User Responsibility */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              User Responsibility
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By using Being, you acknowledge that:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>You are solely responsible for your mental health and wellness decisions</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Being is a wellness and mindfulness tool, not professional medical care or clinical treatment</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Being is not a healthcare provider and does not provide healthcare services</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>You should consult licensed healthcare providers for medical concerns</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>You understand the limitations of self-assessment tools</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>You will use crisis resources (988, 911) when appropriate</span>
              </li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-gray-700 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BEING AND ITS OFFICERS, DIRECTORS, EMPLOYEES,
              AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
              DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF OR
              INABILITY TO USE OUR SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF
              SUCH DAMAGES.
            </p>
          </section>

          {/* Changes to Disclaimers */}
          <section className="bg-white p-8 rounded-lg border border-gray-300 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Changes to Disclaimers
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these disclaimers at any time. We will notify you of
              material changes via email or in-app notification. Continued use of Being after
              changes constitutes acceptance of updated disclaimers.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Questions About These Disclaimers?
            </h3>
            <p className="text-gray-700">
              Contact us at{' '}
              <a href="mailto:legal@being.fyi" className="text-accent-600 hover:underline font-medium">
                legal@being.fyi
              </a>
            </p>
          </section>
        </div>

        {/* Final Reminder */}
        <div className="mt-12 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p className="text-sm text-gray-800 text-center">
            <strong>⚠️ In Crisis?</strong> Call or text{' '}
            <a href="tel:988" className="text-accent-600 hover:underline font-bold">
              988
            </a>{' '}
            for immediate support. Being is not a crisis intervention service.
          </p>
        </div>
      </div>
    </div>
  );
}
