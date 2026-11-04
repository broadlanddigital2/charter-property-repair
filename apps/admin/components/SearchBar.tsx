import { ChangeEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { CFormInput, CInputGroup, CInputGroupText } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilSearch } from "@coreui/icons";

import useDebounce from "@/hooks/useDebounce";

type Props = {
  placeholder: string;
  placeholderKey?: string;
  searchResults: any[];
  searchKeys: string[];
  onSearch: (value: string) => void;
  onItemClick: (item: any) => void;
  /** Optional custom rendering of each result (defaults to the searchKeys values). */
  renderItem?: (item: any) => ReactNode;
};

const SearchBar = ({
  placeholder,
  placeholderKey = "",
  searchResults,
  searchKeys,
  onSearch,
  onItemClick,
  renderItem,
}: Props) => {
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // close the results when clicking/tapping anywhere outside the search box
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const debouncedQuantity = useDebounce(searchValue, 400);

  useEffect(() => {
    onSearch(debouncedQuantity.trim());
  }, [debouncedQuantity]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // keep spaces while typing so multi-word searches work; trimmed when searching
    setSearchValue(e.target.value);
    setOpen(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="position-relative" style={{ width: "100%", maxWidth: 420 }}>
      <CInputGroup>
        <CInputGroupText className="bg-body">
          <CIcon icon={cilSearch} />
        </CInputGroupText>
        <CFormInput
          placeholder={placeholder}
          value={searchValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
        />
      </CInputGroup>

      {open && searchResults.length > 0 && (
        <div
          className="list-group position-absolute w-100 shadow mt-1"
          style={{ zIndex: 1050, maxHeight: 360, overflowY: "auto", minWidth: 380 }}
        >
          {searchResults.map((item, index) => (
            <button
              type="button"
              key={item?.id || item?.guid || index}
              className="list-group-item list-group-item-action py-2"
              onClick={() => {
                onItemClick(item);
                setSearchValue("");
                setOpen(false);
              }}
            >
              {renderItem ? renderItem(item) : renderSearchResults(searchKeys, item, item[placeholderKey])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function renderSearchResults(searchKeys: string[], item: any, placeholder: string): React.ReactNode {
  const renderedNames = searchKeys.reduce<React.ReactNode[]>((acc, key, index) => {
    const value = item[key];
    if ((typeof value === "string" && value.trim().length > 0) || (typeof value !== "string" && !!value)) {
      acc.push(
        <span key={key}>
          {typeof value === "string" ? value.trim() : value}
          {index < searchKeys.length - 1 && " "}
        </span>
      );
    }
    return acc;
  }, []);

  return renderedNames.length > 0 ? renderedNames : placeholder || "Empty name";
}

export default SearchBar;
