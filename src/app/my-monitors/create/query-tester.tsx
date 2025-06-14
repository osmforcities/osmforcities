"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type Area = {
  name: string;
  displayName: string;
  osmId: string;
  osmType: string;
  boundingBox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  countryCode?: string;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  overpassQuery: string;
  tags: string[];
};

type QueryTesterProps = {
  selectedArea: Area | null;
  selectedTemplate: Template | undefined;
};

type OverpassResult = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{
    lat: number;
    lon: number;
  }>;
};

export default function QueryTester({
  selectedArea,
  selectedTemplate,
}: QueryTesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<OverpassResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queryString, setQueryString] = useState<string>("");

  useEffect(() => {
    if (selectedArea && selectedTemplate) {
      // Replace {OSM_RELATION_ID} placeholder with the area's OSM ID
      const modifiedQuery = selectedTemplate.overpassQuery.replace(
        /\{OSM_RELATION_ID\}/g,
        selectedArea.osmId
      );
      setQueryString(modifiedQuery);
    }
  }, [selectedArea, selectedTemplate]);

  const testQuery = async () => {
    if (!selectedArea || !selectedTemplate) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(queryString)}`,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.elements) {
        setResults(data.elements);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Error testing query:", err);
      setError(err instanceof Error ? err.message : "Failed to test query");
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedArea || !selectedTemplate) {
    return (
      <div className="border border-gray-200 p-4 rounded-md bg-gray-50">
        <p className="text-gray-500">
          Please select an area and template first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Query Preview */}
      <div className="border border-gray-200 p-4 rounded-md">
        <h3 className="font-medium mb-2">Query Preview</h3>
        <div className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap">{queryString}</pre>
        </div>
      </div>

      {/* Test Button */}
      <div className="flex justify-center">
        <Button
          onClick={testQuery}
          disabled={isLoading}
          className="bg-blue-600 text-white py-2 px-6 border-2 border-blue-600 hover:bg-white hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Testing Query..." : "Test Query"}
        </Button>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="border border-gray-200 p-4 rounded-md">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>Querying Overpass API...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-200 p-4 rounded-md bg-red-50">
          <h3 className="font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!isLoading && !error && results.length > 0 && (
        <div className="border border-gray-200 p-4 rounded-md">
          <h3 className="font-medium mb-2">
            Results ({results.length} features found)
          </h3>
          <div className="bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {!isLoading && !error && results.length === 0 && (
        <div className="border border-gray-200 p-4 rounded-md bg-yellow-50">
          <h3 className="font-medium text-yellow-800 mb-2">No Results</h3>
          <p className="text-yellow-700 text-sm">
            The query returned no results. This could mean:
          </p>
          <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
            <li>No features match the criteria in this area</li>
            <li>The area might not have the specified amenities</li>
            <li>The query might need adjustment</li>
          </ul>
        </div>
      )}
    </div>
  );
}
