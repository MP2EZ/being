/**
 * Philosophy Page - Stoic Mindfulness explained
 * Professional SaaS Design
 * Updated structure: Five Core Principles as primary framework
 * NOTE: Content validated by philosopher agent
 */

'use client';

import { useState } from 'react';
import BrainIcon from '@/components/shared/BrainIcon';
import Button from '@/components/shared/Button';

export default function PhilosophyPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="px-6 py-16 sm:py-24 bg-white flex items-center justify-center min-h-[500px] sm:min-h-[600px]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <BrainIcon size={48} className="text-blue-950" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-semibold text-blue-950 leading-tight tracking-tight">
            What is Stoic Mindfulness?
          </h1>
          <div className="space-y-6 text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
            <p>
              Stoic Mindfulness is not just Stoicism plus mindfulness—it's a unique integrated system
              that combines ancient philosophical wisdom with modern contemplative practice and neuroscience.
            </p>
            <p>
              It's the practice of <strong className="text-gray-900">aware wisdom</strong>: bringing full presence to each moment
              while guided by principles that help you discern what truly matters and respond with virtue.
            </p>
          </div>
        </div>
      </section>

      {/* Why These Traditions Need Each Other */}
      <section className="px-6 py-20 sm:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 text-center">
            Why These Traditions Need Each Other
          </h2>

          <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 max-w-4xl mx-auto">
            {/* Stoicism Alone */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Stoicism Alone
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Classical Stoicism offers profound wisdom, but it faces a challenge:
              </p>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span>Intellectual understanding without embodied awareness</span>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span>Retrospective analysis instead of real-time response</span>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span>Knowing principles but struggling to apply them in the moment</span>
                </li>
              </ul>
            </div>

            {/* Mindfulness Alone */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Mindfulness Alone
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Traditional mindfulness cultivates presence, but it can lack:
              </p>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span>Ethical framework to guide what deserves attention</span>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span>Guidance on when to accept vs. when to act</span>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span>Direction for wise discernment and moral action</span>
                </li>
              </ul>
            </div>
          </div>

          {/* The Synthesis */}
          <div className="mt-20 sm:mt-24 bg-gray-900 text-white p-12 rounded-xl max-w-4xl mx-auto">
            <h3 className="text-2xl font-semibold mb-4">The Synthesis</h3>
            <p className="text-lg leading-relaxed mb-4 text-gray-100">
              <strong>Aware Wisdom = Metacognitive Awareness × Philosophical Discernment</strong>
            </p>
            <p className="leading-relaxed text-gray-300">
              Mindfulness provides the perceptual training to catch impressions before they become reactions.
              Stoicism provides the ethical framework to discern wise responses. Together, they create a path
              to human flourishing through transformation of consciousness—not just calm, but wisdom in action.
            </p>
          </div>
        </div>
      </section>

      {/* The Five Core Principles */}
      <section className="px-6 py-20 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900">
              The Five Core Principles
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              These principles are the foundation of Stoic Mindfulness. They guide every check-in,
              practice, and moment of reflection in Being.
            </p>
          </div>

          <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 max-w-4xl mx-auto">
            {/* Principle 1: Aware Presence */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="text-3xl opacity-60 flex-shrink-0">🧘</div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">1. Aware Presence</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Be fully here, now. Notice your breath, body, thoughts, and emotions without getting
                    swept away by them.
                  </p>
                  <p className="text-sm text-accent-600 font-medium italic">
                    "Am I present and aware right now?"
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 2: Radical Acceptance */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="text-3xl opacity-60 flex-shrink-0">🌊</div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">2. Radical Acceptance</h3>
                  <p className="text-gray-600 leading-relaxed">
                    This is what's happening. Acceptance doesn't mean approval—it means acknowledging
                    reality as the foundation for wise action.
                  </p>
                  <p className="text-sm text-accent-600 font-medium italic">
                    "Can I accept this moment as it is?"
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 3: Sphere Sovereignty */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="text-3xl opacity-60 flex-shrink-0">🎯</div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">3. Sphere Sovereignty</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Focus only on what you control: your judgments, intentions, and character. Release
                    attachment to outcomes. Govern only your domain.
                  </p>
                  <p className="text-sm text-accent-600 font-medium italic">
                    "What's actually within my control here?"
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 4: Virtuous Response */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="text-3xl opacity-60 flex-shrink-0">⚖️</div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">4. Virtuous Response</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Character over outcomes. In each moment, ask what wisdom, courage, justice,
                    or temperance requires. Choose the response that aligns with your values.
                  </p>
                  <p className="text-sm text-accent-600 font-medium italic">
                    "What does virtue require of me now?"
                  </p>
                </div>
              </div>
            </div>

            {/* Principle 5: Interconnected Living */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="text-3xl opacity-60 flex-shrink-0">🌍</div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">5. Interconnected Living</h3>
                  <p className="text-gray-600 leading-relaxed">
                    You are part of a larger whole. Bring full presence to others. Recognize that humanity
                    shares a common nature and common good.
                  </p>
                  <p className="text-sm text-accent-600 font-medium italic">
                    "How can I serve the common good?"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 sm:mt-24 p-10 bg-gray-50 rounded-xl text-center max-w-4xl mx-auto">
            <p className="text-gray-700 leading-relaxed">
              These five principles work together. Aware Presence grounds you in the moment. Radical Acceptance
              meets reality honestly. Sphere Sovereignty focuses your energy. Virtuous Response guides your
              actions. Interconnected Living connects you to others and the world.
            </p>
          </div>
        </div>
      </section>

      {/* How It Differs */}
      <section className="px-6 py-20 sm:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 text-center">
            How Stoic Mindfulness Differs
          </h2>

          <div className="mt-20 sm:mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* vs Traditional Mindfulness */}
            <div className="bg-white p-12 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-8 text-center">
                vs. Traditional Mindfulness
              </h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-500 mb-4 text-sm">Traditional</h4>
                  <ul className="space-y-3 text-gray-600 text-sm">
                    <li>• Present awareness</li>
                    <li>• Non-judgment</li>
                    <li>• Stress reduction</li>
                    <li>• Often isolated practice</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-accent-600 mb-4 text-sm">Stoic Mindfulness</h4>
                  <ul className="space-y-3 text-gray-600 text-sm">
                    <li>✓ Awareness + philosophy</li>
                    <li>✓ Wise discernment</li>
                    <li>✓ Meaning & flourishing</li>
                    <li>✓ Integrated with ethics</li>
                  </ul>
                </div>
              </div>
              <p className="mt-8 text-gray-600 leading-relaxed italic text-sm text-center">
                Adds a <em>why</em> to the <em>how</em>. Not just calm—wisdom in action.
              </p>
            </div>

            {/* vs Classical Stoicism */}
            <div className="bg-white p-12 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-8 text-center">
                vs. Classical Stoicism
              </h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-500 mb-4 text-sm">Classical</h4>
                  <ul className="space-y-3 text-gray-600 text-sm">
                    <li>• Philosophical study</li>
                    <li>• Intellectual reasoning</li>
                    <li>• Retrospective analysis</li>
                    <li>• Reading & reflection</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-accent-600 mb-4 text-sm">Stoic Mindfulness</h4>
                  <ul className="space-y-3 text-gray-600 text-sm">
                    <li>✓ Embodied practice</li>
                    <li>✓ Somatic awareness</li>
                    <li>✓ Real-time response</li>
                    <li>✓ Daily contemplation</li>
                  </ul>
                </div>
              </div>
              <p className="mt-8 text-gray-600 leading-relaxed italic text-sm text-center">
                Philosophy + contemplative practice. Knowing becomes being.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Deepen Your Practice */}
      <section className="px-6 py-20 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 text-center">
            Deepen Your Practice
          </h2>

          {/* The Four Cardinal Virtues */}
          <div className="mt-12">
            <button
              onClick={() => toggleSection('virtues')}
              className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left border-2 border-gray-200"
            >
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  ⚖️ The Four Cardinal Virtues
                </h3>
                <p className="text-gray-600">
                  The foundation of Virtuous Response: Wisdom, Courage, Justice, Temperance
                </p>
              </div>
              <span className="text-2xl text-accent-600">
                {expandedSection === 'virtues' ? '−' : '+'}
              </span>
            </button>

            {expandedSection === 'virtues' && (
              <div className="mt-4 p-8 bg-white border-2 border-gray-200 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Wisdom */}
                  <div>
                    <div className="text-3xl mb-3">🦉</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Wisdom</h4>
                    <p className="text-gray-600 leading-relaxed mb-3 text-sm">
                      Discerning what is truly good, bad, or indifferent. Understanding what is
                      within your control and what is not.
                    </p>
                    <blockquote className="border-l-4 border-accent-500 pl-3 italic text-gray-600 text-sm">
                      "You have power over your mind—not outside events."
                      <footer className="text-xs mt-1 not-italic">— Marcus Aurelius, Meditations 6.8</footer>
                    </blockquote>
                  </div>

                  {/* Courage */}
                  <div>
                    <div className="text-3xl mb-3">🦁</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Courage</h4>
                    <p className="text-gray-600 leading-relaxed mb-3 text-sm">
                      Not the absence of fear, but action in spite of it. Facing difficulties
                      with resilience and maintaining your principles.
                    </p>
                    <blockquote className="border-l-4 border-accent-500 pl-3 italic text-gray-600 text-sm">
                      "It is because we do not dare that things are difficult."
                      <footer className="text-xs mt-1 not-italic">— Seneca, Letters to Lucilius 104.26</footer>
                    </blockquote>
                  </div>

                  {/* Justice */}
                  <div>
                    <div className="text-3xl mb-3">⚖️</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Justice</h4>
                    <p className="text-gray-600 leading-relaxed mb-3 text-sm">
                      Treating others with fairness, kindness, and respect. Recognizing our
                      responsibilities to the larger community.
                    </p>
                    <blockquote className="border-l-4 border-accent-500 pl-3 italic text-gray-600 text-sm">
                      "What brings no benefit to the hive brings none to the bee."
                      <footer className="text-xs mt-1 not-italic">— Marcus Aurelius, Meditations 6.54</footer>
                    </blockquote>
                  </div>

                  {/* Temperance */}
                  <div>
                    <div className="text-3xl mb-3">🌊</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Temperance</h4>
                    <p className="text-gray-600 leading-relaxed mb-3 text-sm">
                      Self-control and moderation. Finding balance, avoiding excess, and
                      cultivating discipline in thought and action.
                    </p>
                    <blockquote className="border-l-4 border-accent-500 pl-3 italic text-gray-600 text-sm">
                      "It is in our power not to want what we don't have."
                      <footer className="text-xs mt-1 not-italic">— Seneca, Letters to Lucilius 123.3 (adapted)</footer>
                    </blockquote>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Entry Level */}
          <div className="mt-12">
            <button
              onClick={() => toggleSection('entry')}
              className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left border-2 border-gray-200"
            >
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  📘 Foundational Practices (0-6 months)
                </h3>
                <p className="text-gray-600">
                  Building the foundation: daily awareness and discernment
                </p>
              </div>
              <span className="text-2xl text-accent-600">
                {expandedSection === 'entry' ? '−' : '+'}
              </span>
            </button>

            {expandedSection === 'entry' && (
              <div className="mt-4 p-8 bg-white border-2 border-gray-200 rounded-xl space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Morning & Evening Check-ins</h4>
                  <p className="text-gray-600 leading-relaxed">
                    <strong className="text-gray-900">Morning:</strong> Set your intention. What principle will you practice today?<br />
                    <strong className="text-gray-900">Evening:</strong> Review your day. Where did awareness and virtue meet? Where can you grow?
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Aware Presence Practice</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Notice your breath. Observe sensations in your body. Watch thoughts arise and pass
                    without getting swept away. This is the foundation of all practice.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Sphere Sovereignty Sorting</h4>
                  <p className="text-gray-600 leading-relaxed">
                    When worry arises, ask: "Is this within my control?" If yes, plan action. If no,
                    practice acceptance. This is the cornerstone of Stoic practice.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Intermediate Level */}
          <div className="mt-12">
            <button
              onClick={() => toggleSection('intermediate')}
              className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left border-2 border-gray-200"
            >
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  📙 Effortful Integration (6-18 months)
                </h3>
                <p className="text-gray-600">
                  Classical Stoic practices for building resilience and perspective
                </p>
              </div>
              <span className="text-2xl text-accent-600">
                {expandedSection === 'intermediate' ? '−' : '+'}
              </span>
            </button>

            {expandedSection === 'intermediate' && (
              <div className="mt-4 p-8 bg-white border-2 border-gray-200 rounded-xl space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Premeditatio Malorum (Negative Visualization)</h4>
                  <p className="text-gray-600 leading-relaxed">
                    <strong className="text-gray-900">Rational contemplation, not catastrophizing:</strong> Briefly imagine losing
                    what you value to cultivate gratitude and prepare for uncertainty. Time-limited (2-3 minutes),
                    followed by appreciation for the present. This builds resilience without anxiety.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">The View from Above</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Zoom out: see yourself, your city, your country, the Earth from space. This cosmic
                    perspective helps you see daily worries in proper proportion.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Voluntary Discomfort</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Occasionally practice small discomforts: a cold shower, fasting, saying no to pleasures.
                    This builds resilience and reminds you that comfort is not required for well-being.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Level */}
          <div className="mt-12">
            <button
              onClick={() => toggleSection('advanced')}
              className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left border-2 border-gray-200"
            >
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  📕 Integrated Wisdom (2-5+ years)
                </h3>
                <p className="text-gray-600">
                  Principles arising spontaneously, philosophy embodied in character
                </p>
              </div>
              <span className="text-2xl text-accent-600">
                {expandedSection === 'advanced' ? '−' : '+'}
              </span>
            </button>

            {expandedSection === 'advanced' && (
              <div className="mt-4 p-8 bg-white border-2 border-gray-200 rounded-xl space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Amor Fati (Love of Fate)</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Beyond acceptance: loving what happens. Not passive resignation, but active embrace
                    of reality as the raw material for growth. Every obstacle becomes fuel for virtue.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Memento Mori (Remember Death)</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Your time is limited—this isn't morbid, it's liberating. When you remember mortality,
                    trivial concerns fade and what truly matters becomes clear. Every moment is precious.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Sympatheia (Interconnection)</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Deep recognition that you are part of a larger whole. Your actions ripple outward.
                    Justice isn't optional—it's recognition that humanity shares a common nature and
                    common good. Bring presence to this truth.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section className="px-6 py-10 sm:py-16 bg-white border-t-2 border-gray-200">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900">
            Practice Stoic Mindfulness daily
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Being guides you through the Five Core Principles with morning, midday, and evening check-ins.
            Build awareness, cultivate virtue, and find deeper meaning in mindfulness practice.
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
