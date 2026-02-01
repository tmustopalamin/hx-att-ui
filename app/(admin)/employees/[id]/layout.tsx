"use client"

import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import React, { Suspense } from 'react'
import EmployeeProfilePicture from './EmployeeProfilePicture';
import VerticalTabview from './VerticalTabView';
import useSWR from 'swr';
import { Employee } from '@/app/types/employee';
import { fetcher } from '@/app/utils/fetcher';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { useParams } from 'next/navigation';
import { EmploymentData } from '@/app/types/employment-data';

interface EmployeeLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; }>;
}

const EmployeeDetailLayout = ({ children, params }: EmployeeLayoutProps) => {
  const paramsPath = useParams();
  const id = paramsPath.id;

  const [titlePage, setTitlePage] = React.useState('');
  const { data, error } = useSWR<Employee>(`/api/employees/${id}/personal-data`, fetcher, {});
  const { data: employmentData } = useSWR<EmploymentData>(`/api/employees/${id}/employment-data`, fetcher, {
  });

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={`/api/employees/${id}/personal-data`} />
  }

  const changeTitlePage = (title: string) => {
    setTitlePage(title);
  }

  return <>
    <Card title={<p className="text-xl font-semibold pb-5"></p>}>

      <div className="w-full flex flex-row">
        <div className="flex w-64 flex-shrink-0 flex-col items-center gap-5">
          <div className="flex flex-col gap-3 items-center">
            <EmployeeProfilePicture data={data} />
            <div className="flex flex-col">
              <h5 className="text-xl font-semibold text-center">{`${data?.first_name} ${data?.last_name}`}</h5>
              <h5 className="text-sm text-center">{`${employmentData?.position_name}`}</h5>
            </div>
          </div>

          <div className="w-full">
            <VerticalTabview params={params} />
          </div>
        </div>

        <Divider layout="vertical" className="mx-5" />

        <div className="flex flex-col w-full gap-5 overflow-auto">

          <p className="text-2xl font-semibold">{titlePage}</p>

          <div className="pb-5">
            <Suspense fallback={<p>Loading...</p>}>
              {children}
            </Suspense>
          </div>

        </div>
      </div>
    </Card>
  </>
}

export default EmployeeDetailLayout