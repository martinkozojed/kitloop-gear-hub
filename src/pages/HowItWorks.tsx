import React from "react";
import {
  Search,
  CalendarCheck,
  MapPin,
  Star,
  HandCoins,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

const steps = [
  {
    title: "Find the perfect gear",
    description:
      "Browse thousands of rental options filtered by location, activity, or equipment type. Real-time availability helps you find what's nearby.",
    icon: <Search className="w-6 h-6 text-white" />,
  },
  {
    title: "Book in seconds",
    description:
      "Select your dates, add extras, and book securely with instant confirmation.",
    icon: <CalendarCheck className="w-6 h-6 text-white" />,
  },
  {
    title: "Easy pickup",
    description:
      "Follow pickup directions after booking confirmation. Quick ID check and you're good to go.",
    icon: <MapPin className="w-6 h-6 text-white" />,
  },
  {
    title: "Return & review",
    description:
      "Return gear to the same location. Leave a helpful review to support the community.",
    icon: <Star className="w-6 h-6 text-white" />,
  },
];

const process = [
  {
    title: "Booking secured",
    description:
      "You book the gear – we immediately notify the provider and hold your payment securely until return.",
    icon: <HandCoins className="w-6 h-6 text-kitloop-accent" />,
  },
  {
    title: "Provider prepares",
    description:
      "The provider confirms availability, prepares everything for pickup, and marks return in the system.",
    icon: <CheckCircle className="w-6 h-6 text-kitloop-accent" />,
  },
  {
    title: "Automatic payout",
    description:
      "After successful return, the provider is paid out automatically. Kitloop support steps in if needed.",
    icon: <ShieldCheck className="w-6 h-6 text-kitloop-accent" />,
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold mb-2 text-center">How it works</h2>
        <p className="text-muted-foreground text-center mb-12">
          Renting outdoor gear has never been easier.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-6 rounded-xl bg-white shadow-sm border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 shrink-0">
                {step.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-16 border-t border-gray-200" />

        <div className="text-center mb-10">
          <h3 className="text-2xl font-bold mb-2">Behind the scenes</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you're renting or offering gear, here's how Kitloop keeps everything smooth and transparent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {process.map((item, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                {item.icon}
                <h4 className="font-semibold text-lg">{item.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
