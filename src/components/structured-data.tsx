import Script from "next/script";

type StructuredDataSchema = {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
};

/**
 * Centralized, safe component for JSON-LD structured data
 * This is the ONLY place where dangerouslySetInnerHTML is used for JSON-LD
 * All structured data must be server-side generated with JSON.stringify()
 */
export function StructuredData({
  schema,
  id,
}: {
  schema: StructuredDataSchema;
  id?: string;
}) {
  return (
    <Script
      id={id || `structured-data-${schema["@type"]}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
