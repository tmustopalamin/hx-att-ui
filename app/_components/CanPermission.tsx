import { RootState } from "@/store/store";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@/app/utils/permission-utils";
import { useSelector } from "react-redux";

type Props = {
  permission?: string;
  anyOf?: string[]; //minimal punya salah satu dari permission
  allOf?: string[]; //harus punya semua permission
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

const Can = ({ permission, anyOf, allOf, children, fallback }: Props) => {
  const profile = useSelector((state: RootState) => state.profile);
  const permissions = profile?.permissions || [];

  let allowed = permission ? hasPermission(permissions, permission) : false;

  if (anyOf) {
    allowed = hasAnyPermission(permissions, anyOf);
  }

  if (allOf) {
    allowed = hasAllPermissions(permissions, allOf);
  }

  if (!allowed) return <>{fallback}</>;

  return <>{children}</>;
};

export default Can;
