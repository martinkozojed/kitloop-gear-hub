import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, BarChart3, Calendar, Users, ArrowRight, ShieldCheck, Zap, Laptop, Sparkles, X, Package, ClipboardCheck, AlertCircle, Shield, Upload, ChevronDown, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
    const { t } = useTranslation();
    const [announcementOpen, setAnnouncementOpen] = useState(false);
    
    return (
        <div className="bg-background min-h-screen relative selection:bg-primary/20">
            {/* Background Grid Pattern - Pulse Animation */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
            </div>

            {/* Animated Green Glow */}
            {/* Hero Section */}
            <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden min-h-[85vh] flex items-center">
                <div className="container px-4 md:px-6 mx-auto relative w-full">
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

                        {/* Hero Copy - Truthful, Clean */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="space-y-5 max-w-4xl"
                        >
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[1.1]">
                                {t('hero.headline.part1')}{' '}
                                <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                                    {t('hero.headline.part2')}
                                </span>{' '}
                                {t('hero.headline.part3')}
                            </h1>
                            <p className="text-xl text-muted-foreground md:text-2xl max-w-[48rem] mx-auto leading-relaxed">
                                {t('hero.subheadline')}
                            </p>
                        </motion.div>

                        {/* CTAs - Single Primary Path */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex flex-col sm:flex-row gap-4 min-w-[200px] pt-2"
                        >
                            <Button variant="default" size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:scale-105" asChild>
                                <Link to="/about">{t('hero.primaryCta')} <ArrowRight className="ml-2 h-5 w-5" /></Link>
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
                            className="text-center text-sm text-muted-foreground pt-2 max-w-2xl"
                        >
                            <p>{t('hero.microcopy')}</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Product Section - How it works with Screenshots */}
            <section id="product" className="py-20 md:py-32 bg-white relative scroll-mt-20">
                
                <div className="container px-4 md:px-6 mx-auto relative">

                    {/* Workflow with Screenshots - Enhanced Visual Design */}
                    <div className="max-w-7xl mx-auto mb-28 relative">
                        {/* Animated Background Decoration */}
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.05, 0.08, 0.05]
                            }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full blur-3xl pointer-events-none"
                        />
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.15, 1],
                                opacity: [0.05, 0.1, 0.05]
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-1/4 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500 to-green-500 rounded-full blur-3xl pointer-events-none"
                        />
                        
                        {/* Connecting Flow Line (Desktop) */}
                        <div className="hidden md:block absolute left-16 top-48 bottom-48 w-0.5 bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent blur-sm"></div>
                            {/* Animated Pulse Dots */}
                            <motion.div
                                animate={{ y: ["0%", "100%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"
                            />
                        </div>
                        
                        <div className="relative">
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="text-3xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-foreground via-foreground to-emerald-600 bg-clip-text"
                            >
                                {t('product.workflow.heading')}
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="text-center text-lg text-muted-foreground mb-20 max-w-3xl mx-auto"
                            >
                                {t('preview.description')}
                            </motion.p>

                            <div className="space-y-32 md:space-y-40">
                            {/* Step 1 - Reservation (Image Left) */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                className="relative grid md:grid-cols-2 gap-8 md:gap-16 items-center"
                            >
                                {/* Screenshot with Floating Badge */}
                                <div className="relative group">
                                    {/* Floating Number Badge */}
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        whileInView={{ scale: 1, rotate: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                                        className="absolute -top-6 -left-6 z-20 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold text-2xl shadow-2xl shadow-emerald-500/40 border-4 border-white"
                                    >
                                        1
                                    </motion.div>
                                    
                                    {/* Screenshot Container with 3D Effect */}
                                    <div className="relative rounded-2xl overflow-hidden transform transition-all duration-500 group-hover:scale-[1.02] group-hover:-rotate-1">
                                        {/* Inner Glow Border */}
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-transparent to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
                                        
                                        <div className="relative border-2 border-gray-200/60 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15),0_8px_25px_rgba(16,185,129,0.1)] rounded-2xl overflow-hidden">
                                            <img 
                                                src="/hero-dashboard.png" 
                                                alt="Reservation Dashboard"
                                                className="w-full h-auto"
                                            />
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>
                                            
                                            {/* Feature Highlights - Floating Pills */}
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.6 }}
                                                className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-emerald-200/50 rounded-full shadow-lg text-xs font-semibold text-emerald-700"
                                            >
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                Real-time status
                                            </motion.div>
                                            
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.7 }}
                                                className="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-emerald-200/50 rounded-full shadow-lg text-xs font-semibold text-emerald-700"
                                            >
                                                <Calendar className="h-3 w-3" />
                                                Date picker
                                            </motion.div>
                                        </div>
                                    </div>
                                    
                                    {/* Decorative Element */}
                                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                                </div>
                                
                                {/* Content with Icon */}
                                <div className="space-y-6 md:pl-8">
                                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-200/50 rounded-full text-sm font-semibold text-emerald-700 mb-4">
                                        <Calendar className="h-4 w-4" />
                                        Step 1
                                    </div>
                                    <h3 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                                        {t('product.workflow.step1Title')}
                                    </h3>
                                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                                        {t('product.workflow.step1Desc')}
                                    </p>
                                </div>
                                
                                {/* Connecting Arrow (Hidden on Mobile) */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 }}
                                    className="hidden md:block absolute -bottom-20 left-1/2 -translate-x-1/2"
                                >
                                    <ArrowRight className="h-8 w-8 text-emerald-500/40 rotate-90" />
                                </motion.div>
                            </motion.div>

                            {/* Step 2 - Check-in/out (Image Right) */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                className="relative grid md:grid-cols-2 gap-8 md:gap-16 items-center"
                            >
                                {/* Content (on left on desktop) */}
                                <div className="space-y-6 md:order-1 md:pr-8 md:text-right">
                                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-200/50 rounded-full text-sm font-semibold text-emerald-700 mb-4">
                                        <ClipboardCheck className="h-4 w-4" />
                                        Step 2
                                    </div>
                                    <h3 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                                        {t('product.workflow.step2Title')}
                                    </h3>
                                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                                        {t('product.workflow.step2Desc')}
                                    </p>
                                </div>
                                
                                {/* Screenshot (on right on desktop) */}
                                <div className="relative group md:order-2">
                                    {/* Floating Number Badge */}
                                    <motion.div
                                        initial={{ scale: 0, rotate: 180 }}
                                        whileInView={{ scale: 1, rotate: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                                        className="absolute -top-6 -right-6 z-20 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold text-2xl shadow-2xl shadow-emerald-500/40 border-4 border-white"
                                    >
                                        2
                                    </motion.div>
                                    
                                    {/* Screenshot Container */}
                                    <div className="relative rounded-2xl overflow-hidden transform transition-all duration-500 group-hover:scale-[1.02] group-hover:rotate-1">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-bl from-emerald-500/20 via-transparent to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
                                        
                                        <div className="relative border-2 border-gray-200/60 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15),0_8px_25px_rgba(16,185,129,0.1)] rounded-2xl overflow-hidden">
                                            <img 
                                                src="/hero-dashboard.png" 
                                                alt="Check-in/out Interface"
                                                className="w-full h-auto"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-tl from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>
                                            
                                            {/* Feature Highlights */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.6 }}
                                                className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-emerald-200/50 rounded-full shadow-lg text-xs font-semibold text-emerald-700"
                                            >
                                                <ClipboardCheck className="h-3 w-3" />
                                                Photo capture
                                            </motion.div>
                                            
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.7 }}
                                                className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-emerald-200/50 rounded-full shadow-lg text-xs font-semibold text-emerald-700"
                                            >
                                                <Shield className="h-3 w-3" />
                                                Digital signature
                                            </motion.div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-tl from-emerald-400/20 to-green-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                                </div>
                                
                                {/* Connecting Arrow */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 }}
                                    className="hidden md:block absolute -bottom-20 left-1/2 -translate-x-1/2"
                                >
                                    <ArrowRight className="h-8 w-8 text-emerald-500/40 rotate-90" />
                                </motion.div>
                            </motion.div>

                            {/* Step 3 - Return (Image Left) */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                className="relative grid md:grid-cols-2 gap-8 md:gap-16 items-center"
                            >
                                {/* Screenshot */}
                                <div className="relative group">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        whileInView={{ scale: 1, rotate: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                                        className="absolute -top-6 -left-6 z-20 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold text-2xl shadow-2xl shadow-emerald-500/40 border-4 border-white"
                                    >
                                        3
                                    </motion.div>
                                    
                                    <div className="relative rounded-2xl overflow-hidden transform transition-all duration-500 group-hover:scale-[1.02] group-hover:-rotate-1">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-transparent to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
                                        
                                        <div className="relative border-2 border-gray-200/60 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15),0_8px_25px_rgba(16,185,129,0.1)] rounded-2xl overflow-hidden">
                                            <img 
                                                src="/hero-dashboard.png" 
                                                alt="Return & Damage Tracking"
                                                className="w-full h-auto"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>
                                            
                                            {/* Feature Highlights */}
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.6 }}
                                                className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-emerald-200/50 rounded-full shadow-lg text-xs font-semibold text-emerald-700"
                                            >
                                                <AlertCircle className="h-3 w-3" />
                                                Damage log
                                            </motion.div>
                                            
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: 0.7 }}
                                                className="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-emerald-200/50 rounded-full shadow-lg text-xs font-semibold text-emerald-700"
                                            >
                                                <Package className="h-3 w-3" />
                                                Inventory sync
                                            </motion.div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                                </div>
                                
                                {/* Content */}
                                <div className="space-y-6 md:pl-8">
                                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-200/50 rounded-full text-sm font-semibold text-emerald-700 mb-4">
                                        <Package className="h-4 w-4" />
                                        Step 3
                                    </div>
                                    <h3 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                                        {t('product.workflow.step3Title')}
                                    </h3>
                                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                                        {t('product.workflow.step3Desc')}
                                    </p>
                                </div>
                            </motion.div>
                            </div>
                        </div>
                    </div>

                    {/* Capability Cards - Enhanced Bento Grid */}
                    <div className="max-w-6xl mx-auto mb-28 relative">
                        {/* Animated Background Accent */}
                        <motion.div 
                            animate={{ 
                                rotate: [0, 360],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/5 via-transparent to-green-500/5 rounded-full blur-3xl pointer-events-none"
                        />
                        
                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative text-3xl md:text-4xl font-bold text-center mb-16"
                        >
                            {t('product.modules.heading')}
                        </motion.h2>

                        {/* Bento Grid with Glow Effects */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Card 1 - Reservations */}
                            <motion.div
                                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                                className="group relative p-8 bg-white rounded-2xl border border-gray-200/60 hover:border-emerald-300/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-2"
                            >
                                
                                <div className="relative flex flex-col gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all">
                                        <Calendar className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">{t('product.modules.module1Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module1Desc')}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 2 - Inventory */}
                            <motion.div
                                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                                className="group relative p-8 bg-white rounded-2xl border border-gray-200/60 hover:border-emerald-300/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className="relative flex flex-col gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all">
                                        <Package className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">{t('product.modules.module2Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module2Desc')}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 3 - Check-in/out */}
                            <motion.div
                                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                                className="group relative p-8 bg-white rounded-2xl border border-gray-200/60 hover:border-emerald-300/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className="relative flex flex-col gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all">
                                        <ClipboardCheck className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">{t('product.modules.module3Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module3Desc')}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 4 - Deposits & Damage */}
                            <motion.div
                                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                                className="group relative p-8 bg-white rounded-2xl border border-gray-200/60 hover:border-emerald-300/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className="relative flex flex-col gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all">
                                        <AlertCircle className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">{t('product.modules.module4Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module4Desc')}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 5 - Users & Permissions */}
                            <motion.div
                                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                                className="group relative p-8 bg-white rounded-2xl border border-gray-200/60 hover:border-emerald-300/50 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className="relative flex flex-col gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all">
                                        <Shield className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">{t('product.modules.module5Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module5Desc')}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 6 - Data Import */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                                className="group relative p-8 bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.15),0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                            >
                                {/* Subtle hover effects */}
                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-hover:ring-emerald-500/10 transition-all duration-500 pointer-events-none"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 via-transparent to-transparent group-hover:from-emerald-50/20 transition-all duration-500 pointer-events-none"></div>
                                <div className="relative flex flex-col gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all">
                                        <Upload className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">{t('product.modules.module6Title')}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t('product.modules.module6Desc')}</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>


                    {/* CTA Block - Clean & Strong */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="relative bg-white rounded-2xl p-12 md:p-16 border border-gray-200 shadow-lg transition-shadow hover:shadow-xl">
                            {/* Subtle top accent */}
                            <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                            
                            <div className="text-center space-y-6">
                                {/* Heading */}
                                <h3 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                                    {t('product.cta.heading')}
                                </h3>
                                
                                {/* Subtext */}
                                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                    {t('product.cta.microcopy')}
                                </p>
                                
                                {/* CTA Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                    <Button 
                                        size="lg" 
                                        className="h-14 px-10 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all" 
                                        asChild
                                    >
                                        <Link to="/about">
                                            {t('product.cta.primaryCta')} <ArrowRight className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="lg" 
                                        className="h-14 px-10 text-lg font-semibold border-2 border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-700 transition-all" 
                                        asChild
                                    >
                                        <a href="#demo">{t('product.cta.secondaryCta')}</a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>



            {/* FAQ Section - Refined */}
            <section id="faq" className="py-24 bg-gradient-to-b from-white via-emerald-50/10 to-white scroll-mt-20">
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
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: 0.05 }}
                        >
                            <AccordionItem value="item-1" className="group border border-gray-200/60 hover:border-emerald-200 rounded-xl px-6 bg-white hover:bg-emerald-50/30 transition-all duration-200 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-data-[state=open]:bg-emerald-500 transition-colors duration-200">
                                            <Users className="h-4 w-4 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t('faq.q1')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">
                                    {t('faq.a1')}
                                </AccordionContent>
                            </AccordionItem>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}>
                            <AccordionItem value="item-2" className="group border border-gray-200/60 hover:border-emerald-200 rounded-xl px-6 bg-white hover:bg-emerald-50/30 transition-all duration-200 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-data-[state=open]:bg-emerald-500 transition-colors duration-200">
                                            <Package className="h-4 w-4 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t('faq.q2')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">
                                    {t('faq.a2')}
                                </AccordionContent>
                            </AccordionItem>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.15 }}>
                            <AccordionItem value="item-3" className="group border border-gray-200/60 hover:border-emerald-200 rounded-xl px-6 bg-white hover:bg-emerald-50/30 transition-all duration-200 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-data-[state=open]:bg-emerald-500 transition-colors duration-200">
                                            <ShieldCheck className="h-4 w-4 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t('faq.q3')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">{t('faq.a3')}</AccordionContent>
                            </AccordionItem>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }}>
                            <AccordionItem value="item-4" className="group border border-gray-200/60 hover:border-emerald-200 rounded-xl px-6 bg-white hover:bg-emerald-50/30 transition-all duration-200 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-data-[state=open]:bg-emerald-500 transition-colors duration-200">
                                            <AlertCircle className="h-4 w-4 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t('faq.q4')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">{t('faq.a4')}</AccordionContent>
                            </AccordionItem>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.25 }}>
                            <AccordionItem value="item-5" className="group border border-gray-200/60 hover:border-emerald-200 rounded-xl px-6 bg-white hover:bg-emerald-50/30 transition-all duration-200 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-data-[state=open]:bg-emerald-500 transition-colors duration-200">
                                            <Shield className="h-4 w-4 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t('faq.q5')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">{t('faq.a5')}</AccordionContent>
                            </AccordionItem>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 }}>
                            <AccordionItem value="item-6" className="group border border-gray-200/60 hover:border-emerald-200 rounded-xl px-6 bg-white hover:bg-emerald-50/30 transition-all duration-200 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-data-[state=open]:bg-emerald-500 transition-colors duration-200">
                                            <Upload className="h-4 w-4 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t('faq.q6')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">{t('faq.a6')}</AccordionContent>
                            </AccordionItem>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.35 }}>
                            <AccordionItem value="item-7" className="group border border-gray-200/60 hover:border-emerald-200 rounded-xl px-6 bg-white hover:bg-emerald-50/30 transition-all duration-200 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-data-[state=open]:bg-emerald-500 transition-colors duration-200">
                                            <Zap className="h-4 w-4 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t('faq.q7')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">{t('faq.a7')}</AccordionContent>
                            </AccordionItem>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.4 }}>
                            <AccordionItem value="item-8" className="group border border-gray-200/60 hover:border-emerald-200 rounded-xl px-6 bg-white hover:bg-emerald-50/30 transition-all duration-200 data-[state=open]:border-emerald-300 data-[state=open]:bg-emerald-50/50">
                                <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-data-[state=open]:bg-emerald-500 transition-colors duration-200">
                                            <Laptop className="h-4 w-4 text-emerald-600 group-data-[state=open]:text-white transition-colors duration-200" />
                                        </div>
                                        <span>{t('faq.q8')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed pl-11 pb-5">
                                    {t('faq.a8_prefix')}{" "}
                                    <Link to="/about" className="text-emerald-600 hover:underline font-medium">
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
                            <Link to="/about">
                                {t('faq.contact_cta')}
                            </Link>
                        </Button>
                    </motion.div>
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
                                <Link to="/about" onClick={() => setAnnouncementOpen(false)}>
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
