import dynamic from "next/dynamic";
import Navbar from "@/components/marketing/Navbar";
import HeroSection from "@/components/marketing/HeroSection";
import Footer from "@/components/marketing/Footer";

// Lazy-load below-the-fold components
const EducatorValueProp = dynamic(() => import("@/components/marketing/EducatorValueProp"), { ssr: true });
const StudentValueProp = dynamic(() => import("@/components/marketing/StudentValueProp"), { ssr: true });

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-zinc-200">
      <Navbar />
      <HeroSection />
      <EducatorValueProp />
      <StudentValueProp />
      <Footer />
    </div>
  );
}
