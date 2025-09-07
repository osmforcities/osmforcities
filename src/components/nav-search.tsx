"use client";

import { useState, useMemo } from "react";
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
import { Search, X } from "lucide-react";
import { useNominatimAreas } from "@/hooks/useNominatimSearch";
import { Area } from "@/types/area";

type SearchResultItem = Area | EmptyResultItem;

type EmptyResultItem = {
  id: "no-results";
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

function formatAddressTypeDisplay(
  item: SearchResultItem,
  translateAddressType: (key: string) => string
): string {
  if (item.id === "no-results") return "";

  const addressType = item.addresstype || item.type;
  if (!addressType) return "";

  const translatedType = translateAddressType(addressType) || addressType;

  if (item.country) {
    return `${translatedType} in ${item.country}`;
  }

  if (item.countryCode) {
    return `${translatedType} in ${item.countryCode.toUpperCase()}`;
  }

  return translatedType;
}

function NavSearch() {
  const t = useTranslations("NavSearch");
  const translateAddressType = useTranslations("AddressTypes");
  const router = useRouter();

  const [inputValue, setInputValue] = useState("");

  const {
    data: areas = [],
    isLoading,
    error,
  } = useNominatimAreas({
    searchTerm: inputValue,
    enabled: inputValue.length >= 3,
  });

  const searchResults = useMemo((): SearchResultItem[] => {
    if (inputValue.length < 3) return [];

    const noResultsItem: EmptyResultItem = {
      id: "no-results",
      name: t("noAreasFound"),
      displayName: "",
      osmType: "",
      class: "",
      type: "",
      addresstype: undefined,
      boundingBox: [0, 0, 0, 0],
      countryCode: undefined,
      country: undefined,
    };

    if (error) return [noResultsItem];
    if (areas.length === 0 && !isLoading) return [noResultsItem];

    return areas;
  }, [inputValue, areas, isLoading, error, t]);

  const handleInputChange = (value: string) => setInputValue(value);

  const handleSelectionChange = (selectedKey: React.Key | null) => {
    if (selectedKey && selectedKey !== "no-results") {
      const selectedArea = areas.find(
        (area) => area.id.toString() === selectedKey
      );
      if (selectedArea) {
        setInputValue("");
        router.push(`/area/${selectedArea.id}`);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") setInputValue("");
  };

  const clearInput = () => setInputValue("");

  return (
    <div className="flex-1 max-w-lg">
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
            className="w-full px-3 py-1.5 text-sm border-0 rounded-l focus:outline-none bg-white transition-all duration-150"
          />
          <Button
            className="px-2 py-1.5 border-0 rounded-r bg-white hover:bg-olive-100 focus:outline-none transition-all duration-150"
            onPress={clearInput}
            excludeFromTabOrder
          >
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
                        {formatAddressTypeDisplay(item, translateAddressType)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.osmType.charAt(0).toUpperCase() +
                          item.osmType.slice(1)}{" "}
                        {"ID: "} {item.id}
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
