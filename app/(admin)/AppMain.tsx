"use client";

import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { Sidebar } from "primereact/sidebar";
import { usePathname } from "next/navigation";

import AuthProvider from "../(auth)/auth-provider";
import Breadcrumb from "../_components/Breadcrumb";
import BProgressProvider from "../utils/providers/BProgressProvider";
import AvatarWithSidebar from "./AvatarWithSidebar";
import SidebarMenu from "./SidebarMenu";
import NotificationBell from "../_components/NotificationBell";
import LanguageSwitcher from "../_components/LanguageSwitcher";
import { GlobalActionConfirmDialog } from "../_components/ActionConfirmDialog";
import { isUnauthorizedError, redirectToLogin } from "../utils/api-client";

const AppMain = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);

  const getBody = () => document.body;

  useEffect(() => {
    const syncViewport = () => {
      const isMobile = window.innerWidth < 1024;
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
        className={`hidden h-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out lg:block ${
          isDesktopSidebarCollapsed
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
          <div className="shrink-0 px-3 pt-3 sm:px-5 sm:pt-4 lg:px-8 lg:pt-6">
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-5 sm:py-3">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <Breadcrumb
                    sidebarVisible={currentSidebarVisible}
                    onClickSidebar={handleToggleSidebar}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                  <LanguageSwitcher compact />
                  <NotificationBell />
                  <AvatarWithSidebar />
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-4 lg:px-8 lg:pb-8 lg:pt-5">
            <div className="w-full">
              <SWRConfig
                value={{
                  onError: (error: unknown) => {
                    if (isUnauthorizedError(error)) {
                      redirectToLogin();
                    }
                  },
                }}
              >
                <AuthProvider>
                  <BProgressProvider>{children}</BProgressProvider>
                </AuthProvider>
              </SWRConfig>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      <GlobalActionConfirmDialog />
      <Sidebar
        appendTo={getBody}
        visible={isMobileSidebarOpen}
        onHide={() => setIsMobileSidebarOpen(false)}
        showCloseIcon={false}
        blockScroll
        position="left"
        baseZIndex={1200}
        className="!w-[18rem] !max-w-[85vw] !border-none !shadow-2xl lg:!hidden"
      >
        <div className="h-full bg-white">
          <SidebarMenu onClose={() => setIsMobileSidebarOpen(false)} />
        </div>
      </Sidebar>
    </main>
  );
};

export default AppMain;
