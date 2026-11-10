import React from 'react';

export const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  icon: Icon,
  endElement,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={`block w-full rounded-xl text-sm transition-all bg-white border ${
            error
              ? 'border-rose-400 text-rose-900 placeholder-rose-300 focus:ring-rose-500 focus:border-rose-500'
              : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500'
          } ${Icon ? 'pl-10' : 'pl-3.5'} ${endElement ? 'pr-10' : 'pr-3.5'} py-2.5 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
          {...props}
        />

        {endElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{endElement}</div>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
          <span>•</span> {error}
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

