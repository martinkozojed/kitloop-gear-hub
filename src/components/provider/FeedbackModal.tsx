import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { submitFeedback } from '@/lib/app-events';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function FeedbackModal() {
  const { provider } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [messageCs, setMessageCs] = useState('');
  const [messageEn, setMessageEn] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!provider?.id) {
      toast.error('Chybí provider kontext.');
      return;
    }
    if (!messageCs.trim()) {
      toast.error('CZ zprava je povinna.');
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        providerId: provider.id,
        message: messageCs.trim(),
        pagePath: location.pathname,
        metadata: {
          message_en: messageEn.trim() || undefined,
          locale: navigator.language,
        },
      });

      toast.success('Diky za feedback.');
      setMessageCs('');
      setMessageEn('');
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Feedback se nepodarilo odeslat.', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="fixed bottom-20 right-4 md:bottom-6 z-40"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Feedback
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback</DialogTitle>
            <DialogDescription>
              CZ zprava je povinna. EN text je volitelny.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-cs">Zprava (CZ) *</Label>
              <Textarea
                id="feedback-cs"
                value={messageCs}
                onChange={(e) => setMessageCs(e.target.value)}
                required
                minLength={3}
                placeholder="Napiste nam, co zlepsit..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-en">Message (EN, optional)</Label>
              <Textarea
                id="feedback-en"
                value={messageEn}
                onChange={(e) => setMessageEn(e.target.value)}
                placeholder="Optional English version..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                Zavrit
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Odesilam...' : 'Odeslat'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
