"use client";
import React, { useState, useEffect } from "react";
import { City } from "../types/global";

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
          Search a city:
        </label>
        <input
          id="citySearch"
          type="text"
          placeholder="Type a city name"
          className="border p-2 rounded"
          list="cities"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <datalist id="cities">
          {cities.map((city, index) => (
            <option key={index} value={`${city.name} (${city.state})`} />
          ))}
        </datalist>
      </div>
    </div>
  );
};
