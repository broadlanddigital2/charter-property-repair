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