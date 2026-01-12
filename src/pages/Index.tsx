import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, BarChart3, Calendar, Users, ArrowRight, ShieldCheck, Zap, Laptop, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Index = () => {
    const { t } = useTranslation();
    const [announcementOpen, setAnnouncementOpen] = useState(false);
    
    return (
        <div className="bg-background min-h-screen relative selection:bg-primary/20">
            {/* Background Grid Pattern - Pulse Animation */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
            </div>

            {/* Animated Green Glow */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: [0.5, 0.8, 0.5],
                    scale: [1, 1.1, 1],
                    x: [0, 20, 0],
                    y: [0, -20, 0],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
                className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-emerald-500/30 rounded-full blur-[80px] -z-5 pointer-events-none"
            />

            {/* Hero Section */}
            <section className="relative pt-24 pb-20 md:pt-36 md:pb-32 overflow-hidden">
                <div className="container px-4 md:px-6 mx-auto relative z-10">
                    <div className="flex flex-col items-center text-center space-y-8">

                        {/* Announcement Badge - Clickable */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            onClick={() => setAnnouncementOpen(true)}
                            className="group inline-flex items-center rounded-full border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 px-4 py-1.5 text-sm font-medium text-emerald-700 backdrop-blur-sm mb-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer"
                        >
                            <Sparkles className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            <span>{t('hero.announcement')}</span>
                            <ArrowRight className="h-3 w-3 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </motion.button>

                        {/* Hero Copy - Truthful, Capability-Focused */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="space-y-6 max-w-4xl"
                        >
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[1.1]">
                                {t('hero.headline.part1')} <br className="hidden md:block" />
                                <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                                    {t('hero.headline.part2')}
                                </span>
                            </h1>
                            <p className="text-xl text-muted-foreground md:text-2xl max-w-[48rem] mx-auto leading-relaxed">
                                {t('hero.subheadline')}
                            </p>

                            {/* 3 Core Capabilities - Factual Features */}
                            <ul className="space-y-3 text-left max-w-2xl mx-auto text-base md:text-lg">
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-600 mt-1 font-bold">✓</span>
                                    <span className="text-muted-foreground">{t('hero.capability1')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-600 mt-1 font-bold">✓</span>
                                    <span className="text-muted-foreground">{t('hero.capability2')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-600 mt-1 font-bold">✓</span>
                                    <span className="text-muted-foreground">{t('hero.capability3')}</span>
                                </li>
                            </ul>
                        </motion.div>

                        {/* CTAs - Single Primary Path */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex flex-col sm:flex-row gap-4 min-w-[200px] pt-4"
                        >
                            <Button variant="default" size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:scale-105" asChild>
                                <Link to="/signup">{t('hero.primaryCta')} <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                            <Button size="lg" variant="ghost" className="h-14 px-8 text-lg rounded-full text-foreground hover:bg-muted" asChild>
                                <a href="#demo">{t('hero.secondaryCta')}</a>
                            </Button>
                        </motion.div>

                        {/* Microcopy - Safe, Verifiable Claims Only */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground pt-4"
                        >
                            <span>{t('hero.microcopy1')}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span>{t('hero.microcopy2')}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span>{t('hero.microcopy3')}</span>
                        </motion.div>

                        {/* Product Preview - Dashboard Screenshot */}
                        <motion.div
                            id="demo"
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                            className="relative mt-16 w-full max-w-6xl mx-auto"
                        >
                            {/* Dashboard Preview - Clean, No Overlays */}
                            <div className="relative rounded-2xl border border-emerald-100/50 bg-white shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] transform transition-all duration-300 hover:shadow-[0_20px_50px_rgba(16,_185,_129,_0.1)]">
                                <iframe
                                    src="/demo/dashboard"
                                    className="w-full h-full bg-background"
                                    title="Kitloop Dashboard - Today's Work View"
                                    loading="lazy"
                                />
                            </div>
                            
                            {/* Optional: Screenshot Badge */}
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white border border-emerald-100 rounded-full shadow-lg text-xs font-medium text-muted-foreground">
                                {t('hero.demoBadge')}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Grid (Bento Style) */}
            <section className="py-24 bg-white relative">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">Your Basecamp for <span className="text-emerald-600">Growth</span></h2>
                        <p className="text-xl text-muted-foreground">More time on the trail, less time behind the desk.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <BentoFeature
                            icon={<Calendar className="h-8 w-8 text-emerald-600" />}
                            title="Seasonal Calendar"
                            description="Handle peak season chaos with a visual booking engine designed for high turnover."
                            className="bg-emerald-50/30"
                        />
                        <BentoFeature
                            icon={<Users className="h-8 w-8 text-stone-600" />}
                            title="Rider CRM"
                            description="Know if they're goofy or regular. Track sizes, preferences, and waiver history."
                            className="bg-stone-50"
                        />
                        <BentoFeature
                            icon={<BarChart3 className="h-8 w-8 text-amber-600" />}
                            title="Inventory Health"
                            description="Track wear and tear on every bike, ski, and kayak. Retire gear before it breaks."
                            className="bg-amber-50/30"
                        />
                        <BentoFeature
                            icon={<ShieldCheck className="h-8 w-8 text-green-700" />}
                            title="Waiver & Deposits"
                            description="Digital waivers signed before pickup. Pre-auth deposits for peace of mind."
                            className="bg-green-50/50 md:col-span-2"
                        />
                        <BentoFeature
                            icon={<Laptop className="h-8 w-8 text-sky-600" />}
                            title="Paperless Shop"
                            description="Ditch the clipboard. Digital contracts and mobile check-in for the modern guide."
                            className="bg-sky-50/30"
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-emerald-900 text-white">
                <div className="container px-4 md:px-6 mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to modernize your rental business?</h2>
                    <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">Join the growing network of rental providers using Kitloop to save time and increase revenue.</p>
                    <Button size="lg" variant="outline" className="h-14 px-10 text-lg text-emerald-900 bg-white hover:bg-emerald-50" asChild>
                        <Link to="/signup">Start Free Trial</Link>
                    </Button>
                </div>
            </section>

            {/* Announcement Modal */}
            <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl">{t('announcement.title')}</DialogTitle>
                                <p className="text-sm text-muted-foreground">{t('announcement.date')}</p>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="space-y-6 pt-4">
                        {/* Key Highlights */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <span className="text-emerald-600">✨</span>
                                {t('announcement.highlightsTitle')}
                            </h3>
                            <ul className="space-y-3 pl-6">
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-600 mt-0.5">•</span>
                                    <span className="text-muted-foreground">{t('announcement.highlight1')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-600 mt-0.5">•</span>
                                    <span className="text-muted-foreground">{t('announcement.highlight2')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-600 mt-0.5">•</span>
                                    <span className="text-muted-foreground">{t('announcement.highlight3')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-emerald-600 mt-0.5">•</span>
                                    <span className="text-muted-foreground">{t('announcement.highlight4')}</span>
                                </li>
                            </ul>
                        </div>

                        {/* Description */}
                        <div className="bg-muted/50 rounded-lg p-4 border border-emerald-100">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t('announcement.description')}
                            </p>
                        </div>

                        {/* CTA */}
                        <div className="flex gap-3 pt-2">
                            <Button variant="default" size="lg" className="flex-1" asChild>
                                <Link to="/signup" onClick={() => setAnnouncementOpen(false)}>
                                    {t('announcement.cta')} <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="outline" size="lg" onClick={() => setAnnouncementOpen(false)}>
                                {t('announcement.close')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const BentoFeature = ({ icon, title, description, className }: { icon: React.ReactNode, title: string, description: string, className?: string }) => (
    <div className={`flex flex-col p-8 rounded-3xl border border-transparent hover:border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${className}`}>
        <div className="mb-6 p-3 bg-white w-fit rounded-2xl shadow-sm border group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <h3 className="text-2xl font-bold mb-3 text-foreground tracking-tight">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-lg">{description}</p>
    </div>
);

export default Index;
