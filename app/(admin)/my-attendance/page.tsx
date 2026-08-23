"use client";

import { useI18n } from "@/app/i18n";
import React from "react";

const MyAttendancePage = () => {
  const { t: i18nT } = useI18n();
  return <div>{i18nT("static.1wasl64")}</div>;
};

export default MyAttendancePage;
