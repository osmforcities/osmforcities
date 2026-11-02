export default function Loading() {
  return (
    <ul
      aria-busy
      className="grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <li
          key={index}
          className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </ul>
  );
}
