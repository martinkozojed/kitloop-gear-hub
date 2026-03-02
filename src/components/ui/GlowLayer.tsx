import React from 'react';
import { motion } from 'framer-motion';

interface GlowLayerProps {
    className?: string;
}

export function GlowLayer({ className = '' }: GlowLayerProps) {
    return (
        <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
            {/* Primary Glow (Top Left - strictly moves Left & Up) */}
            <motion.div
                className="absolute w-[570px] h-[570px] rounded-full bg-primary/20 blur-[100px] opacity-65 mix-blend-multiply dark:mix-blend-screen"
                animate={{
                    x: ['0%', '-15%', '-5%', '-25%', '0%'],
                    y: ['0%', '-25%', '-10%', '-15%', '0%'],
                    scale: [1, 1.15, 0.85, 1.1, 1],
                }}
                transition={{
                    x: { duration: 37, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 43, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 47, repeat: Infinity, ease: "easeInOut" }
                }}
                style={{
                    top: '10%',
                    left: '10%',
                }}
            />

            {/* Secondary Glow (Bottom Right - strictly moves Right & Down) */}
            <motion.div
                className="absolute w-[475px] h-[475px] rounded-full bg-emerald-300/20 blur-[120px] opacity-55 mix-blend-multiply dark:mix-blend-screen"
                animate={{
                    x: ['0%', '25%', '10%', '35%', '0%'],
                    y: ['0%', '35%', '20%', '15%', '0%'],
                    scale: [1, 0.85, 1.2, 0.9, 1],
                }}
                transition={{
                    x: { duration: 41, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 53, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 59, repeat: Infinity, ease: "easeInOut" }
                }}
                style={{
                    bottom: '10%',
                    right: '5%',
                }}
            />
        </div>
    );
}
