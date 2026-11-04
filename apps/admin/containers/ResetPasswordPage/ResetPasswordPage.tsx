import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import Input from "@/components/Input";
import AuthLayout from "@/components/AuthLayout";
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
    <AuthLayout title="Set a new password" subtitle="Choose a password for your account.">
      <form onSubmit={handleSubmit(submit)}>
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="New password"
          register={register}
          errors={errors}
          withoutTopMargin
        />
        <Input
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Repeat the password"
          register={register}
          errors={errors}
        />
        <Button className="w-100 mt-4">Set password</Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
