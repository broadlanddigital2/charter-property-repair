import { InputHTMLAttributes } from "react";

type CheckboxProps = {
  label: string;
  name: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
} & InputHTMLAttributes<HTMLInputElement>;

const Checkbox = ({ label, name, checked, onChange, ...rest }: CheckboxProps) => {
  return (
    <div className="flex items-center space-x-2">
      <label
        htmlFor={name}
        className={`cursor-pointer flex items-center justify-center w-5 h-5 border-2 rounded ${
          checked ? "bg-green-500 border-green-500" : "border-black"
        }`}
      >
        <input  
          type="checkbox"
          className="hidden"
          id={name}
          checked={checked}
          onChange={onChange}
          {...rest}
        />
        {checked && (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </label>
      <span>{label}</span>
    </div>
  );
};

export default Checkbox;
