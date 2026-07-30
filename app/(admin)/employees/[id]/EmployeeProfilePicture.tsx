"use client";

import { EmployeePersonalData } from "@/app/types/employee-general";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "primereact/avatar";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface EmployeePhotoProfileProps {
  data: EmployeePersonalData | undefined;
}

const getPhotoUrl = (photoUrl?: string | null) => {
  if (!photoUrl) return undefined;

  if (photoUrl.startsWith("/api/")) {
    return photoUrl;
  }

  const filename = photoUrl.split(/[\\/]/).pop();
  return filename
    ? `/api/public/images/uploads/${encodeURIComponent(filename)}`
    : undefined;
};

const EmployeeProfilePicture = ({ data }: EmployeePhotoProfileProps) => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isHovering, setIsHovering] = useState(false);
  const canUpdateEmployee = useSelector((state: RootState) =>
    state.profile.permissions.includes("employee.update"),
  );

  const initials = useMemo(() => {
    const first = data?.first_name?.trim()?.charAt(0) ?? "";
    const last = data?.last_name?.trim()?.charAt(0) ?? "";

    return `${first}${last}`.toUpperCase() || "EM";
  }, [data?.first_name, data?.last_name]);

  const photoUrl = getPhotoUrl(data?.photo_url);

  const goToEditPhoto = () => {
    if (!params?.id) return;

    router.push(`/employees/${params.id}/edit-photo`);
  };

  return (
    <div
      style={{ position: "relative", width: "7rem", height: "7rem" }}
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Avatar
        label={initials}
        image={photoUrl}
        shape="circle"
        className="bg-blue-100 text-blue-700"
        style={{ width: "7rem", height: "7rem", fontSize: "3rem" }}
      />

      {canUpdateEmployee && isHovering && (
        <button
          type="button"
          onClick={goToEditPhoto}
          className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 text-sm font-medium text-white"
        >
          Change
        </button>
      )}
    </div>
  );
};

export default EmployeeProfilePicture;
