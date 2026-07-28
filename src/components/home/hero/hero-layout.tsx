import type { ReactNode } from "react";

export function HeroLayout({ children }: { children: ReactNode }) {
  return (
    <section
      className="border-b border-neutral-200 dark:border-neutral-800 relative"
      style={{ height: 'calc(100vh - var(--nav-height))' }}
    >
      <div className="grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[minmax(380px,42%)_1fr] h-full md:[&>*]:h-full [&>*]:flex [&>*]:flex-col">
        {children}
      </div>
    </section>
  );
}
