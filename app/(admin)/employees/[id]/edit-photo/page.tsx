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
      title="static.gcnmfr"
      description="static.1c3q74x"
      showCurrentPhoto={false}
      showRefreshButton={false}
    />
  );
};

export default EditPhotoPage;
