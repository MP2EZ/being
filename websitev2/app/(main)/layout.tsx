/**
 * Main Layout - With navigation
 * For all standard pages with header/footer navigation
 */

import DesktopNav from "@/components/navigation/DesktopNav";
import MobileHeader from "@/components/navigation/MobileHeader";
import MobileBottomTabs from "@/components/navigation/MobileBottomTabs";
import Footer from "@/components/navigation/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Desktop Navigation (hidden on mobile) */}
      <DesktopNav />

      {/* Mobile Header (hidden on desktop) */}
      <MobileHeader />

      {/* Main Content */}
      <main className="min-h-screen">
        {children}
      </main>

      {/* Footer (with legal links + 988) */}
      <Footer />

      {/* Mobile Bottom Tabs (hidden on desktop) */}
      <MobileBottomTabs />
    </>
  );
}
