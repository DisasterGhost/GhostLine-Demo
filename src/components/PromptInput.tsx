import React, { FormEvent } from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  disabled: boolean;
  isGenerating: boolean;
}

export function PromptInput({ value, onChange, onSubmit, disabled, isGenerating }: PromptInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
    }
  };

  return (
    <form className="prompt-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter a prompt..."
        disabled={disabled}
      />

      <button type="submit" disabled={disabled || !value.trim()}>
        {isGenerating ? 'Generating...' : 'Generate'}
      </button>
    </form>
  );
}
