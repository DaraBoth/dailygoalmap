import React from "react";
import { Helmet } from "react-helmet-async";
import FloatingNavigation from "@/components/home/FloatingNavigation";
import Background from "@/components/home/Background";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/home/Footer";
import { useAuth } from "@/hooks/useAuth";
const Index: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // Create structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Goal Completer",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Person",
      "name": "Vong PichdaraBoth"
    },
    "description": "A completely free goal tracking platform that uses AI to break down your big goals into small, manageable daily steps. Follow the step-by-step plan until you reach your achievement. Created by Vong PichdaraBoth."
  };

  return (
    <>
      <Helmet>
        <title>Goal Completer | Goal Tracking Platform</title>
        <meta name="description" content="A completely free goal tracking platform that uses AI to break down your big goals into small, manageable daily steps. Follow the step-by-step plan until you reach your achievement. Created by Vong PichdaraBoth." />
        <meta name="keywords" content="goal tracking, AI goal breakdown, step by step goals, daily tasks, goal planner, task management, achievement tracker" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Revolutionary Full-Screen Layout */}
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <Background />

        {/* Floating Navigation */}
        <FloatingNavigation />

        {/* Main Content Sections */}
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
        <Footer />
      </div>
    </>
  );
};

export default Index;
