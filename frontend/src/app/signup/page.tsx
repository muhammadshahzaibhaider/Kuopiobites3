import { Suspense } from "react";
import AuthPage from "@/components/AuthPage";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="container-x max-w-md pt-32 text-center text-cherry/70">Loading…</main>}>
      <AuthPage mode="register" />
    </Suspense>
  );
}
