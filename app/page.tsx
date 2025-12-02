"use client";

import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import FloatingNavigation from "@/components/home/FloatingNavigation";
import Background from "@/components/home/Background";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/home/Footer";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  // Animation on component mount
  useEffect(() => {
    const animateElements = () => {
      const elements = document.querySelectorAll(".animate-on-mount");
      elements.forEach((el, index) => {
        setTimeout(() => {
          el.classList.add("animate-fadeIn");
          el.classList.remove("opacity-0");
        }, index * 150);
      });
    };
    animateElements();
  }, []);

  // Create structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Goal Completer",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "Vong PichdaraBoth",
    },
    description:
      "A completely free goal tracking platform that uses AI to break down your big goals into small, manageable daily steps. Follow the step-by-step plan until you reach your achievement. Created by Vong PichdaraBoth.",
  };

  return (
    <>
      <Helmet>
        <title>Goal Completer | Goal Tracking Platform</title>
        <meta
          name="description"
          content="A completely free goal tracking platform that uses AI to break down your big goals into small, manageable daily steps. Follow the step-by-step plan until you reach your achievement. Created by Vong PichdaraBoth."
        />
        <meta name="keywords" content="goal tracking, productivity, AI, task management, personal development, free goal planner" />
        <link rel="canonical" href="https://dailygoalmap.vercel.app/" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="relative min-h-screen overflow-hidden">
        <Background />
        <FloatingNavigation isAuthenticated={isAuthenticated} user={user} />
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection isAuthenticated={isAuthenticated} />
        <Footer />
      </div>
    </>
  );
}
