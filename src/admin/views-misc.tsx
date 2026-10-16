"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { eur, cx } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { apiAnalyticsReport, apiCreateStaff, apiListStaff, apiUpdateStaff, type AdminStaffMember } from "@/lib/api";
import type { StaffRole } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { AuditTab, Switch } from "@/app/admin/v3tabs";
import { Ic } from "./icons";
import { Bars, DataTable, EmptyState, Field, GhostBtn, Pill, PrimaryBtn, StatCard, downloadCSV, fmtDT, inputCls, useLocal, useDelayedReady, type Col } from "./ui";

/* ══ CUSTOMERS ══ */
export function CustomersView() {
  const { users, orders } = useShop();
  const ready = useDelayedReady("customers");
  type Row = { id: string; name: string; email: string; phone?: string; orders: number; spend: number; marketing: boolean; createdAt: number };
  const rows: Row[] = users.map((u) => {
    const mine = orders.filter((o) => o.userId === u.id);
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, orders: mine.length, spend: mine.reduce((a, o) => a + o.total, 0), marketing: u.marketing, createdAt: u.createdAt };
  });
  const cols: Col<Row>[] = [
    { key: "name", label: "Name", sort: (r) => r.name, render: (r) => <span className="font-black text-cherry">{r.name}</span> },
    { key: "email", label: "Contact", render: (r) => <span className="text-xs text-cherry/70">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span> },
    { key: "orders", label: "Orders", sort: (r) => r.orders, render: (r) => <span className="tabular-nums">{r.orders}</span> },
    { key: "spend", label: "Lifetime spend", sort: (r) => r.spend, render: (r) => <span className="font-black tabular-nums">{eur(r.spend)}</span> },
    { key: "marketing", label: "Marketing", hideMd: true, render: (r) => <Pill tone={r.marketing ? "green" : "gray"}>{r.marketing ? "opted in" : "—"}</Pill> },
    { key: "joined", label: "Joined", sort: (r) => r.createdAt, render: (r) => <span className="tabular-nums text-cherry/60">{new Date(r.createdAt).toLocaleDateString("fi-FI")}</span> },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Registered customers" value={users.length} icon="users" />
        <StatCard label="Ordered at least once" value={rows.filter((r) => r.orders > 0).length} icon="orders" tone="green" />
        <StatCard label="Avg lifetime spend" value={eur(rows.length ? rows.reduce((a, r) => a + r.spend, 0) / rows.length : 0)} icon="analytics" tone="gold" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <DataTable rows={rows} cols={cols} id={(r) => r.id} loading={!ready} search={(r, q) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)} empty={<EmptyState icon="users" title="No customers yet" sub="Account sign-ups on the public site appear here." />} />
      </div>
    </div>
  );
}

