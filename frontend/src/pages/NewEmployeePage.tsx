import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toErrorMessages } from '../api/client';
import { createEmployee } from '../api/employees';
import type { NewEmployeeInput } from '../api/employees';
import EmployeeDetailsFields from '../components/EmployeeDetailsFields';
import ErrorMessages from '../components/ErrorMessages';
import TextField from '../components/TextField';

const EMPTY_FORM: NewEmployeeInput = {
  name: '',
  email: '',
  department: '',
  position: '',
  username: '',
  password: '',
};

function NewEmployeePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<NewEmployeeInput>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  function handleFieldChange(field: keyof NewEmployeeInput, value: string) {
    // One state object for the whole form: copy it, then replace the one field that changed.
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessages([]);
    try {
      await createEmployee(form);
      navigate('/employees');
    } catch (error) {
      setErrorMessages(toErrorMessages(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Add employee</h1>

      <form className="form-card" onSubmit={handleSubmit}>
        <EmployeeDetailsFields values={form} onChange={handleFieldChange} />

        <h2>Login</h2>
        <TextField
          label="Username"
          name="username"
          value={form.username}
          autoComplete="off"
          onChange={(value) => handleFieldChange('username', value)}
        />
        <TextField
          label="Initial password"
          name="password"
          type="password"
          value={form.password}
          autoComplete="new-password"
          hint="8 to 72 characters. Share it with the employee yourself; it is not shown again."
          onChange={(value) => handleFieldChange('password', value)}
        />

        <ErrorMessages messages={errorMessages} />

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Create employee'}
          </button>
          <Link to="/employees">Cancel</Link>
        </div>
      </form>
    </section>
  );
}

export default NewEmployeePage;
