/**
 * Download Page - App store links and pricing
 * Professional SaaS Design
 * NOTE: App store badges and QR codes need graphic assets
 * NOTE: Pricing needs verification from product team
 */

import BrainIcon from '@/components/shared/BrainIcon';
import Button from '@/components/shared/Button';

export default function DownloadPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="px-6 py-16 sm:py-24 bg-white flex items-center justify-center min-h-[500px] sm:min-h-[600px]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <BrainIcon size={48} className="text-blue-950" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-semibold text-blue-950 leading-tight tracking-tight">
            Download Being
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Start your Stoic Mindfulness practice today. 28-day free trial included.
            No credit card required.
          </p>
        </div>
      </section>

      {/* App Store Badges */}
      <section className="px-6 py-20 sm:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 text-center">
            Available on iOS and Android
          </h2>

          <div className="mt-16 sm:mt-20 flex flex-col sm:flex-row items-center justify-center gap-8 mb-12">
            {/* iOS App Store Badge - PLACEHOLDER */}
            <div className="bg-white p-8 rounded-xl border-2 border-gray-900 w-64 h-32 flex items-center justify-center hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-2">🍎</div>
                <p className="text-sm text-gray-700 font-medium">iOS App Store Badge</p>
                <p className="text-xs text-gray-500">(graphic needed)</p>
              </div>
            </div>

            {/* Google Play Badge - PLACEHOLDER */}
            <div className="bg-white p-8 rounded-xl border-2 border-gray-900 w-64 h-32 flex items-center justify-center hover:shadow-lg transition-shadow">
              <div className="text-center">
                <div className="text-3xl mb-2">🤖</div>
                <p className="text-sm text-gray-700 font-medium">Google Play Badge</p>
                <p className="text-xs text-gray-500">(graphic needed)</p>
              </div>
            </div>
          </div>

          {/* QR Codes - PLACEHOLDER */}
          <div className="bg-white p-10 rounded-xl border-2 border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-8">
              Scan to download on your phone
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-12">
              <div className="text-center">
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center mb-3 border-2 border-gray-200">
                  <div>
                    <div className="text-4xl mb-2">📱</div>
                    <p className="text-sm text-gray-600">iOS QR Code</p>
                    <p className="text-xs text-gray-500">(graphic needed)</p>
                  </div>
                </div>
                <p className="text-sm text-gray-900 font-medium">iPhone & iPad</p>
              </div>

              <div className="text-center">
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center mb-3 border-2 border-gray-200">
                  <div>
                    <div className="text-4xl mb-2">📱</div>
                    <p className="text-sm text-gray-600">Android QR Code</p>
                    <p className="text-xs text-gray-500">(graphic needed)</p>
                  </div>
                </div>
                <p className="text-sm text-gray-900 font-medium">Android Devices</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              No hidden fees. No data selling. Just mindfulness practice with deeper meaning.
            </p>
          </div>

          <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Free Trial */}
            <div className="bg-white p-12 rounded-xl border-2 border-accent-500">
              <div className="text-center mb-8">
                <div className="text-3xl opacity-60 mb-4">🎁</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Free Trial</h3>
                <div className="text-4xl font-semibold text-gray-900 mb-3">28 days</div>
                <p className="text-gray-600">Full access, no credit card</p>
              </div>
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>All features unlocked</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Daily check-ins & assessments</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Full Learn tab access</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>No automatic billing after trial</span>
                </li>
              </ul>
            </div>

            {/* Subscription Pricing */}
            <div className="bg-white p-12 rounded-xl border-2 border-gray-200">
              <div className="text-center mb-8">
                <div className="text-3xl opacity-60 mb-4">📅</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Subscription</h3>
                <div className="text-4xl font-semibold text-gray-900 mb-3">
                  $79.99/year
                </div>
                <p className="text-gray-600">$9.99/month available</p>
                <p className="text-sm text-accent-600 mt-2">
                  Save 33% with annual billing
                </p>
              </div>
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Everything in free trial</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Unlimited cloud backup</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Export data anytime</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">✓</span>
                  <span>Cancel anytime, keep your data</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-20 sm:mt-24 text-center">
            <p className="text-sm text-gray-500">
              All prices in USD. Tax may apply based on your location.
            </p>
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="px-6 py-20 sm:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 text-center">
            System Requirements
          </h2>

          <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 max-w-4xl mx-auto">
            {/* iOS Requirements */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="text-2xl opacity-60 mr-3">🍎</span>
                iOS & iPadOS
              </h3>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>iOS 15.0 or later</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>iPhone 8 or newer</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>iPad (5th generation) or newer</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>50 MB free storage</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Internet connection for initial download only</span>
                </li>
              </ul>
            </div>

            {/* Android Requirements */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="text-2xl opacity-60 mr-3">🤖</span>
                Android
              </h3>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Android 10 or later</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Most Android phones from 2019 onward</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Tablet support included</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>50 MB free storage</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent-600 mr-2">•</span>
                  <span>Works 100% offline after download</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 text-center">
            Download FAQ
          </h2>

          <div className="mt-20 sm:mt-24 space-y-10">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Do I need to create an account?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                No account required to start. Being works completely offline with local storage.
                You can optionally create an account later for cloud backup across devices.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                What happens after my free trial ends?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Nothing automatically. We won't charge you unless you explicitly subscribe. You'll
                keep access to your data, but check-ins and assessments will be limited to view-only.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Can I use Being without internet?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes. After initial download, Being works 100% offline. All data is stored locally
                on your device. Internet is only needed for optional cloud backup.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Is my data private?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Completely. We use AES-256 encryption, store everything locally on your device,
                and never sell your data. See our{' '}
                <a href="/privacy" className="text-accent-600 hover:text-accent-700 font-medium transition-colors">
                  Privacy Policy
                </a>{' '}
                for full details.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Can I cancel my subscription?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, anytime. Cancel through your App Store or Google Play account settings. You'll
                keep access until the end of your billing period, and you can always export your data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-10 sm:py-16 bg-white border-t-2 border-gray-200">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900">
            Ready to begin?
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Join thousands practicing Stoic Mindfulness. Start your free trial today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button href="#" size="large">
              Download for iOS
            </Button>
            <Button href="#" variant="secondary" size="large">
              Download for Android
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
