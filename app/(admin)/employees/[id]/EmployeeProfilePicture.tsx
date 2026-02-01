"use client";

import { Employee } from '@/app/types/employee';
import { redirect, useParams } from 'next/navigation';
import { Avatar } from 'primereact/avatar'
import React, { useRef, useState } from 'react'

interface EmployeePhotoProfileProps {
  data: Employee | undefined,
}

const EmployeeProfilePicture = ({ data }: EmployeePhotoProfileProps) => {
  const params = useParams();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
    }
  };

  return (
    <div
      style={{ position: 'relative', width: '7rem', height: '7rem' }}
      className='relative'
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Avatar
        label={`${data?.first_name[0]}${data?.last_name[0]}`}
        image={data?.photo_url ? `http://localhost:3050/public/images/uploads/${data?.photo_url}` : undefined}
        shape="circle"
        style={{ width: '7rem', height: '7rem', fontSize: '3rem' }}
      />

      {isHovering && (
        <div
          onClick={() => redirect(`/employees/${params?.id}/edit-photo`)}
          className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white text-sm font-medium cursor-pointer"
        >Change</div>
      )
      }

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div >
  )
}

export default EmployeeProfilePicture