/** Contract error code from POST /api/cart/price → i18n key for the customer. */
export function lineErrorKey(code: string | null | undefined): string {
  switch (code) {
    case "validation.invalidVariant":
      return "cart.err.variant";
    case "validation.invalidOption":
    case "validation.duplicateOption":
      return "cart.err.options";
    case "validation.invalidLine":
      return "cart.err.invalidLine";
    case "avail.unavailable":
      return "cart.err.unavailable";
    default:
      return "cart.err.other";
  }
}
