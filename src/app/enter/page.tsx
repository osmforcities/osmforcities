import { Metadata } from "next";
import AuthForm from "../auth-form";

export const metadata: Metadata = {
  title: "Sign In - OSM for Cities",
  description: "Sign in to monitor OpenStreetMap datasets",
};

export default function EnterPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="flex flex-col items-center justify-center p-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-black dark:text-white">
              Sign In
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Enter your email to get started
            </p>
          </div>

          <AuthForm />
        </div>
      </div>
    </div>
  );
}
