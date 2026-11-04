import { InputHTMLAttributes } from "react";
import { CFormCheck } from "@coreui/react";

type CheckboxProps = {
  label: string;
  name: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
} & InputHTMLAttributes<HTMLInputElement>;

const Checkbox = ({ label, name, checked, onChange, ...rest }: CheckboxProps) => {
  return (
    <CFormCheck
      id={name}
      name={name}
      label={label}
      checked={checked}
      onChange={onChange}
      {...(rest as any)}
    />
  );
};

export default Checkbox;
