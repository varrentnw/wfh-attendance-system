type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

/** Previous/next controls for any list that uses the API's { page, pageSize, total } shape. */
function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  if (total === 0) {
    return null;
  }

  const pageCount = Math.ceil(total / pageSize);
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        Showing {firstItem}–{lastItem} of {total}
      </span>
      <button
        type="button"
        className="button-secondary"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        className="button-secondary"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export default Pagination;
