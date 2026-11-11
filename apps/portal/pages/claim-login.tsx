import Image from "next/image";
import Link from "next/link";
import Cookies from "js-cookie";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

import Button from "@/components/Button";
import { useStores } from "@/hooks/useStores";
import { CookiesEnum } from "@/enums/cookies";
import { requestLoginCode, verifyLoginCode } from "@/services/requestService";
import { errorLogger } from "@/services/axiosService";

/** Claim users sign in with their email and a 6-digit code (no password). */
const ClaimLogin = () => {
  const router = useRouter();
  const { authStore, loaderStore } = useStores();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof router.query.email === "string") setEmail(router.query.email);
  }, [router.isReady, router.query.email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast.error("Enter the email address we sent your claim to");
      return;
    }
    try {
      loaderStore.setLoading(true);
      await requestLoginCode(email);
      setStep("code");
      setCode("");
      setCooldown(60);
      toast.success("We've emailed you a 6-digit code");
    } catch (error) {
      errorLogger(error, "Couldn't send a code");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  const verify = async (e?: FormEvent) => {
    e?.preventDefault();
    if (code.replace(/\D/g, "").length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    try {
      loaderStore.setLoading(true);
      const res = await verifyLoginCode(email, code);
      Cookies.set(CookiesEnum.AccessToken, res.token);
      await authStore.fetchUser();
      await router.push("/dashboard");
    } catch (error) {
      errorLogger(error, "Couldn't sign you in");
    } finally {
      loaderStore.setLoading(false);
    }
  };

  return (
    <main className="bg-[#6D21C7] min-h-[100dvh]">
      <section className="min-h-[100dvh] flex flex-col gap-y-6 justify-center items-center px-4">
        <Image src="/icons/logo.svg" alt="logo" width={220} height={125} />

        <div className="bg-[#EAEAEA] rounded-[13px] py-8 px-6 w-full max-w-[450px]">
          <h1 className="text-[18px] font-semibold text-center">Open your claim</h1>

          {step === "email" ? (
            <form onSubmit={sendCode} className="mt-6">
              <p className="text-sm text-gray-600 mb-3">
                Enter the email address we sent your claim to. We&apos;ll email you a 6-digit code to sign in.
              </p>
              <label htmlFor="claim-email" className="sr-only">
                Email
              </label>
              <input
                id="claim-email"
                type="email"
                autoComplete="email"
                className="w-full rounded-md border border-gray-300 px-4 py-3 bg-white"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex justify-end mt-6">
                <Button variant="success" type="submit">
                  Email me a code
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6">
              <p className="text-sm text-gray-600 mb-3">
                We&apos;ve sent a 6-digit code to <b>{email}</b>. It can take a minute to arrive — check your junk folder
                too.
              </p>
              <label htmlFor="claim-code" className="sr-only">
                6-digit code
              </label>
              <input
                id="claim-code"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                className="w-full rounded-md border border-gray-300 px-4 py-3 bg-white text-center text-2xl tracking-[0.5em]"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
              />
              <div className="flex items-center justify-between mt-6">
                <div className="flex flex-col gap-1 text-sm">
                  <button
                    type="button"
                    className="text-left underline disabled:no-underline disabled:text-gray-500"
                    disabled={cooldown > 0}
                    onClick={() => sendCode()}
                  >
                    {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
                  </button>
                  <button type="button" className="text-left underline" onClick={() => setStep("email")}>
                    Use a different email
                  </button>
                </div>
                <Button variant="success" type="submit">
                  Sign in
                </Button>
              </div>
            </form>
          )}
        </div>

        <Link href="/" className="text-white/80 text-sm underline">
          Staff login with a password
        </Link>
      </section>
    </main>
  );
};

export default ClaimLogin;
