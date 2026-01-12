import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, BarChart3, Calendar, Users, ArrowRight, ShieldCheck, Zap, Laptop, Sparkles, X, Package, ClipboardCheck, AlertCircle, Shield, Upload } from "lucide-react";
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
            <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden min-h-[85vh] flex items-center">
                <div className="container px-4 md:px-6 mx-auto relative z-10 w-full">
                    <div className="flex flex-col items-center text-center space-y-6">

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
                            className="space-y-5 max-w-4xl"
                        >
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[1.1]">
                                {t('hero.headline.part1')} <br className="hidden md:block" />
                                {t('hero.headline.part2')}{' '}
                                <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                                    {t('hero.headline.part3')}
                                </span>{' '}
                                {t('hero.headline.part4')}
                            </h1>
                            <p className="text-xl text-muted-foreground md:text-2xl max-w-[48rem] mx-auto leading-relaxed">
                                {t('hero.subheadline')}
                            </p>

                            {/* 3 Core Capabilities - Factual Features */}
                            <ul className="space-y-2.5 text-left max-w-2xl mx-auto text-base md:text-lg">
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
                            className="flex flex-col sm:flex-row gap-4 min-w-[200px] pt-2"
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
                            className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground pt-2"
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

            {/* Product Section */}
            <section id="product" className="py-20 md:py-32 bg-gradient-to-b from-white via-emerald-50/30 to-white relative scroll-mt-20 overflow-hidden">
                {/* Topographic Pattern Background - More Visible */}
                <div className="absolute inset-0 opacity-[0.08]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 50c0-11 9-20 20-20s20 9 20 20-9 20-20 20-20-9-20-20zm40 0c0-11 9-20 20-20s20 9 20 20-9 20-20 20-20-9-20-20z' stroke='%23059669' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: '80px 80px'
                }}></div>
                
                {/* Decorative Glow Elements - More Visible */}
                <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-0 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-emerald-400/8 rounded-full blur-3xl"></div>
                
                {/* Diagonal Accent Stripes */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/10 to-transparent rotate-12 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-green-500/8 to-transparent -rotate-12 blur-2xl"></div>
                
                <div className="container px-4 md:px-6 mx-auto relative z-10">
                    {/* Above-the-fold */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="max-w-4xl mx-auto text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 tracking-tight leading-[1.1]">
                            {t('product.aboveFold.headline')}
                        </h2>
                        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                            {t('product.aboveFold.subheadline')}
                        </p>
                    </motion.div>

                    {/* Workflow (3 steps) - Bento Style */}
                    <div className="max-w-6xl mx-auto mb-28">
                        <motion.h3 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-4xl font-bold text-center mb-16"
                        >
                            {t('product.workflow.heading')}
                        </motion.h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Step 1 */}
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="group relative p-8 bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl border border-emerald-100/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold text-xl shadow-lg">
                                    1
                                </div>
                                <div className="space-y-4 mt-4">
                                    <h4 className="text-xl font-bold text-foreground">{t('product.workflow.step1Title')}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{t('product.workflow.step1Desc')}</p>
                                </div>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                            </motion.div>

                            {/* Step 2 */}
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="group relative p-8 bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl border border-emerald-100/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold text-xl shadow-lg">
                                    2
                                </div>
                                <div className="space-y-4 mt-4">
                                    <h4 className="text-xl font-bold text-foreground">{t('product.workflow.step2Title')}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{t('product.workflow.step2Desc')}</p>
                                </div>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                            </motion.div>

                            {/* Step 3 */}
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                                className="group relative p-8 bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl border border-emerald-100/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold text-xl shadow-lg">
                                    3
                                </div>
                                <div className="space-y-4 mt-4">
                                    <h4 className="text-xl font-bold text-foreground">{t('product.workflow.step3Title')}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{t('product.workflow.step3Desc')}</p>
                                </div>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-300"></div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Module Cards - Enhanced */}
                    <div className="max-w-6xl mx-auto mb-28">
                        <motion.h3 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-4xl font-bold text-center mb-16"
                        >
                            {t('product.modules.heading')}
                        </motion.h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Module 1: Reservations */}
                            <div className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 group-hover:from-emerald-500 group-hover:to-green-600 transition-all">
                                        <Calendar className="h-6 w-6 text-emerald-700 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-foreground group-hover:text-emerald-700 transition-colors">{t('product.modules.module1Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module1Desc')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Module 2: Inventory */}
                            <div className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 group-hover:from-emerald-500 group-hover:to-green-600 transition-all">
                                        <Package className="h-6 w-6 text-emerald-700 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-foreground group-hover:text-emerald-700 transition-colors">{t('product.modules.module2Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module2Desc')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Module 3: Check-in/out */}
                            <div className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 group-hover:from-emerald-500 group-hover:to-green-600 transition-all">
                                        <ClipboardCheck className="h-6 w-6 text-emerald-700 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-foreground group-hover:text-emerald-700 transition-colors">{t('product.modules.module3Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module3Desc')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Module 4: Damage & Deposits */}
                            <div className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 group-hover:from-emerald-500 group-hover:to-green-600 transition-all">
                                        <AlertCircle className="h-6 w-6 text-emerald-700 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-foreground group-hover:text-emerald-700 transition-colors">{t('product.modules.module4Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module4Desc')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Module 5: Roles */}
                            <div className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 group-hover:from-emerald-500 group-hover:to-green-600 transition-all">
                                        <Shield className="h-6 w-6 text-emerald-700 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-foreground group-hover:text-emerald-700 transition-colors">{t('product.modules.module5Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module5Desc')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Module 6: Import */}
                            <div className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 group-hover:from-emerald-500 group-hover:to-green-600 transition-all">
                                        <Upload className="h-6 w-6 text-emerald-700 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-foreground group-hover:text-emerald-700 transition-colors">{t('product.modules.module6Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module6Desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Info Blocks - Side by Side */}
                    <div className="max-w-5xl mx-auto mb-28 grid md:grid-cols-2 gap-6">
                        {/* Roles Block */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl border border-emerald-100/50 hover:shadow-lg transition-shadow"
                        >
                            <h3 className="text-lg font-bold mb-4 text-foreground">{t('product.roles.heading')}</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                    <span className="font-semibold text-foreground">{t('product.roles.ownerLabel')}</span>
                                    <span className="text-muted-foreground">— {t('product.roles.ownerDesc')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                    <span className="font-semibold text-foreground">{t('product.roles.staffLabel')}</span>
                                    <span className="text-muted-foreground">— {t('product.roles.staffDesc')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                    <span className="font-semibold text-foreground">{t('product.roles.viewerLabel')}</span>
                                    <span className="text-muted-foreground">— {t('product.roles.viewerDesc')}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Data Block */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl border border-emerald-100/50 hover:shadow-lg transition-shadow"
                        >
                            <h3 className="text-lg font-bold mb-4 text-foreground">{t('product.data.heading')}</h3>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                <span className="text-muted-foreground">{t('product.data.import')}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* CTA Block - Enhanced */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl mx-auto text-center space-y-8 p-12 bg-gradient-to-br from-emerald-50 to-white rounded-3xl border border-emerald-100"
                    >
                        <h3 className="text-3xl md:text-4xl font-bold text-foreground">{t('product.cta.heading')}</h3>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button variant="default" size="lg" className="h-14 px-10 text-lg shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-105 transition-all" asChild>
                                <Link to="/signup">
                                    {t('product.cta.primaryCta')} <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                            <Button variant="outline" size="lg" className="h-14 px-10 text-lg hover:bg-white hover:border-emerald-300 transition-all" asChild>
                                <Link to="/about">{t('product.cta.secondaryCta')}</Link>
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{t('product.cta.microcopy')}</p>
                    </motion.div>
                </div>
            </section>

            {/* Decorative Divider - Mountain Silhouette (More Visible) */}
            <div className="relative h-32 overflow-hidden">
                <svg className="absolute bottom-0 w-full h-32" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z" fill="#10b981" opacity="0.08"/>
                    <path d="M0,80 Q300,40 600,80 T1200,80 L1200,120 L0,120 Z" fill="#10b981" opacity="0.12"/>
                </svg>
            </div>

            {/* Features Grid (Bento Style) */}
            <section className="py-24 bg-white relative overflow-hidden">
                {/* Subtle Grid Pattern - More Visible */}
                <div className="absolute inset-0 opacity-[0.06]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '60px 60px'
                }}></div>
                
                {/* Additional decorative elements */}
                <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-10 w-72 h-72 bg-green-500/5 rounded-full blur-3xl"></div>
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
