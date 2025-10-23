"use client"

import React, { useEffect, useState } from "react"
import AuthProvider from "../(auth)/auth-provider"
import Breadcrumb from "../_components/Breadcrumb"
import BProgressProvider from "../utils/providers/BProgressProvider"
import AvatarWithSidebar from "./AvatarWithSidebar"
import SidebarMenu from "./SidebarMenu"
import SidebarProfileMenu from "./SidebarProfileMenu"
import { Sidebar } from "primereact/sidebar"
import { useMediaQuery } from "react-responsive"
// import Notification from "../_components/top-menu/Notification"

const AppMain = ({ children }: { children: React.ReactNode }) => {
  const [isUILoaded, setIsUILoaded] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const isDesktop = useMediaQuery({ minWidth: 768 }); // md ke atas
  const isMobile = useMediaQuery({ maxWidth: 767 });  // md ke bawah

  useEffect(() => {
    setIsUILoaded(true);
  }, []);

  return (
    <main className="w-full flex h-screen bg-[#EFF3F8]">
      {/* Sidebar kiri - tampil hanya di desktop */}
      {isUILoaded && isDesktop && !sidebarVisible && <>
        <div className="hidden md:flex flex-none w-[16rem] bg-white shadow-xl">
          <SidebarMenu />
        </div>
      </>}

      {/* Konten utama */}
      <div className="flex-1 flex flex-col pt-6 pr-6 pl-6 md:pl-10 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-5 font-bold">
            {/* Tombol buka sidebar saat mobile */}
            <Breadcrumb sidebarVisible={sidebarVisible} onClickSidebar={setSidebarVisible} />
          </div>

          <div className="flex items-center gap-5 font-bold relative">
            {/* <Notification /> */}
            <AvatarWithSidebar />
          </div>

        </div>

        {/* Konten halaman */}
        <div className="flex-1 pb-6">
          <AuthProvider>
            <BProgressProvider>{children}</BProgressProvider>
          </AuthProvider>
        </div>
      </div>

      {/* Sidebar mobile (PrimeReact Sidebar) */}
      {isMobile && <>
        <Sidebar
          visible={sidebarVisible}
          onHide={() => setSidebarVisible(false)}
          showCloseIcon={false}
          className="!w-[16rem] md:!hidden"
          content={<SidebarMenu />}
        >
        </Sidebar>
      </>}

      {/* Sidebar kanan / profile */}
      <SidebarProfileMenu />
    </main>
  )
}

export default AppMain
