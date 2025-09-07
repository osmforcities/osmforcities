"use client";

import { useParams } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { useAuth } from "@/hooks/use-auth";

export default function LoginForm() {
  const params = useParams();
  const locale = params.locale as string;
  const { login } = useAuth();

  const fields = [
    {
      name: "email",
      type: "email",
      placeholder: "Email address",
      required: true,
      autoComplete: "email",
    },
    {
      name: "password",
      type: "password",
      placeholder: "Password",
      required: true,
      autoComplete: "current-password",
    },
  ];

  const handleSubmit = async (data: Record<string, string>) => {
    await login(data.email, data.password);
  };

  return (
    <AuthForm
      fields={fields}
      submitText="Sign In"
      loadingText="Signing In..."
      onSubmit={handleSubmit}
      linkText="Don't have an account? Sign up"
      linkHref="/signup"
      locale={locale}
    />
  );
}
