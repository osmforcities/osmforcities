"use client";
import React, { useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";
import { Button } from "@nextui-org/react";
import Link from "next/link";

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds

const AboutToast = () => {
  useEffect(() => {
    const lastDismissedAt = localStorage.getItem("aboutToastLastDismissed");

    const shouldShowToast =
      !lastDismissedAt ||
      Date.now() - parseInt(lastDismissedAt, 10) > ONE_WEEK_IN_MS;

    if (shouldShowToast) {
      toast(
        (t) => (
          <div className="flex flex-col space-y-4 text-justify">
            <div>
              This platform is in early development and currently supports only
              Brazil. We are working to expand our coverage and improve the
              platform&apos;s features for better accessibility and usability.
            </div>
            <div className="flex justify-end space-x-2">
              <Button color="primary" as={Link} href="/about">
                Learn More
              </Button>
              <Button
                onClick={() => {
                  toast.dismiss(t.id);
                  localStorage.setItem(
                    "aboutToastLastDismissed",
                    Date.now().toString()
                  );
                  localStorage.setItem("aboutToastDismissedForever", "true");
                }}
                variant="ghost"
              >
                Dismiss
              </Button>
            </div>
          </div>
        ),
        {
          duration: 10000,
          position: "bottom-right",
          style: {
            background: "#fff",
            color: "#333",
            border: "1px solid #e0e0e0",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            padding: "16px",
            textAlign: "justify",
          },
        }
      );
    }
  }, []);

  return <Toaster />;
};

export default AboutToast;
