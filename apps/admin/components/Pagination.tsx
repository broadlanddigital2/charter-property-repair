import clsx from "clsx";

import { Icons } from "./Icons";
import { DOTS, usePagination } from "@/hooks/usePagination";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: Props) => {
  const paginationRange = usePagination({
    currentPage,
    totalPageCount: totalPages,
  });

  const onFirstPage = currentPage === 1;
  const onLastPage = currentPage === totalPages;

  return (
    <div aria-label="Pagination">
      <div className="flex items-center justify-center py-5 gap-x-4">
        <div className="mr-2">
          <button
            style={{ transform: "rotate(180deg)" }}
            className={clsx(
              "group py-2 px-4 grid place-content-center w-[52px] rounded-[5px] bg-[#DDDDDD] duration-300 hover:bg-[#777777]",
              onFirstPage && "cursor-not-allowed !bg-[#EEEEEE]"
            )}
            onClick={() => {
              if (!onFirstPage) {
                onPageChange(currentPage - 1);
              }
            }}
          >
            <Icons.ChevronRight className="fill-black duration-300 group-hover:fill-white" />
          </button>
        </div>

        {paginationRange &&
          paginationRange.map((pageNumber, idx) => {
            if (pageNumber === DOTS) {
              return (
                <div
                  key={idx}
                  className="w-1 h-1 rounded-full bg-black mx-1 relative"
                  title="pagination-ellipsis"
                >
                  <span className="absolute left-[-6px] w-1 h-1 rounded-full bg-black"></span>
                  <span className="absolute left-[6px] w-1 h-1 rounded-full bg-black"></span>
                </div>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => {
                  onPageChange(Number(pageNumber));
                }}
                className={clsx(
                  "py-2 px-4 grid place-content-center w-[52px] rounded-[5px] bg-[#DDDDDD] duration-300 hover:bg-[#777777] hover:text-white",
                  pageNumber === currentPage && "!bg-[#777777] text-white"
                )}
                aria-label="page-number-btn"
              >
                {pageNumber}
              </button>
            );
          })}

        <div className="ml-2">
          <button
            className={clsx(
              "group py-2 px-4 grid place-content-center w-[52px] rounded-[5px] bg-[#DDDDDD] duration-300 hover:bg-[#777777]",
              onLastPage && "cursor-not-allowed !bg-[#EEEEEE]"
            )}
            onClick={() => {
              if (!onLastPage) {
                onPageChange(currentPage + 1);
              }
            }}
          >
            <Icons.ChevronRight className="fill-black duration-300 group-hover:fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