/* ══ ANALYTICS ══ */
export function AnalyticsView({ mode }: { mode: "sales" | "items" | "peaks" }) {
  const { lang } = useLang();
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [report, setReport] = useState<import("@/lib/api").AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const today = todayStrHelsinki();
  const to = today;
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - (range - 1) * 86400000).toISOString().slice(0, 10);
  const w = (en: string, fi: string) => lang === "fi" ? fi : en;

  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    apiAnalyticsReport(from, to).then((value) => {
      if (live) setReport(value);
    }).catch((cause) => {
      if (live) { setError((cause as Error).message || "net.offline"); setReport(null); }
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [from, to, reload]);

  const rangeButtons = <div className="flex gap-1" role="group" aria-label={w("Report range", "Raportin aikaväli")}>
    {([7, 14, 30] as const).map((days) => <button key={days} type="button" onClick={() => setRange(days)} aria-pressed={range === days} className={range === days ? "rounded-lg bg-cherry px-2.5 py-1 text-[11px] font-black text-cream" : "rounded-lg px-2.5 py-1 text-[11px] font-black text-cherry/50"}>{days}d</button>)}
  </div>;
  if (loading) return <div role="status" className="rounded-2xl bg-cream-deep p-10 text-center text-sm font-bold text-cherry/60">{w("Loading report…", "Ladataan raporttia…")}</div>;
  if (error || !report) return <div role="alert" className="rounded-2xl border border-brick/20 bg-brick/5 p-6 text-sm font-bold text-brick">{w("The report could not be loaded. Confirm the backend, database, and staff permissions, then retry.", "Raporttia ei voitu ladata. Tarkista palvelin, tietokanta ja henkilöstöoikeudet ja yritä uudelleen.")} <button type="button" onClick={() => setReload((value) => value + 1)} className="ml-2 underline">{w("Retry", "Yritä uudelleen")}</button></div>;

  const deliveryShare = report.orderCount ? Math.round(report.fulfillment.delivery / report.orderCount * 100) : 0;
  if (mode === "items") return <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cherry/10 px-4 py-3"><p className="text-sm font-black text-cherry">{w("Item performance", "Tuotemyynti")} · {range}d · {from}–{to}</p><div className="flex items-center gap-3">{rangeButtons}<GhostBtn onClick={() => downloadCSV("item-performance.csv", [["item", "quantity", "revenue_eur"], ...report.topItems.map((item) => [item.name, item.quantity, item.revenue.toFixed(2)])])}><Ic n="csv" size={13} /> CSV</GhostBtn></div></div>
    <DataTable rows={report.topItems} id={(item) => item.itemId} search={(item, query) => item.name.toLowerCase().includes(query)} cols={[
      { key: "name", label: w("Item", "Tuote"), sort: (item) => item.name, render: (item) => <span className="font-bold">{item.name}</span> },
      { key: "qty", label: w("Quantity", "Määrä"), sort: (item) => item.quantity, render: (item) => <span className="tabular-nums">×{item.quantity}</span> },
      { key: "revenue", label: w("Revenue", "Myynti"), sort: (item) => item.revenue, render: (item) => <span className="font-black tabular-nums">{eur(item.revenue)}</span> },
    ]} empty={<EmptyState icon="analytics" title={w("No sales in range", "Ei myyntiä aikavälillä")} />} />
  </div>;

  if (mode === "peaks") return <div className="space-y-4">
    <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-cherry">{w("Orders by hour · Helsinki", "Tilaukset tunneittain · Helsinki")} · {range}d</p>{rangeButtons}</div><div className="mt-4"><Bars data={report.byHour.map((entry) => ({ label: String(entry.hour).padStart(2, "0"), value: entry.orders }))} height={170} /></div></div>
    <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4"><p className="text-sm font-black text-cherry">{w("Orders by weekday", "Tilaukset viikonpäivittäin")}</p><div className="mt-4"><Bars data={report.byWeekday.map((entry) => ({ label: lang === "fi" ? ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"][entry.weekday] : entry.label, value: entry.orders }))} height={150} /></div></div>
  </div>;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-end gap-3">{rangeButtons}<GhostBtn onClick={() => downloadCSV("sales-report.csv", [["date", "orders", "revenue_eur"], ...report.daily.map((day) => [day.date, day.orders, day.revenue.toFixed(2)])])}><Ic n="csv" size={13} /> {w("Export report", "Vie raportti")}</GhostBtn></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={w(`Revenue ${range} days`, `Myynti ${range} päivää`)} value={eur(report.revenue)} icon="analytics" tone="green" />
      <StatCard label={w("Paid orders", "Maksetut tilaukset")} value={report.orderCount} icon="orders" />
      <StatCard label={w("Average order value", "Keskiostos")} value={eur(report.averageOrderValue)} icon="cash" tone="gold" />
      <StatCard label={w("Refunded orders", "Palautetut tilaukset")} value={report.refundedCount} icon="trash" tone={report.refundedCount ? "red" : "gray"} />
    </div>
    <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-cherry">{w("Paid revenue by day", "Maksettu myynti päivittäin")} · {from}–{to}</p><span className="text-[11px] font-bold text-cherry/50">{report.daily.length} {w("days", "päivää")}</span></div>
      <div className="mt-4"><Bars data={report.daily.map((day) => ({ label: day.label, value: day.revenue }))} height={170} /></div>
    </div>
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4"><p className="text-[11px] font-black uppercase text-cherry/50">{w("Delivery vs pickup", "Toimitus ja nouto")}</p><div className="mt-3 flex h-4 overflow-hidden rounded-full"><span className="bg-cherry-bright" style={{ width: `${deliveryShare}%` }} /><span className="flex-1 bg-gold" /></div><p className="mt-2 text-xs font-bold text-cherry/70">{deliveryShare}% {w("delivery", "toimitus")} · {100 - deliveryShare}% {w("pickup", "nouto")}</p></div>
      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4"><p className="text-[11px] font-black uppercase text-cherry/50">{w("Order status mix", "Tilausten tilajakauma")}</p><ul className="mt-2 space-y-1 text-xs font-bold text-cherry/70">{["completed", "ready", "preparing", "accepted", "placed"].map((status) => <li key={status} className="flex justify-between"><span>{status}</span><span className="tabular-nums">{report.statuses[status] ?? 0}</span></li>)}</ul></div>
    </div>
    {report.topCategories.length > 0 && <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4"><p className="text-sm font-black text-cherry">{w("Top categories", "Suosituimmat kategoriat")}</p><div className="mt-3 space-y-2">{report.topCategories.slice(0, 5).map((category) => <div key={category.categoryId} className="flex justify-between gap-3 text-sm"><span className="font-bold text-cherry">{category.name} <span className="text-xs text-cherry/50">×{category.quantity}</span></span><span className="font-black tabular-nums">{eur(category.revenue)}</span></div>)}</div></div>}
  </div>;
}

