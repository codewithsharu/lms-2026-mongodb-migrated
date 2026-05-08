const InputField = ({
  label,
  leftIcon: LeftIcon,
  rightNode,
  className = '',
  inputClassName = '',
  ...props
}) => {
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
      <div className="relative">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LeftIcon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          className={`form-input ${LeftIcon ? 'with-left-icon' : ''} ${rightNode ? 'with-right-icon' : ''} ${inputClassName}`.trim()}
          {...props}
        />
        {rightNode && <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{rightNode}</div>}
      </div>
    </div>
  );
};

export default InputField;
