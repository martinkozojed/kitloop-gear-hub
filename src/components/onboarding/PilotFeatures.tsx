import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "./shared";
import type { WhatYouGetItem } from "./shared";

export function PilotFeatures() {
  const { t } = useTranslation();
  const items = t("onboarding.whatYouGetItems", { returnObjects: true }) as WhatYouGetItem[];

  return (
    <Section className="bg-subtle py-12 border-y border-muted">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold md:text-3xl">{t("onboarding.whatYouGetTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("onboarding.whatYouGetSub")}</p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
          <div className="relative rounded-xl border border-border shadow-xl overflow-hidden bg-muted aspect-[4/3] flex items-center justify-center order-2 lg:order-1">
            <img
              src="/onboarding/features-proof-screenshot.png"
              alt="Kitloop reservation detail — customer info, reserved items, pricing, issue and print actions"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-muted -z-10">
              <p className="text-sm font-medium text-muted-foreground">Loading…</p>
            </div>
          </div>

          <div className="grid gap-4 order-1 lg:order-2">
            {items.map((item, i) => (
              <Card key={i} className="rounded-xl border shadow-sm bg-white">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2.5 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0" />
                    <h3 className="font-bold text-sm">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-[1.625rem]">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
