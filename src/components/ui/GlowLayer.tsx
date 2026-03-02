import React from 'react';
import { motion } from 'framer-motion';

interface GlowLayerProps {
    className?: string;
}

export function GlowLayer({ className = '' }: GlowLayerProps) {
    return (
        <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
            {/* Primary Glow */}
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px] opacity-65 mix-blend-multiply dark:mix-blend-screen"
                animate={{
                    x: ['-28%', '28%', '55%', '-18%', '-28%'],
                    y: ['-28%', '18%', '-44%', '28%', '-28%'],
                    scale: [1, 1.25, 0.75, 1.15, 1],
                }}
                transition={{
                    duration: 25,
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
                className="absolute w-[500px] h-[500px] rounded-full bg-emerald-300/20 blur-[120px] opacity-55 mix-blend-multiply dark:mix-blend-screen"
                animate={{
                    x: ['28%', '-38%', '-18%', '38%', '28%'],
                    y: ['18%', '38%', '-28%', '-18%', '18%'],
                    scale: [1, 0.75, 1.3, 0.85, 1],
                }}
                transition={{
                    duration: 30,
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
