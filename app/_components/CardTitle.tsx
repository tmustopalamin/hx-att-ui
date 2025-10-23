import React from "react";
import BackButton from "./BackButton";

interface CardTitleProps {
  url: string;
  title: string;
}

const CardTitle: React.FC<CardTitleProps> = ({ url, title }) => {
  return (
    <>
      <div className="flex gap-2 items-center">
        { url.length > 0 && <BackButton url={url}  />}
        <p className="text-2xl font-semibold p-3">{title}</p>
      </div>
    </>
  );
};

export default CardTitle;
