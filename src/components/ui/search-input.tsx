import { Search } from "lucide-react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * Reusable search input with icon
 * @param value - Current search value
 * @param onChange - Callback when value changes
 * @param placeholder - Placeholder text (default: "Search...")
 * @param className - Additional CSS classes
 * @example
 * <SearchInput
 *   value={searchTerm}
 *   onChange={setSearchTerm}
 *   placeholder="Search datasets..."
 * />
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
      />
    </div>
  );
}
