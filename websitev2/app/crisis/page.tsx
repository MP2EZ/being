/**
 * Crisis Resources Page - 988 and mental health support
 * NOTE: Content requires crisis agent validation before launch
 * Tone: Calm, supportive, informative (not alarming)
 */

import BrainIcon from '@/components/shared/BrainIcon';

export default function CrisisPage() {
  return (
    <div className="bg-brand-off-white">
      {/* Hero Section - Calm and Supportive */}
      <section className="px-6 py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-6">🫂</div>
          <h1 className="text-4xl sm:text-5xl font-bold text-brand-midnight mb-6">
            You're not alone
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
            If you're in crisis or need support, help is available 24/7. Trained counselors
            are ready to listen, free and confidential.
          </p>
        </div>
      </section>

      {/* 988 Primary CTA - Prominent but Calm */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-crisis-bg border-2 border-crisis-border rounded-lg p-8 sm:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-brand-midnight mb-4">
                  988 Suicide & Crisis Lifeline
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Call or text <strong className="text-brand-midnight">988</strong> to connect
                  with a trained crisis counselor. Available 24 hours a day, 7 days a week,
                  365 days a year.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <span className="text-brand-sage mr-3 text-xl">✓</span>
                    <span className="text-gray-700">Free and confidential</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-brand-sage mr-3 text-xl">✓</span>
                    <span className="text-gray-700">No judgment, just support</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-brand-sage mr-3 text-xl">✓</span>
                    <span className="text-gray-700">Available in English and Spanish</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-brand-sage mr-3 text-xl">✓</span>
                    <span className="text-gray-700">Veterans: Press 1 for specialized support</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <a
                  href="tel:988"
                  className="bg-crisis-border hover:opacity-90 text-white font-bold py-6 px-12 rounded-lg text-center text-2xl transition-opacity"
                >
                  📞 Call 988
                </a>
                <a
                  href="sms:988"
                  className="bg-brand-midnight hover:opacity-90 text-white font-bold py-4 px-12 rounded-lg text-center text-lg transition-opacity"
                >
                  💬 Text 988
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Online chat also available at{' '}
              <a
                href="https://988lifeline.org/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-sage hover:underline font-medium"
              >
                988lifeline.org/chat
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-brand-midnight text-center mb-12">
            What to expect when you call 988
          </h2>

          <div className="space-y-6">
            <div className="bg-brand-off-white p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-brand-midnight mb-3">
                1. You'll speak with a trained counselor
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Crisis counselors are trained to listen, provide support, and help you through
                difficult moments. They won't judge you or tell you what to do—they're there
                to listen and help you find your own path forward.
              </p>
            </div>

            <div className="bg-brand-off-white p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-brand-midnight mb-3">
                2. Your call is confidential
              </h3>
              <p className="text-gray-700 leading-relaxed">
                What you share stays private. Counselors may only break confidentiality if they
                believe you're in imminent danger and need immediate emergency assistance.
              </p>
            </div>

            <div className="bg-brand-off-white p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-brand-midnight mb-3">
                3. You can call for yourself or someone else
              </h3>
              <p className="text-gray-700 leading-relaxed">
                988 is available if you're concerned about yourself or someone you care about.
                Counselors can provide guidance on how to support someone in crisis.
              </p>
            </div>

            <div className="bg-brand-off-white p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-brand-midnight mb-3">
                4. No situation is too small
              </h3>
              <p className="text-gray-700 leading-relaxed">
                You don't need to be in immediate danger to call. If you're struggling,
                overwhelmed, or just need someone to talk to, 988 is here for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-brand-midnight text-center mb-12">
            Additional Crisis Resources
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Crisis Text Line */}
            <div className="bg-white p-8 rounded-lg border border-gray-300">
              <h3 className="text-xl font-semibold text-brand-midnight mb-3">
                Crisis Text Line
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Text <strong>HOME</strong> to <strong>741741</strong> to connect with a
                Crisis Counselor. Free 24/7 support via text message.
              </p>
              <a
                href="sms:741741&body=HOME"
                className="inline-block bg-brand-sage hover:opacity-90 text-white font-medium py-3 px-6 rounded-lg transition-opacity"
              >
                Text HOME to 741741
              </a>
            </div>

            {/* Veterans Crisis Line */}
            <div className="bg-white p-8 rounded-lg border border-gray-300">
              <h3 className="text-xl font-semibold text-brand-midnight mb-3">
                Veterans Crisis Line
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Call 988 and press 1, or text <strong>838255</strong>. Confidential support
                for Veterans, service members, National Guard, and their families.
              </p>
              <a
                href="tel:988"
                className="inline-block bg-brand-sage hover:opacity-90 text-white font-medium py-3 px-6 rounded-lg transition-opacity"
              >
                Call 988, Press 1
              </a>
            </div>

            {/* The Trevor Project (LGBTQ+) */}
            <div className="bg-white p-8 rounded-lg border border-gray-300">
              <h3 className="text-xl font-semibold text-brand-midnight mb-3">
                The Trevor Project (LGBTQ+ Youth)
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Call <strong>1-866-488-7386</strong> or text <strong>START</strong> to{' '}
                <strong>678678</strong>. Crisis support for LGBTQ+ young people under 25.
              </p>
              <a
                href="tel:1-866-488-7386"
                className="inline-block bg-brand-sage hover:opacity-90 text-white font-medium py-3 px-6 rounded-lg transition-opacity"
              >
                Call Trevor Project
              </a>
            </div>

            {/* NAMI HelpLine */}
            <div className="bg-white p-8 rounded-lg border border-gray-300">
              <h3 className="text-xl font-semibold text-brand-midnight mb-3">
                NAMI HelpLine
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Call <strong>1-800-950-6264</strong> or text <strong>NAMI</strong> to{' '}
                <strong>62640</strong>. Mental health support and resources, M-F 10am-10pm ET.
              </p>
              <a
                href="tel:1-800-950-6264"
                className="inline-block bg-brand-sage hover:opacity-90 text-white font-medium py-3 px-6 rounded-lg transition-opacity"
              >
                Call NAMI
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* When to Call 911 */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-900 mb-4">
              When to call 911 (Emergency)
            </h2>
            <p className="text-gray-800 leading-relaxed mb-4">
              Call <strong>911</strong> immediately if:
            </p>
            <ul className="space-y-2 text-gray-800">
              <li className="flex items-start">
                <span className="text-red-600 mr-3">•</span>
                <span>You or someone else has taken action to harm themselves</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-3">•</span>
                <span>There is an immediate medical emergency</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-3">•</span>
                <span>Someone is threatening to harm themselves or others right now</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-3">•</span>
                <span>There is an active life-threatening situation</span>
              </li>
            </ul>
            <div className="mt-6 pt-6 border-t border-red-300">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> 988 is for crisis support and suicide prevention. 911
                is for immediate medical emergencies and life-threatening situations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* International Resources */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-brand-midnight text-center mb-8">
            International Crisis Resources
          </h2>
          <p className="text-center text-gray-700 mb-8">
            If you're outside the United States, please visit{' '}
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-sage hover:underline font-medium"
            >
              findahelpline.com
            </a>{' '}
            to find crisis support in your country.
          </p>
        </div>
      </section>

      {/* Being Disclaimer */}
      <section className="px-6 py-16 bg-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <BrainIcon size={48} className="text-brand-midnight mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-brand-midnight mb-4">
            About Being
          </h3>
          <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto">
            Being is a wellness and mindfulness tool, not a substitute for professional medical
            care or emergency services. If you're in crisis, please use the resources above.
            Our app includes 988 access from every screen because your safety is paramount.
          </p>
        </div>
      </section>
    </div>
  );
}
