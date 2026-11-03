import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { Icon } from "./Icon";

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

export const Dropdown = <T extends string | number | object>({
  options,
  selectedOption,
  placeholder,
  label,
  withoutTopMargin,
  onSelect,
}: TDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleOutsideClick = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick, true);
    return () => {
      document.removeEventListener("click", handleOutsideClick, true);
    };
  }, []);

  return (
    <div className={clsx(!withoutTopMargin && "mt-6")}>
      {label && <p className="ml-2 font-semibold">{label}</p>}
      <div className="relative min-w-150 w-full mt-2" ref={dropdownRef}>
        <button
          type="button"
          className={clsx(
            "flex items-center justify-between text-start w-full p-4 bg-white rounded-[13px]"
          )}
          onClick={toggleDropdown}
        >
          <span className="text-black text-sm flex-grow overflow-hidden whitespace-nowrap overflow-ellipsis">
            {selectedOption !== null ||
            selectedOption !== undefined ||
            selectedOption !== ""
              ? options.find((o) => o.value === selectedOption)?.label
              : placeholder}
          </span>
          <div
            className={clsx(
              "flex items-center justify-center w-6 h-6 transform transition duration-300",
              {
                "-rotate-90": isOpen,
                "rotate-90": !isOpen,
              }
            )}
          >
            <Icon
              src="/icons/chevron-right-light.svg"
              alt="chevron down"
              size={12}
            />
          </div>
        </button>
        {isOpen && (
          <div className="absolute z-20 max-h-[300px] overflow-y-auto overflow-x-hidden w-full py-2 mt-2 bg-white border rounded-[13px] border-gray-700">
            <button
              type="button"
              className="block w-full text-left py-2 px-4 text-sm border-none outline-none cursor-pointer transition duration-200 ease-in-out hover:bg-gray-300"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
            >
              {placeholder}
            </button>

            {options.map((option) => (
              <button
                type="button"
                key={JSON.stringify(option.value)}
                className="block w-full text-left py-2 px-4 text-black text-sm border-none outline-none cursor-pointer transition duration-200 ease-in-out hover:bg-gray-300"
                onClick={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
