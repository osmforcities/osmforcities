"use client";
import React, { useState, useEffect } from "react";
import { Autocomplete, AutocompleteItem, Spinner } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { MagnifierRight } from "../../components/icons";
import { SearchResult } from "../api/search/route";

export const SearchInput = () => {
  const [results, setCities] = useState<SearchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (searchTerm) {
      setIsLoading(true);
      const fetchCities = async () => {
        try {
          const response = await fetch(`/api/search?q=${searchTerm}`);
          const { results } = await response.json();
          setCities(results);
        } catch (error) {
          alert("An error occurred while performing the search.");
        } finally {
          setIsLoading(false);
        }
      };
      const id = setTimeout(fetchCities, 500);
      setTimeoutId(id);
    } else {
      setCities([]);
      setIsLoading(false);
    }
  }, [searchTerm]);

  return (
    <div className="w-[300px]">
      <Autocomplete
        id="citySearch"
        placeholder="Search"
        items={results}
        inputValue={searchTerm}
        onInputChange={(value) => setSearchTerm(value)}
        onSelectionChange={(key) => {
          const selected = results.find(
            (result) => result.name_normalized === key
          );
          if (selected) {
            router.push(selected.url);
          }
        }}
        classNames={{
          base: "max-w-full",
          listbox: "max-h-[300px]",
          selectorButton: "hidden",
        }}
        listboxProps={{
          emptyContent: isLoading ? (
            <div className="p-2 text-center">Searching...</div>
          ) : searchTerm ? (
            <div className="p-2 text-center text-default-500">
              No cities found for &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div className="p-2 text-center text-default-500">
              Enter a city name...
            </div>
          ),
        }}
        startContent={<MagnifierRight />}
        endContent={isLoading ? <Spinner size="sm" /> : null}
      >
        {(item) => (
          <AutocompleteItem
            key={item.name_normalized}
            value={item.name_normalized}
          >
            {item.label}
          </AutocompleteItem>
        )}
      </Autocomplete>
    </div>
  );
};
