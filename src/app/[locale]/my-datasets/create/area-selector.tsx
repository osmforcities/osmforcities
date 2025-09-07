"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Area } from "@/types/area";
import { useTranslations } from "next-intl";

type NominatimResult = {
  place_id: number;
  osm_type: string;
  osm_id: number;
  display_name: string;
  name: string;
  class: string;
  type: string;
  addresstype?: string;
  boundingbox: string[];
  lat: string;
  lon: string;
  address: {
    country_code?: string;
    country?: string;
    [key: string]: string | undefined;
  };
};

type AreaSelectorProps = {
  onAreaSelected: (area: Area | null) => void;
  selectedArea: Area | null;
};

export default function AreaSelector({
  onAreaSelected,
  selectedArea,
}: AreaSelectorProps) {
  const t = useTranslations("AreaSelector");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedArea && inputRef.current) {
      inputRef.current.focus();

      const observer = new MutationObserver(() => {
        if (document.activeElement !== inputRef.current && inputRef.current) {
          inputRef.current.focus();
        }
      });

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

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
    }
  }, [searchTerm]);

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

      if (!response.ok) throw new Error("Failed to search for areas");

      const data: NominatimResult[] = await response.json();

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
      id: result.osm_id,
      name: result.name || result.display_name.split(",")[0].trim(),
      displayName: result.display_name,
      osmType: result.osm_type,
      class: result.class,
      type: result.type,
      addresstype: result.addresstype,
      boundingBox: [
        parseFloat(result.boundingbox[0]),
        parseFloat(result.boundingbox[2]),
        parseFloat(result.boundingbox[1]),
        parseFloat(result.boundingbox[3]),
      ] as [number, number, number, number],
      countryCode: result.address?.country_code,
      country: result.address?.country,
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchPlaceholder")}
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
            <p className="text-gray-500 text-sm">{t("searchPlaceholder")}</p>
          )}

          <p className="text-gray-500 text-xs mt-1">{t("searchDescription")}</p>

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
                      {t("id")} {result.osm_id}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {searchTerm.length >= 3 &&
            searchResults.length === 0 &&
            !isSearching && (
              <p className="text-gray-500 text-sm">{t("noAreasFound")}</p>
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
                {t("id")} {selectedArea.id}
              </p>
              <p className="text-xs text-gray-500">
                {t("boundingBox")}
                {selectedArea.boundingBox.join(", ")}
                {t("boundingBoxEnd")}
              </p>
              <a
                href={`https://www.openstreetmap.org/${selectedArea.osmType}/${selectedArea.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                {t("viewOnOsm")}
              </a>
            </div>
            <Button
              onClick={handleClearSelection}
              variant="outline"
              className="text-sm border-gray-300"
            >
              {t("change")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
