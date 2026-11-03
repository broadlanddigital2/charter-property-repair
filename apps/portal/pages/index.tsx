import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import Input from "@/components/Input";
import { Icon } from "@/components/Icon";
import Button from "@/components/Button";
import { useStores } from "@/hooks/useStores";
import { CookiesEnum } from "@/enums/cookies";
import { TLoginCredentials } from "@/types/api";
import { login } from "@/services/requestService";
import { errorLogger } from "@/services/axiosService";

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
      errorLogger(error, "Failed to login");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  return (
    <main className="bg-[#6D21C7] min-h-[100dvh]">
      <section className="h-[100dvh] flex flex-col gap-y-6 justify-center items-center">
        <div className="relative">
          <Image src="/icons/logo.svg" alt="logo" width={220} height={125} />
        </div>

        <form
          onSubmit={handleSubmit(submit)}
          className="bg-[#EAEAEA] rounded-[13px] py-8 px-4 w-[450px]"
        >
          <div className="flex items-center justify-center gap-x-4">
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
            <Link href="forgot-password" className="text-sm">
              Forgotten Password
            </Link>

            <Button variant="success">Login</Button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default Login;
