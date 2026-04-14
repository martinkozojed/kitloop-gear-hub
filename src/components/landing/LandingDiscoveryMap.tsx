import RentalMap from "../home/RentalMap";
import { Sparkles, MapPin } from "lucide-react";

export function LandingDiscoveryMap() {
    return (
        <section className="py-20 md:py-32 bg-slate-50 relative selection:bg-brand-500/20">
            <div className="container px-4 md:px-6 mx-auto relative">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
                    <div className="flex-1 space-y-8">
                        <div className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1 text-sm font-medium text-brand-600 shadow-sm">
                            <MapPin className="h-4 w-4 mr-2" />
                            Marketplace Discovery
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
                            Objevte vybavení <span className="text-brand-600">ve svém okolí</span>
                        </h2>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            Kitloop již propojuje outdoorové nadšence s ověřenými půjčovnami v celé republice. Nemusíte složitě hledat – vidíte dostupnost online a na správném místě.
                        </p>
                        
                        <ul className="space-y-4 pt-4">
                            {[
                                "Stovky položek od ověřených poskytovatelů",
                                "Žádné volání, okamžitá dostupnost a rezervace online",
                                "Osobní vyzvednutí přesně tam, kde začíná vaše cesta"
                            ].map((text, i) => (
                                <li key={i} className="flex items-start">
                                    <div className="bg-brand-100 rounded-full p-1.5 mr-3 mt-0.5 text-brand-600">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <span className="text-slate-700 font-medium">{text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="flex-1 w-full lg:w-auto">
                        <div className="rounded-2xl border bg-white/50 p-2 shadow-xl shadow-brand-900/5 backdrop-blur-xl">
                            <RentalMap />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
