import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "./shared";

export function IsIsntCards() {
  const { t } = useTranslation();
  const isBullets = t("onboarding.isBullets", { returnObjects: true }) as string[];
  const isntBullets = t("onboarding.isntBullets", { returnObjects: true }) as string[];

  return (
    <Section className="bg-slate-50/50 py-10">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="rounded-xl border border-emerald-200 bg-emerald-50/80 shadow-sm backdrop-blur-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <p className="text-base font-bold text-emerald-900">{t("onboarding.isTitle")}</p>
              </div>
              <ul className="space-y-2">
                {isBullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm text-emerald-800">
                    <span className="mt-0.5 text-emerald-500 shrink-0" aria-hidden="true">&#10003;</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                <p className="text-base font-bold text-slate-600">{t("onboarding.isntTitle")}</p>
              </div>
              <ul className="space-y-2">
                {isntBullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true">&#10007;</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Section>
  );
}
