import React from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Section, timelineIcons } from "./shared";
import type { TimelineStep } from "./shared";

interface OnboardingTimelineProps {
  featuresRef: React.Ref<HTMLDivElement>;
}

export function OnboardingTimeline({ featuresRef }: OnboardingTimelineProps) {
  const { t } = useTranslation();
  const { ref: revealRef, isVisible } = useScrollReveal();
  const steps = t("onboarding.timelineSteps", { returnObjects: true }) as TimelineStep[];

  return (
    <Section id="section-features" className="bg-white py-16 md:py-24 scroll-mt-24">
      <div ref={revealRef} className={`transition-all duration-slow ease-spring ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div ref={featuresRef} className="mx-auto max-w-5xl px-6">
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.timelineTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("onboarding.timelineSub")}</p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] items-center">
          <div className="space-y-8">
            {steps.map((step, i) => {
              const StepIcon = timelineIcons[i] || Package;
              return (
                <div key={i} className="flex flex-row items-start gap-4 animate-enter" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 border border-brand-100/50">
                    <StepIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative rounded-token-xl border border-border shadow-xl overflow-hidden bg-muted aspect-[4/3] flex items-center justify-center">
            <img
              src="/onboarding/timeline-loop-poster.png"
              alt="Kitloop inventory management — item list with status badges, search, and asset tracking"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-muted -z-10">
              <p className="text-sm font-medium text-muted-foreground">Loading…</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Section>
  );
}
