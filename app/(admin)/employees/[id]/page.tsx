import { redirect } from 'next/navigation';
import React from 'react'

interface Params {
    params: { id: string };
}

const EmployeeIdPage = ({ params }: Params) => {
    redirect(`/employees/${params.id}/general/personal`);
}

export default EmployeeIdPage