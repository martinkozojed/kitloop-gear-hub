
import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, BookOpen, ShoppingCart, RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const faqData = [
  {
    category: "finding",
    title: "Finding Gear",
    icon: Search,
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
    title: "Making a Reservation",
    icon: BookOpen,
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
    title: "Pickup",
    icon: ShoppingCart,
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
    title: "Returning Gear",
    icon: RotateCcw,
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
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = React.useState("finding");
  
  return (
    <section className="py-16 px-6 bg-background" id="faq">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold mb-2 text-center">Frequently Asked Questions</h2>
        <p className="text-muted-foreground mb-12 text-center">
          Everything you need to know about renting gear with Kitloop
        </p>
        
        <div className={`${isMobile ? 'flex flex-col space-y-6' : 'grid md:grid-cols-[280px_1fr]'} gap-8`}>
          {/* Categories navigation - adapts to mobile */}
          <div className="space-y-4">
            <Tabs 
              value={activeCategory} 
              onValueChange={setActiveCategory}
              orientation={isMobile ? "horizontal" : "vertical"} 
              className="w-full"
            >
              <TabsList className={`
                ${isMobile ? 'flex overflow-x-auto justify-start pb-3 w-full space-x-3' : 'flex flex-col h-auto space-y-2'} 
                bg-transparent p-0`}
              >
                {faqData.map((category) => {
                  const Icon = category.icon;
                  return (
                    <TabsTrigger 
                      key={category.category} 
                      value={category.category}
                      className={`
                        justify-start text-left p-3 h-auto 
                        ${isMobile ? 'border-b-2 border-b-transparent data-[state=active]:border-b-green-600' : 'border-l-2 border-transparent data-[state=active]:border-l-green-600'}
                        data-[state=active]:bg-muted data-[state=active]:text-green-600 font-medium
                        ${isMobile ? 'rounded-md whitespace-nowrap min-w-max' : 'w-full rounded-r-md'}
                      `}
                    >
                      <div className={`flex items-center gap-3 ${isMobile ? 'flex-col text-xs' : ''}`}>
                        <div className={`flex items-center justify-center ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-muted`}>
                          <Icon size={isMobile ? 16 : 20} className="text-green-600" />
                        </div>
                        <span className="font-medium">{category.title}</span>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* FAQ content - same Tabs component controlling both sides */}
          <div>
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              {faqData.map((category) => (
                <TabsContent key={category.category} value={category.category} className="mt-0 animate-fade-in">
                  <div className="space-y-4">
                    {category.questions.map((faq, index) => (
                      <Card key={index} className="overflow-hidden border-muted bg-card shadow-sm transition-all hover:shadow">
                        <Collapsible className="w-full">
                          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left font-medium">
                            <span className={`${isMobile ? 'text-base' : 'text-lg'}`}>{faq.question}</span>
                            <div className="h-6 w-6 rounded-full border border-muted flex items-center justify-center transition-transform duration-200 data-[state=open]:rotate-180">
                              <svg 
                                width="10" 
                                height="6" 
                                viewBox="0 0 10 6" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pb-4 text-muted-foreground leading-relaxed border-t pt-4">
                              {faq.answer}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
