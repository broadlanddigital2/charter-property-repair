import { ChangeEvent, ReactNode, useState, useEffect } from "react";
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

  const debouncedQuantity = useDebounce(searchValue, 400);

  useEffect(() => {
    onSearch(debouncedQuantity);
  }, [debouncedQuantity]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value.trim());
  };

  return (
    <div className="position-relative" style={{ width: "100%", maxWidth: 420 }}>
      <CInputGroup>
        <CInputGroupText className="bg-body">
          <CIcon icon={cilSearch} />
        </CInputGroupText>
        <CFormInput placeholder={placeholder} value={searchValue} onChange={handleChange} />
      </CInputGroup>

      {searchResults.length > 0 && (
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
