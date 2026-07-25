import { Card } from "primereact/card";
import React from "react";
import { mutate } from "swr";

type Params = {
  mutateKey: string;
};

const ErrorNotConnectedToApi = (params: Params) => {
  return (
    <Card>
      <div className="flex p-4 justify-between items-center bg-red-100 text-red-800 rounded w-full">
        <div className="">
          Unable to connect to the server. Please try again later
        </div>
        <div className="">
          <button
            onClick={() => mutate(params.mutateKey)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ErrorNotConnectedToApi;
