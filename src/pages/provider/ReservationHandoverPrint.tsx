import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

interface HandoverLine {
  quantity: number;
  product_variant: { name: string } | null;
}

interface HandoverData {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  admin_notes?: string | null;
  provider: {
    rental_name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    terms_url?: string | null;
  };
  lines: HandoverLine[];
}

export default function ReservationHandoverPrint() {
  const { id } = useParams<{ id: string }>();
  const { user, provider, loading: authLoading } = useAuth();
  const [data, setData] = useState<HandoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || authLoading) return;
    if (!user || !provider?.id) return;

    (async () => {
      try {
        const { data: res, error: err } = await supabase
          .from('reservations')
          .select(`
            id, status, start_date, end_date,
            customer_name, customer_email, customer_phone,
            admin_notes,
            provider:providers ( rental_name, address, email, phone, terms_url ),
            lines:reservation_lines ( quantity, product_variant:product_variants ( name ) )
          `)
          .eq('id', id)
          .single();

        if (err) throw err;
        setData(res as unknown as HandoverData);
      } catch {
        setError('Rezervace nenalezena nebo přístup odepřen.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, provider?.id, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="handover-loading">
        <Loader2 className="animate-spin" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user || !provider) return <Navigate to="/login" replace />;
  if (error || !data) {
    return (
      <div className="handover-error">
        <p>{error || 'Rezervace nenalezena.'}</p>
      </div>
    );
  }

  const prov = Array.isArray(data.provider) ? data.provider[0] : data.provider;
  const lines = data.lines ?? [];
  const now = format(new Date(), "d.M.yyyy HH:mm", { locale: cs });

  return (
    <>
      <style>{printStyles}</style>

      <div className="handover-page">
        {/* Print trigger (hidden in print) */}
        <div className="no-print" style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
          <button className="print-btn" onClick={() => window.print()}>
            Vytisknout
          </button>
          <button className="print-btn print-btn--secondary" onClick={() => window.history.back()}>
            Zpět
          </button>
        </div>

        {/* Header */}
        <header className="handover-header">
          <h1>Předávací protokol</h1>
          <p className="handover-subtitle">
            Rezervace #{data.id.slice(0, 8).toUpperCase()} &middot; {data.status.toUpperCase()}
          </p>
        </header>

        {/* Provider */}
        <section className="handover-section">
          <h2>Poskytovatel</h2>
          <p className="handover-bold">{prov?.rental_name ?? '—'}</p>
          {prov?.address && <p>{prov.address}</p>}
          {(prov?.email || prov?.phone) && (
            <p>
              {[prov.email, prov.phone].filter(Boolean).join(' | ')}
            </p>
          )}
        </section>

        {/* Dates */}
        <section className="handover-section">
          <h2>Termín</h2>
          <div className="handover-grid">
            <div>
              <span className="handover-label">Od:</span>
              <span>{format(new Date(data.start_date), 'd.M.yyyy HH:mm', { locale: cs })}</span>
            </div>
            <div>
              <span className="handover-label">Do:</span>
              <span>{format(new Date(data.end_date), 'd.M.yyyy HH:mm', { locale: cs })}</span>
            </div>
          </div>
        </section>

        {/* Customer */}
        <section className="handover-section">
          <h2>Zákazník</h2>
          <p className="handover-bold">{data.customer_name}</p>
          <p>{data.customer_email || data.customer_phone || '—'}</p>
        </section>

        {/* Items */}
        <section className="handover-section">
          <h2>Položky</h2>
          {lines.length > 0 ? (
            <table className="handover-table">
              <thead>
                <tr>
                  <th>Název</th>
                  <th style={{ textAlign: 'right' }}>Ks</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td>{line.product_variant?.name ?? 'Položka'}</td>
                    <td style={{ textAlign: 'right' }}>{line.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="handover-muted">Dle specifikace rezervace</p>
          )}
        </section>

        {/* Admin notes */}
        {data.admin_notes && (
          <section className="handover-section">
            <h2>Poznámky</h2>
            <p>{data.admin_notes}</p>
          </section>
        )}

        {/* Signatures */}
        <section className="handover-signatures">
          <div className="sig-block">
            <div className="sig-line" />
            <p className="sig-label">Předáno (poskytovatel)</p>
            <p className="sig-date">Datum: {now}</p>
          </div>
          <div className="sig-block">
            <div className="sig-line" />
            <p className="sig-label">Převzal (zákazník)</p>
            <p className="sig-date">Datum: _______________</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="handover-footer">
          {prov?.terms_url && (
            <p>Obchodní podmínky: <a href={prov.terms_url}>{prov.terms_url}</a></p>
          )}
          <p>Vygenerováno: {now}</p>
        </footer>
      </div>
    </>
  );
}

const printStyles = `
  /* Screen layout */
  .handover-page {
    max-width: 210mm;
    margin: 0 auto;
    padding: 40px 32px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #111;
    font-size: 14px;
    line-height: 1.6;
  }
  .handover-loading, .handover-error {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #666;
  }
  .handover-header {
    border-bottom: 2px solid #111;
    padding-bottom: 12px;
    margin-bottom: 24px;
  }
  .handover-header h1 {
    font-size: 26px;
    font-weight: 700;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .handover-subtitle {
    margin: 4px 0 0;
    color: #555;
    font-size: 13px;
  }
  .handover-section {
    margin-bottom: 20px;
  }
  .handover-section h2 {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    margin: 0 0 8px;
    color: #333;
  }
  .handover-bold { font-weight: 600; }
  .handover-label { font-weight: 600; margin-right: 6px; }
  .handover-muted { color: #888; font-style: italic; }
  .handover-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .handover-table {
    width: 100%;
    border-collapse: collapse;
  }
  .handover-table th, .handover-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #e5e5e5;
    text-align: left;
  }
  .handover-table th {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #555;
  }
  .handover-signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-top: 48px;
    page-break-inside: avoid;
  }
  .sig-block { text-align: center; }
  .sig-line {
    border-bottom: 1px solid #111;
    height: 48px;
    margin-bottom: 6px;
  }
  .sig-label { font-weight: 700; font-size: 12px; text-transform: uppercase; }
  .sig-date { font-size: 11px; color: #666; margin-top: 2px; }
  .handover-footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    font-size: 11px;
    color: #999;
    text-align: center;
  }
  .handover-footer a { color: #555; }

  /* Print button */
  .print-btn {
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 600;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #111;
    color: #fff;
    cursor: pointer;
  }
  .print-btn--secondary {
    background: #fff;
    color: #111;
  }

  /* Print overrides */
  @media print {
    .no-print, nav, aside, header:not(.handover-header),
    footer:not(.handover-footer), [data-testid="navbar"],
    [data-testid="sidebar"], .sonner-toaster { display: none !important; }

    body { margin: 0; padding: 0; }
    .handover-page { padding: 20mm 15mm; max-width: none; }
    .handover-signatures { page-break-inside: avoid; }
    .handover-section { page-break-inside: avoid; }
  }
`;
