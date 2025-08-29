declare module "*.mdx" {
  import type { ComponentType } from "react";

  interface MDXMetadata {
    title?: string;
    metaTitle?: string;
    metaDescription?: string;
    [key: string]: string;
  }

  interface MDXComponent extends ComponentType<Record<string, unknown>> {
    metadata?: MDXMetadata;
  }

  const component: MDXComponent;
  export default component;
}
