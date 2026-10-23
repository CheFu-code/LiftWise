const clamp = (min: number, value: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function getWelcomeLayout(
  width: number,
  height: number,
  fontScale = 1,
  insets = { top: 0, bottom: 0, left: 0, right: 0 },
) {
  const availableWidth = Math.max(1, width - insets.left - insets.right);
  const availableHeight = Math.max(1, height - insets.top - insets.bottom);
  const wide =
    availableWidth >= 960 &&
    availableHeight >= 520 &&
    (Math.min(availableWidth, 1100) - 160) / 2 >= 300 * fontScale;
  const contentWidth = Math.min(availableWidth, wide ? 1100 : 640);
  const scale = clamp(0.8, contentWidth / 390, wide ? 1.3 : 1.2);
  const spacing = scale * (availableHeight < 600 ? 0.85 : 1);
  const padding = Math.min(
    contentWidth / 12,
    clamp(16, 24 * scale, wide ? 48 : 32),
  );
  const innerWidth = Math.max(1, contentWidth - padding * 2);
  const columnGap = wide ? clamp(32, innerWidth * 0.06, 64) : 0;
  const columnWidth = wide ? (innerWidth - columnGap) / 2 : innerWidth;
  const heroPadding = Math.min(columnWidth / 10, clamp(16, 22 * scale, 28));
  const illustrationHeight = clamp(135, columnWidth * 0.52, 250);
  // A 254 × 128 barbell rotated 26° has a bounding box of about 285 × 227.
  const artScale = Math.max(
    0.01,
    Math.min(
      (columnWidth - heroPadding * 2) / 310,
      illustrationHeight / 240,
      1.35,
    ),
  );
  return {
    wide,
    contentWidth,
    innerWidth,
    columnWidth,
    columnGap,
    padding,
    scale,
    spacing,
    heroPadding,
    illustrationHeight,
    artScale,
    headlineSize: clamp(32, columnWidth * 0.155, wide ? 72 : 64),
    bodySize: clamp(14, 14 * scale, 18),
    logoSize: clamp(32, 36 * scale, 46),
    iconSize: clamp(18, 20 * scale, 26),
    smallIconSize: clamp(14, 14 * scale, 18),
    buttonIconSize: clamp(32, 36 * scale, 44),
    buttonMinHeight: clamp(56, 62 * scale, 74),
    // Let large accessibility text wrap naturally instead of forcing short lines.
    headlineBreak: fontScale <= 1.3 && columnWidth >= 300 ? "\n" : " ",
  };
}
