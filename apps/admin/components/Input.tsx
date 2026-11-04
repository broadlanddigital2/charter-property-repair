import clsx from "clsx";
import { HTMLInputTypeAttribute, InputHTMLAttributes, useState } from "react";
import { UseFormRegister, FieldValues, Path, FieldErrors } from "react-hook-form";
import { CButton, CFormInput, CFormLabel, CInputGroup } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilLockLocked, cilLockUnlocked } from "@coreui/icons";

const getNestedProp = (obj: Record<string, any> | undefined, path: string) => {
  return path.split(".").reduce((obj, key) => obj?.[key], obj);
};

type InputProps<T extends FieldValues> = {
  id: Path<T>;
  label?: string;
  type?: HTMLInputTypeAttribute;
  name?: string;
  errors?: FieldErrors;
  required?: boolean;
  otherClasses?: string;
  withoutTopMargin?: boolean;
  register?: UseFormRegister<T>;
} & InputHTMLAttributes<HTMLInputElement>;

const Input = <T extends FieldValues>({
  label,
  id,
  type = "text",
  required,
  name,
  errors,
  withoutTopMargin,
  otherClasses,
  register,
  ...otherProps
}: InputProps<T>) => {
  const error = getNestedProp(errors, id);
  const [typeState, setTypeState] = useState(type);

  return (
    <div className={clsx(!withoutTopMargin && "mt-3")}>
      {label && (
        <CFormLabel htmlFor={id} className="fw-semibold small mb-1">
          {label}
        </CFormLabel>
      )}

      <CInputGroup>
        <CFormInput
          id={id}
          type={typeState}
          invalid={!!error?.message}
          className={otherClasses}
          {...register?.(id, { required })}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(otherProps as any)}
        />
        {type === "password" && (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            onClick={() => setTypeState(typeState === "password" ? "text" : "password")}
            aria-label={typeState === "password" ? "Show password" : "Hide password"}
          >
            <CIcon icon={typeState === "password" ? cilLockLocked : cilLockUnlocked} />
          </CButton>
        )}
      </CInputGroup>

      {error?.message && <div className="invalid-feedback d-block">{String(error.message)}</div>}
    </div>
  );
};

export default Input;
