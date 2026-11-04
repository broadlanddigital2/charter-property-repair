import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";
import { CButton } from "@coreui/react";

type TButtonVariant = "primary" | "secondary" | "error";

type TButtonProps = {
  variant?: TButtonVariant;
  size?: "sm" | "lg";
} & ButtonHTMLAttributes<HTMLButtonElement>;

const COLORS = { primary: "primary", secondary: "secondary", error: "danger" } as const;

/** CoreUI button. Defaults to type="submit" like a plain <button>, as the forms rely on it. */
const Button = ({ children, variant, size, className, type, ...props }: TButtonProps) => {
  return (
    <CButton
      color={COLORS[variant || "primary"]}
      size={size}
      type={type ?? "submit"}
      className={clsx("px-4", className)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
    >
      {children}
    </CButton>
  );
};

export default Button;
