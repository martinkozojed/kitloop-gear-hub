import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AnnouncementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AnnouncementModal({ open, onOpenChange }: AnnouncementModalProps) {
    const { t } = useTranslation();

    const highlights = [
        t('announcement.highlight1'),
        t('announcement.highlight2'),
        t('announcement.highlight3'),
        t('announcement.highlight4'),
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl">{t('announcement.title')}</DialogTitle>
                            <p className="text-sm text-muted-foreground">{t('announcement.date')}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <span className="text-emerald-600">&#10024;</span>
                            {t('announcement.highlightsTitle')}
                        </h3>
                        <ul className="space-y-3 pl-6">
                            {highlights.map((text, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="text-emerald-600 mt-0.5">&#8226;</span>
                                    <span className="text-muted-foreground">{text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 border border-emerald-100">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {t('announcement.description')}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="default" size="lg" className="flex-1" asChild>
                            <Link to="/" onClick={() => onOpenChange(false)}>
                                {t('announcement.cta')} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
                            {t('announcement.close')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
