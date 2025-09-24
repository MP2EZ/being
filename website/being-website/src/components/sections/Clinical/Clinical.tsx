'use client';

/**
 * Being. Clinical Section
 * Clinical evidence, research, and validation showcase
 */

import React from 'react';
import { Container, Typography, Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { clinicalInfo, primaryTherapistTestimonial } from '@/config/site';

interface ClinicalProps {
  className?: string;
  variant?: 'default' | 'detailed' | 'research-focused';
  'data-testid'?: string;
}

export const Clinical: React.FC<ClinicalProps> = ({
  className,
  variant = 'default',
  'data-testid': testId,
}) => {
  // Note: variant will be used for future styling variants
  console.log('Clinical component variant:', variant);
  const sectionClasses = cn(
    // Base styling
    'py-16 lg:py-24',
    'bg-gradient-to-b from-clinical-safe/5 to-white',
    
    className
  );

  return (
    <section className={sectionClasses} data-testid={testId} id="clinical">
      <Container>
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-clinical-safe/10 text-clinical-safe rounded-full mb-6">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <Typography variant="caption" className="font-medium">
              Clinically Validated Approach
            </Typography>
          </div>
          
          <Typography 
            variant="h2" 
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            element="h2"
          >
            Backed by 20+ Years of Research
          </Typography>
          <Typography 
            variant="body" 
            className="text-xl text-gray-600 max-w-3xl mx-auto"
            element="p"
          >
            Being. is built on the proven foundation of Mindfulness-Based Cognitive Therapy (MBCT), 
            with every feature grounded in peer-reviewed clinical research.
          </Typography>
        </div>

        {/* MBCT Overview */}
        <div className="bg-white rounded-2xl shadow-medium p-8 lg:p-12 mb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <Typography 
                variant="h3" 
                className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6"
                element="h3"
              >
                {clinicalInfo.approach.title}
              </Typography>
              <Typography 
                variant="body" 
                className="text-gray-600 leading-relaxed mb-8"
                element="p"
              >
                {clinicalInfo.approach.description}
              </Typography>
              
              {/* Benefits List */}
              <div className="space-y-4 mb-8">
                {clinicalInfo.approach.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-6 h-6 bg-clinical-safe rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <Typography variant="body" className="text-gray-700">
                      {benefit}
                    </Typography>
                  </div>
                ))}
              </div>

              <Button
                variant="clinical"
                size="lg"
                href="/clinical-evidence"
                className="inline-flex items-center"
              >
                View Full Clinical Evidence
                <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-clinical-safe/10 to-clinical-safe/5 rounded-2xl p-8 text-center">
                {/* Research Metrics */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Typography variant="h2" className="text-4xl font-bold text-clinical-safe mb-2">
                      43%
                    </Typography>
                    <Typography variant="body" className="text-gray-600 text-sm">
                      Reduction in depression relapse rates
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="h2" className="text-4xl font-bold text-clinical-safe mb-2">
                      20+
                    </Typography>
                    <Typography variant="body" className="text-gray-600 text-sm">
                      Years of clinical research
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="h2" className="text-4xl font-bold text-clinical-safe mb-2">
                      1000+
                    </Typography>
                    <Typography variant="body" className="text-gray-600 text-sm">
                      Participants in studies
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="h2" className="text-4xl font-bold text-clinical-safe mb-2">
                      50+
                    </Typography>
                    <Typography variant="body" className="text-gray-600 text-sm">
                      Peer-reviewed studies
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Research Studies */}
        <div className="mb-16">
          <Typography 
            variant="h3" 
            className="text-2xl lg:text-3xl font-bold text-gray-900 text-center mb-12"
            element="h3"
          >
            Key Research Studies
          </Typography>
          
          <div className="grid gap-8 lg:gap-12">
            {clinicalInfo.evidence.map((study, index) => (
              <StudyCard key={index} study={study} index={index} />
            ))}
          </div>
        </div>

        {/* Assessment Demonstration */}
        <div className="mb-16">
          <Typography 
            variant="h3" 
            className="text-2xl lg:text-3xl font-bold text-gray-900 text-center mb-12"
            element="h3"
          >
            Clinical-Grade Assessment Tools
          </Typography>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Assessment Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-strong p-6 lg:p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <Typography variant="h5" className="font-bold text-gray-900">
                    PHQ-9 Assessment
                  </Typography>
                  <div className="px-3 py-1 bg-clinical-safe/10 text-clinical-safe rounded-full">
                    <Typography variant="caption" className="font-medium text-xs">
                      Validated
                    </Typography>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Typography variant="body" className="text-gray-700 mb-3 text-sm">
                      Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?
                    </Typography>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-midday-primary rounded-full"></div>
                      <Typography variant="caption" className="text-gray-600">
                        Several days
                      </Typography>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <Typography variant="body" className="text-gray-600 text-sm">
                      Assessment Progress
                    </Typography>
                    <Typography variant="body" className="text-midday-primary font-semibold text-sm">
                      3/9
                    </Typography>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-midday-primary h-2 rounded-full transition-all duration-300" style={{ width: '33%' }}></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="primary" size="sm">
                    Continue
                  </Button>
                </div>
              </div>
              
              {/* Floating score indicator */}
              <div className="absolute -top-4 -right-4 bg-clinical-safe text-white rounded-full w-16 h-16 flex items-center justify-center shadow-medium">
                <div className="text-center">
                  <Typography variant="h6" className="font-bold text-sm">
                    12
                  </Typography>
                  <Typography variant="caption" className="text-xs opacity-90">
                    Mild
                  </Typography>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <Typography 
                variant="h4" 
                className="text-xl lg:text-2xl font-bold text-gray-900 mb-4"
                element="h4"
              >
                Precision Mental Health Screening
              </Typography>
              <Typography 
                variant="body" 
                className="text-gray-600 leading-relaxed mb-6"
                element="p"
              >
                Our PHQ-9 and GAD-7 assessments provide clinically accurate screening 
                for depression and anxiety. With automatic crisis detection and seamless 
                integration with your care team.
              </Typography>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-clinical-safe rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <Typography variant="body" className="text-gray-700">
                    Validated scoring algorithm with 94% clinical accuracy
                  </Typography>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-clinical-safe rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <Typography variant="body" className="text-gray-700">
                    Automatic crisis detection at validated thresholds
                  </Typography>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-clinical-safe rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <Typography variant="body" className="text-gray-700">
                    Progress tracking for therapy outcomes measurement
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Therapist Testimonial */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 lg:p-12 text-white relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 translate-y-16"></div>
            </div>
            
            <div className="relative">
              <div className="grid lg:grid-cols-3 gap-8 items-center">
                {/* Quote */}
                <div className="lg:col-span-2">
                  <div className="mb-6">
                    <svg className="w-12 h-12 text-white/20 mb-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-10zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                    </svg>
                  </div>
                  
                  <Typography variant="h4" className="text-2xl lg:text-3xl font-bold mb-6 text-white">
                    &ldquo;{primaryTherapistTestimonial.quote}&rdquo;
                  </Typography>
                  
                  <Typography variant="body" className="text-white/90 leading-relaxed text-lg mb-8">
                    {primaryTherapistTestimonial.content}
                  </Typography>
                </div>

                {/* Therapist Info */}
                <div className="text-center lg:text-left">
                  <div className="w-24 h-24 bg-white/10 rounded-full mx-auto lg:mx-0 mb-4 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  <Typography variant="h5" className="font-bold text-white mb-1">
                    {primaryTherapistTestimonial.name}
                  </Typography>
                  <Typography variant="body" className="text-white/70 mb-1">
                    {primaryTherapistTestimonial.role}
                  </Typography>
                  <Typography variant="caption" className="text-white/60 mb-3">
                    {primaryTherapistTestimonial.credentials} • {primaryTherapistTestimonial.yearsExperience} years experience
                  </Typography>
                  
                  <div className="text-center lg:text-left">
                    <Typography variant="caption" className="text-white/50 text-xs">
                      {primaryTherapistTestimonial.institution}
                    </Typography>
                  </div>
                </div>
              </div>
              
              {/* Verification badge */}
              <div className="mt-8 flex items-center justify-center lg:justify-start">
                <div className="flex items-center px-4 py-2 bg-white/10 rounded-full">
                  <svg className="w-4 h-4 text-clinical-safe mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <Typography variant="caption" className="text-white/90 font-medium text-xs">
                    Verified Clinical Professional
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Validations */}
        <div className="bg-gradient-to-r from-gray-50 to-clinical-safe/5 rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-8">
            <Typography 
              variant="h3" 
              className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4"
              element="h3"
            >
              Clinical Validations & Endorsements
            </Typography>
            <Typography 
              variant="body" 
              className="text-gray-600 max-w-2xl mx-auto"
              element="p"
            >
              Being. meets the highest standards for mental health technology and 
              is recognized by leading clinical organizations.
            </Typography>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {clinicalInfo.validations.map((validation, index) => (
              <div key={index} className="flex items-start">
                <div className="w-8 h-8 bg-clinical-safe/10 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                  <svg className="w-4 h-4 text-clinical-safe" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <Typography variant="body" className="text-gray-700">
                  {validation}
                </Typography>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <Button
              variant="outline"
              size="md"
              href="/research"
              className="text-clinical-safe border-clinical-safe hover:bg-clinical-safe/10"
            >
              Explore Research Library
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
};

// Study Card Component
interface StudyCardProps {
  study: {
    study: string;
    finding: string;
    participants: string;
  };
  index: number;
}

const StudyCard: React.FC<StudyCardProps> = ({ study, index }) => {
  return (
    <Card 
      className={cn(
        "p-8 bg-white border border-gray-200 hover:shadow-medium transition-all duration-300",
        "animate-slide-up"
      )}
      style={{
        animationDelay: `${index * 200}ms`
      }}
    >
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-center">
        {/* Study Info */}
        <div>
          <div className="w-16 h-16 bg-clinical-safe/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-clinical-safe" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4C4.01 4 2.6 4.44 1.5 5.2v9.8C2.6 14.44 4.01 14 5.5 14c1.49 0 2.9.44 4 1.2.37-.23.8-.4 1.25-.52V4.804zM15.5 4c-1.49 0-2.9.44-4 1.2v9.8c1.1-.76 2.51-1.2 4-1.2s2.9.44 4 1.2v-9.8C18.4 4.44 16.99 4 15.5 4z" />
            </svg>
          </div>
          <Typography variant="h5" className="font-bold text-gray-900 mb-2">
            {study.study}
          </Typography>
          <Typography variant="caption" className="text-gray-500">
            {study.participants}
          </Typography>
        </div>

        {/* Finding */}
        <div className="lg:col-span-2">
          <Typography 
            variant="body" 
            className="text-lg text-gray-700 font-medium leading-relaxed"
          >
            &ldquo;{study.finding}&rdquo;
          </Typography>
          
          {/* Visual indicator */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-clinical-safe rounded-full animate-fade-in"
              style={{ 
                width: index === 0 ? '43%' : index === 1 ? '60%' : '75%',
                animationDelay: `${(index * 200) + 500}ms`
              }}
            ></div>
          </div>
        </div>
      </div>
    </Card>
  );
};