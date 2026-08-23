import { useI18n } from "@/app/i18n";
import React from "react";
import Image from "next/image";
import Link from "next/link";

const AppLogo = () => {
  const { t: i18nT } = useI18n();
  return (
    <>
      <div className="flex justify-center items-center pt-[1rem] p-0">
        <Link href="/dashboard">
          <Image
            src="/images/logo.png"
            alt={i18nT("static.ufdz22")}
            width={150}
            height={35}
            priority
            className="rounded-full mt-4"
          />
        </Link>
      </div>
    </>
  );
};

export default AppLogo;
