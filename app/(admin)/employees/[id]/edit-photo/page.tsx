import ChangeProfilePicture from "@/app/(admin)/account-settings/ChangeProfilePicture";
import React from "react";

interface EditPhotoPageProps {
  params: Promise<{
    id: string;
  }>;
}

const EditPhotoPage = async ({ params }: EditPhotoPageProps) => {
  const { id } = await params;

  return (
    <ChangeProfilePicture
      employeeId={id}
      title="Edit Employee Photo"
      description="Upload a new profile picture for this employee."
      showCurrentPhoto={false}
      showRefreshButton={false}
    />
  );
};

export default EditPhotoPage;
