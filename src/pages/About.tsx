import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

const About = () => {
  const { t } = useTranslation();

  const whyParagraphs = useMemo(
    () =>
      [
        t("about.why_kitloop.paragraph1"),
        t("about.why_kitloop.paragraph2"),
        t("about.why_kitloop.paragraph3"),
      ].filter(Boolean),
    [t],
  );

  const founderParagraphs = useMemo(
    () =>
      [
        t("about.founder.paragraph1"),
        t("about.founder.paragraph2"),
        t("about.founder.paragraph3"),
      ].filter(Boolean),
    [t],
  );

  return (
    <div className="bg-background pb-36">
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.2),_transparent_55%)]" />
        <div className="relative container mx-auto px-6 py-20">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.35em] text-emerald-100">
              Kitloop
            </span>
            <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl">
              {t("about.title")}
            </h1>
            <p className="text-lg text-emerald-100/90">{t("about.why_kitloop.paragraph1")}</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="primarySolid" size="cta">
                <Link to="/browse" aria-label="Browse gear" data-cta="browse-gear">
                  {t("navbar.browse_gear")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
              >
                <Link to="/add-rental">{t("about.cta")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="rounded-3xl border border-muted-foreground/15 bg-white p-8 shadow-lg shadow-emerald-100/40">
            <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
              {t("about.why_kitloop.title")}
            </h2>
            <div className="mt-6 space-y-5 text-muted-foreground">
              {whyParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50 text-emerald-900 shadow-lg shadow-emerald-100/50">
            <div className="relative h-60 w-full overflow-hidden bg-emerald-200/60">
              <img
                src="/lovable-uploads/b1f0a36d-5b99-458c-bae3-638430580400.png"
                alt={t("about.founder.image_alt")}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="px-8 py-8 space-y-4 text-emerald-900">
              <h3 className="text-xl font-semibold">{t("about.founder.title")}</h3>
              {founderParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <div className="pt-2">
                <Button asChild variant="primarySolid" size="cta">
                  <Link to="/browse" aria-label="Browse gear" data-cta="browse-gear">
                    {t("navbar.browse_gear")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
