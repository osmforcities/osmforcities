import React from 'react';

export interface ButtonProps {
  primary?: boolean;
  label: string;
  onClick?: () => void;
}

export const Button = ({
  primary = false,
  label,
  ...props
}: ButtonProps) => {
  const mode = primary ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900';
  return (
    <button
      type="button"
      className={`px-4 py-2 rounded font-medium ${mode}`}
      {...props}
    >
      {label}
    </button>
  );
};
