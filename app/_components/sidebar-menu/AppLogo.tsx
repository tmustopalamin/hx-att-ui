import React from "react";
import Image from "next/image";
import Link from "next/link";

const AppLogo = () => {
  return (
    <>
      <div className="flex justify-center items-center pt-[1rem] p-0">
        <Link href="/dashboard">
          <Image
            src="/images/logo.png"
            alt="Logo"
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
