import { Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { WhatsAppButton } from "../components/layout/WhatsAppButton";
import { Loading } from "../components/ui/States";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="contenu" className="flex-1">
        <Suspense fallback={<Loading />}><Outlet /></Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
      <ScrollRestoration />
    </div>
  );
}
