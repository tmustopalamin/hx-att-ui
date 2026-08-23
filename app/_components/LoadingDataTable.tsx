import { useI18n } from "@/app/i18n";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Skeleton } from "primereact/skeleton";
import React from "react";

interface data {
  code: number;
  description: string;
}

const LoadingDataTable = () => {
  const { t: i18nT } = useI18n();
  const values: data[] = [
    { code: 1, description: i18nT("static.1cs5qlh") },
    { code: 2, description: i18nT("static.1cs5qlh") },
    { code: 3, description: i18nT("static.1cs5qlh") },
    { code: 4, description: i18nT("static.1cs5qlh") },
    { code: 5, description: i18nT("static.1cs5qlh") },
  ];

  return (
    <Card title={<Skeleton width="10rem" className="mb-2"></Skeleton>}>
      <DataTable value={values} className="p-datatable-striped">
        <Column
          field=""
          header=""
          style={{ width: "25%" }}
          body={<Skeleton />}
        ></Column>
        <Column
          field=""
          header=""
          style={{ width: "25%" }}
          body={<Skeleton />}
        ></Column>
        <Column
          field=""
          header=""
          style={{ width: "25%" }}
          body={<Skeleton />}
        ></Column>
        <Column
          field=""
          header=""
          style={{ width: "25%" }}
          body={<Skeleton />}
        ></Column>
        <Column
          field=""
          header=""
          style={{ width: "25%" }}
          body={<Skeleton />}
        ></Column>
      </DataTable>
    </Card>
  );
};

export default LoadingDataTable;
