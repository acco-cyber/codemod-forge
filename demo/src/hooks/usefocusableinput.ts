import React, { useRef } from 'react';

// Demo 4: useRef without initial value (needs null/0 default)
function useFocusableInput() {
  const inputRef = useRef<HTMLInputElement>();
  const focusCount = useRef<number>();

  const focus = () => {
    inputRef.current?.focus();
    focusCount.current = (focusCount.current || 0) + 1;
  };

  const blur = () => {
    inputRef.current?.blur();
  };

  return { inputRef, focus, blur };
}

export default useFocusableInput;
