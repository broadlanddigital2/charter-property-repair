import clsx from "clsx";
import React, { ButtonHTMLAttributes } from "react";

type TButtonVariant = "primary" | "secondary" | "error";

type TButtonProps = {
  variant?: TButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const Button = ({ children, variant, ...props }: TButtonProps) => {
  const BUTTON_VARIANTS = {
    primary: "text-white bg-[#31B75C] hover:bg-[#3d9d5b]",
    secondary: "text-white bg-[#9D9D9D] hover:bg-[#807e7e]",
    error: "text-white bg-[#D70040] hover:bg-[#b8093d]"
  };

  const buttonVariant = BUTTON_VARIANTS[variant || "primary"];

  return (
    <button
      className={clsx("py-2 px-6 rounded-[4px] duration-300", buttonVariant)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
