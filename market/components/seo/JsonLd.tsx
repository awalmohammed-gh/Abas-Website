/**
 * Helper component to safely render JSON-LD structured data into the document head/body.
 * Escapes '<' characters to prevent HTML/XSS injection when injecting dynamic user/product data.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
