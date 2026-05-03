/**
 * Serializes a value to JSON safe for embedding in an HTML <script> tag.
 *
 * JSON.stringify() does not escape <, >, /, & or Unicode line/paragraph
 * separators. When the output is injected into a <script type="application/ld+json">
 * tag via dangerouslySetInnerHTML, a crafted string like `</script><script>` in
 * user-controlled content (job title, description, …) would break out of the
 * script context and execute arbitrary code.
 *
 * This helper applies the same escaping used by Google's json-ld libraries.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\//g, '\\u002f')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
