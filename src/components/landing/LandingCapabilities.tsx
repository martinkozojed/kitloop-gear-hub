import { Calendar, Package, ClipboardCheck, AlertCircle, Shield, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const CARDS = [
    { icon: Calendar,       titleKey: 'product.modules.module1Title', descKey: 'product.modules.module1Desc', delay: 0.10 },
    { icon: Package,        titleKey: 'product.modules.module2Title', descKey: 'product.modules.module2Desc', delay: 0.15 },
    { icon: ClipboardCheck, titleKey: 'product.modules.module3Title', descKey: 'product.modules.module3Desc', delay: 0.20 },
    { icon: AlertCircle,    titleKey: 'product.modules.module4Title', descKey: 'product.modules.module4Desc', delay: 0.25 },
    { icon: Shield,         titleKey: 'product.modules.module5Title', descKey: 'product.modules.module5Desc', delay: 0.30 },
    { icon: Upload,         titleKey: 'product.modules.module6Title', descKey: 'product.modules.module6Desc', delay: 0.30 },
] as const;

export function LandingCapabilities() {
    const { t } = useTranslation();

    return (
        <div className="max-w-6xl mx-auto mb-28 relative">
            {/* Animated Background Accent */}
            <motion.div
                animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-brand-500/5 via-transparent to-brand-500/5 rounded-full blur-3xl pointer-events-none"
            />

            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative text-3xl md:text-4xl font-bold text-center mb-16"
            >
                {t('product.modules.heading')}
            </motion.h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CARDS.map(({ icon: Icon, titleKey, descKey, delay }) => (
                    <motion.div
                        key={titleKey}
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
                        className="group relative p-8 bg-white rounded-2xl border border-border/60 hover:border-primary/30 shadow-card hover:shadow-hero-hover transition-all duration-300 hover:-translate-y-2"
                    >
                        <div className="relative flex flex-col gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 group-hover:scale-110 transition-all">
                                <Icon className="h-7 w-7 text-white" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-bold text-foreground">{t(titleKey)}</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">{t(descKey)}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
