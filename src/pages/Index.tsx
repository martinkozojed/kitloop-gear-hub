import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, BarChart3, Calendar, Users, ArrowRight } from "lucide-react";

const Index = () => {
    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="flex flex-col items-center text-center space-y-8">
                        <div className="space-y-4 max-w-3xl">
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-slate-900">
                                The Operating System for <span className="text-green-600">Outdoor Rental</span> Businesses
                            </h1>
                            <p className="text-xl text-slate-600 md:text-2xl max-w-[42rem] mx-auto">
                                Manage inventory, reservations, and customer relationships in one modern platform. Built for gear rental shops who want to grow.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 min-w-[200px]">
                            <Button size="lg" className="h-12 px-8 text-lg" asChild>
                                <Link to="/signup">Start Free Trial <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 px-8 text-lg" asChild>
                                <Link to="/login">Provider Login</Link>
                            </Button>
                        </div>

                        {/* Dashboard Preview Image Placeholder */}
                        <div className="relative mt-12 w-full max-w-5xl mx-auto rounded-xl border bg-slate-50 shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
                            <div className="text-slate-400 flex flex-col items-center">
                                <p className="text-sm">App Dashboard Preview</p>
                                {/* In a real app, you'd put a screenshot of your dashboard here */}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof / Stats */}
            <section className="py-12 bg-slate-50 border-y">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-slate-900">100%</div>
                            <div className="text-sm text-slate-600 mt-1">Digital Workflow</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">24/7</div>
                            <div className="text-sm text-slate-600 mt-1">Availability</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">Zero</div>
                            <div className="text-sm text-slate-600 mt-1">Paperwork</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">Secure</div>
                            <div className="text-sm text-slate-600 mt-1">Payments</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 md:py-32">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to run your shop</h2>
                        <p className="text-lg text-slate-600">Stop wrestling with spreadsheets and paper forms. Kitloop gives you professional tools to manage your entire operation.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Calendar className="h-10 w-10 text-green-600" />}
                            title="Smart Calendar"
                            description="Visual booking calendar that prevents double bookings and manages equipment availability automatically."
                        />
                        <FeatureCard
                            icon={<Users className="h-10 w-10 text-green-600" />}
                            title="Customer CRM"
                            description="Keep track of your customers, their rental history, and preferences to build lasting relationships."
                        />
                        <FeatureCard
                            icon={<BarChart3 className="h-10 w-10 text-green-600" />}
                            title="Real-time Analytics"
                            description="Understand your business with detailed reports on revenue, utilization, and popular items."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-green-900 text-white">
                <div className="container px-4 md:px-6 mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to modernize your rental business?</h2>
                    <p className="text-xl text-green-100 mb-10 max-w-2xl mx-auto">Join the growing network of rental providers using Kitloop to save time and increase revenue.</p>
                    <Button size="lg" variant="secondary" className="h-14 px-10 text-lg text-green-900" asChild>
                        <Link to="/signup">Get Started for Free</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex flex-col p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-4 bg-green-50 w-16 h-16 rounded-full flex items-center justify-center">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-slate-900">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
);

export default Index;
