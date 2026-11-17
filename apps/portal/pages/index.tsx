import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import Input from "@/components/Input";
import Button from "@/components/Button";
import { useStores } from "@/hooks/useStores";
import { CookiesEnum } from "@/enums/cookies";
import { TLoginCredentials } from "@/types/api";
import { login } from "@/services/requestService";
import { errorLogger } from "@/services/axiosService";

const PHONE = "01603 944 080";
const PHONE_HREF = "tel:01603944080";
const EMAIL = "mail@charterpropertyrepairs.co.uk";

const STEPS = [
  {
    title: "We set up your claim",
    text: "Your claims handler agrees your budget and the rooms affected, then emails you an invitation to the portal.",
  },
  {
    title: "Sign in with a code",
    text: "Enter the email address we have for you and we'll send a 6-digit code. There's no password to remember.",
  },
  {
    title: "Choose room by room",
    text: "Work through each room item by item: units, worktops, flooring, tiles and more. Pick replacements and quantities.",
  },
  {
    title: "Review and order",
    text: "Check your selections and your budget, then place your order. Our team takes it from there.",
  },
];

const BUDGET_POINTS = [
  "Items marked Included in Budget are covered by your claim.",
  "Your running total and remaining budget are shown as you go.",
  "If you choose items outside your budget, you'll see any amount to pay before you order.",
  "Your selections are saved, so you can come back and finish later.",
];

const Login = () => {
  const router = useRouter();
  const { authStore, loaderStore } = useStores();
  const [showStaff, setShowStaff] = useState(false);

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
    <>
      <Head>
        <title>Customer portal | Charter Property Repairs</title>
        <meta
          name="description"
          content="Choose the replacement items for your insurance claim online, room by room, within your agreed budget."
        />
      </Head>

      <main className="min-h-[100dvh] bg-[#f6f3fa] text-[#29232f]">
        {/* Hero + sign in */}
        <section className="bg-[#6D21C7] text-white">
          <div className="mx-auto max-w-6xl px-5 pt-6 pb-14 lg:pb-20">
            <header className="flex items-center justify-between gap-4">
              <Image src="/icons/logo.svg" alt="Charter Property Repairs" width={96} height={90} priority />
              <a href={PHONE_HREF} className="text-sm font-semibold text-white/90 hover:text-white">
                Need help? {PHONE}
              </a>
            </header>

            <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[1.1fr_1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">
                  Customer portal
                </p>
                <h1 className="mt-3 text-[34px] font-bold leading-[1.1] sm:text-[44px]">
                  Choose the replacements for your claim, online.
                </h1>
                <p className="mt-5 max-w-xl text-lg text-white/85">
                  If your home has been damaged and Charter is handling the repairs for your insurer, this is where
                  you pick the new kitchen units, flooring, sanitaryware and finishes you'd like, room by room, within
                  your agreed budget.
                </p>
                <ul className="mt-7 grid gap-3 text-white/90 sm:grid-cols-3">
                  {["No password needed", "See your budget as you go", "Save and finish later"].map((point) => (
                    <li key={point} className="flex items-center gap-2 text-sm font-semibold">
                      <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-white/15">
                        ✓
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sign-in card */}
              <div className="rounded-2xl bg-white p-6 text-[#29232f] shadow-[0_20px_50px_#1d0b3a40] sm:p-8">
                <h2 className="text-xl font-bold">Have a claim with us?</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Use the email address your invitation was sent to. We'll email you a 6-digit code to open your claim.
                </p>
                <Button href="/claim-login" className="mt-5 w-full rounded-lg text-base font-semibold">
                  Open my claim →
                </Button>
                <p className="mt-3 text-xs text-gray-500">
                  Not had an invitation yet? Your claim may not be ready. Call us on{" "}
                  <a href={PHONE_HREF} className="underline">
                    {PHONE}
                  </a>
                  .
                </p>

                <div className="mt-6 border-t border-gray-200 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowStaff((open) => !open)}
                    aria-expanded={showStaff}
                    aria-controls="staff-login"
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-[#6D21C7]"
                  >
                    Staff and partner login
                    <span aria-hidden className={showStaff ? "rotate-180 transition" : "transition"}>
                      ▾
                    </span>
                  </button>

                  {showStaff && (
                    <form id="staff-login" onSubmit={handleSubmit(submit)} className="mt-1">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        autoComplete="username"
                        register={register}
                        otherClasses="border border-gray-300"
                      />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        register={register}
                        otherClasses="border border-gray-300"
                      />
                      <div className="mt-5 flex items-center justify-between">
                        <Link href="/forgot-password" className="text-sm underline">
                          Forgotten password
                        </Link>
                        <Button variant="success" className="rounded-lg">
                          Log in
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6D21C7]">How it works</p>
          <h2 className="mt-2 text-3xl font-bold">Four steps from claim to order</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-[#e6dff0] bg-white p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#6D21C7] font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Budget + help */}
        <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 lg:grid-cols-[1.4fr_1fr] lg:pb-24">
          <div className="rounded-2xl bg-white p-7 sm:p-9">
            <h2 className="text-2xl font-bold">Understanding your budget</h2>
            <p className="mt-2 text-gray-600">
              Your budget is agreed with your insurer before your claim is opened. The portal keeps track of it for
              you.
            </p>
            <ul className="mt-5 space-y-3">
              {BUDGET_POINTS.map((point) => (
                <li key={point} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 font-bold text-[#31B75C]">
                    ✓
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-[#29232f] p-7 text-white sm:p-9">
            <h2 className="text-2xl font-bold">Need a hand?</h2>
            <p className="mt-2 text-white/80">
              Our team can help with signing in, choosing items or anything about your claim.
            </p>
            <div className="mt-6 space-y-3">
              <a href={PHONE_HREF} className="block text-xl font-bold hover:underline">
                {PHONE}
              </a>
              <a href={`mailto:${EMAIL}`} className="block break-all text-white/90 hover:underline">
                {EMAIL}
              </a>
            </div>
            <p className="mt-6 text-sm text-white/60">
              Technova House, Technova Court, Earl Road, Rackheath, Norwich NR13 6NT
            </p>
          </div>
        </section>

        <footer className="border-t border-[#e6dff0] py-6 text-center text-xs text-gray-500">
          © Charter Property Repairs · Registered in England and Wales · Company no. 11120168
        </footer>
      </main>
    </>
  );
};

export default Login;
