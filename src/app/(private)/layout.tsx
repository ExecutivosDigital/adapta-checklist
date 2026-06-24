"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/driver/layout/Sidebar";
import { BottomNavigation } from "@/components/driver/layout/BottomNavigation";
import { AuthGate } from "@/components/driver/AuthGate";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { OfflineQueueDrainer } from "@/components/pwa/OfflineQueueDrainer";
import { useAuth } from "@/hooks/useAuth";
import { DriverTab } from "@/types/driver.types";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Perfil Frota (ADM) tem navegação própria (tabs na própria tela).
  const isFrota = pathname.startsWith("/frota");

  const activeTab: DriverTab = pathname.startsWith("/profile")
    ? "profile"
    : "checklists";

  const handleTabChange = (tab: DriverTab) => {
    router.push(tab === "profile" ? "/profile" : "/");
  };

  return (
    <AuthGate>
      {isFrota ? (
        <div className="min-h-screen bg-background">{children}</div>
      ) : (
        <div className="flex min-h-screen bg-background">
          {!isMobile && (
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              userName={user?.name ?? ""}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          )}

          <div
            className={`flex-1 transition-all duration-300 ${
              !isMobile && (sidebarCollapsed ? "ml-20" : "ml-64")
            }`}
          >
            <div className={isMobile ? "mx-auto max-w-md" : "mx-auto max-w-6xl"}>
              <div
                className={`min-h-screen ${
                  isMobile ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : ""
                }`}
              >
                {children}
              </div>
            </div>
          </div>

          {isMobile && (
            <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
          )}
        </div>
      )}

      <OfflineBanner />
      <InstallBanner />
      <OfflineQueueDrainer />
    </AuthGate>
  );
}
