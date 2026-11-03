import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import { confirmPasswordReset } from "@/services/requestService";
import { yupResolver } from "@hookform/resolvers/yup";
import { setNewPassSchema } from "@/validators/schemas";

type TResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

const ResetPasswordPage = () => {
  const router = useRouter();

  const { loaderStore } = useStores();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<TResetPasswordForm>({
    mode: "onBlur",
    resolver: yupResolver(setNewPassSchema),
  });

  const submit = async (formData: TResetPasswordForm) => {
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }


    try {
      loaderStore.setLoading(true);
      // send request for password reset for specified email
      await confirmPasswordReset({
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      });

      toast.success("Password was successfully set");
      await router.push("/");
    } catch (error) {
      errorLogger(error, "Failed to set the password");
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
          <div className="grid place-items-center gap-x-4">
            <h1 className="text-[18px] font-semibold">Set New Password</h1>
          </div>

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Password"
            register={register}
            errors={errors}
          />

          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm Password"
            register={register}
            errors={errors}
          />

          <div className="flex justify-center mt-6">
            <Button>Set password</Button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default ResetPasswordPage;
