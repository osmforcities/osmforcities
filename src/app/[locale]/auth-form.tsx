"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "sent">("email");
  const [error, setError] = useState("");
  const t = useTranslations("AuthForm");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send magic link");
      }

      // In development, log the magic link to console
      if (data.magicLink) {
        console.log("🔗 Magic link:", data.magicLink);
      }

      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "sent") {
    return (
      <div className="text-center space-y-4">
        <div className="text-2xl">📧</div>
        <div>
          <h3 className="font-medium text-black dark:text-white">
            {t("checkYourEmail")}
          </h3>
          <p className="mt-1 text-sm text-black/70 dark:text-white/70">
            {t("sentLinkTo", { email })}
          </p>
        </div>

        <button
          onClick={() => setStep("email")}
          className="text-sm text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
        >
          {t("tryDifferentEmail")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <input
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        required
        className="w-full py-3 px-4 border-2 border-black/20 dark:border-white/20 rounded-lg bg-transparent text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 focus:border-black dark:focus:border-white outline-none"
      />

      <button
        type="submit"
        disabled={!email || isLoading}
        className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {isLoading ? t("sending") : t("continue")}
      </button>
    </form>
  );
}
