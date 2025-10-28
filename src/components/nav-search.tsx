"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Button,
  ComboBox,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { Search, X } from "lucide-react";
import { useNominatimAreas } from "@/hooks/useNominatimSearch";
import { Area } from "@/types/area";
import { getAreaCharacteristics } from "@/lib/utils";

type SearchResultItem = Area | SpecialSearchItem;

type SpecialSearchItem = {
  id: "no-results" | "loading" | "need-more-chars" | "search-hint";
  name: string;
  displayName: "";
  osmType: "";
  class: "";
  type: "";
  addresstype: undefined;
  boundingBox: [0, 0, 0, 0];
  countryCode: undefined;
  country: undefined;
};

const MIN_SEARCH_CHARS = 3;

/**
 * Creates a special search item with the given id and name
 */
const createSpecialSearchItem = (
  id: SpecialSearchItem["id"],
  name: string
): SpecialSearchItem => ({
  id,
  name,
  displayName: "",
  osmType: "",
  class: "",
  type: "",
  addresstype: undefined,
  boundingBox: [0, 0, 0, 0],
  countryCode: undefined,
  country: undefined,
});

function NavSearch() {
  const t = useTranslations("NavSearch");
  const translateAddressType = useTranslations("AddressTypes");
  const locale = useLocale();
  const router = useRouter();

  const [inputValue, setInputValue] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce the search term with 500ms delay
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (inputValue.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        setDebouncedSearchTerm(inputValue);
      }, 500);
    } else {
      setDebouncedSearchTerm("");
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [inputValue]);

  const {
    data: areas = [],
    isLoading,
    error,
  } = useNominatimAreas({
    searchTerm: debouncedSearchTerm,
    language: locale,
    enabled: debouncedSearchTerm.length >= MIN_SEARCH_CHARS,
  });

  const searchResults = useMemo((): SearchResultItem[] => {
    // Show "need more chars" message when input is 1-2 characters
    if (inputValue.length > 0 && inputValue.length < MIN_SEARCH_CHARS) {
      const charsNeeded = MIN_SEARCH_CHARS - inputValue.length;
      return [
        createSpecialSearchItem(
          "need-more-chars",
          t("typeMoreChars", { count: charsNeeded } as Parameters<typeof t>[1])
        ),
      ];
    }

    // Don't show dropdown for empty input
    if (inputValue.length === 0) return [];

    // Show loading state when:
    // 1. Input is >= 3 chars but debounced search hasn't triggered yet (debounce period)
    // 2. API is actually loading
    if (
      (inputValue.length >= MIN_SEARCH_CHARS &&
        debouncedSearchTerm.length < MIN_SEARCH_CHARS) ||
      isLoading
    ) {
      return [
        createSpecialSearchItem("loading", t("searching") || "Searching..."),
      ];
    }

    // Show error state
    if (error) {
      return [createSpecialSearchItem("no-results", t("noAreasFound"))];
    }

    // Show no results when we have a valid search but no results
    if (areas.length === 0) {
      return [createSpecialSearchItem("no-results", t("noAreasFound"))];
    }

    return areas;
  }, [inputValue, debouncedSearchTerm, areas, isLoading, error, t]);

  const handleInputChange = (value: string) => setInputValue(value);

  const handleSelectionChange = (selectedKey: React.Key | null) => {
    if (
      selectedKey &&
      selectedKey !== "no-results" &&
      selectedKey !== "loading" &&
      selectedKey !== "need-more-chars" &&
      selectedKey !== "search-hint"
    ) {
      const selectedArea = areas.find(
        (area) => area.id.toString() === selectedKey
      );
      if (selectedArea) {
        setInputValue("");
        setDebouncedSearchTerm("");
        router.push(`/area/${selectedArea.id}`);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setInputValue("");
      setDebouncedSearchTerm("");
    }
  };

  const clearInput = () => {
    setInputValue("");
    setDebouncedSearchTerm("");
  };

  return (
    <div className="flex-1 max-w-lg">
      {/* Screen reader announcements for search state changes */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {inputValue.length > 0 &&
          inputValue.length < MIN_SEARCH_CHARS &&
          t("typeMoreChars", {
            count: MIN_SEARCH_CHARS - inputValue.length,
          } as Parameters<typeof t>[1])}
        {isLoading && "Searching for areas"}
        {error && "Search failed, please try again"}
        {areas.length > 0 &&
          `Found ${areas.length} area${areas.length === 1 ? "" : "s"}`}
        {areas.length === 0 &&
          inputValue.length >= MIN_SEARCH_CHARS &&
          !isLoading &&
          !error &&
          "No areas found"}
      </div>

      <ComboBox
        items={searchResults}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSelectionChange={handleSelectionChange}
        allowsEmptyCollection
        menuTrigger="input"
        className="relative"
      >
        <div className="relative flex rounded border border-border focus-within:border-olive-500 focus-within:ring-2 focus-within:ring-olive-500/20">
          <Input
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            onKeyDown={handleKeyDown}
            className={`w-full px-3 py-1.5 text-sm border-0 rounded-l focus:outline-none bg-white transition-all duration-150 ${
              inputValue.length > 0 && inputValue.length < MIN_SEARCH_CHARS
                ? "text-gray-500"
                : inputValue.length >= MIN_SEARCH_CHARS
                ? "text-gray-900"
                : ""
            }`}
          />
          <Button
            className="px-2 py-1.5 border-0 rounded-r bg-white hover:bg-olive-100 focus:outline-none transition-all duration-150"
            onPress={clearInput}
            excludeFromTabOrder
          >
            {!inputValue ? (
              <Search size={16} className="text-gray-400" />
            ) : (
              <X size={16} className="text-gray-600 hover:text-gray-900" />
            )}
          </Button>
          {/* Character counter */}
          {inputValue.length > 0 && (
            <div className="absolute -bottom-5 right-0 text-xs text-gray-400">
              {`${inputValue.length}/${MIN_SEARCH_CHARS}`}
            </div>
          )}
        </div>

        {inputValue.length > 0 && (
          <Popover
            className="mt-1 bg-white border border-gray-200 rounded-[4px] shadow-xl z-50 max-h-80 overflow-y-auto"
            style={{ width: "var(--trigger-width)" }}
          >
            <ListBox className="outline-none py-2">
              {(item: SearchResultItem) => {
                if (item.id === "no-results") {
                  return (
                    <ListBoxItem
                      key={item.id}
                      id={item.id}
                      className="px-4 py-2.5 text-sm text-gray-500"
                    >
                      {item.name}
                    </ListBoxItem>
                  );
                }

                if (item.id === "loading") {
                  return (
                    <ListBoxItem
                      key={item.id}
                      id={item.id}
                      className="px-4 py-2.5 text-sm text-gray-500 flex items-center"
                    >
                      <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2" />
                      {item.name}
                    </ListBoxItem>
                  );
                }

                // Type guard to check if item is an Area
                const isArea = typeof item.id === "number";

                return (
                  <ListBoxItem
                    key={item.id.toString()}
                    id={item.id.toString()}
                    className="px-4 py-3 cursor-pointer transition-all duration-150 ease-in-out data-[hovered]:bg-olive-100 data-[hovered]:shadow-sm data-[focused]:bg-olive-100 data-[focused]:outline-none data-[selected]:bg-olive-200 data-[selected]:shadow-md data-[selected]:font-semibold"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {item.name}
                        </p>
                        {isArea && (
                          <>
                            <p className="text-xs text-gray-600 mt-1">
                              {item.state && item.country
                                ? `${item.state}, ${item.country}`
                                : item.state || item.country || ""}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {"ID: "}
                              {item.id}
                            </p>
                          </>
                        )}
                      </div>
                      {isArea && (
                        <div className="flex-shrink-0 ml-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-olive-100 text-olive-800">
                            {
                              getAreaCharacteristics(
                                item,
                                translateAddressType
                              )[0]
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </ListBoxItem>
                );
              }}
            </ListBox>
          </Popover>
        )}
      </ComboBox>
    </div>
  );
}

export default NavSearch;
