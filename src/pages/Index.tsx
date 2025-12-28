import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, BarChart3, Calendar, Users, ArrowRight, ShieldCheck, Zap, Laptop, Play, Star, ChevronRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

const Index = () => {
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  return (
    <div className="bg-background min-h-screen relative selection:bg-primary/20 overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Floating gradient orbs */}
        <motion.div 
          className="absolute top-20 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-emerald-200/40 to-green-300/20 rounded-full blur-3xl"
          style={{ y: backgroundY }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/30 to-teal-200/20 rounded-full blur-3xl"
          style={{ y: backgroundY }}
        />

        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="flex flex-col items-center text-center space-y-6 md:space-y-8">

            {/* Outdoor-Themed Pill Label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
              🌲 Built for the Wild, Ready for Business
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-4 max-w-4xl"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground leading-[1.1]">
                The only platform built{' '}
                <br className="hidden sm:block" />
                for <span className="gradient-text">Outdoor Gear</span> Rentals
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground md:text-2xl max-w-[48rem] mx-auto leading-relaxed px-4">
                Your gear belongs on the mountain, not stuck in a spreadsheet.
                <br className="hidden md:block" />
                Manage skis, bikes, and kayaks with a system that speaks your language.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 min-w-[200px] pt-4 w-full sm:w-auto px-4 sm:px-0"
            >
              <Button 
                size="lg" 
                className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 group w-full sm:w-auto" 
                asChild
              >
                <Link to="/signup">
                  Start Free Trial 
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg rounded-full border-2 hover:bg-primary/5 transition-all w-full sm:w-auto" 
                asChild
              >
                <Link to="/login">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Link>
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-6 text-sm text-muted-foreground"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2">500+ rental shops trust Kitloop</span>
              </div>
            </motion.div>

            {/* High-Fidelity Interactive Demo with Reveal Animation */}
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="relative mt-8 md:mt-16 w-full max-w-6xl mx-auto group"
            >
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-green-500/10 to-teal-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              {/* Interactive Dashboard iframe */}
              <div className="relative rounded-xl md:rounded-2xl border border-primary/10 bg-white shadow-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] transform transition-all duration-500 hover:shadow-[0_20px_60px_rgba(16,_185,_129,_0.2)] group/demo">
                <iframe
                  src="/demo/dashboard"
                  className="w-full h-full bg-background"
                  title="Interactive Dashboard Demo"
                  loading="lazy"
                />

                {/* Overlay to prevent scroll trapping */}
                <div 
                  className="absolute inset-0 bg-transparent cursor-pointer transition-colors" 
                  onClick={(e) => {
                    e.currentTarget.style.pointerEvents = 'none';
                  }}
                />
              </div>

              {/* Browser chrome effect */}
              <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-muted/80 backdrop-blur rounded-full text-xs text-muted-foreground">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="hidden sm:inline">app.kitloop.com/dashboard</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid (Bento Style) */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="container px-4 md:px-6 mx-auto">
          <motion.div 
            className="text-center max-w-3xl mx-auto mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 md:mb-6 tracking-tight">
              Your Basecamp for <span className="text-primary">Growth</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              More time on the trail, less time behind the desk.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            <BentoFeature
              icon={<Calendar className="h-7 w-7 md:h-8 md:w-8 text-primary" />}
              title="Seasonal Calendar"
              description="Handle peak season chaos with a visual booking engine designed for high turnover."
              className="bg-primary/5"
              delay={0}
            />
            <BentoFeature
              icon={<Users className="h-7 w-7 md:h-8 md:w-8 text-stone-600" />}
              title="Rider CRM"
              description="Know if they're goofy or regular. Track sizes, preferences, and waiver history."
              className="bg-stone-50"
              delay={0.1}
            />
            <BentoFeature
              icon={<BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-amber-600" />}
              title="Inventory Health"
              description="Track wear and tear on every bike, ski, and kayak. Retire gear before it breaks."
              className="bg-amber-50/50"
              delay={0.2}
            />
            <BentoFeature
              icon={<ShieldCheck className="h-7 w-7 md:h-8 md:w-8 text-green-700" />}
              title="Waiver & Deposits"
              description="Digital waivers signed before pickup. Pre-auth deposits for peace of mind."
              className="bg-green-50/50 sm:col-span-2"
              delay={0.3}
            />
            <BentoFeature
              icon={<Laptop className="h-7 w-7 md:h-8 md:w-8 text-sky-600" />}
              title="Paperless Shop"
              description="Ditch the clipboard. Digital contracts and mobile check-in for the modern guide."
              className="bg-sky-50/50"
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: '500+', label: 'Rental Shops' },
              { value: '2M+', label: 'Bookings Processed' },
              { value: '99.9%', label: 'Uptime' },
              { value: '4.9/5', label: 'Customer Rating' },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        </div>

        <div className="container px-4 md:px-6 mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">
              Ready to modernize your rental business?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-emerald-100 mb-8 md:mb-10 max-w-2xl mx-auto px-4">
              Join the growing network of rental providers using Kitloop to save time and increase revenue.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Button 
                size="lg" 
                className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg bg-white text-emerald-700 hover:bg-emerald-50 rounded-full group w-full sm:w-auto" 
                asChild
              >
                <Link to="/signup">
                  Get Started for Free
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg border-2 border-white/30 text-white hover:bg-white/10 rounded-full w-full sm:w-auto" 
                asChild
              >
                <Link to="/login">Provider Login</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

const BentoFeature = ({ 
  icon, 
  title, 
  description, 
  className,
  delay = 0 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  delay?: number;
}) => (
  <motion.div 
    className={`flex flex-col p-6 md:p-8 rounded-2xl md:rounded-3xl border border-transparent hover:border-border/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${className}`}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="mb-4 md:mb-6 p-2.5 md:p-3 bg-white w-fit rounded-xl md:rounded-2xl shadow-sm border group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-foreground tracking-tight">{title}</h3>
    <p className="text-muted-foreground leading-relaxed text-base md:text-lg">{description}</p>
  </motion.div>
);

export default Index;