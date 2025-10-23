import React from 'react'
import PayrollFormulaDataTable from './PayrollFormulaDataTable';

export const metadata = {
    title: 'Manage Payroll Formula - PT. Hexing Technology',
    description: 'add, update, delete payroll formula data',
};

const PayrollFormulaPage = () => {
    return <>
        <PayrollFormulaDataTable />
    </>
}



export default PayrollFormulaPage