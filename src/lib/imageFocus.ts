/*
 * Focal points for the verified story images (presentation only).
 *
 * Every story photograph is extracted from its printed page (the two halves of
 * a photograph printed across a spread are rejoined), and
 * layouts crop it to different shapes (portrait plates, landscape strips,
 * square thumbnails). These object-position values keep the subject of each
 * photograph in frame. Values were read off a 5×5 grid over each image.
 */
const FOCUS: Record<string, string> = {
  "/images/stories/welcome-aboard-september-2026.webp": "62% 45%",
  "/images/stories/kolkata-forever-day-in-a-city.webp": "50% 40%",
  "/images/stories/ranveer-brar-conversation.webp": "62% 34%",
  "/images/stories/five-monsoon-escapes-rain-kissed-splendour.webp": "35% 60%",
  "/images/stories/kitchen-healing-traditional-superfoods.webp": "45% 55%",
  "/images/stories/global-flavours-take-off.webp": "50% 45%",
  "/images/stories/sweet-devotion-modak-traditions.webp": "50% 55%",
  "/images/stories/ladakh-roof-of-the-world.webp": "50% 55%",
  "/images/stories/saving-the-greater-one-horned-rhino.webp": "45% 68%",
  "/images/stories/my-hometown-gwalior.webp": "50% 50%",
  "/images/stories/icons-of-new-india.webp": "50% 62%",
  "/images/stories/from-estate-to-espresso.webp": "50% 35%",
  "/images/stories/sittong-orange-valley-hills.webp": "42% 38%",
  "/images/stories/my-hometown-wayanad.webp": "50% 58%",
  "/images/stories/varanasi-the-eternal-city.webp": "24% 48%",
  "/images/stories/day-in-a-city-pune.webp": "40% 55%",
  "/images/stories/live-long-travel-longer.webp": "45% 28%",
  "/images/stories/japanese-desserts-india.webp": "50% 60%",
  "/images/stories/fur-all-pet-yoga.webp": "50% 50%",
  "/images/stories/my-hometown-jaipur.webp": "50% 50%",
};

/** CSS object-position for a story image; centred when not listed. */
export function imageFocus(src?: string): string {
  return (src && FOCUS[src]) || "50% 50%";
}
