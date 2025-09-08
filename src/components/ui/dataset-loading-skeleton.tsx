export function DatasetLoadingSkeleton() {
  return (
    <div className="flex max-w-7xl mx-auto" data-testid="dataset-loading-skeleton">
      {/* Info Panel */}
      <section
        className="w-96 flex flex-col"
        style={{ height: "calc(100vh - var(--nav-height))" }}
      >
        <div className="flex-1 flex flex-col pl-6 pr-3 py-4 space-y-6">
          {/* Dataset Title */}
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>

          {/* Basic Information */}
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="h-4 bg-gray-200 rounded w-12"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-18"></div>
              </div>
            </div>
          </div>

          {/* Data Metrics */}
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="flex justify-between items-center py-2">
                <div className="h-4 bg-gray-200 rounded w-28"></div>
                <div className="h-4 bg-gray-200 rounded w-14"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-full mb-3"></div>
            <div className="flex space-x-3">
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Panel */}
      <div className="w-[800px]">
        <div className="h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-36 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DatasetCreationLoader({
  stage = "preparing",
}: {
  stage?: string;
}) {
  const stages = {
    preparing: "Preparing dataset creation...",
    fetching_area: "Fetching area information...",
    querying_data: "Querying OpenStreetMap data...",
    processing: "Processing results...",
    saving: "Saving dataset...",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {"Creating Dataset"}
          </h3>
          <p className="text-gray-600 mb-4">
            {stages[stage as keyof typeof stages] || "Processing..."}
          </p>

          <p className="text-sm text-gray-500">
            {"This usually takes less than 30 seconds"}
          </p>

          <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{
                width:
                  stage === "preparing"
                    ? "20%"
                    : stage === "fetching_area"
                    ? "40%"
                    : stage === "querying_data"
                    ? "60%"
                    : stage === "processing"
                    ? "80%"
                    : stage === "saving"
                    ? "95%"
                    : "20%",
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DatasetCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-4/5"></div>
      </div>

      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  );
}
