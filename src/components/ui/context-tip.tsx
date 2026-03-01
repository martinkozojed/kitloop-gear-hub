/**
 * ContextTip – inline behavior-based tip component.
 *
 * Max 1 tip per page; caller is responsible for choosing which tip to pass.
 * Renders nothing if shouldShowTip() returns false.
 */
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { TipCopy } from '@/content/microcopy.registry';
import {
    shouldShowTip,
    recordTipShown,
    recordTipDismissed,
    recordTipClicked,
} from '@/lib/tip-engine';
import { track } from '@/lib/telemetry';
// APP_EVENTS not imported here — track() calls use TelemetryEventName directly ('tip.dismissed', 'tip.clicked')

interface ContextTipProps {
    tip: TipCopy;
    userId: string;
    /** True when user focus is inside an input/textarea/select. */
    isTyping?: boolean;
    /** Override navigate; defaults to react-router navigate. */
    onNavigate?: (href: string) => void;
}

export const ContextTip: React.FC<ContextTipProps> = ({
    tip,
    userId,
    isTyping = false,
    onNavigate,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const shownRef = useRef(false);

    const visible = shouldShowTip(tip, userId, { isTyping });

    // Record "shown" once on mount (only if actually visible, only once per render)
    useEffect(() => {
        if (visible && !shownRef.current) {
            shownRef.current = true;
            recordTipShown(tip.id, userId);
        }
    }, [visible, tip.id, userId]);

    if (!visible) return null;

    const handleDismiss = () => {
        recordTipDismissed(tip.id, userId);
        track('tip.dismissed', { tipId: tip.id });
        // Force re-render by triggering a state change — parent key is responsible.
        // This component unmounts naturally if parent re-renders after dismiss.
    };

    const handleCta = () => {
        recordTipClicked(tip.id, userId);
        track('tip.clicked', { tipId: tip.id });
        if (tip.ctaHref) {
            if (onNavigate) {
                onNavigate(tip.ctaHref);
            } else {
                navigate(tip.ctaHref);
            }
        }
    };

    return (
        <div
            role="note"
            aria-label={t('ssot.tip.ariaLabel', 'Tip')}
            className="
        flex items-start gap-3 p-3 rounded-lg
        border border-primary/20 bg-primary/5
        text-sm text-foreground
        animate-in fade-in slide-in-from-top-1 duration-300
      "
            data-testid={`context-tip-${tip.id}`}
        >
            {/* Tip icon */}
            <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-primary text-base select-none"
            >
                💡
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="leading-relaxed">{t(tip.textKey)}</p>
                {tip.ctaLabelKey && tip.ctaHref && (
                    <Button
                        size="sm"
                        variant="link"
                        className="px-0 h-auto mt-1 text-primary font-medium"
                        onClick={handleCta}
                        data-testid={`context-tip-cta-${tip.id}`}
                    >
                        {t(tip.ctaLabelKey)} →
                    </Button>
                )}
            </div>

            {/* Dismiss */}
            <button
                onClick={handleDismiss}
                aria-label={t('ssot.tip.dismiss', 'Skrýt tip')}
                className="
          shrink-0 mt-0.5 text-muted-foreground
          hover:text-foreground transition-colors
        "
                data-testid={`context-tip-dismiss-${tip.id}`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default ContextTip;
