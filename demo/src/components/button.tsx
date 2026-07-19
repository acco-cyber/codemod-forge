import React, { forwardRef } from 'react';

// Demo 1: forwardRef component (needs migration to ref-as-prop)
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant, disabled, onClick, children }, ref) {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant}`}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
);

export default Button;
