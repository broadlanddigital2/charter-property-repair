import clsx from "clsx";
import { HTMLInputTypeAttribute, InputHTMLAttributes, useState } from "react";
import {
  UseFormRegister,
  FieldValues,
  Path,
  FieldErrors,
} from "react-hook-form";

import { Icon } from "./Icon";

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

  const eyeClickHandler = () => {
    setTypeState(typeState === "password" ? "text" : "password");
  };

  return (
    <div className={clsx(!withoutTopMargin && 'mt-6')}>
      {label && <label htmlFor={id} className="ml-2 font-semibold">{label}</label>}

      <div className="relative">
        <input
          id={id}
          type={typeState}
          className={clsx(
            "block bg-white p-4 w-full rounded-[13px] placeholder:text-gray-600 text-black mt-2",
            { "outline outline-[#d31919]": error?.message },
            otherClasses
          )}
          {...register?.(id, { required })}
          {...otherProps}
        />

        {type === "password" && (
          <Icon
            onClick={eyeClickHandler}
            className="absolute top-[20px] right-[16px] cursor-pointer"
            src="/icons/Hide.svg"
            alt="hide icon"
          />
        )}

        {error?.message && (
          <p className="absolute left-0 top-[calc(100%+5px)] text-[#d31919] text-[12px]">
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default Input;
