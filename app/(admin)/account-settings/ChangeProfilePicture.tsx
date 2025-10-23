"use client";

import { Me } from "@/app/types/me";
import { updateDataProfile } from "@/store/me/ProfileSlice";
import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import Image from "next/image";
import { FileUpload, FileUploadErrorEvent, FileUploadUploadEvent } from "primereact/fileupload";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useSWR from "swr";

const ChangeProfilePicture = () => {
  const fileUploadRef = useRef(null);
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [isUploadComplete, setIsUploadComplete] = useState(false);

  const fetcher = async (url: string) => {
    const res = await fetch(url, {
      credentials: "include",
    });

    if (!res.ok) {
      const errorBody = await res.json();
      const error = new Error(
        errorBody.message || "An error occurred while fetching data."
      ) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return res.json();
  };
  
  const { data } = useSWR<Me>(isUploadComplete ? `/api/auth/me` : null,fetcher);
  if (data && Object.keys(data).length > 0) {
    const newData: Me = {
      employee_id: data.employee_id,
      email: data.email,
      name: data.name,
      role: data.role,
      photo_url: data.photo_url,
    };
    dispatch(updateDataProfile(newData));
  }

  const onUploadComplete = (event: FileUploadUploadEvent) => {
    const response = JSON.parse(event?.xhr?.response);

    dispatch(
      showToast({
        visible: false,
        severity: "success",
        summary: "success",
        detail: response.message,
      })
    );

    setIsUploadComplete(true);
  } 

  const onUploadError = (event: FileUploadErrorEvent) => {
    const response = JSON.parse(event?.xhr?.response);

    dispatch(
      showToast({
        visible: false,
        severity: "error",
        summary: "failed",
        detail: response.message,
      })
    );
  }

  return (
    <div className="flex flex-row gap-5 w-full">
      <div className="current-photo w-full">
        <Image src={`/api/public/images/uploads/${profileState.photo_url}`} alt="photo profile" width={250} height={250}></Image>
      </div>

      <div className="upload w-full">
        <FileUpload
          ref={fileUploadRef}
          name="file"
          url={`/api/employees/${profileState.employee_id}/photo/upload`}
          accept="image/*"
          maxFileSize={1048576}
          multiple={false}
          emptyTemplate={
            <p className="m-0">Drag and drop files to here to upload.</p>
          }
          previewWidth={250}
          onError={onUploadError}
          withCredentials={true}
          onUpload={onUploadComplete}
        />
      </div>
    </div>
  );
};

export default ChangeProfilePicture;
