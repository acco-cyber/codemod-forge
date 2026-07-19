import type { BreakingChange, Fixture } from '../types/index.js';

/**
 * Real before/after code fixtures for common breaking changes.
 * They guide GPT-5.6 generation and verify generated transforms.
 */
export function generateFixtures(changeOrId: BreakingChange | string): Fixture[] {
  const id = typeof changeOrId === 'string'
    ? changeOrId.toLowerCase()
    : [
        changeOrId.id,
        changeOrId.title,
        changeOrId.description,
        changeOrId.affectedPatterns.join(' '),
        changeOrId.migrationSteps,
      ].join(' ').toLowerCase();

  if (id.includes('forwardref')) {
    return [
      {
        name: 'basic-forwardRef-component',
        before: `import { forwardRef } from 'react';

interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    return <button ref={ref} className={props.variant} onClick={props.onClick} />;
  }
);`,
        after: `interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

const Button = ({ ref, variant, onClick }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  return <button ref={ref} className={variant} onClick={onClick} />;
};`,
        description: 'Basic forwardRef to ref-as-prop pattern',
      },
      {
        name: 'forwardRef-arrow-function',
        before: `import { forwardRef } from 'react';

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});`,
        after: `const Input = ({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) => {
  return <input ref={ref} {...props} />;
};`,
        description: 'Arrow function forwardRef to ref-as-prop',
      },
    ];
  }

  if (id.includes('proptypes')) {
    return [
      {
        name: 'remove-propTypes-from-component',
        before: `import React from 'react';
import PropTypes from 'prop-types';

function Alert({ message, severity }) {
  return <div className={\`alert \${severity}\`}>{message}</div>;
}

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  severity: PropTypes.oneOf(['info', 'warning', 'error']),
};

Alert.defaultProps = {
  severity: 'info',
};`,
        after: `function Alert({ message, severity = 'info' }: { message: string; severity?: 'info' | 'warning' | 'error' }) {
  return <div className={\`alert \${severity}\`}>{message}</div>;
}`,
        description: 'Remove propTypes and defaultProps, add TypeScript types',
      },
    ];
  }

  if (id.includes('defaultprops') && !id.includes('proptypes')) {
    return [
      {
        name: 'defaultProps-to-default-params',
        before: `interface CardProps {
  title: string;
  shadow?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

function Card({ title, shadow, rounded }: CardProps) {
  return <div className={\`card shadow-\${shadow} \${rounded ? 'rounded' : ''}\`}>{title}</div>;
}

Card.defaultProps = {
  shadow: 'md',
  rounded: true,
};`,
        after: `interface CardProps {
  title: string;
  shadow?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

function Card({ title, shadow = 'md', rounded = true }: CardProps) {
  return <div className={\`card shadow-\${shadow} \${rounded ? 'rounded' : ''}\`}>{title}</div>;
}`,
        description: 'defaultProps to ES6 default parameters',
      },
    ];
  }

  if (id.includes('useref')) {
    return [
      {
        name: 'useref-null-required',
        before: `import { useRef } from 'react';

function useFocus() {
  const inputRef = useRef<HTMLInputElement>();
  const countRef = useRef<number>();

  const focus = () => inputRef.current?.focus();
  const increment = () => { countRef.current = (countRef.current || 0) + 1; };

  return { inputRef, countRef, focus, increment };
}`,
        after: `import { useRef } from 'react';

function useFocus() {
  const inputRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<number>(0);

  const focus = () => inputRef.current?.focus();
  const increment = () => { countRef.current = (countRef.current || 0) + 1; };

  return { inputRef, countRef, focus, increment };
}`,
        description: 'useRef now requires explicit initial value',
      },
    ];
  }

  if (id.includes('children') && (id.includes('type') || id.includes('react'))) {
    return [
      {
        name: 'children-in-props-type',
        before: `import React from 'react';

interface ContainerProps {
  className?: string;
}

function Container({ children, className }: React.PropsWithChildren<ContainerProps>) {
  return <div className={className}>{children}</div>;
}`,
        after: `interface ContainerProps {
  className?: string;
  children?: React.ReactNode;
}

function Container({ children, className }: ContainerProps) {
  return <div className={className}>{children}</div>;
}`,
        description: 'PropsWithChildren to explicit children in props',
      },
    ];
  }

  return [];
}
