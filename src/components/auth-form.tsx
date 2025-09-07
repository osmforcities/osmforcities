"use client";

import { useState } from "react";

interface FormField {
  name: string;
  type: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}

interface AuthFormProps {
  fields: FormField[];
  submitText: string;
  loadingText: string;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  linkText: string;
  linkHref: string;
  locale: string;
}

export default function AuthForm({
  fields,
  submitText,
  loadingText,
  onSubmit,
  linkText,
  linkHref,
  locale,
}: AuthFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid = fields.every((field) => {
    if (!field.required) return true;
    return formData[field.name]?.trim();
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {fields.map((field) => (
        <input
          key={field.name}
          type={field.type}
          name={field.name}
          autoComplete={field.autoComplete}
          value={formData[field.name] || ""}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          minLength={field.minLength}
          className="w-full py-3 px-4 border-2 border-black/20 dark:border-white/20 rounded-lg bg-transparent text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:border-black dark:focus:border-white outline-none"
        />
      ))}

      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {isLoading ? loadingText : submitText}
      </button>

      <div className="text-center">
        <a
          href={`/${locale}${linkHref}`}
          className="text-sm text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
        >
          {linkText}
        </a>
      </div>
    </form>
  );
}
