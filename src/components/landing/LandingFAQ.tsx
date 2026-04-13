import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Package, ShieldCheck, AlertCircle, Shield, Upload, Zap, Laptop } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
    { value: 'item-1', qKey: 'faq.q1', aKey: 'faq.a1', icon: Users,       delay: 0.05 },
    { value: 'item-2', qKey: 'faq.q2', aKey: 'faq.a2', icon: Package,     delay: 0.10 },
    { value: 'item-3', qKey: 'faq.q3', aKey: 'faq.a3', icon: ShieldCheck, delay: 0.15 },
    { value: 'item-4', qKey: 'faq.q4', aKey: 'faq.a4', icon: AlertCircle, delay: 0.20 },
    { value: 'item-5', qKey: 'faq.q5', aKey: 'faq.a5', icon: Shield,     delay: 0.25 },
    { value: 'item-6', qKey: 'faq.q6', aKey: 'faq.a6', icon: Upload,     delay: 0.30 },
    { value: 'item-7', qKey: 'faq.q7', aKey: 'faq.a7', icon: Zap,        delay: 0.35 },
] as const;

export function LandingFAQ() {
    const { t } = useTranslation();

    return (
        <section id="faq" className="py-24 bg-gradient-to-b from-white via-brand-50/10 to-white scroll-mt-20">
            <div className="container px-4 md:px-6 mx-auto max-w-3xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                        {t('faq.heading')}
                    </h2>
                    <p className="text-muted-foreground">
                        {t('faq.subheading')}
                    </p>
                </motion.div>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    {FAQ_ITEMS.map(({ value, qKey, aKey, icon: Icon, delay }) => (
                        <motion.div
                            key={value}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay }}
                        >
                            <AccordionItem value={value} className="group border border-border/60 hover:border-brand-200 rounded-xl px-6 bg-white hover:bg-brand-50/30 transition-all duration-200 data-[state=open]:border-brand-300 data-[state=open]:bg-brand-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 group-data-[state=open]:bg-brand-500 transition-colors duration-200">
                                            <Icon className="h-4 w-4 text-brand-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t(qKey)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">
                                    {t(aKey)}
                                </AccordionContent>
                            </AccordionItem>
                        </motion.div>
                    ))}

                    {/* Item 8 — special (has inline link) */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                    >
                        <AccordionItem value="item-8" className="group border border-border/60 hover:border-brand-200 rounded-xl px-6 bg-white hover:bg-brand-50/30 transition-all duration-200 data-[state=open]:border-brand-300 data-[state=open]:bg-brand-50/50">
                            <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 group-data-[state=open]:bg-brand-500 transition-colors duration-200">
                                        <Laptop className="h-4 w-4 text-brand-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                    </div>
                                    <span>{t('faq.q8')}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">
                                {t('faq.a8_prefix')}{" "}
                                <Link to="/" className="text-brand-600 hover:underline font-medium">
                                    {t('faq.a8_link')}
                                </Link>.
                            </AccordionContent>
                        </AccordionItem>
                    </motion.div>
                </Accordion>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.45 }}
                    className="mt-10 text-center"
                >
                    <p className="text-muted-foreground mb-4">{t('faq.more_questions')}</p>
                    <Button variant="outline" size="lg" asChild>
                        <Link to="/">
                            {t('faq.contact_cta')}
                        </Link>
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
