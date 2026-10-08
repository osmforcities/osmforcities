"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LAST_EMAIL_COOKIE } from "@/lib/last-email-cookie";

function readLastEmail(): string {
  try {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${LAST_EMAIL_COOKIE}=`));
    return match
      ? decodeURIComponent(match.slice(LAST_EMAIL_COOKIE.length + 1))
      : "";
  } catch {
    return "";
  }
}

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "sent">("email");
  const [error, setError] = useState("");
  // Unticked by default: remembering the email needs the user's consent.
  const [remember, setRemember] = useState(false);
  const t = useTranslations("AuthForm");

  // After mount, not in useState: the page is statically rendered.
  useEffect(() => {
    const lastEmail = readLastEmail();
    if (lastEmail) {
      setEmail((typed) => typed || lastEmail);
      setRemember(true);
    }
  }, []);

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
        body: JSON.stringify({ email, remember }),
      });

      if (response.status === 400) {
        setError(t("invalidEmail"));
      } else if (response.status === 429) {
        setError(t("tooManyRequests"));
      } else if (!response.ok) {
        setError(t("genericError"));
      } else {
        setStep("sent");
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "sent") {
    return (
      <div className="text-center space-y-4">
        <div className="text-2xl">{t("emailIcon")}</div>
        <div>
          <h3 className="font-medium text-black dark:text-white">
            {t("checkYourEmail")}
          </h3>
          <p className="mt-1 text-sm text-black/70 dark:text-white/70">
            {t("sentLinkTo", { email })}
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setStep("email")}>
          {t("tryDifferentEmail")}
        </Button>
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

      <label className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
        <input
          type="checkbox"
          name="remember"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        {t("rememberEmail")}
      </label>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!email || isLoading}
      >
        {isLoading ? t("sending") : t("continue")}
      </Button>

      <p className="text-xs text-center text-black/50 dark:text-white/50">
        {t("signInNotice")}
      </p>
    </form>
  );
}
