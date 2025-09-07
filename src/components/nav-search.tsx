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
import { ChevronDown } from "lucide-react";

function NavSearch() {
  const t = useTranslations("NavSearch");
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [selectedKey, setSelectedKey] = useState<React.Key | null>(null);

  // Fixed options for testing
  const FIXED_OPTIONS = [
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

  // Filter options based on input
  const filteredOptions = FIXED_OPTIONS.filter(
    (option) =>
      option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.displayName.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelectionChange = (key: React.Key | null) => {
    setSelectedKey(key);
    if (key) {
      const option = FIXED_OPTIONS.find((opt) => opt.id === key);
      if (option) {
        setInputValue("");
        router.push(`/area/${option.osmId}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setInputValue("");
      setSelectedKey(null);
    }
  };

  return (
    <div className="flex-1 max-w-md">
      <ComboBox
        items={filteredOptions}
        inputValue={inputValue}
        onInputChange={setInputValue}
        selectedKey={selectedKey}
        onSelectionChange={handleSelectionChange}
        className="relative"
      >
        <div className="relative flex">
          <Input
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-1.5 text-sm border border-olive-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <Button className="px-2 py-1.5 border border-l-0 border-olive-200 rounded-r-md bg-white hover:bg-olive-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <ChevronDown size={16} className="text-olive-600" />
          </Button>
        </div>
        <Popover className="w-[--trigger-width] mt-1 bg-white border border-olive-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          <ListBox className="outline-none py-1">
            {(option: { id: string; name: string; displayName: string; osmId: number }) => (
              <ListBoxItem
                key={option.id}
                id={option.id}
                className="px-3 py-2 cursor-pointer transition-all duration-150 ease-in-out data-[hovered]:bg-olive-50 data-[hovered]:shadow-sm data-[focused]:bg-blue-50 data-[focused]:outline-none data-[focused]:ring-2 data-[focused]:ring-blue-200 data-[focused]:ring-inset data-[selected]:bg-blue-100 data-[selected]:shadow-md data-[selected]:font-semibold"
              >
                <div>
                  <p className="font-medium text-sm text-olive-700">
                    {option.name}
                  </p>
                  <p className="text-xs text-olive-600 truncate">
                    {option.displayName}
                  </p>
                </div>
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </ComboBox>
    </div>
  );
}

export default NavSearch;
