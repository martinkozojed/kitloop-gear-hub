/**
 * Shared types, helpers, and primitives for onboarding sections.
 */
import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Package, ClipboardList, FileSpreadsheet,
  LayoutDashboard, CalendarCheck, QrCode,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Lang = "cs" | "en";
export type Pain = "inventory" | "counter" | "exports";

export interface PainItem { key: Pain; label: string; }
export interface TimelineStep { title: string; desc: string; }
export interface WhatYouGetItem { title: string; desc: string; }
export interface FAQ { q: string; a: string; }

// ─── Static icon maps ───────────────────────────────────────────────────────

export const painIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  inventory: Package,
  counter: ClipboardList,
  exports: FileSpreadsheet,
};

export const timelineIcons = [LayoutDashboard, Package, CalendarCheck, QrCode];

// ─── Animation variant ──────────────────────────────────────────────────────

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } },
};

// ─── Section wrapper ────────────────────────────────────────────────────────

export function Section({
  children, className, id,
}: {
  children: React.ReactNode; className?: string; id?: string;
}) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={shouldReduce ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Ambient glow layer ─────────────────────────────────────────────────────

export function GlowLayer({ className }: { className?: string }) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return null;
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className || ""}`} aria-hidden="true">
      <motion.div
        className="absolute top-10 -right-20 w-[570px] h-[570px] rounded-full bg-emerald-400/[0.15] blur-[100px]"
        animate={{ x: [0, -100, -250, -50, 0], y: [0, 200, 400, 100, 0], scale: [1, 1.2, 0.9, 1.1, 1] }}
        transition={{
          x: { duration: 37, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 43, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 47, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      <motion.div
        className="absolute top-20 -left-20 w-[310px] h-[310px] rounded-full bg-emerald-400/[0.19] blur-[100px]"
        animate={{ x: [0, 100, 250, 50, 0], y: [0, 200, 350, 100, 0], scale: [1, 0.9, 1.2, 0.95, 1] }}
        transition={{
          x: { duration: 41, repeat: Infinity, ease: "easeInOut", delay: 3 },
          y: { duration: 53, repeat: Infinity, ease: "easeInOut", delay: 3 },
          scale: { duration: 59, repeat: Infinity, ease: "easeInOut", delay: 3 },
        }}
      />
    </div>
  );
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export function fireCtaEvent(placement: string, lang: string, pain: Pain | null) {
  window.dispatchEvent(
    new CustomEvent("kitloop:onboarding_cta_click", { detail: { placement, lang, pain } }),
  );
}

export function firePainEvent(pain: Pain, lang: string) {
  window.dispatchEvent(
    new CustomEvent("kitloop:onboarding_pain_select", { detail: { pain, lang } }),
  );
}
