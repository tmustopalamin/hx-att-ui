"use client";

import { useEffect, useRef } from "react";
import { Checkbox, type CheckboxProps } from "primereact/checkbox";

interface IndeterminateCheckboxProps extends CheckboxProps {
  indeterminate?: boolean;
}

export default function IndeterminateCheckbox({
  indeterminate = false,
  ...props
}: IndeterminateCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return <Checkbox {...props} inputRef={inputRef} />;
}
