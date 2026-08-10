import './landing.css'
import Nav from './sections/Nav'
import Hero from './sections/Hero'
import Audience from './sections/Audience'
import Features from './sections/Features'
import Glimpse from './sections/Glimpse'
import How from './sections/How'
import Pricing from './sections/Pricing'
import FAQ from './sections/FAQ'
import CTABand from './sections/CTABand'
import Footer from './sections/Footer'
import WhatsAppFab from './sections/WhatsAppFab'

// منقولة حرفياً من landing.html (752 سطر، بدون أي JS بالأصل — نص وتصميم فقط)
export default function App() {
  return (
    <>
      <Nav />
      <Hero />
      <hr className="rule" />
      <Audience />
      <Features />
      <Glimpse />
      <How />
      <Pricing />
      <FAQ />
      <CTABand />
      <Footer />
      <WhatsAppFab />
    </>
  )
}
