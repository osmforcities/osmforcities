"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type NominatimResult = {
  place_id: number;
  osm_type: string;
  osm_id: number;
  display_name: string;
  name: string;
  boundingbox: string[];
  lat: string;
  lon: string;
  address: {
    country_code?: string;
    [key: string]: string | undefined;
  };
};

type Area = {
  name: string;
  displayName: string;
  osmId: string;
  osmType: string;
  boundingBox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  countryCode?: string;
};

type AreaSelectorProps = {
  onAreaSelected: (area: Area | null) => void;
  selectedArea: Area | null;
};

export default function AreaSelector({
  onAreaSelected,
  selectedArea,
}: AreaSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use a MutationObserver to keep focus on the input
  useEffect(() => {
    if (!selectedArea && inputRef.current) {
      // Focus initially
      inputRef.current.focus();

      // Create a MutationObserver to watch for DOM changes
      const observer = new MutationObserver(() => {
        if (document.activeElement !== inputRef.current && inputRef.current) {
          inputRef.current.focus();
        }
      });

      // Start observing the parent element for changes
      const parentElement = inputRef.current.parentElement?.parentElement;
      if (parentElement) {
        observer.observe(parentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }

      return () => {
        observer.disconnect();
      };
    }
  }, [selectedArea]);

  // Clear search results when search term is cleared
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
    }
  }, [searchTerm]);

  // Handle search with debounce
  useEffect(() => {
    if (searchTerm.length < 3) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAreas(searchTerm);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const searchAreas = async (term: string) => {
    if (term.length < 3) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          term
        )}&format=json&addressdetails=1&limit=10&polygon_geojson=1&osm_type=relation`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "OSMForCities/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search for areas");
      }

      const data: NominatimResult[] = await response.json();

      // Only include relations (administrative boundaries, cities, etc.)
      const filteredData = data.filter(
        (result) => result.osm_type === "relation"
      );

      setSearchResults(filteredData);
    } catch (err) {
      console.error("Error searching for areas:", err);
      setError("Failed to search for areas. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectArea = (result: NominatimResult) => {
    const area: Area = {
      name: result.name || result.display_name.split(",")[0].trim(),
      displayName: result.display_name,
      osmId: result.osm_id.toString(),
      osmType: result.osm_type,
      boundingBox: [
        parseFloat(result.boundingbox[0]), // minLat
        parseFloat(result.boundingbox[2]), // minLon
        parseFloat(result.boundingbox[1]), // maxLat
        parseFloat(result.boundingbox[3]), // maxLon
      ],
      countryCode: result.address.country_code,
    };

    onAreaSelected(area);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    onAreaSelected(null);
  };

  return (
    <div className="space-y-4">
      {!selectedArea ? (
        <>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              placeholder="Type an area name (city, town, neighborhood, etc.)"
              className="w-full p-2 border border-black focus:outline-none focus:ring-2 focus:ring-black"
              disabled={isSearching}
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <p className="text-gray-500 text-sm">
              Please enter at least 3 characters to search
            </p>
          )}

          <p className="text-gray-500 text-xs mt-1">
            Only administrative areas (cities, towns, neighborhoods) will be
            shown in results
          </p>

          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {searchResults.map((result) => (
                  <li
                    key={result.place_id}
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectArea(result)}
                  >
                    <p className="font-medium">
                      {result.name || result.display_name.split(",")[0].trim()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {result.display_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {result.osm_type.charAt(0).toUpperCase() +
                        result.osm_type.slice(1)}{" "}
                      ID: {result.osm_id}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {searchTerm.length >= 3 &&
            searchResults.length === 0 &&
            !isSearching && (
              <p className="text-gray-500 text-sm">
                No areas found. Try a different search term.
              </p>
            )}
        </>
      ) : (
        <div className="border border-gray-200 p-4 rounded-md">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{selectedArea.name}</h3>
              <p className="text-sm text-gray-600">
                {selectedArea.displayName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedArea.osmType.charAt(0).toUpperCase() +
                  selectedArea.osmType.slice(1)}{" "}
                ID: {selectedArea.osmId}
              </p>
              <p className="text-xs text-gray-500">
                Bounding Box: [{selectedArea.boundingBox.join(", ")}]
              </p>
              <a
                href={`https://www.openstreetmap.org/${selectedArea.osmType}/${selectedArea.osmId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                View on OpenStreetMap →
              </a>
            </div>
            <Button
              onClick={handleClearSelection}
              variant="outline"
              className="text-sm border-gray-300"
            >
              Change
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
