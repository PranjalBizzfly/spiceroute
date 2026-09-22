import { AUTO_FOCUS } from "./imageFocus.auto";

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
  "/images/stories/ranveer-brar-conversation.webp": "60% 40%",
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
  // The attention crop pinned these to the top edge (a head cut to its hair,
  // the black ceiling of a dimly lit room)
  "/images/stories/rise-of-the-well-groomed-man.webp": "50% 58%",
  "/images/stories/spa-holidays-to-stay-cool.webp": "50% 60%",
  "/images/stories/predictions-category.webp": "50% 45%",
  "/images/stories/welcome-aboard-august-2026.webp": "50% 50%",
  "/images/stories/welcome-aboard-july-2026.webp": "50% 40%",
  "/images/stories/welcome-aboard-june-2026-v2.webp": "50% 50%",
  "/images/stories/welcome-aboard-may-2026.webp": "50% 50%",
  "/images/stories/from-the-cmds-desk-april-2024.webp": "50% 50%",
  "/images/stories/from-the-cmds-desk-march-2024-v2.webp": "50% 40%",
  "/images/stories/from-the-cmds-desk-february-2024-v2.webp": "50% 35%",
  "/images/stories/predictions-september-2026-v2.webp": "50% 45%",
  "/images/stories/predictions-august-2026-v2.webp": "50% 45%",
  "/images/stories/predictions-july-2026-v2.webp": "50% 50%",
  "/images/stories/predictions-june-2026-v2.webp": "50% 45%",
  "/images/stories/predictions-may-2026-v2.webp": "50% 45%",
  "/images/stories/predictions-april-2026-v2.webp": "50% 50%",
  "/images/stories/predictions-march-2026-v2.webp": "50% 45%",
  "/images/stories/your-forecast-this-month-may-2024-v2.webp": "50% 45%",
  "/images/stories/your-forecast-this-month-april-2024-v2.webp": "50% 45%",
  "/images/stories/your-forecast-this-month-march-2024-v2.webp": "50% 50%",
  "/images/stories/your-forecast-this-month-february-2024-v2.webp": "50% 45%",
};

/**
 * CSS object-position for a story image: the hand-tuned value above, else the
 * generated one (.qa/image-focus.mjs), else centred.
 */
export function imageFocus(src?: string): string {
  return (src && (FOCUS[src] ?? AUTO_FOCUS[src])) || "50% 50%";
}
