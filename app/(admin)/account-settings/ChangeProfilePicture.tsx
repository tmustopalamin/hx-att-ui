"use client";

import { Me } from "@/app/types/me";
import { updateDataProfile } from "@/store/me/ProfileSlice";
import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import { useParams } from "next/navigation";
import { FileUpload, FileUploadErrorEvent, FileUploadUploadEvent } from "primereact/fileupload";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useSWR, { mutate } from "swr";

const ChangeProfilePicture = () => {
  const paramsPath = useParams();
  const id = paramsPath.id;

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

  const { data } = useSWR<Me>(isUploadComplete ? `/api/auth/me` : null, fetcher);
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
    mutate(`/api/auth/me`);
    mutate(`/api/employees/${id}/personal-data`);
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
    <>
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          Edit Photo
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          upload a new profile picture to represent yourself.
        </p>
      </div>

      <div className="flex flex-row gap-5 w-full">
        {/* <div className="current-photo w-full">
          <Image src={`http://localhost:3050/public/images/uploads/${profileState.photo_url}`} alt="photo profile" width={250} height={250}></Image>
        </div> */}

        <div className="upload w-full">
          <FileUpload
            ref={fileUploadRef}
            name="file"
            url={`http://localhost:3050/employees/${profileState.employee_id}/photo/upload`}
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
    </>

  );
};

export default ChangeProfilePicture;
