
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const faqData = [
  {
    category: "finding",
    title: "🧩 Finding Gear",
    questions: [
      {
        question: "How do I find the gear I need?",
        answer: "Just enter the type of equipment and your location. You'll see available gear near you right away."
      },
      {
        question: "Can I search by my current location?",
        answer: "Yes – if you allow location access, Kitloop will show gear available nearby."
      },
      {
        question: "How do I know what's available right now?",
        answer: "Listings show live availability. If an item is shown, you can reserve it immediately."
      },
      {
        question: "I'm not sure what I need. Can you help me choose?",
        answer: "Yes – we'll soon add guides and recommendations based on your activity (e.g. hiking, winter, climbing)."
      },
      {
        question: "Can I filter or sort by brand, price, or rating?",
        answer: "Yes – you can sort by most popular, price, or filter by specific brands and categories."
      }
    ]
  },
  {
    category: "reservation",
    title: "🛒 Making a Reservation",
    questions: [
      {
        question: "How do I reserve gear?",
        answer: "Simply click on the item, choose your rental dates, and confirm the reservation."
      },
      {
        question: "Do I need an account to make a reservation?",
        answer: "Yes – creating an account helps us manage your bookings and keep everything safe."
      },
      {
        question: "How far in advance should I book?",
        answer: "As early as possible, especially in high season. Some items may also be available last minute."
      },
      {
        question: "Can I change or cancel my reservation?",
        answer: "Yes – you can modify or cancel in your profile. Cancellation rules may vary by provider."
      },
      {
        question: "Do I pay when I book or later?",
        answer: "You usually pay online at the time of booking. Some providers may offer pay-on-pickup."
      }
    ]
  },
  {
    category: "pickup",
    title: "🧳 Pickup",
    questions: [
      {
        question: "Where do I pick up my gear?",
        answer: "Each item shows the pickup location before you confirm. It's usually a shop or trusted individual."
      },
      {
        question: "How does the handover work?",
        answer: "You'll receive details after booking – most providers just need a confirmation code or ID."
      },
      {
        question: "What if I can't reach the provider?",
        answer: "Contact us immediately – we'll step in to help."
      },
      {
        question: "Do I need to bring anything with me?",
        answer: "Just a valid ID and your booking confirmation (mobile is fine)."
      },
      {
        question: "Can someone else pick it up for me?",
        answer: "Yes – as long as they bring your booking details and ID."
      }
    ]
  },
  {
    category: "returning",
    title: "🔁 Returning Gear",
    questions: [
      {
        question: "How do I return the gear?",
        answer: "You'll return it to the same location unless agreed otherwise. Details are in your booking."
      },
      {
        question: "Can I return it to a different place?",
        answer: "Only if the provider allows it – check before booking."
      },
      {
        question: "What if the gear gets damaged or lost?",
        answer: "Please report it as soon as possible. Minor wear is expected, but serious damage may incur a fee."
      },
      {
        question: "Do I get my deposit back immediately?",
        answer: "Most deposits are refunded within 1–3 business days after a successful return check."
      },
      {
        question: "Can I leave a review after returning the gear?",
        answer: "Yes! Reviews help others and keep the community trustworthy."
      }
    ]
  }
];

const FAQ = () => {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold mb-2 text-center">Frequently Asked Questions</h2>
        <p className="text-muted-foreground mb-10 text-center">
          Everything you need to know about renting gear with Kitloop
        </p>
        
        <Tabs defaultValue="finding" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-8">
            {faqData.map((category) => (
              <TabsTrigger 
                key={category.category} 
                value={category.category}
                className="text-sm md:text-base"
              >
                {category.title}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {faqData.map((category) => (
            <TabsContent key={category.category} value={category.category} className="mt-0">
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((faq, index) => (
                  <AccordionItem key={index} value={`${category.category}-item-${index}`}>
                    <AccordionTrigger className="text-left font-medium text-lg">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default FAQ;
