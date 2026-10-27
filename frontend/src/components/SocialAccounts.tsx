"use client";
import { useLang } from "@/lib/i18n";
import { RESTAURANT, WHATSAPP_DISPLAY, WHATSAPP_GREETING, whatsappUrl } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { cx } from "@/lib/format";
import WhatsAppIcon from "./WhatsAppIcon";

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M12 2.2c2.7 0 3 0 4.1.1 2.7.1 4.4 1.8 4.5 4.5.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.8 4.4-4.5 4.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4.4-1.8-4.5-4.5-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1C3.5 4.3 5.2 2.6 7.9 2.5c1.1-.1 1.4-.2 4.1-.2Zm0 4.6a5.2 5.2 0 1 0 5.2 5.2A5.2 5.2 0 0 0 12 6.8Zm0 8.6a3.4 3.4 0 1 1 3.4-3.4 3.4 3.4 0 0 1-3.4 3.4Zm5.4-8.8a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2Z" />
    </svg>
  );
}
function FbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7Z" />
    </svg>
  );
}

const cardCls = "relative flex flex-col overflow-hidden rounded-[28px] border border-cherry/10 bg-cream p-5 shadow-card";
const badgeCls = "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]";
const iconBox = "grid h-12 w-12 place-items-center rounded-2xl";

export default function SocialAccounts() {
  const { t } = useLang();
  const { settings, toast } = useShop();
  const wolt = settings.platforms.wolt || RESTAURANT.wolt;
  const uber = settings.platforms.uberEats || RESTAURANT.uberEats;

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(WHATSAPP_DISPLAY);
      toast(t("about.waCopied"));
    } catch {
      toast(t("about.waCopied"), "err");
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className={cardCls}>
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" />
        <div className="mt-1 flex items-start justify-between">
          <span className={cx(iconBox, "bg-[#fce7f3] text-[#c13584]")}><IgIcon /></span>
          <span className={cx(badgeCls, "bg-cream-deep text-cherry/50")}>{t("about.igBadge")}</span>
        </div>
        <h3 className="mt-5 font-display text-2xl font-black text-cherry">Instagram</h3>
        <p className="mt-1 text-sm font-bold text-cherry/55">@kuopio.bites</p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-cherry/70">{t("about.igDesc")}</p>
        <a href={RESTAURANT.instagram} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-cherry px-4 text-sm font-black text-cream">
          {t("about.igCta")} ↗
        </a>
      </article>

      <article className={cardCls}>
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[#1877f2]" />
        <div className="mt-1 flex items-start justify-between">
          <span className={cx(iconBox, "bg-[#e8f1ff] text-[#1877f2]")}><FbIcon /></span>
          <span className={cx(badgeCls, "bg-cream-deep text-cherry/50")}>{t("about.fbBadge")}</span>
        </div>
        <h3 className="mt-5 font-display text-2xl font-black text-cherry">Facebook</h3>
        <p className="mt-1 text-sm font-bold text-cherry/55">{RESTAURANT.name}</p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-cherry/70">{t("about.fbDesc")}</p>
        <a href={RESTAURANT.facebook} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-cherry/15 bg-cream-deep px-4 text-sm font-black text-cherry">
          {t("about.fbCta")} ↗
        </a>
      </article>

      <article className={cardCls}>
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[#25d366]" />
        <div className="mt-1 flex items-start justify-between">
          <span className={cx(iconBox, "bg-[#e8f8ee] text-[#168c4a]")}><WhatsAppIcon /></span>
          <span className={cx(badgeCls, "bg-[#e8f8ee] text-[#168c4a]")}>{t("about.waBadge")}</span>
        </div>
        <h3 className="mt-5 font-display text-2xl font-black text-cherry">WhatsApp</h3>
        <p className="mt-1 text-sm font-bold text-cherry/80">{WHATSAPP_DISPLAY}</p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-cherry/70">{t("about.waDesc")}</p>
        <a href={whatsappUrl(WHATSAPP_GREETING)} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 text-sm font-black text-white">
          <WhatsAppIcon /> {t("about.waChat")}
        </a>
        <button type="button" onClick={() => void copyPhone()} className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-cherry/15 bg-cream-deep px-4 text-sm font-black text-cherry">
          {t("about.waCopy")}
        </button>
      </article>

      <article className={cardCls}>
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#00c2e8] to-[#00a0e8]" />
        <div className="mt-1 flex items-start justify-between">
          <span className={cx(iconBox, "bg-[#e6f9fc] text-[#0088a8]")}>
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden><path d="M3.5 6.5h3.2l2.1 7.1 2.6-7.1h1.9l2.6 7.1 2.1-7.1h2.5l-3.4 11h-2.2l-2.6-7.1-2.5 7.1H7.6l-4.1-11Z" /></svg>
          </span>
          <span className={cx(badgeCls, "bg-cream-deep text-cherry/50")}>{t("about.woltBadge")}</span>
        </div>
        <h3 className="mt-5 font-display text-2xl font-black text-cherry">Wolt</h3>
        <p className="mt-1 text-sm font-bold text-cherry/55">{RESTAURANT.name}</p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-cherry/70">{t("about.woltDesc")}</p>
        <a href={wolt} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-cherry/15 bg-cream-deep px-4 text-sm font-black text-cherry">
          {t("about.woltCta")} ↗
        </a>
        {uber && (
          <a href={uber} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-cherry/15 bg-cream-deep px-4 text-sm font-black text-cherry">
            {t("about.ueCta")} ↗
          </a>
        )}
      </article>
    </div>
  );
}
