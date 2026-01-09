import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Edit, Phone, Mail, CheckCircle, XCircle, ArrowRightLeft } from "lucide-react";
import { Link } from 'react-router-dom';

import { ResolveConflictModal } from "@/components/operations/ResolveConflictModal";
import { IssueFlow } from "@/components/operations/IssueFlow";
import { ReturnFlow } from "@/components/operations/ReturnFlow";
import { Package, PackageCheck } from "lucide-react";

interface ReservationDetailSheetProps {
    reservation: any | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate: (id: string, status: string) => void;
}

export const ReservationDetailSheet: React.FC<ReservationDetailSheetProps> = ({ reservation, isOpen, onClose, onStatusUpdate }) => {
    const [isConflictOpen, setIsConflictOpen] = React.useState(false);
    const [isIssueOpen, setIsIssueOpen] = React.useState(false);
    const [isReturnOpen, setIsReturnOpen] = React.useState(false);

    if (!reservation) return null;

    const hasAssignment = reservation.assignments && reservation.assignments.length > 0;

    const handleFlowSuccess = async (id: string) => {
        // MVP: Hard refresh to ensure calendar/data sync
        window.location.reload();
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            Rezervace
                            <Badge variant={reservation.status === 'confirmed' ? 'default' : 'outline'}>{reservation.status}</Badge>
                        </SheetTitle>
                        <SheetDescription>Detail rezervace z kalendáře</SheetDescription>
                    </SheetHeader>

                    <div className="py-6 space-y-6">
                        {/* Status Warning */}
                        {reservation.status === 'confirmed' && !hasAssignment && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-center justify-between">
                                <div className="text-sm text-red-800 font-medium flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
                                    Nepřiřazeno (Konflikt)
                                </div>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setIsConflictOpen(true)}
                                >
                                    Vyřešit
                                </Button>
                            </div>
                        )}

                        {/* Customer Info */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Zákazník</h4>
                            <div className="bg-muted/30 p-3 rounded-md space-y-1">
                                <div className="font-medium">{reservation.customer_name}</div>
                                {reservation.customer_email && (
                                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                                        <Mail className="w-3 h-3" /> {reservation.customer_email}
                                    </div>
                                )}
                                {reservation.customer_phone && (
                                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                                        <Phone className="w-3 h-3" /> {reservation.customer_phone}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Date & Item */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Termín</h4>
                                <div className="text-sm">
                                    <div>{format(new Date(reservation.start_date), 'd. MMMM', { locale: cs })}</div>
                                    <div className="text-muted-foreground">do</div>
                                    <div>{format(new Date(reservation.end_date), 'd. MMMM yyyy', { locale: cs })}</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Finance</h4>
                                <div className="text-sm">
                                    <div className="font-medium">{reservation.total_price} Kč</div> {/* Helper for formatting needed */}
                                    <div className={reservation.deposit_paid ? "text-green-600" : "text-amber-600 font-medium"}>
                                        {reservation.deposit_paid ? "Záloha zaplacena" : "Nezaplaceno"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assignments List (Simple MVP) */}
                        {reservation.assignments?.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Přiřazeno</h4>
                                <div className="space-y-1">
                                    {reservation.assignments.map((a: any, i: number) => (
                                        <div key={i} className="text-xs bg-slate-50 p-2 rounded border flex justify-between">
                                            <span>{a.assets?.product_variants?.name || 'Item'}</span>
                                            <span className="font-mono text-slate-500">{a.assets?.asset_tag}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <SheetFooter className="flex-col sm:flex-col gap-2 sm:space-x-0">
                        {/* Primary Operational Actions */}
                        {reservation.status === 'confirmed' && (
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsIssueOpen(true)}>
                                <Package className="w-4 h-4 mr-2" /> Vydat (Issue)
                            </Button>
                        )}

                        {reservation.status === 'active' && (
                            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setIsReturnOpen(true)}>
                                <PackageCheck className="w-4 h-4 mr-2" /> Vrátit (Return)
                            </Button>
                        )}

                        <div className="border-t my-2" />

                        {/* Manual Override Action */}
                        <Button variant="secondary" className="w-full text-xs" onClick={() => setIsConflictOpen(true)}>
                            <ArrowRightLeft className="w-3 h-3 mr-2" /> Změnit přiřazení (Swap)
                        </Button>

                        <div className="border-t my-2" />

                        <Button className="w-full" asChild variant="outline">
                            <Link to={`/provider/reservations/edit/${reservation.id}`}>
                                <Edit className="w-4 h-4 mr-2" /> Upravit rezervaci
                            </Link>
                        </Button>

                        {reservation.status === 'hold' || reservation.status === 'pending' ? (
                            <Button className="w-full text-green-700 bg-green-50 hover:bg-green-100 border-green-200" onClick={() => onStatusUpdate(reservation.id, 'confirmed')} variant="outline">
                                <CheckCircle className="w-4 h-4 mr-2" /> Potvrdit rezervaci
                            </Button>
                        ) : null}

                        <Button className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" variant="ghost" onClick={() => onStatusUpdate(reservation.id, 'cancelled')}>
                            Zrušit rezervaci
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <ResolveConflictModal
                isOpen={isConflictOpen}
                onClose={() => setIsConflictOpen(false)}
                reservation={reservation}
                onSuccess={() => window.location.reload()}
            />

            <IssueFlow
                open={isIssueOpen}
                onOpenChange={setIsIssueOpen}
                reservation={{
                    id: reservation.id,
                    customerName: reservation.customer_name,
                    itemName: `${reservation.assignments?.length || 0} Items` // approximate
                }}
                onConfirm={handleFlowSuccess}
            />

            <ReturnFlow
                open={isReturnOpen}
                onOpenChange={setIsReturnOpen}
                reservation={{
                    id: reservation.id,
                    customerName: reservation.customer_name,
                    itemName: `${reservation.assignments?.length || 0} Items`
                }}
                onConfirm={handleFlowSuccess}
            />
        </>
    );
};
