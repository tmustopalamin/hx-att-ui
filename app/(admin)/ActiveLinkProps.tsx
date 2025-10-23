"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface ActiveLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
}

export default function ActiveLink({
  children,
  href,
  className = "",
  activeClassName = "bg-gray-200",
  exact = true,
  ...props
}: ActiveLinkProps) {
  const pathname = usePathname();

  // match penuh atau prefix
  const isActive = exact
    ? pathname === href
    : pathname.startsWith(String(href));

  return (
    <Link
      href={href}
      className={`${className} ${isActive ? activeClassName : ""}`}
      {...props}
    >
      {children}
    </Link>
  );
}
