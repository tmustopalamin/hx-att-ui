"use client";

import { Card } from "primereact/card";
import React from "react";
import { mutate } from "swr";
import { useI18n } from "@/app/i18n";

type Params = {
  mutateKey: string;
};

const ErrorNotConnectedToApi = (params: Params) => {
  const { t } = useI18n();
  return (
    <Card>
      <div className="flex p-4 justify-between items-center bg-red-100 text-red-800 rounded w-full">
        <div className="">{t("common.errors.unableToConnect")}</div>
        <div className="">
          <button
            onClick={() => mutate(params.mutateKey)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {t("common.actions.retry")}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ErrorNotConnectedToApi;
