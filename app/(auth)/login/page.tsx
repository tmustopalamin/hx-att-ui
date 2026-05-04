import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import LoginForm from "./login-form";

export const metadata = {
  title: "Login - PT. Hexing Technology",
  description: "Login to your account",
};

const AuthLoginPage = async () => {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token");

  if (access) {
    redirect("/dashboard");
  }

  return <LoginForm />;
};

export default AuthLoginPage;