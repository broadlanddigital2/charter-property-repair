import clsx from "clsx";
import Link from "next/link";
import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type TButtonVariant = "primary" | "secondary" | "success" | "ghost";

type TBaseButtonProps = {
  variant?: TButtonVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  children: React.ReactNode;
};

// Button props (when href is not provided)
type TButtonProps = TBaseButtonProps & {
  href?: never;
} & ButtonHTMLAttributes<HTMLButtonElement>;

// Link props (when href is provided)
type TLinkProps = TBaseButtonProps & {
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

type TComponentProps = TButtonProps | TLinkProps;

const BUTTON_VARIANTS = {
  primary: "bg-[#6D21C7] hover:bg-[#6D21C7]/70",
  secondary: "bg-[#9D9D9D] hover:bg-[#807e7e]",
  success: "bg-[#31B75C] hover:bg-[#3d9d5b]",
  ghost:
    "hover:text-[#6D20C7] bg-transparent hover:bg-white border-2 border-white",
};

const BUTTON_SIZES = {
  sm: "py-2 px-4",
  md: "py-3 px-6",
};

const Button = ({ 
  children, 
  variant = "primary", 
  size = "md", 
  icon,
  className,
  ...props 
}: TComponentProps) => {
  const buttonVariant = BUTTON_VARIANTS[variant];
  const buttonSize = BUTTON_SIZES[size];

  const classes = clsx(
    "flex items-center justify-center gap-x-3 text-white rounded-[4px] duration-300",
    buttonVariant,
    buttonSize,
    className,
  );

  if ('href' in props && props.href) {
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {icon}
        {children}
      </Link>
    );
  }

  const { href, ...buttonProps } = props as TButtonProps;
  return (
    <button className={classes} {...buttonProps}>
      {icon}
      {children}
    </button>
  );
};

export default Button;