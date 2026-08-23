"use client";
import { useI18n } from "@/app/i18n";
import { Sidebar } from "primereact/sidebar";
import React, { useState } from "react";
const SidebarProfileMenu = () => {
  const { t: i18nT } = useI18n();
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  return (
    <Sidebar
      visible={sidebarVisible}
      position="right"
      onHide={() => setSidebarVisible(false)}
    >
      {" "}
      <h2>{i18nT("static.ikueqp")}</h2> <p> {i18nT("static.2tolke")} </p>{" "}
    </Sidebar>
  );
};
export default SidebarProfileMenu;
