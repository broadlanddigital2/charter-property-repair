import Link from "next/link";
import Cookies from "js-cookie";
import { AxiosError } from "axios";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import Input from "@/components/Input";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import { CookiesEnum } from "@/enums/cookies";
import { TLoginCredentials } from "@/types/api";
import { login } from "@/services/requestService";
import { useStores } from "@/hooks/useStores";
import { useEffect } from "react";

const Login = () => {
  const router = useRouter();
  const { authStore, loaderStore } = useStores();

  const { register, handleSubmit } = useForm<TLoginCredentials>();

  useEffect(() => {
    if (Cookies.get(CookiesEnum.AccessToken)) {
      router.push("/dashboard");
    }
  }, []);

  const submit = async (formData: TLoginCredentials) => {
    try {
      loaderStore.setLoading(true);
      const loginData = await login(formData);

      Cookies.set(CookiesEnum.AccessToken, loginData.token);

      await authStore.fetchUser();

      await router.push("/dashboard");
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || "Failed to login");
      }

      console.error({ error });
    } finally {
      loaderStore.setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Use your admin account to continue.">
      <form onSubmit={handleSubmit(submit)}>
        <Input id="email" label="Email" type="email" placeholder="you@company.co.uk" register={register} withoutTopMargin />
        <Input id="password" label="Password" type="password" placeholder="Password" register={register} />

        <Button className="w-100 mt-4">Sign in</Button>

        <div className="text-center mt-3">
          <Link href="/forgot-password" className="small">
            Forgotten your password?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
