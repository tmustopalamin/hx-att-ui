"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "primereact/sidebar";
import { usePathname } from "next/navigation";

import AuthProvider from "../(auth)/auth-provider";
import Breadcrumb from "../_components/Breadcrumb";
import BProgressProvider from "../utils/providers/BProgressProvider";
import AvatarWithSidebar from "./AvatarWithSidebar";
import SidebarMenu from "./SidebarMenu";
import { apiFetch } from "../services/api-fetch";

const AppMain = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const getBody = () => document.body;

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        await apiFetch("/api/auth/me");
      } catch {
        // redirect / handling tetap dari apiFetch
      }
    };

    bootstrapAuth();
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileViewport(isMobile);

      if (!isMobile) {
        setIsMobileSidebarOpen(false);
      }
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const handleToggleSidebar = () => {
    if (isMobileViewport) {
      setIsMobileSidebarOpen((prev) => !prev);
      return;
    }

    setIsDesktopSidebarCollapsed((prev) => !prev);
  };

  const currentSidebarVisible = isMobileViewport
    ? isMobileSidebarOpen
    : !isDesktopSidebarCollapsed;

  return (
    <main className="flex h-screen w-full overflow-hidden bg-slate-100">
      {/* Desktop sidebar */}
      <aside
        className={`hidden h-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out md:block ${isDesktopSidebarCollapsed
            ? "w-0 border-r-0 opacity-0"
            : "w-[17rem] border-r border-slate-200 opacity-100"
          }`}
      >
        <div className="h-full bg-white">
          <SidebarMenu />
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="shrink-0 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Breadcrumb
                    sidebarVisible={currentSidebarVisible}
                    onClickSidebar={handleToggleSidebar}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <AvatarWithSidebar />
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <div className="w-full">
              <AuthProvider>
                <BProgressProvider>{children}</BProgressProvider>
              </AuthProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      <Sidebar
        appendTo={getBody}
        visible={isMobileSidebarOpen}
        onHide={() => setIsMobileSidebarOpen(false)}
        showCloseIcon={false}
        blockScroll
        position="left"
        baseZIndex={1200}
        className="!w-[18rem] !border-none !shadow-2xl md:!hidden"
      >
        <div className="h-full bg-white">
          <SidebarMenu />
        </div>
      </Sidebar>
    </main>
  );
};

export default AppMain;