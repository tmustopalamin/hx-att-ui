import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { cookies } from "next/headers";

export const metadata = {
  title: 'Login - PT. Hexing Technology',
  description: 'login to your account',
};

const AuthLoginPage = async () => {
  const cookieStore = await cookies();
  const access = cookieStore.get('access_token');

  if (access) {
    redirect('/dashboard')
  }

  return <>
    <LoginForm />
  </>
};

export default AuthLoginPage;
