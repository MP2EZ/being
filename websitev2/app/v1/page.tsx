/**
 * Version 1: Extra Spacious (Notion-style)
 * - Massive vertical gaps
 * - Each section takes significant screen space
 * - Very generous padding throughout
 */

import BrainIcon from '@/components/shared/BrainIcon';
import Button from '@/components/shared/Button';
import PillarCard from '@/components/features/PillarCard';
import PhilosophyIcon from '@/components/shared/icons/PhilosophyIcon';
import ScienceIcon from '@/components/shared/icons/ScienceIcon';
import PrivacyIcon from '@/components/shared/icons/PrivacyIcon';

export default function V1() {
  return (
    <div className="bg-white">
      {/* Hero - Nearly full viewport */}
      <section className="px-6 py-24 min-h-screen flex items-center">
        <div className="max-w-3xl mx-auto text-center w-full">
          <BrainIcon size={56} className="text-gray-800 mb-20 mx-auto" />
          <h1 className="text-6xl font-semibold text-gray-900 mb-10 leading-tight">
            Mindfulness with meaning
          </h1>
          <p className="text-xl text-gray-600 mb-20 mx-auto max-w-2xl leading-relaxed">
            Ancient Stoic wisdom meets modern mental health practice. Daily mindfulness grounded in 2,000 years of philosophical wisdom.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-16 justify-center">
            <Button href="/download" size="large">Begin Your Practice</Button>
            <Button href="/philosophy" variant="secondary" size="large">Explore Stoic Mindfulness</Button>
          </div>

          <p className="text-sm text-gray-500">28-day free trial · No credit card required</p>
        </div>
      </section>

      {/* Three Pillars - Lots of vertical space */}
      <section className="px-6 py-40 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold text-gray-900 text-center mb-32">
            Why Being is different
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <PillarCard
              icon={<PhilosophyIcon size={48} />}
              title="Philosophy"
              description="2,000 years of Stoic wisdom from Marcus Aurelius, Epictetus, and Seneca. Not just calming sounds—mindfulness with deeper meaning."
              link={{ href: '/philosophy', text: 'Learn about Stoic Mindfulness' }}
            />
            <PillarCard
              icon={<ScienceIcon size={48} />}
              title="Science"
              description="Clinical tools (PHQ-9, GAD-7) track your mental health. Immediate crisis support via 988. Mindfulness meets evidence-based care."
              link={{ href: '/features', text: 'Explore app features' }}
            />
            <PillarCard
              icon={<PrivacyIcon size={48} />}
              title="Privacy"
              description="HIPAA-level encryption. All data stored locally on your device. We never sell your information. Your mental health data belongs to you."
              link={{ href: '/privacy', text: 'Read privacy policy' }}
            />
          </div>
        </div>
      </section>

      {/* Download CTA - Massive gap above */}
      <section className="px-6 py-40 bg-white border-t border-gray-200 mt-40">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-semibold text-gray-900 mb-8">Ready to begin?</h2>
          <p className="text-lg text-gray-600 mb-12 leading-relaxed max-w-xl mx-auto">
            Join thousands practicing Stoic Mindfulness. Start your 28-day free trial today.
          </p>
          <Button href="/download" size="large">Download Being</Button>
        </div>
      </section>
    </div>
  );
}
