import { object, ref, string } from "yup";

export const setNewPassSchema = object({
  password: string()
    .min(8, "Password must be at least 8 characters long")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character"
    )
    .required("Password field is required"),
  confirmPassword: string()
    .oneOf([ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

export const userUpdateFormSchema = object({
  userData: object({
    name: string().optional(),
    email: string().optional(),
    mobile: string().optional(),
    phone: string().optional(),
  }),
});

export const userCreateFormSchema = object({
  userData: object({
    name: string().required("Full Name field is required"),
    email: string().email("Invalid email").required("Email field is required"),
    mobile: string().optional(),
    phone: string().optional(),
    password: string().min(8, "Password must be at least 8 characters long")
  }),
});
