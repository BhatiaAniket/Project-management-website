import MouseBlob from "@/components/MouseBlob";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

import AboutSection from "@/components/AboutSection";
import FeaturesSection from "@/components/FeaturesSection";
import RolesSection from "@/components/RolesSection";
import TechStackSection from "@/components/TechStackSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <MouseBlob />
      <Navbar />
      <HeroSection />
      
      <AboutSection />
      <FeaturesSection />
      <RolesSection />
      <TechStackSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
