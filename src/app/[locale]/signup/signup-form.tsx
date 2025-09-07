"use client";

import { useParams } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { useAuth } from "@/hooks/use-auth";

export default function SignupForm() {
  const params = useParams();
  const locale = params.locale as string;
  const { signup } = useAuth();

  const fields = [
    {
      name: "name",
      type: "text",
      placeholder: "Full name",
      required: true,
    },
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
      minLength: 6,
      autoComplete: "new-password",
    },
  ];

  const handleSubmit = async (data: Record<string, string>) => {
    await signup(data.email, data.password, data.name);
  };

  return (
    <AuthForm
      fields={fields}
      submitText="Create Account"
      loadingText="Creating Account..."
      onSubmit={handleSubmit}
      linkText="Already have an account? Sign in"
      linkHref="/login"
      locale={locale}
    />
  );
}
