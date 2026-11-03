import { toast } from "react-toastify";
import { AxiosError } from "axios";

// The legacy axios instance for the Laravel API is gone; requests now go
// through services/supabase.ts, which raises AxiosError-compatible errors.
export const errorLogger = (error: unknown, customMessage?: string) => {
  console.error("Error logger: ", error);
  if (error instanceof AxiosError) {
    toast.error(
      error.response?.data?.error ||
        error.response?.data?.message ||
        customMessage ||
        "Request failed, try again later"
    );
  } else {
    toast.error(customMessage || "Request failed, try again later");
  }
};
