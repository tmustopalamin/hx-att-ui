"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "primereact/button";
import React from "react";

type ChildProps = {
  sidebarVisible: boolean;
  onClickSidebar: (visible: boolean) => void;
};

const Breadcrumb = ({
  sidebarVisible,
  onClickSidebar: onClickSidebar,
}: ChildProps) => {
  const pathname = usePathname();
  const segments = pathname
    .split("/")
    .filter(Boolean)
    // skip segment dinamis (contoh angka)
    .filter((seg) => isNaN(Number(seg)));

  const format = (str: string) =>
    str
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");

  return (
    <nav className="flex column items-center gap-5 text-sm text-gray-600">
      <Button
        icon="pi pi-bars"
        rounded
        text
        onClick={() => onClickSidebar(!sidebarVisible)}
      />
      <ol className="flex gap-2">
        <li>
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </li>
        {segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/");

          return (
            <li key={href} className="flex gap-2">
              <span>/</span>
              <Link href={href} className="hover:underline">
                {format(seg)}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
