import { useState } from 'react';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingWorkflow } from '@/components/landing/LandingWorkflow';
import { LandingCapabilities } from '@/components/landing/LandingCapabilities';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFAQ } from '@/components/landing/LandingFAQ';
import { AnnouncementModal } from '@/components/landing/AnnouncementModal';

const Index = () => {
    const [announcementOpen, setAnnouncementOpen] = useState(false);

    return (
        <div className="bg-background min-h-screen relative selection:bg-primary/20">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:6rem_4rem]" />

            <LandingHero onAnnouncementClick={() => setAnnouncementOpen(true)} />

            <section id="product" className="py-20 md:py-32 bg-white relative scroll-mt-20">
                <div className="container px-4 md:px-6 mx-auto relative">
                    <LandingWorkflow />
                    <LandingCapabilities />
                    <LandingCTA />
                </div>
            </section>

            <LandingFAQ />

            <AnnouncementModal open={announcementOpen} onOpenChange={setAnnouncementOpen} />
        </div>
    );
};

export default Index;
