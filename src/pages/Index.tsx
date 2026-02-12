import React from "react";
// ...existing code...
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
    "name": "Orbit",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
    },
    "author": {
      "@type": "Person",
      "name": "Vong PichdaraBoth"
    },
    "description": "Orbit is an autonomous intelligence platform that transforms your complex aspirations into an automated trajectory of success. Break down big goals into manageable daily steps with AI-powered orbital mapping."
  };

  return (
    <>
      <title>Orbit | Autonomous Intelligence & Goal Mapping</title>
      <meta name="description" content="Orbit is an autonomous intelligence platform that transforms your complex aspirations into an automated trajectory of success. Break down big goals into manageable daily steps with AI-powered orbital mapping." />
      <meta name="keywords" content="goal tracking, AI goal breakdown, orbital mapping, daily tasks, productivity, autonomous intelligence, achievement tracker" />
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      <div>
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
      </div >
    </>
  );
};

export default Index;