/* ══ ADMIN ▸ staff + activity ══ */
export function AdminStaffView() {
  const { staffRole } = useShop();
  const { lang } = useLang();
  const fi = lang === "fi";
  const w = useCallback((en: string, finnish: string) => fi ? finnish : en, [fi]);
  const [staff, setStaff] = useState<AdminStaffMember[]>([]);
  const [draft, setDraft] = useState({ username: "", name: "", email: "", role: "manager" as StaffRole, password: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setStaff(await apiListStaff()); }
    catch { setError(w("Staff accounts could not be loaded. Owner access is required.", "Henkilöstötilejä ei voitu ladata. Vain omistajalla on käyttöoikeus.")); }
    finally { setLoading(false); }
  }, [w]);
  useEffect(() => { void load(); }, [load]);

  const reset = () => { setDraft({ username: "", name: "", email: "", role: "manager", password: "" }); setEditingId(null); };
  const edit = (member: AdminStaffMember) => {
    setDraft({ username: member.username, name: member.name, email: member.email, role: member.role, password: "" });
    setEditingId(member.id); setError(""); setNotice("");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (editingId) {
        await apiUpdateStaff(editingId, { username: draft.username, name: draft.name, email: draft.email, role: draft.role });
        setNotice(w("Staff account updated.", "Henkilöstötili päivitetty."));
      } else {
        await apiCreateStaff(draft);
        setNotice(w("Staff account created. Share the initial password securely and outside this browser session.", "Henkilöstötili luotu. Jaa alkusalasana turvallisesti tämän selainistunnon ulkopuolella."));
      }
      await load(); reset();
    } catch {
      setError(w("Could not save the staff account. Check that the username and email are unique and the password has at least 12 characters.", "Henkilöstötilin tallennus epäonnistui. Tarkista, että käyttäjätunnus ja sähköposti ovat yksilöllisiä ja salasana on vähintään 12 merkkiä."));
    } finally { setBusy(false); }
  };
  const toggleActive = async (member: AdminStaffMember) => {
    setError(""); setNotice("");
    try {
      await apiUpdateStaff(member.id, { active: !member.active });
      await load();
      setNotice(member.active ? w("Account deactivated. Existing audit and order records remain.", "Tili poistettu käytöstä. Auditointi- ja tilaustiedot säilyvät.") : w("Account reactivated.", "Tili aktivoitu uudelleen."));
    } catch {
      setError(w("Could not change account access. The last active owner cannot be deactivated or demoted.", "Tilin käyttöoikeutta ei voitu muuttaa. Viimeistä aktiivista omistajaa ei voi poistaa käytöstä tai alentaa."));
    }
  };

  if (staffRole !== "owner") return <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5 text-sm font-bold text-cherry">{w("Staff account management is restricted to owners.", "Henkilöstötilien hallinta on sallittu vain omistajille.")}</div>;
  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-xl border border-brick/20 bg-brick/5 p-3 text-sm font-bold text-brick">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-green/20 bg-green/5 p-3 text-sm font-bold text-green">{notice}</p>}
    <section className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
      <div className="flex items-center justify-between border-b border-cherry/10 px-4 py-3"><h2 className="text-sm font-black text-cherry">{w("Staff accounts", "Henkilöstötilit")}</h2><button type="button" onClick={() => void load()} className="text-xs font-black text-cherry/60 underline">{w("Refresh", "Päivitä")}</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead><tr className="border-b border-cherry/10 text-[11px] font-black uppercase text-cherry/50"><th className="px-4 py-2">{w("Name / username", "Nimi / käyttäjätunnus")}</th><th className="px-3 py-2">{w("Email", "Sähköposti")}</th><th className="px-3 py-2">{w("Role", "Rooli")}</th><th className="px-3 py-2">{w("Access", "Käyttöoikeus")}</th><th className="px-3 py-2">{w("Created", "Luotu")}</th><th className="px-3 py-2" /></tr></thead>
        <tbody>{loading ? <tr><td colSpan={6} role="status" className="px-4 py-6 text-center text-cherry/50">{w("Loading staff…", "Ladataan henkilöstöä…")}</td></tr> : staff.map((member) => <tr key={member.id} className="border-b border-cherry/5">
          <td className="px-4 py-2.5"><strong className="block text-cherry">{member.name}</strong><span className="text-xs text-cherry/50">@{member.username}</span></td>
          <td className="px-3 py-2.5 text-xs text-cherry/70">{member.email}</td>
          <td className="px-3 py-2.5"><Pill tone={member.role === "owner" ? "gold" : member.role === "manager" ? "teal" : "gray"}>{member.role === "owner" ? w("Owner", "Omistaja") : member.role === "manager" ? w("Manager", "Esihenkilö") : w("Kitchen", "Keittiö")}</Pill></td>
          <td className="px-3 py-2.5"><Pill tone={member.active ? "green" : "red"}>{member.active ? w("Active", "Aktiivinen") : w("Inactive", "Pois käytöstä")}</Pill></td>
          <td className="px-3 py-2.5 tabular-nums text-xs text-cherry/60">{new Date(member.createdAt).toLocaleDateString(fi ? "fi-FI" : "en-GB")}</td>
          <td className="px-3 py-2.5"><div className="flex justify-end gap-2"><GhostBtn onClick={() => edit(member)}>{w("Edit", "Muokkaa")}</GhostBtn><GhostBtn onClick={() => void toggleActive(member)}>{member.active ? w("Deactivate", "Poista käytöstä") : w("Reactivate", "Aktivoi")}</GhostBtn></div></td>
        </tr>)}
        {!loading && staff.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-cherry/50">{w("No staff accounts found.", "Henkilöstötilejä ei löytynyt.")}</td></tr>}</tbody>
      </table></div>
    </section>

    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:p-5">
      <h3 className="font-black text-cherry">{editingId ? w("Edit staff account", "Muokkaa henkilöstötiliä") : w("Create staff account", "Luo henkilöstötili")}</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label={w("Full name", "Koko nimi")}><input required maxLength={80} autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputCls} /></Field>
        <Field label={w("Username", "Käyttäjätunnus")}><input required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" autoComplete="username" value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} className={inputCls} /></Field>
        <Field label={w("Email address", "Sähköpostiosoite")}><input required type="email" maxLength={254} autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputCls} /></Field>
        <Field label={w("Role", "Rooli")}><select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as StaffRole })} className={inputCls}><option value="manager">{w("Manager", "Esihenkilö")}</option><option value="kitchen">{w("Kitchen", "Keittiö")}</option><option value="owner">{w("Owner", "Omistaja")}</option></select></Field>
        {!editingId && <Field label={w("Initial password (12+ characters)", "Alkusalasana (vähintään 12 merkkiä)")}><input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} className={inputCls} /></Field>}
      </div>
      <p className="text-xs text-cherry/55">{w("Staff identities are authenticated through Supabase Auth. Passwords are not stored or shown by this dashboard; communicate initial credentials through a secure channel.", "Henkilöstön tunnistautuminen hoidetaan Supabase Authilla. Hallintapaneeli ei tallenna tai näytä salasanoja. Toimita alkutunnukset turvallista kanavaa pitkin.")}</p>
      <div className="flex flex-wrap gap-2"><PrimaryBtn icon="save" disabled={busy}>{busy ? w("Saving…", "Tallennetaan…") : editingId ? w("Save changes", "Tallenna muutokset") : w("Create account", "Luo tili")}</PrimaryBtn>{editingId && <GhostBtn onClick={reset}>{w("Cancel", "Peruuta")}</GhostBtn>}</div>
    </form>
    <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40"><AuditTab /></div>
  </div>;
}

