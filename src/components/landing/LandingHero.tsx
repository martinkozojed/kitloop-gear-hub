import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface LandingHeroProps {
    onAnnouncementClick: () => void;
}

export function LandingHero({ onAnnouncementClick }: LandingHeroProps) {
    const { t } = useTranslation();

    return (
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden min-h-[85vh] flex items-center">
            <div className="container px-4 md:px-6 mx-auto relative w-full">
                <div className="flex flex-col items-center text-center space-y-6">

                    {/* Announcement Badge */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        onClick={onAnnouncementClick}
                        className="group inline-flex items-center rounded-full border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 px-4 py-1.5 text-sm font-medium text-emerald-700 backdrop-blur-sm mb-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                        <Sparkles className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                        <span>{t('hero.announcement')}</span>
                        <ArrowRight className="h-3 w-3 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </motion.button>

                    {/* Hero Copy */}
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

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col sm:flex-row gap-4 min-w-[200px] pt-2"
                    >
                        <Button variant="cta" size="lg" className="h-14 px-8 text-lg rounded-full" asChild>
                            <Link to="/demo/dashboard">{t('hero.secondaryCta')} <ArrowRight className="ml-2 h-5 w-5" /></Link>
                        </Button>
                        <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full" asChild>
                            <Link to="/">{t('hero.primaryCta')}</Link>
                        </Button>
                    </motion.div>

                    {/* Microcopy */}
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
    );
}
