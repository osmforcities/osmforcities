// Dev-only UI, intentionally not translated
const LOADING_TEXT = "Loading gallery…";

export default function Loading() {
  if (process.env.NODE_ENV !== "development") return null;
  return <main className="p-6 text-sm text-gray-600">{LOADING_TEXT}</main>;
}
