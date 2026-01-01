import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, BarChart3, Calendar, Users, ArrowRight, ShieldCheck, Zap, Laptop } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
    return (
        <div className="bg-background min-h-screen relative selection:bg-primary/20">
            {/* Background Grid Pattern - Pulse Animation */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
            </div>

            {/* Hero Section */}
            <section className="relative pt-24 pb-20 md:pt-36 md:pb-32 overflow-hidden">
                <div className="container px-4 md:px-6 mx-auto relative z-10">
                    <div className="flex flex-col items-center text-center space-y-8">

                        {/* Outdoor-Themed Pill Label */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-sm font-medium text-emerald-700 backdrop-blur-sm mb-4"
                        >
                            <span className="flex h-2 w-2 rounded-full bg-emerald-600 mr-2 animate-pulse"></span>
                            🌲 Built for the Wild, Ready for Business
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="space-y-4 max-w-4xl"
                        >
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[1.1]">
                                The only platform built <br className="hidden md:block" />
                                for <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">Outdoor Gear</span> Rentals
                            </h1>
                            <p className="text-xl text-muted-foreground md:text-2xl max-w-[48rem] mx-auto leading-relaxed">
                                Your gear belongs on the mountain, not stuck in a spreadsheet.
                                <br className="hidden md:block" />
                                Manage skis, bikes, and kayaks with a system that speaks your language.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex flex-col sm:flex-row gap-4 min-w-[200px] pt-4"
                        >
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:scale-105 bg-emerald-600 hover:bg-emerald-700" asChild>
                                <Link to="/signup">Start Free Trial <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-emerald-50/50 transition-all text-emerald-800 border-emerald-200" asChild>
                                <Link to="/login">Provider Login</Link>
                            </Button>
                        </motion.div>

                        {/* High-Fidelity Interactive Demo with Reveal Animation */}
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                            className="relative mt-16 w-full max-w-6xl mx-auto group perspective-1000"
                        >
                            {/* Interactive Dashboard iframe */}
                            <div className="relative rounded-2xl border-2 border-emerald-100/50 bg-white shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] transform transition-transform duration-700 hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(16,_185,_129,_0.15)] group/demo">

                                {/* Iframe is technically interactable but we control focus */}
                                <iframe
                                    src="/demo/dashboard"
                                    className="w-full h-full bg-background"
                                    title="Interactive Dashboard Demo"
                                    loading="lazy"
                                />

                                {/* Overlay to prevent scroll trapping until clicked (Professional UX) */}
                                <div className="absolute inset-0 bg-transparent cursor-pointer group-hover/demo:bg-transparent transition-colors" onClick={(e) => {
                                    e.currentTarget.style.pointerEvents = 'none';
                                }}></div>
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
            <section className="py-20 bg-green-900 text-white">
                <div className="container px-4 md:px-6 mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to modernize your rental business?</h2>
                    <p className="text-xl text-green-100 mb-10 max-w-2xl mx-auto">Join the growing network of rental providers using Kitloop to save time and increase revenue.</p>
                    <Button size="lg" variant="outline" className="h-14 px-10 text-lg text-green-900 bg-white hover:bg-green-50" asChild>
                        <Link to="/signup">Get Started for Free</Link>
                    </Button>
                </div>
            </section>
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
