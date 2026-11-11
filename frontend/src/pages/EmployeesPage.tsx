import { useEffect, useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link } from 'react-router';
import { toErrorMessages } from '../api/client';
import { listEmployees } from '../api/employees';
import ErrorMessages from '../components/ErrorMessages';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import TextField from '../components/TextField';
import type { Employee, EmploymentStatus, PaginatedResult } from '../types/api';

const PAGE_SIZE = 10;

type Filters = {
  search: string;
  department: string;
  employmentStatus: EmploymentStatus | '';
};

const NO_FILTERS: Filters = {
  search: '',
  department: '',
  employmentStatus: '',
};

function EmployeesPage() {
  // Two copies on purpose: what the inputs show, and what the list was last asked for.
  // Typing changes only the first, so a request is sent on "Search", not on every keystroke.
  const [draftFilters, setDraftFilters] = useState<Filters>(NO_FILTERS);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PaginatedResult<Employee> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  // Runs after the first render, and again whenever the applied filters or the page change.
  useEffect(() => {
    // A slow, older answer must not overwrite a newer one.
    let ignore = false;

    async function loadEmployees() {
      try {
        const employees = await listEmployees({
          ...filters,
          page,
          pageSize: PAGE_SIZE,
        });
        if (!ignore) {
          setResult(employees);
          setErrorMessages([]);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessages(toErrorMessages(error));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadEmployees();

    return () => {
      ignore = true;
    };
  }, [filters, page]);

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(draftFilters);
    setPage(1); // a new search starts from the first page
    setIsLoading(true);
  }

  function handleReset() {
    setDraftFilters(NO_FILTERS);
    setFilters(NO_FILTERS);
    setPage(1);
    setIsLoading(true);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setIsLoading(true);
  }

  return (
    <section>
      <div className="page-heading">
        <h1>Employees</h1>
        <Link className="button" to="/employees/new">
          Add employee
        </Link>
      </div>

      <form className="filters" onSubmit={handleSearch}>
        <TextField
          label="Name or email"
          name="search"
          value={draftFilters.search}
          onChange={(value) =>
            setDraftFilters((prev) => ({ ...prev, search: value }))
          }
        />
        <TextField
          label="Department (exact)"
          name="department"
          value={draftFilters.department}
          onChange={(value) =>
            setDraftFilters((prev) => ({ ...prev, department: value }))
          }
        />
        <div className="field">
          <label htmlFor="field-status">Status</label>
          <select
            id="field-status"
            value={draftFilters.employmentStatus}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                employmentStatus: event.target
                  .value as Filters['employmentStatus'],
              }))
            }
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="filter-actions">
          <button type="submit">Search</button>
          <button
            type="button"
            className="button-secondary"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </form>

      <ErrorMessages messages={errorMessages} />

      {result === null ? (
        isLoading && <p>Loading employees…</p>
      ) : (
        <>
          <div
            className={isLoading ? 'table-wrapper is-loading' : 'table-wrapper'}
          >
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((employee) => (
                  <tr key={employee.employeeId}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.department}</td>
                    <td>{employee.position}</td>
                    <td>
                      <StatusBadge status={employee.employmentStatus} />
                    </td>
                    <td>
                      <Link to={`/employees/${employee.employeeId}/edit`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
                {result.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No employees match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </section>
  );
}

export default EmployeesPage;
