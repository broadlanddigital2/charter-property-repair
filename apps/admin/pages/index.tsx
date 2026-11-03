import Link from "next/link";
import Cookies from "js-cookie";
import { AxiosError } from "axios";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import Input from "@/components/Input";
import { Icon } from "@/components/Icon";
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
    <main className="bg-[#3F4B63] min-h-[100dvh]">
      <section className="h-[100dvh] grid place-items-center">
        <form
          onSubmit={handleSubmit(submit)}
          className="bg-[#EAEAEA] rounded-[13px] py-8 px-4 w-[450px]"
        >
          <div className="flex justify-center items-center gap-x-3">
            <Icon src="/icons/login.svg" alt="login icon" size={36} />
            <h1 className="text-[18px] font-semibold">System Login</h1>
          </div>

          <Input
            id="email"
            type="email"
            placeholder="Email"
            register={register}
          />

          <Input
            id="password"
            type="password"
            placeholder="Password"
            register={register}
          />

          <div className="flex justify-between mt-6 pl-3">
            <Link
              href="forgot-password"
              className="text-sm duration-200 hover:text-blue-400"
            >
              Forgotten Password
            </Link>

            <Button>Login</Button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default Login;
