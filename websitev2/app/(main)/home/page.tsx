/**
 * Homepage - Being
 * Professional SaaS Design
 * Hero + Three Pillars + Download CTA
 */

import BrainIcon from '@/components/shared/BrainIcon';
import Button from '@/components/shared/Button';
import PhilosophyIcon from '@/components/shared/icons/PhilosophyIcon';
import ScienceIcon from '@/components/shared/icons/ScienceIcon';
import PrivacyIcon from '@/components/shared/icons/PrivacyIcon';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="
        px-6 py-16 sm:py-24
        bg-white
        flex items-center justify-center
        min-h-[500px] sm:min-h-[600px]
      ">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Icon - subtle, professional */}
          <div className="flex justify-center">
            <BrainIcon size={48} className="text-blue-950" />
          </div>

          {/* Headline - large, clear hierarchy */}
          <h1 className="
            text-6xl sm:text-7xl
            font-semibold text-blue-950
            leading-tight tracking-tight
          ">
            Mindfulness with meaning
          </h1>

          {/* Subhead - larger, relaxed */}
          <p className="
            text-xl sm:text-2xl text-gray-600
            leading-relaxed max-w-2xl mx-auto
          ">
            Ancient Stoic wisdom meets modern mental health practice. Daily mindfulness grounded in 2,000 years of philosophical wisdom.
          </p>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button href="/download" size="large">
              Begin Your Practice
            </Button>
            <Button href="/philosophy" variant="secondary" size="large">
              Explore Stoic Mindfulness
            </Button>
          </div>

          {/* Trust Signal */}
          <p className="text-sm text-gray-500 pt-4">
            28-day free trial · No credit card required
          </p>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="px-6 py-24 sm:py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900">
              Why Being is different
            </h2>
          </div>

          {/* Open Layout (no cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
            {/* Philosophy */}
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <PhilosophyIcon size={40} className="text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Philosophy
              </h3>
              <p className="text-gray-600 leading-relaxed">
                2,000 years of Stoic wisdom from Marcus Aurelius, Epictetus, and Seneca. Not just calming sounds—mindfulness with deeper meaning.
              </p>
              <div>
                <Link
                  href="/philosophy"
                  className="text-accent-600 hover:text-accent-700 font-medium transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Learn about Stoic Mindfulness
                  <span className="text-xs">→</span>
                </Link>
              </div>
            </div>

            {/* Science */}
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <ScienceIcon size={40} className="text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Science
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Clinical tools (PHQ-9, GAD-7) track your mental health. Immediate crisis support via 988. Mindfulness meets evidence-based care.
              </p>
              <div>
                <Link
                  href="/features"
                  className="text-accent-600 hover:text-accent-700 font-medium transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Explore app features
                  <span className="text-xs">→</span>
                </Link>
              </div>
            </div>

            {/* Privacy */}
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <PrivacyIcon size={40} className="text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Privacy
              </h3>
              <p className="text-gray-600 leading-relaxed">
                HIPAA-level encryption. All data stored locally on your device. We never sell your information. Your mental health data belongs to you.
              </p>
              <div>
                <Link
                  href="/privacy"
                  className="text-accent-600 hover:text-accent-700 font-medium transition-colors duration-150 inline-flex items-center gap-1"
                >
                  Read privacy policy
                  <span className="text-xs">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA Section */}
      <section className="
        px-6 py-12 sm:py-20
        bg-white border-t-2 border-gray-200
      ">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-8">
            Ready to begin?
          </h2>

          <p className="text-lg text-gray-600 leading-relaxed mb-6">
            Join thousands practicing Stoic Mindfulness. Start your 28-day free trial today.
          </p>

          <div>
            <Button href="/download" size="large">
              Download Being
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
