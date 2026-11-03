import { useRouter } from "next/router";

import { Icons } from "./Icons";
import { DOTS, usePagination } from "@/hooks/usePagination";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();

  const paginationRange = usePagination({
    currentPage,
    totalPageCount: totalPages,
    siblingCount: 2,
  });

  const onFirstPage = !currentPage || currentPage === 1;
  const onLastPage = currentPage && Number(currentPage) === totalPages;

  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    const newQuery = { ...router.query, page: String(page) };
    router.push({ pathname: router.pathname, query: newQuery });
  };

  return (
    <nav aria-label="Pagination">
      <div className="flex justify-center items-center py-5 gap-4 lg:gap-3">
        {!onFirstPage && totalPages > 3 && (
          <div className="mr-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="flex items-center justify-center w-[45px] h-[45px] min-w-[45px] rounded-md bg-[#6D20C7]/40 hover:bg-[#6D20C7] hover:text-white transition rotate-180"
            >
              <Icons.ChevronRight width={20} height={20} />
            </button>
          </div>
        )}

        {paginationRange?.map((pageNumber, idx) =>
          pageNumber === DOTS ? (
            <div
              key={idx}
              className="relative w-1 h-1 bg-black rounded-full mx-[3px]"
              title="pagination-ellipsis"
            >
              <span className="absolute left-[-5px] w-1 h-1 bg-black rounded-full" />
              <span className="absolute left-[5px] w-1 h-1 bg-black rounded-full" />
            </div>
          ) : (
            <button
              key={idx}
              onClick={() => handlePageChange(Number(pageNumber))}
              aria-label="page-number-btn"
              className={`w-[45px] h-[45px] min-w-[45px] rounded-md transition
                ${
                  pageNumber === currentPage || (!currentPage && idx === 0)
                    ? "bg-[#6D20C7] text-white"
                    : "bg-[#6D20C7]/40 hover:bg-[#6D20C7] hover:text-white"
                }`}
            >
              {pageNumber}
            </button>
          )
        )}

        {!onLastPage && totalPages > 3 && (
          <div className="ml-2">
            <button
              onClick={() => handlePageChange(onFirstPage ? 2 : currentPage + 1)}
              className="flex items-center justify-center w-[45px] h-[45px] min-w-[45px] rounded-md bg-[#6D20C7]/40 hover:bg-[#6D20C7] hover:text-white transition"
            >
              <Icons.ChevronRight width={20} height={20} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
