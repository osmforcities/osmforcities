"use client";

import { ChevronDown } from "lucide-react";
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
} from "react-aria-components";

type SelectOption<T extends string> = { id: T; label: string };

type SelectProps<T extends string> = {
  label: string;
  /** Keeps the label for screen readers only, when a nearby heading already names the field. */
  hideLabel?: boolean;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  isDisabled?: boolean;
};

/**
 * Single-choice dropdown with a label, keyboard and screen reader support
 * @example
 * <Select
 *   label="Frequency"
 *   options={[{ id: "DAILY", label: "Daily" }, { id: "WEEKLY", label: "Weekly" }]}
 *   value={frequency}
 *   onChange={setFrequency}
 * />
 */
export function Select<T extends string>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  isDisabled,
}: SelectProps<T>) {
  return (
    <AriaSelect
      selectedKey={value}
      onSelectionChange={(key) => onChange(key as T)}
      isDisabled={isDisabled}
      className="flex flex-col gap-2"
    >
      <Label className={hideLabel ? "sr-only" : "text-sm font-medium"}>
        {label}
      </Label>
      <Button className="inline-flex w-fit min-w-40 items-center justify-between gap-2 rounded border border-border bg-white px-3 py-2 text-start outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-olive-500 data-[disabled]:opacity-50">
        <SelectValue />
        <ChevronDown size={16} aria-hidden className="text-gray-500" />
      </Button>
      <Popover className="min-w-(--trigger-width) rounded border border-gray-200 bg-white shadow-xl">
        <ListBox className="py-1 outline-none">
          {options.map((option) => (
            <ListBoxItem
              key={option.id}
              id={option.id}
              className="cursor-pointer px-3 py-2 outline-none data-[focused]:bg-olive-100 data-[selected]:font-semibold"
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
