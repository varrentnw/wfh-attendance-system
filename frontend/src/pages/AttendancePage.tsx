import { useEffect, useState } from 'react';
import type { SubmitEvent } from 'react';
import { listAttendanceRecords } from '../api/attendance';
import { toErrorMessages } from '../api/client';
import { listEmployees } from '../api/employees';
import ErrorMessages from '../components/ErrorMessages';
import Pagination from '../components/Pagination';
import PhotoDialog from '../components/PhotoDialog';
import TextField from '../components/TextField';
import type {
  AttendanceRecordWithEmployee,
  Employee,
  PaginatedResult,
} from '../types/api';
import { formatDateTime } from '../utils/format';

const PAGE_SIZE = 10;
// The employee filter lists at most this many names, which is the API's largest page.
const EMPLOYEE_OPTIONS_LIMIT = 100;

type Filters = {
  /** Kept as text because it comes from a <select>; '' means every employee. */
  employeeId: string;
  from: string;
  to: string;
};

const NO_FILTERS: Filters = { employeeId: '', from: '', to: '' };

function AttendancePage() {
  const [draftFilters, setDraftFilters] = useState<Filters>(NO_FILTERS);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);

  const [result, setResult] =
    useState<PaginatedResult<AttendanceRecordWithEmployee> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const [employeeOptions, setEmployeeOptions] = useState<Employee[]>([]);
  const [openRecord, setOpenRecord] =
    useState<AttendanceRecordWithEmployee | null>(null);

  // Names for the employee filter, loaded once. If this fails, the filter
  // simply offers "All employees", and the list itself still works.
  useEffect(() => {
    let ignore = false;

    async function loadEmployeeOptions() {
      try {
        const employees = await listEmployees({
          page: 1,
          pageSize: EMPLOYEE_OPTIONS_LIMIT,
        });
        if (!ignore) {
          setEmployeeOptions(employees.items);
        }
      } catch {
        // Nothing to do: the filter is a convenience, not a requirement.
      }
    }

    loadEmployeeOptions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadRecords() {
      try {
        const records = await listAttendanceRecords({
          employeeId:
            filters.employeeId === '' ? undefined : Number(filters.employeeId),
          from: filters.from,
          to: filters.to,
          page,
          pageSize: PAGE_SIZE,
        });
        if (!ignore) {
          setResult(records);
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

    loadRecords();

    return () => {
      ignore = true;
    };
  }, [filters, page]);

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(draftFilters);
    setPage(1);
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
        <h1>Attendance</h1>
      </div>

      <form className="filters" onSubmit={handleSearch}>
        <div className="field">
          <label htmlFor="field-employeeId">Employee</label>
          <select
            id="field-employeeId"
            value={draftFilters.employeeId}
            onChange={(event) =>
              setDraftFilters((prev) => ({
                ...prev,
                employeeId: event.target.value,
              }))
            }
          >
            <option value="">All employees</option>
            {employeeOptions.map((employee) => (
              <option key={employee.employeeId} value={employee.employeeId}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <TextField
          label="From work date"
          name="from"
          type="date"
          value={draftFilters.from}
          onChange={(value) =>
            setDraftFilters((prev) => ({ ...prev, from: value }))
          }
        />
        <TextField
          label="To work date"
          name="to"
          type="date"
          value={draftFilters.to}
          onChange={(value) =>
            setDraftFilters((prev) => ({ ...prev, to: value }))
          }
        />
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
        isLoading && <p>Loading attendance…</p>
      ) : (
        <>
          <div
            className={isLoading ? 'table-wrapper is-loading' : 'table-wrapper'}
          >
            <table>
              <thead>
                <tr>
                  <th>Work date</th>
                  <th>Checked in at</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Photo</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((record) => (
                  <tr key={record.recordId}>
                    <td>{record.workDate}</td>
                    <td>{formatDateTime(record.checkedInAt)}</td>
                    {record.employee === null ? (
                      // The gateway could not reach the employee service; the record is still valid.
                      <td colSpan={2} className="muted">
                        Employee #{record.employeeId} (details unavailable)
                      </td>
                    ) : (
                      <>
                        <td>{record.employee.name}</td>
                        <td>{record.employee.department}</td>
                      </>
                    )}
                    <td>
                      <button
                        type="button"
                        className="button-link"
                        onClick={() => setOpenRecord(record)}
                      >
                        View photo
                      </button>
                    </td>
                  </tr>
                ))}
                {result.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      No attendance records match these filters.
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

      {openRecord !== null && (
        <PhotoDialog
          recordId={openRecord.recordId}
          title={`${openRecord.employee?.name ?? `Employee #${openRecord.employeeId}`}, ${openRecord.workDate}`}
          onClose={() => setOpenRecord(null)}
        />
      )}
    </section>
  );
}

export default AttendancePage;
