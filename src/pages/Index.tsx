import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PropertyFilter from "@/components/PropertyFilter";
import PropertyGrid from "@/components/PropertyGrid";
import TestimonialSection from "@/components/TestimonialSection";
import LeadForm from "@/components/LeadForm";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <div className="bg-background">
        <PropertyFilter />
        <PropertyGrid />
        <TestimonialSection />
        <LeadForm />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
