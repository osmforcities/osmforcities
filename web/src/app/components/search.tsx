"use client";
import React, { useEffect, useState } from "react";

interface City {
  name: string;
  state: string;
  normalized: string;
  slug: string;
}

export const SearchInput = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadCities = async () => {
      const response = await fetch("/cities.csv");
      const csvData = await response.text();
      const rows = csvData.split("\n").slice(1); // Skip header row
      const parsedCities = rows.map((row) => {
        const columns = row.split(",");
        return {
          name: columns[3],
          state: columns[2],
          normalized: columns[14],
          slug: columns[15],
        };
      });
      setCities(parsedCities);
    };

    loadCities();
  }, []);

  // Utility function to remove accents from user input
  const normalizeInput = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const filteredCities = cities
    .filter((city) =>
      city.normalized
        .toLowerCase()
        .includes(normalizeInput(searchTerm).toLowerCase())
    )
    .slice(0, 10);

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <div>
        <label htmlFor="citySearch" className="block mb-2">
          Search:
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
          {filteredCities.map((city, index) => (
            <option key={index} value={`${city.name} (${city.state})`} />
          ))}
        </datalist>
      </div>
    </div>
  );
};
