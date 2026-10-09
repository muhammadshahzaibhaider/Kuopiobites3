import { Suspense } from "react";
import AuthPage from "@/components/AuthPage";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="container-x max-w-md pt-32 text-center text-cherry/70">Loading…</main>}>
      <AuthPage mode="login" />
    </Suspense>
  );
}
