import dayjs from 'dayjs';
import React from 'react'
import utc from 'dayjs/plugin/utc';
import ShiftTableData from './SalaryComponentTableData';
import SalaryComponentTableData from './SalaryComponentTableData';

dayjs.extend(utc);

export const metadata = {
    title: 'Manage Salary Component - PT. Hexing Technology',
    description: 'add, update, delete Salary Component data',
};

const SalaryComponentSettingPage = () => {
    return <>
        <SalaryComponentTableData />
    </>
}

export default SalaryComponentSettingPage