import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatPrice } from '@/lib/availability';

interface ContractTemplateProps {
    reservation: any;
    provider: any;
    customer: any;
    items?: any[];
}

export const ContractTemplate = forwardRef<HTMLDivElement, ContractTemplateProps>(({ reservation, provider, customer, items = [] }, ref) => {
    const totalDeposit = reservation.deposit_amount || 0;
    const totalPrice = reservation.total_price || 0;
    const isPaid = reservation.payment_status === 'paid';

    return (
        <div ref={ref} className="p-12 max-w-[210mm] mx-auto bg-white text-black font-serif text-sm leading-relaxed">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Nájemní Smlouva</h1>
                    <p className="text-gray-500">Číslo rezervace: <span className="text-black font-mono font-bold">#{reservation.id.slice(0, 8).toUpperCase()}</span></p>
                </div>
                <div className="text-right">
                    <h2 className="font-bold text-lg">{provider.rental_name || 'Outdoor Rental'}</h2>
                    <p>{provider.address}</p>
                    <p>{provider.email} | {provider.phone}</p>
                    {provider.tax_id && <p>IČ: {provider.tax_id}</p>}
                </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="font-bold uppercase text-xs mb-2 border-b border-gray-300 pb-1">Pronajímatel</h3>
                    <p className="font-bold">{provider.rental_name}</p>
                    <p>{provider.address}</p>
                </div>
                <div>
                    <h3 className="font-bold uppercase text-xs mb-2 border-b border-gray-300 pb-1">Nájemce</h3>
                    <p className="font-bold">{customer.full_name}</p>
                    <p>{customer.email}</p>
                    <p>{customer.phone}</p>
                    {customer.email && <p className="text-xs text-gray-500 mt-1">ID: {customer.id}</p>}
                </div>
            </div>

            {/* Rental Details */}
            <div className="mb-8">
                <h3 className="font-bold uppercase text-xs mb-4 border-b border-black pb-1">Předmět nájmu</h3>
                <table className="w-full text-left mb-4">
                    <thead>
                        <tr className="border-b border-gray-300">
                            <th className="py-2">Položka</th>
                            <th className="py-2 text-right">Cena</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                                <td className="py-2">
                                    <span className="font-bold">{item.gear?.name || item.name}</span>
                                    {item.gear?.asset_tag && <span className="text-gray-500 text-xs ml-2">({item.gear.asset_tag})</span>}
                                </td>
                                <td className="py-2 text-right">
                                    {formatPrice((item.price_cents || 0) / 100)}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td className="py-2 font-italic text-gray-500">Dle specifikace rezervace (viz systém)</td>
                                <td className="py-2 text-right">{formatPrice(totalPrice)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="grid grid-cols-2 gap-8 text-sm bg-gray-50 p-4 rounded">
                    <div>
                        <span className="block text-gray-500 text-xs">Termín výpůjčky:</span>
                        <span className="font-bold">
                            {format(new Date(reservation.start_date), 'd.M.yyyy HH:mm')} - {format(new Date(reservation.end_date), 'd.M.yyyy HH:mm')}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="block text-gray-500 text-xs">Celková cena:</span>
                        <span className="font-bold text-lg">{formatPrice(totalPrice)}</span>
                        <span className="block text-xs text-gray-500">{isPaid ? 'Hrazeno' : 'K úhradě'}</span>
                    </div>
                </div>
            </div>

            {/* Terms & Conditions */}
            <div className="mb-12">
                <h3 className="font-bold uppercase text-xs mb-2 border-b border-black pb-1">Podmínky a Prohlášení</h3>
                <div className="text-xs text-gray-600 text-justify space-y-2 leading-snug">
                    <p>
                        1. Nájemce přebírá vybavení ve stavu způsobilém k řádnému užívání a zavazuje se jej vrátit ve stejném stavu, s přihlédnutím k běžnému opotřebení.
                    </p>
                    <p>
                        2. Nájemce odpovídá za škody způsobené na vybavení ode dne převzetí do dne vrácení. V případě ztráty nebo zničení vybavení se zavazuje uhradit pořizovací cenu nového vybavení.
                    </p>
                    <p>
                        3. Vybavení není pojištěno proti krádeži ani poškození, pokud není sjednáno jinak. Nájemce souhlasí s tím, že vybavení bude užívat na vlastní nebezpečí.
                    </p>
                    <p>
                        4. V případě pozdního vrácení je pronajímatel oprávněn účtovat smluvní pokutu ve výši dvojnásobku denního nájemného za každý započatý den prodlení.
                    </p>
                    {provider.terms_text && (
                        <p className="mt-2 font-semibold">Další podmínky: {provider.terms_text}</p>
                    )}
                </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-16 mt-auto pt-12">
                <div className="text-center">
                    <div className="border-b border-black h-12 mb-2"></div>
                    <p className="font-bold text-xs uppercase">Za Pronajímatele</p>
                    <p className="text-xs text-gray-500">{format(new Date(), 'd.M.yyyy')}</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-black h-12 mb-2"></div>
                    <p className="font-bold text-xs uppercase">Za Nájemce (Podpis)</p>
                    <p className="text-xs text-gray-500">Souhlasím s převzetím a podmínkami</p>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-300">
                Generated by Kitloop on {format(new Date(), 'dd.MM.yyyy HH:mm')}
            </div>
        </div>
    );
});
ContractTemplate.displayName = "ContractTemplate";
