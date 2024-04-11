import { format } from "date-fns";

export const Footer = () => {
  const renderTimestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

  return (
    <footer className="italic text-sm font-thin pt-5">
      <div>Page generated at {renderTimestamp} UTC</div>
    </footer>
  );
};
