"use client";

import Link from "next/link";
import { Button } from "primereact/button";
import React from "react";
import { useI18n } from "@/app/i18n";

const BackButton = ({ url }: { url: string }) => {
  const { t } = useI18n();
  return (
    <Link href={url}>
      <Button
        icon="pi pi-arrow-left"
        rounded
        text
        aria-label={t("common.navigation.back")}
        tooltip={t("common.navigation.back")}
      />
    </Link>
  );
};

export default BackButton;
