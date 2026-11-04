import { CPagination, CPaginationItem } from "@coreui/react";

import { DOTS, usePagination } from "@/hooks/usePagination";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination = ({ currentPage, totalPages, onPageChange }: Props) => {
  const paginationRange = usePagination({ currentPage, totalPageCount: totalPages });

  if (!totalPages || totalPages <= 1) return null;

  const onFirstPage = currentPage === 1;
  const onLastPage = currentPage === totalPages;

  return (
    <CPagination align="center" className="mt-4" aria-label="Pagination">
      <CPaginationItem
        aria-label="Previous"
        disabled={onFirstPage}
        onClick={() => !onFirstPage && onPageChange(currentPage - 1)}
        style={{ cursor: onFirstPage ? "default" : "pointer" }}
      >
        &laquo;
      </CPaginationItem>

      {paginationRange?.map((pageNumber, idx) =>
        pageNumber === DOTS ? (
          <CPaginationItem key={idx} disabled>
            &hellip;
          </CPaginationItem>
        ) : (
          <CPaginationItem
            key={idx}
            active={pageNumber === currentPage}
            onClick={() => onPageChange(Number(pageNumber))}
            style={{ cursor: "pointer" }}
          >
            {pageNumber}
          </CPaginationItem>
        )
      )}

      <CPaginationItem
        aria-label="Next"
        disabled={onLastPage}
        onClick={() => !onLastPage && onPageChange(currentPage + 1)}
        style={{ cursor: onLastPage ? "default" : "pointer" }}
      >
        &raquo;
      </CPaginationItem>
    </CPagination>
  );
};

export default Pagination;
