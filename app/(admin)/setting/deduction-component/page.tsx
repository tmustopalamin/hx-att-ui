import React from 'react'
import DeductionComponentTableData from './DeductionComponentTableData';

export const metadata = {
    title: 'Manage Deduction Component - PT. Hexing Technology',
    description: 'add, update, delete deduction component data',
};

const DeductionComponentPage = () => {
    return <>
        <DeductionComponentTableData />
    </>
}



export default DeductionComponentPage