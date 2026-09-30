"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import AuthForm from "@/components/AuthForm";
import { cx, eur, fmtDate, fmtTime } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";

export default function AccountPage() {
  const { user, logout, updateUser, orders, toast } = useShop();
  const { t } = useLang();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [newAddr, setNewAddr] = useState("");

  if (!user)
    return (
      <div className="container-x max-w-md pt-28 sm:pt-32">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-script text-2xl text-gold-deep -rotate-1">{t("acct.welcome")}</p>
          <h1 className="text-4xl font-black text-cherry">{t("acct.title")}</h1>
          <div className="gold-rule mt-4 w-24" />
          <p className="mt-4 text-sm text-cherry/70">
            {t("acct.blurb")}
          </p>
        </motion.div>
        <div className="mt-6">
          <AuthForm />
        </div>
      </div>
    );

  const myOrders = orders.filter((o) => o.userId === user.id);

  return (
    <div className="container-x max-w-4xl pt-24 sm:pt-32">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-script text-2xl text-gold-deep -rotate-1">moi, {user.name.split(" ")[0]}!</p>
        <h1 className="text-4xl font-black text-cherry">{t("acct.title")}</h1>
        <div className="gold-rule mt-4 w-24" />
      </motion.div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* profile */}
        <section className="rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
          <h2 className="font-display text-lg font-black text-cherry">{t("acct.profile")}</h2>
          <div className="mt-4 space-y-3">
            <input className="min-h-[48px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <input className="min-h-[48px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            <p className="text-xs font-bold text-cherry/50">{user.email}</p>
            <button
              onClick={async () => { await updateUser({ name, phone }); toast("Profile saved"); }}
              className="min-h-[44px] rounded-full bg-cherry-bright px-6 font-black text-cream hover:bg-cherry"
            >
              {t("acct.save")}
            </button>
          </div>
          <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-cream px-4 py-3">
            <span className="text-sm font-black text-cherry">{t("acct.marketing")}</span>
            <button
              role="switch"
              aria-checked={user.marketing}
              onClick={async () => { await updateUser({ marketing: !user.marketing }); toast(user.marketing ? "Marketing emails off" : "You'll get the tasty deals 🎉"); }}
              className={cx("relative h-7 w-12 rounded-full transition", user.marketing ? "bg-[#2e7d32]" : "bg-cherry/25")}
            >
              <span className={cx("absolute top-1 h-5 w-5 rounded-full bg-cream shadow transition-all", user.marketing ? "left-6" : "left-1")} />
            </button>
          </label>
          <button onClick={() => { logout(); }} className="mt-5 text-sm font-black text-cherry-bright underline decoration-gold underline-offset-4 hover:text-cherry">
            {t("acct.signout")}
          </button>
        </section>

        {/* addresses */}
        <section className="rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
          <h2 className="font-display text-lg font-black text-cherry">{t("acct.addresses")}</h2>
          <ul className="mt-4 space-y-2">
            {user.addresses.length === 0 && <li className="text-sm text-cherry/60">{t("acct.noAddr")}</li>}
            {user.addresses.map((a) => (
              <li key={a} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-bold text-cherry">
                {a}
                <button
                  onClick={async () => { await updateUser({ addresses: user.addresses.filter((x) => x !== a) }); toast("Address removed"); }}
                  aria-label={`Remove ${a}`}
                  className="text-cherry/50 hover:text-cherry-bright"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input className="min-h-[44px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold" placeholder={t("acct.addAddr")} value={newAddr} onChange={(e) => setNewAddr(e.target.value)} />
            <button
              onClick={async () => {
                if (newAddr.trim().length < 5) return;
                await updateUser({ addresses: [...user.addresses, newAddr.trim()] });
                setNewAddr("");
                toast("Address saved");
              }}
              className="min-h-[44px] rounded-full bg-cherry px-5 font-black text-cream hover:bg-cherry-bright"
            >
              {t("acct.add")}
            </button>
          </div>
        </section>
      </div>

      {/* order history */}
      <section className="mt-6 rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
        <h2 className="font-display text-lg font-black text-cherry">{t("acct.history")}</h2>
        {myOrders.length === 0 ? (
          <p className="mt-3 text-sm text-cherry/60">{t("acct.noOrders")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-cherry/10">
            {myOrders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-black text-cherry">{o.id} · {eur(o.total)}</p>
                  <p className="text-xs font-bold text-cherry/60">
                    {fmtDate(o.createdAt)} klo {fmtTime(o.createdAt)} · {o.type} · {o.lines.reduce((a, l) => a + l.qty, 0)} items
                    {o.refunded && " · refunded"}
                  </p>
                </div>
                <Link href={`/track/${o.id}`} className="min-h-[44px] rounded-full border-2 border-cherry px-5 text-sm font-black leading-[40px] text-cherry hover:bg-cherry hover:text-cream">
                  {t("acct.track")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
