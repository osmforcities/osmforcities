interface TextWithLinkProps {
  text: string;
  linkText: string;
  linkHref: string;
  className?: string;
}

export function TextWithLink({
  text,
  linkText,
  linkHref,
  className = ""
}: TextWithLinkProps) {
  const parts = text.split(linkText);

  return (
    <>
      {parts[0]}
      <a
        href={linkHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-blue-600 dark:text-blue-400 hover:underline ${className}`}
      >
        {linkText}
      </a>
      {parts[1]}
    </>
  );
}