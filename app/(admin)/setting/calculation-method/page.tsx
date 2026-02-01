import React from 'react'
import PayrollFormulaDataTable from './CalculationMethodDataTable';

export const metadata = {
    title: 'Manage Calculation Method - PT. Hexing Technology',
    description: 'add, update, delete calculation method data',
};

const CalculationMethodPage = () => {
    return <>
        <PayrollFormulaDataTable />
    </>
}

export default CalculationMethodPage