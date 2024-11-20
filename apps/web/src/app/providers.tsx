"use client";
import { ReactNode } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { useRouter } from "next/navigation";

export default function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  return <NextUIProvider navigate={router.push}>{children}</NextUIProvider>;
}
