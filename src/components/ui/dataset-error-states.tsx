import { Link } from "@/components/ui/link";

export function TemplateNotFoundError({
  templateId,
  areaName,
}: {
  templateId: string;
  areaName?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-3">
          {"Dataset Template Not Found"}
        </h1>

        <p className="text-gray-600 mb-6">
          {`The dataset template "${templateId}" doesn't exist or is no longer available.`}
          {areaName && ` We couldn't find this dataset type for ${areaName}.`}
        </p>

        <div className="space-y-3">
          {areaName && (
            <Link
              href={`/area/${encodeURIComponent(
                areaName.toLowerCase().replace(/\s+/g, "-")
              )}`}
              className="block w-full"
            >
              {`View Available Datasets for ${areaName}`}
            </Link>
          )}

          <Link href="/templates" className="block w-full" variant="underline">
            {"Browse All Templates"}
          </Link>

          <Link href="/" className="block w-full">
            {"Back to Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AreaNotFoundError({ areaId }: { areaId: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-3">
          {"Area Not Found"}
        </h1>

        <p className="text-gray-600 mb-6">
          {`The area with ID "${areaId}" doesn't exist in OpenStreetMap or couldn't be found. Please check the area ID and try again.`}
        </p>

        <div className="space-y-3">
          <Link href="/" className="block w-full">
            {"Search for Areas"}
          </Link>

          <Link
            href={`https://www.openstreetmap.org/relation/${areaId}`}
            external
            className="block w-full"
            variant="underline"
          >
            {"Check on OpenStreetMap"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DatasetCreationError({
  error,
  areaName,
  templateName,
  onRetry,
}: {
  error: string;
  areaName?: string;
  templateName?: string;
  onRetry?: () => void;
}) {
  const isTimeout = error.toLowerCase().includes("timeout");
  const isTooLarge =
    error.toLowerCase().includes("too large") ||
    error.toLowerCase().includes("memory");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 max-w-lg w-full mx-4 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-3">
          {isTimeout
            ? "Request Timed Out"
            : isTooLarge
            ? "Dataset Too Large"
            : "Dataset Creation Failed"}
        </h1>

        <p className="text-gray-600 mb-6">
          {isTimeout && (
            <>
              {
                "The request to create this dataset took too long. This usually happens with very large areas or during peak usage times."
              }
            </>
          )}
          {isTooLarge && (
            <>
              {
                "This area contains too much data for the selected template. Try choosing a smaller area or a more specific template."
              }
            </>
          )}
          {!isTimeout && !isTooLarge && (
            <>
              {"We encountered an error while creating the dataset"}
              {templateName && areaName && ` "${templateName}" for ${areaName}`}
              {"."}
            </>
          )}
        </p>

        {error && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600 font-mono">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isTimeout ? "Try Again" : "Retry Creation"}
            </button>
          )}

          {areaName && (
            <Link
              href={`/area/${encodeURIComponent(
                areaName.toLowerCase().replace(/\s+/g, "-")
              )}`}
              className="block w-full"
              variant="underline"
            >
              {"Choose Different Template"}
            </Link>
          )}

          <Link href="/" className="block w-full">
            {"Back to Home"}
          </Link>
        </div>

        {isTooLarge && (
          <div className="mt-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">{"Suggestions:"}</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                {"• Try a smaller city or district instead of a large region"}
              </li>
              <li>
                {
                  '• Use a more specific template (e.g., "Primary Schools" instead of "All Schools")'
                }
              </li>
              <li>{"• Contact us if you need data for large areas"}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function DatasetErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-3">
          {"Something went wrong"}
        </h1>

        <p className="text-gray-600 mb-6">
          {
            "We encountered an unexpected error while loading the dataset. Please try again or contact support if the problem persists."
          }
        </p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {"Try Again"}
          </button>

          <Link href="/" className="block w-full" variant="underline">
            {"Back to Home"}
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">
              {"Error Details"}
            </summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
