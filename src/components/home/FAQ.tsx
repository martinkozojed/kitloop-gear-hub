
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does Kitloop work?",
    answer: "Kitloop connects outdoor enthusiasts with gear rental providers. Search for gear, select your rental dates, make a secure payment, and pick up your equipment from the provider. After your adventure, simply return the gear at the agreed time."
  },
  {
    question: "Are the rental providers verified?",
    answer: "Yes, all rental providers go through a verification process before joining Kitloop. We also maintain a review system so you can see feedback from previous renters."
  },
  {
    question: "What if the gear is damaged during my rental?",
    answer: "Most rentals include basic insurance coverage. If damage occurs beyond normal wear and tear, the specific policy will be outlined in your rental agreement. We recommend checking the insurance details before confirming your reservation."
  },
  {
    question: "Can I extend my rental period?",
    answer: "In many cases, yes. You'll need to contact the provider through the Kitloop platform to request an extension. Approval depends on the provider's availability and policies."
  },
  {
    question: "What happens if I return the gear late?",
    answer: "Late returns typically incur additional daily charges. The specific late fees are outlined in your rental agreement before you confirm your reservation."
  }
];

const FAQ = () => {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold mb-2 text-center">Frequently Asked Questions</h2>
        <p className="text-muted-foreground mb-10 text-center">
          Everything you need to know about renting gear with Kitloop
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
