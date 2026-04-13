import { useTranslation } from "react-i18next";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Section } from "./shared";
import type { FAQ } from "./shared";

export function OnboardingFAQ() {
  const { t } = useTranslation();
  const faqs = t("onboarding.faqs", { returnObjects: true }) as FAQ[];

  return (
    <Section className="bg-muted/50 py-10">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-2xl font-bold md:text-3xl mb-6">{t("onboarding.faqTitle")}</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={String(i)}
              className="group rounded-xl border border-border px-5 overflow-hidden bg-white/70 backdrop-blur-sm transition-all hover:bg-white data-[state=open]:bg-white data-[state=open]:border-brand-200 data-[state=open]:shadow-sm"
            >
              <AccordionTrigger className="text-left font-semibold py-3.5 hover:no-underline text-sm group-data-[state=open]:text-brand-900 [&[data-state=open]>svg]:text-brand-900">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground group-data-[state=open]:text-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
