import TextField from './TextField';

export type EmployeeDetails = {
  name: string;
  email: string;
  department: string;
  position: string;
};

type EmployeeDetailsFieldsProps = {
  values: EmployeeDetails;
  onChange: (field: keyof EmployeeDetails, value: string) => void;
};

/** The four fields that the "add" and "edit" forms have in common. */
function EmployeeDetailsFields({
  values,
  onChange,
}: EmployeeDetailsFieldsProps) {
  return (
    <>
      <TextField
        label="Full name"
        name="name"
        value={values.name}
        onChange={(value) => onChange('name', value)}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        value={values.email}
        onChange={(value) => onChange('email', value)}
      />
      <TextField
        label="Department"
        name="department"
        value={values.department}
        onChange={(value) => onChange('department', value)}
      />
      <TextField
        label="Position"
        name="position"
        value={values.position}
        onChange={(value) => onChange('position', value)}
      />
    </>
  );
}

export default EmployeeDetailsFields;
