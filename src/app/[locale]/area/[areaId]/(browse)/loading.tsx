import { datasetGridClassName } from "@/components/area/dataset-cards";

export default function Loading() {
  return (
    <ul aria-busy className={datasetGridClassName}>
      {Array.from({ length: 6 }, (_, index) => (
        <li
          key={index}
          className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white"
        />
      ))}
    </ul>
  );
}
