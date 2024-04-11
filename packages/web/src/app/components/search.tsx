"use client";
import React, { useState, useEffect } from "react";
import ReactSelect from "react-select";
import { useRouter } from "next/navigation";
import { MagnifierRight } from "../../components/icons";
import { SearchResult } from "../api/search/route";

export const SearchInput = () => {
  const [results, setCities] = useState<SearchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (searchTerm) {
      const fetchCities = async () => {
        try {
          const response = await fetch(`/api/search?q=${searchTerm}`);
          const { results } = await response.json();
          setCities(results);
        } catch (error) {
          alert("An error occurred while performing the search.");
        }
      };

      const id = setTimeout(fetchCities, 500);
      setTimeoutId(id);
    }
  }, [searchTerm]);

  return (
    <div>
      <ReactSelect
        id="citySearch"
        placeholder="e.g. Rio de Janeiro, Aracaju, Curitiba..."
        options={results as SearchResult[]}
        onInputChange={(value) => setSearchTerm(value)}
        onChange={(result) => {
          if (result) {
            router.push(result.url);
          }
        }}
        getOptionLabel={(result: SearchResult) => result.label}
        getOptionValue={(result: SearchResult) => result.name_normalized}
        isSearchable={true}
        styles={{
          control: (baseStyles) => ({
            ...baseStyles,
            width: "400px",
            minWidth: "400px",
          }),
        }}
        components={{
          NoOptionsMessage: () => null,
          DropdownIndicator: () => (
            <div className="px-2">
              <MagnifierRight />
            </div>
          ),
        }}
      />
    </div>
  );
};
