import { ChangeEvent, ReactNode, useState, useEffect } from "react";

import { Icon } from "./Icon";
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
    const query = e.target.value.trim();
    setSearchValue(query);
  };

  return (
    <div className="w-[400px] relative">
      <div className="relative flex items-center">
        <input
          className="h-10 pr-4 pl-12 py-2 w-full border border-gray-400 rounded-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder}
          value={searchValue}
          onChange={handleChange}
        />

        <Icon
          className="absolute transform -translate-y-1/2 left-3 top-1/2"
          src="/icons/search-regular.svg"
          alt="Search"
          size={22}
        />
      </div>

      {searchResults.length > 0 && (
        <div className="inline-flex items-start w-full absolute top-[calc(100%+12px)] left-0">
          <div className="absolute top-full left-0 block z-50 min-w-[400px] max-h-[350px] overflow-auto p-2 bg-white rounded-[13px] shadow-md">
            {searchResults.map((item, index) => (
              <button
                key={item?.id || item?.guid || index}
                className="block text-start w-full relative p-2 text-sm leading-5 text-gray-700 rounded-[8px] duration-300 hover:bg-gray-100"
                onClick={() => {
                  onItemClick(item);
                  setSearchValue("");
                }}
              >
                {renderItem ? renderItem(item) : renderSearchResults(searchKeys, item, item[placeholderKey])}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function renderSearchResults(searchKeys: string[], item: any, placeholder: string): React.ReactNode {
  const renderedNames = searchKeys.reduce<React.ReactNode[]>((acc, key, index) => {
    const value = item[key];

    if (typeof value === "string" && value.trim().length > 0) {
      acc.push(
        <span key={key}>
          {value.trim()}
          {index < searchKeys.length - 1 && " "}
        </span>
      );
    } else if (typeof value !== "string" && !!value) {
      acc.push(
        <span key={key}>
          {value}
          {index < searchKeys.length - 1 && " "}
        </span>
      );
    }
    return acc;
  }, []);

  if (renderedNames.length > 0) {
    return renderedNames;
  }

  return placeholder || "Empty name";
}

export default SearchBar;
