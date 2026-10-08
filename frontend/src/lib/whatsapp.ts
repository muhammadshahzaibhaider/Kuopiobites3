export const WHATSAPP_NUMBER = "358449816223";
export const WHATSAPP_DISPLAY = "+358 44 981 6223";
export const WHATSAPP_GREETING = "Hello Kuopio Bites, I would like to ask about...";

export function whatsappUrl(message?: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
