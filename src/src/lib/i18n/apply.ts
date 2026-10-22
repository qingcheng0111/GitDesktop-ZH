/**
 * Apply the localization preferences (interface language + faces + typography)
 * to the live document. Called once at boot with the persisted settings and
 * again whenever the Appearance panel changes one of them, so the preview is
 * immediate.
 *
 * Kept structural (no `AppSettings` import) to avoid a cycle: the settings
 * module already imports these modules for its heal helpers.
 */

import {
  applyFonts,
  applyTypography,
  CODE_FONT_SIZE,
  type CodeFontId,
  clampFontSize,
  DEFAULT_TYPOGRAPHY,
  type FontWeightSetting,
  isFontWeight,
  isUiTracking,
  UI_FONT_SIZE,
  type UiFontId,
  type UiTrackingSetting,
} from "@/lib/fonts";
import { applyUiLanguage, type UiLanguage } from "@/lib/i18n/dom";

export interface LocalizationPreferences {
  uiLanguage: UiLanguage;
  uiFont: UiFontId;
  codeFont: CodeFontId;
  uiFontWeight: FontWeightSetting;
  codeFontWeight: FontWeightSetting;
  uiFontSize: number;
  codeFontSize: number;
  uiLetterSpacing: UiTrackingSetting;
}

/** Push language + faces + typography onto the document. Order matters: fonts
 *  first, so the localizer's first walk measures the final face and doesn't
 *  reflow twice. */
export function applyLocalization(
  prefs: Partial<LocalizationPreferences>,
): void {
  applyFonts(prefs.uiFont ?? "pingfang", prefs.codeFont ?? "jetbrains");
  applyTypography({
    // Partial prefs (a caller patching one axis) fall back to the defaults
    // rather than to whatever the DOM currently holds: every caller that
    // matters passes the whole settings object.
    uiWeight: isFontWeight(prefs.uiFontWeight)
      ? prefs.uiFontWeight
      : DEFAULT_TYPOGRAPHY.uiWeight,
    codeWeight: isFontWeight(prefs.codeFontWeight)
      ? prefs.codeFontWeight
      : DEFAULT_TYPOGRAPHY.codeWeight,
    uiSize: clampFontSize(prefs.uiFontSize, UI_FONT_SIZE),
    codeSize: clampFontSize(prefs.codeFontSize, CODE_FONT_SIZE),
    uiTracking: isUiTracking(prefs.uiLetterSpacing)
      ? prefs.uiLetterSpacing
      : DEFAULT_TYPOGRAPHY.uiTracking,
  });
  applyUiLanguage(prefs.uiLanguage ?? "zh-CN");
}
