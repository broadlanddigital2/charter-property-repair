import clsx from "clsx";
import { CFormLabel, CFormSelect } from "@coreui/react";

type TDropdownOption<T extends string | number | object> = {
  label: string;
  value: T;
};

type TDropdownProps<T extends string | number | object> = {
  options: TDropdownOption<T>[];
  selectedOption: T | null | undefined;
  placeholder: string;
  label?: string;
  withoutTopMargin?: boolean;
  onSelect: (option: T | null) => void;
};

/** CoreUI select. Options are addressed by index so object values keep working. */
export const Dropdown = <T extends string | number | object>({
  options,
  selectedOption,
  placeholder,
  label,
  withoutTopMargin,
  onSelect,
}: TDropdownProps<T>) => {
  const selectedIndex = options.findIndex((o) => o.value === selectedOption);

  return (
    <div className={clsx(!withoutTopMargin && "mt-3")}>
      {label && <CFormLabel className="fw-semibold small mb-1">{label}</CFormLabel>}
      <CFormSelect
        value={selectedIndex >= 0 ? String(selectedIndex) : ""}
        onChange={(e) => {
          const v = e.target.value;
          onSelect(v === "" ? null : options[Number(v)].value);
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option, i) => (
          <option key={i} value={String(i)}>
            {option.label}
          </option>
        ))}
      </CFormSelect>
    </div>
  );
};
