const SelectField = ({ label, className = '', selectClassName = '', children, ...props }) => {
  const labelText = label ? String(label) : '';
  const hasLabelStar = labelText.includes('*');
  const cleanLabel = labelText.replace(/\s*\*+\s*$/, '');

  return (
    <div className={className}>
      {label && (
        <label className="form-label">
          {cleanLabel}
          {(props.required || hasLabelStar) && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <select className={`form-select ${selectClassName}`.trim()} {...props}>
        {children}
      </select>
    </div>
  );
};

export default SelectField;
