"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Button,
  ComboBox,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { useState } from "react";
import { Search, X } from "lucide-react";

function NavSearch() {
  const t = useTranslations("NavSearch");
  const router = useRouter();
  
  // Search state management
  const [inputValue, setInputValue] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Mock data for search functionality - will be replaced with real API
  const MOCK_SEARCH_OPTIONS = [
    {
      id: "1",
      name: "São Paulo",
      displayName: "São Paulo, State of São Paulo, Brazil",
      osmId: 54321,
    },
    {
      id: "2",
      name: "São José dos Campos",
      displayName: "São José dos Campos, State of São Paulo, Brazil",
      osmId: 98765,
    },
    {
      id: "3",
      name: "Rio de Janeiro",
      displayName: "Rio de Janeiro, State of Rio de Janeiro, Brazil",
      osmId: 12345,
    },
    {
      id: "4",
      name: "Belo Horizonte",
      displayName: "Belo Horizonte, State of Minas Gerais, Brazil",
      osmId: 67890,
    },
  ];

  // Filter search results based on user input
  const filteredSearchResults = MOCK_SEARCH_OPTIONS.filter(
    (option) =>
      option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.displayName.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Handle user selection from search results
  const handleSearchResultSelection = (selectedKey: React.Key | null) => {
    setSelectedKey(selectedKey as string | null);
    if (selectedKey) {
      const selectedOption = MOCK_SEARCH_OPTIONS.find((option) => option.id === selectedKey);
      if (selectedOption) {
        // Clear search and navigate to selected area
        setInputValue("");
        setIsDropdownOpen(false);
        router.push(`/area/${selectedOption.osmId}`);
      }
    }
  };

  // Handle keyboard interactions (Escape to clear)
  const handleSearchInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      // Reset search state on Escape key
      setInputValue("");
      setSelectedKey(null);
      setIsDropdownOpen(false);
    }
  };

  // Handle search input changes and show/hide dropdown
  const handleSearchInputChange = (newInputValue: string) => {
    setInputValue(newInputValue);
    // Show dropdown when user types, hide when input is empty
    setIsDropdownOpen(newInputValue.length > 0);
  };

  // Clear search input and reset state
  const clearSearchInput = () => {
    setInputValue("");
    setSelectedKey(null);
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex-1 max-w-lg">
      <ComboBox
        items={filteredSearchResults}
        inputValue={inputValue}
        onInputChange={handleSearchInputChange}
        selectedKey={selectedKey}
        onSelectionChange={handleSearchResultSelection}
        className="relative"
      >
        <div className="relative flex rounded border border-border focus-within:border-olive-500 focus-within:ring-2 focus-within:ring-olive-500/20">
          <Input
            placeholder={isInputFocused ? t("searchPlaceholder") : ""}
            aria-label={t("searchPlaceholder")}
            onKeyDown={handleSearchInputKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className="w-full px-3 py-1.5 text-sm border-0 rounded-l focus:outline-none bg-white transition-all duration-150"
          />
          <Button
            className="px-2 py-1.5 border-0 rounded-r bg-white hover:bg-olive-100 focus:outline-none transition-all duration-150"
            onPress={clearSearchInput}
            excludeFromTabOrder
          >
            {/* Show search icon when no input, clear button when there is input */}
            {!inputValue ? (
              <Search size={16} className="text-gray-400" />
            ) : (
              <X size={16} className="text-gray-600 hover:text-gray-900" />
            )}
          </Button>
        </div>

        {isDropdownOpen && (
          <Popover
            className="mt-1 bg-white border border-gray-200 rounded shadow-xl z-50 max-h-80 overflow-y-auto"
            style={{ width: "var(--trigger-width)" }}
          >
            <ListBox className="outline-none py-2">
              {(option: {
                id: string;
                name: string;
                displayName: string;
                osmId: number;
              }) => (
                <ListBoxItem
                  key={option.id}
                  id={option.id}
                  className="px-4 py-2.5 cursor-pointer transition-all duration-150 ease-in-out data-[hovered]:bg-olive-100 data-[hovered]:shadow-sm data-[focused]:bg-olive-100 data-[focused]:outline-none data-[selected]:bg-olive-200 data-[selected]:shadow-md data-[selected]:font-semibold"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {option.name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {option.displayName}
                    </p>
                  </div>
                </ListBoxItem>
              )}
            </ListBox>
          </Popover>
        )}
      </ComboBox>
    </div>
  );
}

export default NavSearch;
