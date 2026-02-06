import React, { useRef, useState, useEffect } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled = false }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array.from({ length }, () => ''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    // Handle paste
    if (value.length > 1) {
      const pastedCode = value.slice(0, length).split('');
      const newValues = [...values];
      pastedCode.forEach((char, i) => {
        if (i < length && /^\d$/.test(char)) {
          newValues[i] = char;
        }
      });
      setValues(newValues);
      
      const lastFilledIndex = Math.min(pastedCode.length - 1, length - 1);
      inputRefs.current[lastFilledIndex]?.focus();
      
      if (newValues.every((v) => v !== '')) {
        onComplete(newValues.join(''));
      }
      return;
    }

    // Handle single character
    if (/^\d$/.test(value) || value === '') {
      const newValues = [...values];
      newValues[index] = value;
      setValues(newValues);

      if (value && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newValues.every((v) => v !== '')) {
        onComplete(newValues.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 md:gap-3 justify-center">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={length}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className="w-12 h-14 md:w-14 md:h-16 text-center text-xl md:text-2xl font-bold input-cm focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
      ))}
    </div>
  );
}
