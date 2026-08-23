"use client";

import { useI18n } from "@/app/i18n";
import React from "react";

const SidebarMenuItem = () => {
  const { t: i18nT } = useI18n();
  return <div>{i18nT("SidebarMenuItem")}</div>;
};

export default SidebarMenuItem;
