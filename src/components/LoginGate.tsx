"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "@/lib/store";

/* Shown whenever a guest tries something that belongs to an account
   (add to cart, favorite an item, open the cart). The intent they started
   with is remembered and replayed automatically after they sign in.
   Visual shell matches the existing item popup: same backdrop, rounded-3xl
   cream card and cherry pill buttons. */
export default function LoginGate() {
  const { loginGate, closeLoginGate } = useShop();
  const pathname = usePathname();
  const next = pathname && pathname !== "/" && !pathname.startsWith("/login") && !pathname.startsWith("/signup") ? pathname : undefined;
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";
  return (
    <AnimatePresence>
      {loginGate && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-cherry-dark/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLoginGate}
          role="dialog"
          aria-modal="true"
          aria-label="Log in to continue"
        >
          <motion.div
            className="w-full max-w-md rounded-3xl bg-cream p-6 shadow-lift"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-xs font-black uppercase tracking-[0.25em] text-gold-deep">
              almost there
            </p>
            <h3 className="mt-1 font-display text-2xl font-black text-cherry">Log in to keep going</h3>
            <div className="gold-rule mt-3 w-20" />
            <p className="mt-3 text-sm text-cherry/70">
              Please log in or create an account to add items to your cart, save favorites and check out.
              Your pick is remembered and will be added right after you sign in.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href={loginHref}
                onClick={closeLoginGate}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-cherry-bright px-6 font-black text-cream hover:bg-cherry"
              >
                Log in
              </Link>
              <Link
                href={signupHref}
                onClick={closeLoginGate}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border-2 border-cherry px-6 font-black text-cherry hover:bg-cherry hover:text-cream"
              >
                Sign up
              </Link>
            </div>
            <button
              type="button"
              onClick={closeLoginGate}
              className="mt-3 min-h-[44px] w-full text-center text-sm font-black text-cherry/60 underline underline-offset-4 hover:text-cherry"
            >
              Keep browsing
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
