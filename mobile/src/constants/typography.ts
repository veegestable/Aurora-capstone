export const APP_FONT_FAMILY_REGULAR = "NunitoSans_400Regular";
export const APP_FONT_FAMILY_SEMIBOLD = "NunitoSans_600SemiBold";
export const APP_FONT_FAMILY_BOLD = "NunitoSans_700Bold";

export const APP_FONT_FAMILY = APP_FONT_FAMILY_REGULAR;

export function getAppFontFamilyByWeight(
  fontWeight?: number | string,
): string {
  if (fontWeight === "bold" || fontWeight === 700 || fontWeight === "700") {
    return APP_FONT_FAMILY_BOLD;
  }
  if (
    fontWeight === "600" ||
    fontWeight === 600 ||
    fontWeight === "semibold"
  ) {
    return APP_FONT_FAMILY_SEMIBOLD;
  }
  return APP_FONT_FAMILY_REGULAR;
}
