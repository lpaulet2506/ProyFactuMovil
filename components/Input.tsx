
import React from 'react';

interface InputProps {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  className?: string;
  error?: boolean;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder, 
  className = '',
  error = false,
  required = false
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border bg-white outline-none transition-all duration-200 text-gray-800 shadow-sm ${
          error 
            ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
            : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
        }`}
      />
    </div>
  );
};

export default Input;
