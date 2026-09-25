import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Services } from "@/components/landing/services";
import { Testimonials } from "@/components/landing/testimonials";
import { WhyChooseNova } from "@/components/landing/why-choose-nova";
import { getAuthenticatedUser } from "@/lib/dal";

export default async function Home() {
  const user = await getAuthenticatedUser();

  return (
    <>
      <Navbar user={user} />
      <main id="main-content">
        <Hero />
        <Services />
        <WhyChooseNova />
        <Testimonials />
        <FAQ />
        <FinalCTA user={user} />
      </main>
      <Footer />
    </>
  );
}
