import React from 'react';
import { motion } from 'framer-motion';

interface GlowLayerProps {
    className?: string;
}

export function GlowLayer({ className = '' }: GlowLayerProps) {
    return (
        <div className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 ${className}`}>
            {/* Primary Glow */}
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px] opacity-60 mix-blend-multiply dark:mix-blend-screen"
                animate={{
                    x: ['-20%', '20%', '40%', '-10%', '-20%'],
                    y: ['-20%', '10%', '-30%', '20%', '-20%'],
                    scale: [1, 1.2, 0.8, 1.1, 1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                style={{
                    top: '10%',
                    left: '10%',
                }}
            />

            {/* Secondary Glow */}
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full bg-emerald-300/20 blur-[120px] opacity-50 mix-blend-multiply dark:mix-blend-screen"
                animate={{
                    x: ['20%', '-30%', '-10%', '30%', '20%'],
                    y: ['10%', '30%', '-20%', '-10%', '10%'],
                    scale: [1, 0.8, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                style={{
                    bottom: '10%',
                    right: '5%',
                }}
            />
        </div>
    );
}
