/** Answers one app route and leaves every other request (the basemap) alone. */
export function serveRoute(
  route: string,
  answer: (url: string) => unknown,
  status = 200
) {
  return () => {
    const realFetch = window.fetch;
    window.fetch = async (...request: Parameters<typeof fetch>) => {
      const url = String(
        request[0] instanceof Request ? request[0].url : request[0]
      );
      if (!url.includes(route)) return realFetch(...request);
      return new Response(JSON.stringify(answer(url)), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    };
    return () => {
      window.fetch = realFetch;
    };
  };
}
