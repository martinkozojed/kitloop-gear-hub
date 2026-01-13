import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const About = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rentalType: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission - in production, this would send to your backend
    setTimeout(() => {
      toast.success("Děkujeme! Zprávu jsme přijali a ozveme se, jakmile to bude možné.");
      setFormData({ name: "", email: "", rentalType: "", message: "" });
      setIsSubmitting(false);
    }, 1000);
  };

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
              Kontakt & MVP přístup
            </h1>
            <p className="text-lg text-emerald-100/90">
              Napište nám pár detailů o vaší půjčovně. Ozveme se s dalším postupem.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="container mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-3xl border border-emerald-100 bg-white p-8 md:p-12 shadow-lg shadow-emerald-100/40">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
              <Mail className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Připojit se do MVP
            </h2>
            <p className="text-muted-foreground">
              MVP přístup je zdarma pro půjčovny outdoor vybavení
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Jméno a příjmení</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jan Novák"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jan@pujcovna.cz"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rentalType">Typ půjčovny</Label>
              <Input
                id="rentalType"
                value={formData.rentalType}
                onChange={(e) => setFormData({ ...formData, rentalType: e.target.value })}
                placeholder="ski / bike / outdoor / jiné"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Zpráva</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Co potřebujete řešit? (rezervace, výdej/vratka, import dat...)"
                rows={4}
                required
              />
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Odesílání..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Odeslat
                </>
              )}
            </Button>
          </form>
        </div>
      </section>

      {/* Why Kitloop Section */}
      <section className="container mx-auto max-w-5xl px-6 py-12">
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
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
