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
import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import {
  searchAreasWithNominatim,
  convertNominatimResultToArea,
} from "@/lib/nominatim";
import { Area } from "@/types/area";

type EmptyResultItem = {
  id: string;
  name: string;
  displayName: string;
  osmType: string;
  boundingBox: [number, number, number, number];
  countryCode?: string;
};

function NavSearch() {
  const t = useTranslations("NavSearch");
  const router = useRouter();

  const [inputValue, setInputValue] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create items with empty state when needed
  const items = useMemo((): (Area | EmptyResultItem)[] => {
    // Don't show dropdown for queries less than 3 characters
    if (inputValue.length < 3) {
      return [];
    }

    if (areas.length === 0 && !isLoading) {
      // Return a special "no results" item
      return [
        {
          id: "no-results",
          name: "No areas found",
          displayName: "",
          osmType: "",
          boundingBox: [0, 0, 0, 0] as [number, number, number, number],
        },
      ];
    }
    return areas;
  }, [inputValue, areas, isLoading]);

  // Handle search input changes
  const handleInputChange = async (value: string) => {
    setInputValue(value);

    if (!value || value.length < 3) {
      setAreas([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const nominatimResults = await searchAreasWithNominatim(value);
      const fetchedAreas = nominatimResults.map(convertNominatimResultToArea);
      setAreas(fetchedAreas);
    } catch (error) {
      console.error("Error searching areas:", error);
      setAreas([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user selection from search results
  const handleSearchResultSelection = (selectedKey: React.Key | null) => {
    if (selectedKey && selectedKey !== "no-results") {
      const selectedArea = areas.find(
        (area) => area.id.toString() === selectedKey
      );
      if (selectedArea) {
        // Clear search and navigate to selected area
        setInputValue("");
        setAreas([]);
        router.push(`/area/${selectedArea.id}`);
      }
    }
  };

  // Handle keyboard interactions (Escape to clear)
  const handleSearchInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      // Reset search state on Escape key
      setInputValue("");
      setAreas([]);
    }
  };

  // Clear search input and reset state
  const clearSearchInput = () => {
    setInputValue("");
    setAreas([]);
  };

  return (
    <div className="flex-1 max-w-lg">
      <ComboBox
        items={items}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSelectionChange={handleSearchResultSelection}
        allowsEmptyCollection={true}
        menuTrigger="input"
        className="relative"
      >
        <div className="relative flex rounded border border-border focus-within:border-olive-500 focus-within:ring-2 focus-within:ring-olive-500/20">
          <Input
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            onKeyDown={handleSearchInputKeyDown}
            className="w-full px-3 py-1.5 text-sm border-0 rounded-l focus:outline-none bg-white transition-all duration-150"
          />
          <Button
            className="px-2 py-1.5 border-0 rounded-r bg-white hover:bg-olive-100 focus:outline-none transition-all duration-150"
            onPress={clearSearchInput}
            excludeFromTabOrder
          >
            {/* Show search icon when no input, clear button when there is input, loading spinner when searching */}
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
            ) : !inputValue ? (
              <Search size={16} className="text-gray-400" />
            ) : (
              <X size={16} className="text-gray-600 hover:text-gray-900" />
            )}
          </Button>
        </div>

        {inputValue.length >= 3 && (
          <Popover
            className="mt-1 bg-white border border-gray-200 rounded-[4px] shadow-xl z-50 max-h-80 overflow-y-auto"
            style={{ width: "var(--trigger-width)" }}
          >
            <ListBox className="outline-none py-2">
              {(item: Area | EmptyResultItem) => {
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

                return (
                  <ListBoxItem
                    key={item.id.toString()}
                    id={item.id.toString()}
                    className="px-4 py-2.5 cursor-pointer transition-all duration-150 ease-in-out data-[hovered]:bg-olive-100 data-[hovered]:shadow-sm data-[focused]:bg-olive-100 data-[focused]:outline-none data-[selected]:bg-olive-200 data-[selected]:shadow-md data-[selected]:font-semibold"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {item.displayName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.osmType.charAt(0).toUpperCase() +
                          item.osmType.slice(1)}{" "}
                        {"ID: "}{item.id}
                      </p>
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
