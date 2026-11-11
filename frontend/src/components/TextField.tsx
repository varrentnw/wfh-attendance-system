type TextFieldProps = {
  label: string;
  /** Also used to build the input's id, so it must be unique on the page. */
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'date';
  autoComplete?: string;
  hint?: string;
};

/** A labelled text input. The parent owns the value; this component only displays and reports it. */
function TextField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  autoComplete,
  hint,
}: TextFieldProps) {
  const id = `field-${name}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint !== undefined && <small className="hint">{hint}</small>}
    </div>
  );
}

export default TextField;
