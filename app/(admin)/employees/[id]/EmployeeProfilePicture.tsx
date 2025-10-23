"use client";

import { Employee } from '@/app/types/employee';
import { Avatar } from 'primereact/avatar'
// import { Badge } from 'primereact/badge'
import React, { useRef } from 'react'

interface EmployeePhotoProfileProps {
  data: Employee | undefined
}

const EmployeeProfilePicture = ({ data }: EmployeePhotoProfileProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // const handleBadgeClick = () => {
  //   fileInputRef.current?.click();
  // };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      // Handle your upload logic here
      console.log("Selected file:", file);

      // For example: uploadFile(file);
    }
  };

  return (
    <div style={{ position: 'relative', width: '7rem', height: '7rem' }}>
      <Avatar
        label={`${data?.first_name[0]}${data?.last_name[0]}`}
        image={`http://localhost:3000/api/public/images/uploads/${data?.photo_url}`}
        shape="circle"
        style={{ width: '7rem', height: '7rem', fontSize: '3rem' }}
      />

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* <Badge className='flex justify-center items-center cursor-pointer' onClick={handleBadgeClick}
        value={<i className="pi pi-camera" style={{ fontSize: '1rem' }}></i>} severity="danger" style={{ position: 'absolute', bottom: '0rem', right: '0rem', width: '2rem', height: '2rem', borderRadius: '50%' }}
      /> */}
    </div>
  )
}

export default EmployeeProfilePicture