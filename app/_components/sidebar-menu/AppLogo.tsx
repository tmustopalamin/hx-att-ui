import { useI18n } from "@/app/i18n";
import React from "react";
import Image from "next/image";
import Link from "next/link";

const AppLogo = () => {
  const { t: i18nT } = useI18n();
  return (
    <div className="flex items-center justify-center">
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center transition-opacity hover:opacity-90"
      >
        <Image
          src="/images/logo.png"
          alt={i18nT("static.ufdz22")}
          width={150}
          height={38}
          priority
          className="h-9 w-auto max-w-[155px] object-contain sm:h-[38px]"
        />
      </Link>
    </div>
  );
};

export default AppLogo;
