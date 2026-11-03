import Link from "next/link";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import Input from "@/components/Input";
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
    <main className="bg-[#3F4B63] min-h-[100dvh]">
      <section className="h-[100dvh] grid place-items-center">
        <div>
          <Link
            href=".."
            className="text-white duration-200 hover:text-blue-400"
          >
            &larr; Go Back
          </Link>
          <form
            onSubmit={handleSubmit(submit)}
            className="bg-[#EAEAEA] rounded-[13px] mt-3 py-8 px-4 w-[450px]"
          >
            <div className="grid place-items-center gap-x-4">
              <h1 className="text-[18px] font-semibold">Reset Password</h1>
            </div>

            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="Email Address"
              register={register}
            />

            <div className="flex justify-center mt-6">
              <Button>Request Changing Password</Button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
