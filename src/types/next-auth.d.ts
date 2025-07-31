import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      language: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    isAdmin: boolean;
    language: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
    language: string;
  }
}
