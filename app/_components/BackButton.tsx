import Link from "next/link";
import { Button } from "primereact/button";
import React from "react";

const BackButton = ({ url }: { url: string }) => {
  return (
    <Link href={url}>
      <Button icon="pi pi-arrow-left" rounded text aria-label="Filter" />
    </Link>
  );
};

export default BackButton;
