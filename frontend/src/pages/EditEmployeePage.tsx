import { useEffect, useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toErrorMessages } from '../api/client';
import { getEmployee, updateEmployee } from '../api/employees';
import type { EmployeeChanges } from '../api/employees';
import EmployeeDetailsFields from '../components/EmployeeDetailsFields';
import type { EmployeeDetails } from '../components/EmployeeDetailsFields';
import ErrorMessages from '../components/ErrorMessages';
import type { Employee, EmploymentStatus } from '../types/api';

type EditForm = EmployeeDetails & { employmentStatus: EmploymentStatus };

const EDITABLE_FIELDS = [
  'name',
  'email',
  'department',
  'position',
  'employmentStatus',
] as const;

/**
 * PATCH means "change only these fields", so only the fields the user edited are sent.
 * It also matters here: sending employmentStatus makes the gateway call the auth service,
 * which a simple name change should not depend on.
 */
function findChanges(original: Employee, form: EditForm): EmployeeChanges {
  const changes: Record<string, string> = {};
  for (const field of EDITABLE_FIELDS) {
    if (form[field] !== original[field]) {
      changes[field] = form[field];
    }
  }
  return changes as EmployeeChanges;
}

function EditEmployeePage() {
  const navigate = useNavigate();
  // The ":employeeId" part of the route's path. URL parts are always strings.
  const params = useParams();
  const employeeId = Number(params.employeeId);

  // The employee as loaded from the server, kept to compare against when saving.
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;

    async function loadEmployee() {
      try {
        const loaded = await getEmployee(employeeId);
        if (!ignore) {
          setEmployee(loaded);
          setForm({
            name: loaded.name,
            email: loaded.email,
            department: loaded.department,
            position: loaded.position,
            employmentStatus: loaded.employmentStatus,
          });
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

    loadEmployee();

    return () => {
      ignore = true;
    };
  }, [employeeId]);

  function handleFieldChange(field: keyof EditForm, value: string) {
    setForm((prev) => (prev === null ? prev : { ...prev, [field]: value }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (employee === null || form === null) {
      return;
    }

    const changes = findChanges(employee, form);
    if (Object.keys(changes).length === 0) {
      navigate('/employees');
      return;
    }

    setIsSubmitting(true);
    setErrorMessages([]);
    try {
      await updateEmployee(employee.employeeId, changes);
      navigate('/employees');
    } catch (error) {
      setErrorMessages(toErrorMessages(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p>Loading employee…</p>;
  }

  if (employee === null || form === null) {
    return (
      <section>
        <h1>Edit employee</h1>
        <ErrorMessages messages={errorMessages} />
        <Link to="/employees">Back to employees</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Edit employee</h1>

      <form className="form-card" onSubmit={handleSubmit}>
        <EmployeeDetailsFields values={form} onChange={handleFieldChange} />

        <div className="field">
          <label htmlFor="field-employmentStatus">Employment status</label>
          <select
            id="field-employmentStatus"
            value={form.employmentStatus}
            onChange={(event) =>
              handleFieldChange('employmentStatus', event.target.value)
            }
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <small className="hint">
            Setting an employee to inactive also disables their login. Their
            attendance history is kept.
          </small>
        </div>

        <ErrorMessages messages={errorMessages} />

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
          <Link to="/employees">Cancel</Link>
        </div>
      </form>
    </section>
  );
}

export default EditEmployeePage;
