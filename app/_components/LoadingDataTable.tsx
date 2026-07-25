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
  const values: data[] = [
    { code: 1, description: "test" },
    { code: 2, description: "test" },
    { code: 3, description: "test" },
    { code: 4, description: "test" },
    { code: 5, description: "test" },
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