/* ══ SETTINGS ══ */
export function SettingsView({ mode }: { mode: "general" | "restaurant" }) {
  const { settings, saveSettings, toast, logAudit } = useShop();
  const { dayName, lang } = useLang();
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setS(settings), [settings]);
  const today = todayStrHelsinki();

  const w = (en: string, finnish: string) => lang === "fi" ? finnish : en;
  const persist = async (next: typeof s, message: string) => {
    setSaving(true);
    const saved = await saveSettings(next);
    setSaving(false);
    if (saved) { setS(next); toast(message); return true; }
    return false;
  };
  const restaurant = s.restaurant;
  const patchRestaurant = <K extends keyof typeof restaurant>(key: K, value: (typeof restaurant)[K]) =>
    setS({ ...s, restaurant: { ...restaurant, [key]: value } });
  const saveRestaurant = async () => {
    const saved = await persist(s, w("Restaurant settings saved", "Ravintolan asetukset tallennettu"));
    if (saved) logAudit("restaurant info / announcement updated");
  };

  if (mode === "restaurant")
    return (
      <div className="max-w-3xl space-y-4">
        <section className="space-y-4 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:p-5">
          <div><h2 className="text-base font-black text-cherry">{w("Restaurant information", "Ravintolan tiedot")}</h2><p className="mt-1 text-xs text-cherry/55">{w("Saved details are used on the public site and in order pickup/delivery information without a redeploy.", "Tallennetut tiedot näkyvät julkisilla sivuilla sekä tilausten nouto- ja toimitustiedoissa ilman uutta käyttöönottoa.")}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={w("Restaurant name", "Ravintolan nimi")}><input value={restaurant.name} maxLength={120} onChange={(event) => patchRestaurant("name", event.target.value)} className={inputCls} /></Field>
            <Field label={w("Address", "Osoite")}><input value={restaurant.address} maxLength={200} onChange={(event) => patchRestaurant("address", event.target.value)} className={inputCls} /></Field>
            <Field label={w("Tagline · English", "Iskulause · englanti")}><input value={restaurant.taglineEn} maxLength={200} onChange={(event) => patchRestaurant("taglineEn", event.target.value)} className={inputCls} /></Field>
            <Field label={w("Tagline · Finnish", "Iskulause · suomi")}><input value={restaurant.taglineFi} maxLength={200} onChange={(event) => patchRestaurant("taglineFi", event.target.value)} className={inputCls} /></Field>
            <Field label={w("Phone", "Puhelin")}><input type="tel" value={restaurant.phone} maxLength={40} onChange={(event) => patchRestaurant("phone", event.target.value)} className={inputCls} /></Field>
            <Field label={w("Email", "Sähköposti")}><input type="email" value={restaurant.email} maxLength={160} onChange={(event) => patchRestaurant("email", event.target.value)} className={inputCls} /></Field>
            <Field label="Instagram URL"><input type="url" value={restaurant.instagram} maxLength={500} onChange={(event) => patchRestaurant("instagram", event.target.value)} className={inputCls} /></Field>
            <Field label="Facebook URL"><input type="url" value={restaurant.facebook} maxLength={500} onChange={(event) => patchRestaurant("facebook", event.target.value)} className={inputCls} /></Field>
            <Field label={w("Map link URL", "Karttalinkin URL")}><input type="url" value={restaurant.mapLink} maxLength={500} onChange={(event) => patchRestaurant("mapLink", event.target.value)} className={inputCls} /></Field>
            <Field label={w("Embedded map URL", "Upotetun kartan URL")}><input type="url" value={restaurant.mapEmbed} maxLength={500} onChange={(event) => patchRestaurant("mapEmbed", event.target.value)} className={inputCls} /></Field>
            <Field label={w("Latitude (optional; improves delivery distance accuracy)", "Leveysaste (valinnainen; tarkentaa toimitusetäisyyttä)")}><input type="number" min="-90" max="90" step="any" value={restaurant.latitude ?? ""} onChange={(event) => patchRestaurant("latitude", event.target.value === "" ? undefined : Number(event.target.value))} className={inputCls} /></Field>
            <Field label={w("Longitude (optional; required with latitude)", "Pituusaste (valinnainen; vaatii leveysasteen)")}><input type="number" min="-180" max="180" step="any" value={restaurant.longitude ?? ""} onChange={(event) => patchRestaurant("longitude", event.target.value === "" ? undefined : Number(event.target.value))} className={inputCls} /></Field>
          </div>
        </section>

        <section className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-cherry">{w("Announcement strip", "Tiedotepalkki")}</h3><p className="mt-1 text-xs text-cherry/55">{w("An enabled announcement appears on the home page.", "Käytössä oleva tiedote näytetään etusivulla.")}</p></div><Switch on={s.announcement.enabled} ariaLabel={w("Enable announcement", "Ota tiedote käyttöön")} onChange={() => setS({ ...s, announcement: { ...s.announcement, enabled: !s.announcement.enabled } })} /></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label={w("Announcement · English", "Tiedote · englanti")}><textarea rows={2} maxLength={500} value={s.announcement.textEn ?? s.announcement.text} onChange={(event) => setS({ ...s, announcement: { ...s.announcement, textEn: event.target.value, text: event.target.value } })} className={inputCls} /></Field><Field label={w("Announcement · Finnish", "Tiedote · suomi")}><textarea rows={2} maxLength={500} value={s.announcement.textFi ?? ""} onChange={(event) => setS({ ...s, announcement: { ...s.announcement, textFi: event.target.value } })} className={inputCls} /></Field></div>
        </section>

        <section className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:p-5"><h3 className="text-sm font-black text-cherry">{w("Ordering pause message", "Tilausten taukoviesti")}</h3><Field label={w("Message (English or Finnish)", "Viesti (englanniksi tai suomeksi)")}><textarea rows={2} maxLength={500} value={s.pauseMessage} onChange={(event) => setS({ ...s, pauseMessage: event.target.value })} className={inputCls} /></Field></section>
        <PrimaryBtn icon="save" disabled={saving} onClick={() => void saveRestaurant()}>{saving ? w("Saving…", "Tallennetaan…") : w("Save restaurant settings", "Tallenna ravintolan asetukset")}</PrimaryBtn>
      </div>
    );

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-cherry/10 bg-cream-deep/40 px-4 py-3">
        <span>
          <span className="block text-sm font-black text-cherry">{w("Pause online ordering", "Keskeytä verkkotilaaminen")}</span>
          <span className="text-xs text-cherry/60">{w("Emergency switch — customers cannot place online orders", "Hätäkatkaisin — asiakkaat eivät voi tehdä verkkotilauksia")}</span>
        </span>
        <Switch
          on={s.paused}
          ariaLabel={w("Pause ordering", "Keskeytä tilaaminen")}
          onChange={() => {
            const next = { ...s, paused: !s.paused };
            setS(next);
            void persist(next, s.paused ? w("Ordering resumed", "Tilaaminen avattu") : w("Ordering paused", "Tilaaminen keskeytetty")).then((saved) => { if (saved) logAudit(`ordering ${s.paused ? "resumed" : "paused"}`); });
          }}
        />
      </div>

      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <h3 className="text-sm font-black text-cherry">{w("Opening hours", "Aukioloajat")}</h3>
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <div key={d} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-24 font-bold">{dayName(d)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-cherry/60">
                <input type="checkbox" checked={!s.hours[d]} onChange={(e) => setS({ ...s, hours: { ...s.hours, [d]: e.target.checked ? null : { open: "10:00", close: "21:00" } } })} className="h-4 w-4 accent-[#0F3D3E]" />
                {w("Closed", "Suljettu")}
              </label>
              {s.hours[d] && (
                <>
                  <input type="time" value={s.hours[d]!.open} onChange={(e) => setS({ ...s, hours: { ...s.hours, [d]: { ...s.hours[d]!, open: e.target.value } } })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2" />
                  <span>–</span>
                  <input type="time" value={s.hours[d]!.close} onChange={(e) => setS({ ...s, hours: { ...s.hours, [d]: { ...s.hours[d]!, close: e.target.value } } })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:grid-cols-3">
        <Field label={w("Delivery fee (€)", "Toimitusmaksu (€)")}><input type="number" step="0.5" value={s.deliveryFee} onChange={(e) => setS({ ...s, deliveryFee: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
        <Field label={w("Minimum delivery order (€)", "Toimituksen vähimmäistilaus (€)")}><input type="number" step="1" value={s.minOrder} onChange={(e) => setS({ ...s, minOrder: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
        <Field label={w("Delivery radius (km)", "Toimitussäde (km)")}><input type="number" step="1" value={s.radiusKm} onChange={(e) => setS({ ...s, radiusKm: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
      </div>

      <div className="space-y-3 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <h3 className="text-sm font-black text-cherry">{w("Ordering platforms & display", "Tilausalustat ja ulkoasu")}</h3>
        <Field label="Wolt URL"><input value={s.platforms.wolt} onChange={(e) => setS({ ...s, platforms: { ...s.platforms, wolt: e.target.value } })} className={inputCls} /></Field>
        <Field label="Uber Eats URL"><input value={s.platforms.uberEats} onChange={(e) => setS({ ...s, platforms: { ...s.platforms, uberEats: e.target.value } })} className={inputCls} /></Field>
        <label className="flex items-center justify-between text-sm font-black text-cherry">
          {w("Header logo", "Ylätunnisteen logo")}
          <select value={s.headerLogo} onChange={(e) => setS({ ...s, headerLogo: e.target.value as "round" | "mark" })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold">
            <option value="round">{w("Round logo", "Pyöreä logo")}</option>
            <option value="mark">{w("Banner pizza mark", "Logomerkki")}</option>
          </select>
        </label>
        <label className="flex items-center justify-between text-sm font-black text-cherry">
          {w("Hide unavailable items", "Piilota loppuunmyydyt tuotteet")}
          <Switch on={s.hideUnavailable} ariaLabel={w("Hide unavailable", "Piilota loppuunmyydyt")} onChange={() => setS({ ...s, hideUnavailable: !s.hideUnavailable })} />
        </label>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-cherry/10 bg-cream-deep/40 px-4 py-3 text-sm">
        <span className="font-black text-cherry">{w("Today", "Tänään")} ({today}) — {w("quick availability", "pikavaraus")}</span>
        <GhostBtn onClick={() => { const map = { ...s.offItems }; for (const k of Object.keys(map)) if (map[k].offToday === today) delete map[k]; const next = { ...s, offItems: map }; setS(next); void persist(next, w("Today's sold-outs reset", "Tämän päivän loppuunmyydyt nollattu")); }}>{w("Reset today's sold-outs", "Nollaa tämän päivän loppuunmyydyt")}</GhostBtn>
      </div>

      <PrimaryBtn icon="save" disabled={saving} onClick={() => void persist(s, w("Settings saved", "Asetukset tallennettu"))}>{saving ? w("Saving…", "Tallennetaan…") : w("Save settings", "Tallenna asetukset")}</PrimaryBtn>
    </div>
  );
}
