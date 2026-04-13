import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function LandingCTA() {
    const { t } = useTranslation();

    return (
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
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

                <div className="text-center space-y-6">
                    <h3 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                        {t('product.cta.heading')}
                    </h3>

                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        {t('product.cta.microcopy')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button variant="cta" size="lg" className="h-14 px-10 text-lg font-semibold" asChild>
                            <Link to="/">
                                {t('product.cta.primaryCta')} <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-14 px-10 text-lg font-semibold border-2 border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-700 transition-all"
                            asChild
                        >
                            <Link to="/demo/dashboard">{t('product.cta.secondaryCta')}</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
