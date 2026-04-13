import { Calendar, ClipboardCheck, Package, Shield, AlertCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function LandingWorkflow() {
    const { t } = useTranslation();

    return (
        <div className="max-w-7xl mx-auto mb-28 relative">
            {/* Animated Background Decoration */}
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.08, 0.05] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-br from-brand-500 to-brand-500 rounded-full blur-3xl pointer-events-none"
            />
            <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.1, 0.05] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-1/4 left-0 w-96 h-96 bg-gradient-to-tr from-brand-500 to-brand-500 rounded-full blur-3xl pointer-events-none"
            />

            {/* Connecting Flow Line (Desktop) */}
            <div className="hidden md:block absolute left-16 top-48 bottom-48 w-0.5 bg-gradient-to-b from-transparent via-brand-500/30 to-transparent">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/50 to-transparent blur-sm" />
                <motion.div
                    animate={{ y: ["0%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-500 rounded-full shadow-lg shadow-brand-500/50"
                />
            </div>

            <div className="relative">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-foreground via-foreground to-brand-600 bg-clip-text"
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
                    {/* Step 1 — Reservation */}
                    <WorkflowStep
                        step={1}
                        icon={<Calendar className="h-4 w-4" />}
                        imageAlt="Reservation Dashboard"
                        titleKey="product.workflow.step1Title"
                        descKey="product.workflow.step1Desc"
                        direction="left"
                        pills={[
                            { label: "Real-time status", position: "top-right", icon: null, pulse: true },
                            { label: "Date picker", position: "bottom-left", icon: <Calendar className="h-3 w-3" /> },
                        ]}
                    />

                    {/* Step 2 — Check-in/out */}
                    <WorkflowStep
                        step={2}
                        icon={<ClipboardCheck className="h-4 w-4" />}
                        imageAlt="Check-in/out Interface"
                        titleKey="product.workflow.step2Title"
                        descKey="product.workflow.step2Desc"
                        direction="right"
                        pills={[
                            { label: "Photo capture", position: "top-left", icon: <ClipboardCheck className="h-3 w-3" /> },
                            { label: "Digital signature", position: "bottom-right", icon: <Shield className="h-3 w-3" /> },
                        ]}
                    />

                    {/* Step 3 — Return */}
                    <WorkflowStep
                        step={3}
                        icon={<Package className="h-4 w-4" />}
                        imageAlt="Return & Damage Tracking"
                        titleKey="product.workflow.step3Title"
                        descKey="product.workflow.step3Desc"
                        direction="left"
                        pills={[
                            { label: "Damage log", position: "top-right", icon: <AlertCircle className="h-3 w-3" /> },
                            { label: "Inventory sync", position: "bottom-left", icon: <Package className="h-3 w-3" /> },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Workflow Step Sub-component ─────────────────────────────────────────────

interface PillDef {
    label: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    icon: React.ReactNode;
    pulse?: boolean;
}

interface WorkflowStepProps {
    step: number;
    icon: React.ReactNode;
    imageAlt: string;
    titleKey: string;
    descKey: string;
    direction: 'left' | 'right';
    pills: PillDef[];
}

const POSITION_CLASSES: Record<PillDef['position'], string> = {
    'top-left': 'top-6 left-6',
    'top-right': 'top-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-right': 'bottom-6 right-6',
};

function WorkflowStep({ step, icon, imageAlt, titleKey, descKey, direction, pills }: WorkflowStepProps) {
    const { t } = useTranslation();
    const isLeft = direction === 'left';

    return (
        <motion.div
            initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative grid md:grid-cols-2 gap-8 md:gap-16 items-center"
        >
            {/* Screenshot */}
            <div className={`relative group ${!isLeft ? 'md:order-2' : ''}`}>
                <motion.div
                    initial={{ scale: 0, rotate: isLeft ? -180 : 180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className={`absolute -top-6 ${isLeft ? '-left-6' : '-right-6'} z-20 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white font-bold text-2xl shadow-2xl shadow-brand-500/40 border-4 border-white`}
                >
                    {step}
                </motion.div>

                <div className={`relative rounded-2xl overflow-hidden transform transition-all duration-500 group-hover:scale-[1.02] ${isLeft ? 'group-hover:-rotate-1' : 'group-hover:rotate-1'}`}>
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-${isLeft ? 'br' : 'bl'} from-brand-500/20 via-transparent to-brand-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10`} />

                    <div className="relative border-2 border-border/60 bg-white shadow-hero rounded-2xl overflow-hidden">
                        <img src="/hero-dashboard.png" alt={imageAlt} className="w-full h-auto" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/5 via-transparent to-transparent pointer-events-none" />

                        {pills.map((pill, i) => (
                            <motion.div
                                key={pill.label}
                                initial={{ opacity: 0, ...(pill.position.includes('left') ? { x: -20 } : pill.position.includes('right') ? { x: 20 } : { y: 20 }) }}
                                whileInView={{ opacity: 1, x: 0, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.6 + i * 0.1 }}
                                className={`absolute ${POSITION_CLASSES[pill.position]} flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-brand-200/50 rounded-full shadow-lg text-xs font-semibold text-brand-700`}
                            >
                                {pill.pulse ? (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                                    </span>
                                ) : pill.icon}
                                {pill.label}
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className={`absolute -bottom-4 ${isLeft ? '-right-4' : '-left-4'} w-24 h-24 bg-gradient-to-br from-brand-400/20 to-brand-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            </div>

            {/* Content */}
            <div className={`space-y-6 ${isLeft ? 'md:pl-8' : 'md:order-1 md:pr-8 md:text-right'}`}>
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-brand-50 border border-brand-200/50 rounded-full text-sm font-semibold text-brand-700 mb-4">
                    {icon}
                    Step {step}
                </div>
                <h3 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                    {t(titleKey)}
                </h3>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                    {t(descKey)}
                </p>
            </div>

            {/* Connecting Arrow */}
            {step < 3 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="hidden md:block absolute -bottom-20 left-1/2 -translate-x-1/2"
                >
                    <ArrowRight className="h-8 w-8 text-brand-500/40 rotate-90" />
                </motion.div>
            )}
        </motion.div>
    );
}
