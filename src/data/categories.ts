import { Category } from "@/types";

// id: the key stories use (never changes). slug: the public address,
// /stories/<slug>, following the category's name (see lib/urls.ts)
export const categories: Category[] = [
  {
    id: "travel",
    slug: "travel-escapes",
    name: "Travel & Escapes",
    description: "Discover hidden gems, scenic monsoon getaways, and iconic Indian cities.",
  },
  {
    id: "cuisine",
    slug: "food-flavours",
    name: "Food & Flavours",
    description: "Culinary explorations, traditional regional feasts, and global flavours in India.",
  },
  {
    id: "destinations",
    slug: "destinations",
    name: "Destinations",
    description: "Breathtaking landscapes, cultural sanctuaries, and photo journeys across the country.",
  },
  {
    id: "interviews",
    slug: "conversations",
    name: "Conversations",
    description: "Exclusive dialogues with master chefs, visionaries, and notable personalities.",
  },
  {
    id: "wellness",
    slug: "health-healing",
    name: "Health & Healing",
    description: "Ancient Indian superfoods, science-backed nutrition, and everyday wellness practices.",
  },
  {
    id: "wildlife",
    slug: "wildlife-nature",
    name: "Wildlife & Nature",
    description: "Remarkable species, conservation narratives, and India's natural wonders.",
  },
  {
    id: "culture",
    slug: "culture-living",
    name: "Culture & Living",
    description: "Festivals, artisanal heritage, and contemporary reflections from across the sub-continent.",
  },
  {
    id: "predictions",
    slug: "predictions",
    name: "Predictions",
    description: "The monthly astrological predictions, sign by sign, from each edition.",
  },
  {
    // Printed section heading on page 4 of each edition
    id: "welcome-aboard",
    slug: "welcome-aboard",
    name: "Welcome Aboard",
    description: "A letter to readers from SpiceJet's Chairman & Managing Director.",
  },
];
