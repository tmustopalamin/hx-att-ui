import dayjs from 'dayjs';
import React from 'react'
import utc from 'dayjs/plugin/utc';
import ShiftTableData from './ShiftTableData';

dayjs.extend(utc);

export const metadata = {
    title: 'Manage Shift - PT. Hexing Technology',
    description: 'add, update, delete shift data',
};

const ShiftSettingPage = () => {
    return <>
        <ShiftTableData />
    </>
}

export default ShiftSettingPage