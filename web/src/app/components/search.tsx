"use client";
import React, { useState, useEffect } from "react";
import { City } from "../types/global";
import ReactSelect, { DropdownIndicatorProps } from "react-select";
import { MagnifierRight } from "./icons";

export const SearchInput = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

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
    <div className="h-screen w-full flex justify-center items-center">
      <div>
        <label htmlFor="citySearch" className="block mb-2">
          Find a city:
        </label>
        <ReactSelect
          id="citySearch"
          autoFocus={true}
          placeholder="Type a city name"
          options={cities as City[]}
          onInputChange={(value) => setSearchTerm(value)}
          getOptionLabel={(city: City) => `${city.name} (${city.region_code})`}
          getOptionValue={(city: City) => city.name_normalized}
          isSearchable={true}
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              width: "400px",
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
    </div>
  );
};
