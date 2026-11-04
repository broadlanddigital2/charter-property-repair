import Link from "next/link";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import Input from "@/components/Input";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/Button";
import { useStores } from "@/hooks/useStores";
import { errorLogger } from "@/services/axiosService";
import { resetPassword } from "@/services/requestService";

type TResetPasswordForm = {
  email: string;
};

const ForgotPasswordPage = () => {
  const router = useRouter();
  const { loaderStore } = useStores();

  const { register, handleSubmit } = useForm<TResetPasswordForm>();

  const submit = async (formData: TResetPasswordForm) => {
    try {
      loaderStore.setLoading(true);
      await resetPassword(formData.email);
      toast.success("Email with confirmation was sent successfully");
      await router.push("/");
    } catch (error) {
      errorLogger(error, "Failed to send reset password email");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to set a new password.">
      <form onSubmit={handleSubmit(submit)}>
        <Input id="email" label="Email" type="email" placeholder="you@company.co.uk" register={register} withoutTopMargin />
        <Button className="w-100 mt-4">Send reset link</Button>
        <div className="text-center mt-3">
          <Link href="/" className="small">
            &larr; Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
