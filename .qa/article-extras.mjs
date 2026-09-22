// Prompt 6 additions for the 20 verified articles: their other printed
// photographs (gallery), the captions printed with them, and which printed
// blocks are represented elsewhere (headline/byline strings) or decorative.
// Image refs are embedded-image files from extract-images.mjs; "a+b" is one
// photograph printed across a spread. Alt text describes what each photo shows.
//
// Caption format: { label: blockRef, items: [ref | [refs]] } — each item is
// one printed caption, pinned to the exact printed lines ("pNNbK@from-to").

export const EXTRAS = {
  "welcome-aboard-september-2026": {
    uses: ["p4b0", "p4b1", "p4b5", "p4b6"], // headline, signature name and role
  },
  "kolkata-forever-day-in-a-city": {
    gallery: ["p35-1", "p35-2", "p35-3", "p36-1", "p36-2", "p36-3", "p36-4", "p36-5"],
    galleryAlt: {
      "p35-1": "A plated breakfast of eggs, sausages, toast and orange juice",
      "p35-2": "An artisan painting the face of a clay goddess idol",
      "p35-3": "The colonnaded courtyard of a grand colonial building",
      "p36-1": "A serving of biryani",
      "p36-2": "A steel cantilever bridge silhouetted at sunset over a river, with a small boat",
      "p36-3": "Yellow taxis on a busy street at dusk",
      "p36-4": "Sushi pieces lifted with chopsticks from a wooden stand",
      "p36-5": "A long, backlit bar counter in a restaurant",
    },
    captions: [{ items: ["p36b22"] }, { items: ["p36b24"] }],
    uses: ["p34b1", "p34b2", "p34b3", "p34b4", "p36b0"],
    ignore: ["p35b1"], // printed stop numbers (carried as numbers on the subheads)
  },
  "ranveer-brar-conversation": {
    gallery: ["p60-1", "p60-2", "p61-1", "p61-2", "p63-1", "p63-2", "p63-3"],
    galleryAlt: {
      "p60-1": "Ranveer Brar seated in a flowing green outfit, holding flowers",
      "p60-2": "Ranveer Brar in a black chef's jacket, arms crossed, seated behind leafy plants in a restaurant",
      "p61-1": "Ranveer Brar cooking at a stove as steam rises from a pot",
      "p61-2": "Ranveer Brar standing with his luggage in an airport terminal",
      "p63-1": "Ranveer Brar crouching beside a dog in a forest",
      "p63-2": "Ranveer Brar in a yellow outfit, drinking from a cup",
      "p63-3": "Ranveer Brar in a red jacket, seated outdoors against snow-capped mountains",
    },
    uses: ["p59b6", "p59b7", "p60b32"],
  },
  "five-monsoon-escapes-rain-kissed-splendour": {
    // the lead photograph, printed across the opening spread
    hero: "p46-1+p47-1",
    heroAlt: "Terraced tea gardens and a winding road below cloud-covered hills",
    gallery: ["p48-1", "p48-2", "p48-3", "p49-1", "p49-2", "p49-3"],
    galleryAlt: {
      "p46-1+p47-1": "Terraced tea gardens and a winding road below cloud-covered hills, across the opening spread",
      "p48-1": "Trekkers walking in single file across green grassland",
      "p48-2": "A tiger walking along a forest path",
      "p48-3": "A waterfall cascading over rocks",
      "p49-1": "Rolling green hills under a cloudy sky",
      "p49-2": "Pine-covered slopes beneath distant mountains",
      "p49-3": "Two women carrying bundles of wood on their backs walk a stone village path with two young girls",
    },
    captions: [
      { label: "p48b6", items: ["p48b7@0-1", "p48b7@2-3", "p48b7@4-5"] },
      { label: "p49b21", items: ["p49b22@0-1", "p49b22@2-4", "p49b22@5-6"] },
    ],
    uses: ["p46b6", "p46b7", "p46b9", "p46b10", "p46b11", "p48b20"],
  },
  "kitchen-healing-traditional-superfoods": {
    gallery: ["p51-4", "p52-1", "p52-2", "p52-3", "p53-1", "p53-2", "p53-3", "p53-4", "p53-5"],
    galleryAlt: {
      "p51-4": "Two cinnamon sticks, crossed",
      "p52-1": "A bundle of cinnamon sticks",
      "p52-2": "Fresh turmeric, ginger and lemon slices on a wooden board",
      "p52-3": "Green amla fruit in a bowl beside a glass of amla juice",
      "p53-1": "Fresh ginger root on a green leaf",
      "p53-2": "A bowl of millet flour with whole grains on a spoon",
      "p53-3": "Moringa leaves and drumsticks",
      "p53-4": "A bowl of curd with chopped chives",
      "p53-5": "Portrait of a smiling man in glasses and a blue jacket",
    },
    uses: ["p51b0", "p51b2", "p51b3", "p51b4", "p52b31", "p53b34", "p53b40"],
    ignore: ["p53b32"], // decorative quotation marks around the pull quotes
  },
  "global-flavours-take-off": {
    gallery: ["p39-2", "p39-3", "p40-2", "p40-3", "p40-4", "p41-2", "p41-3", "p41-4", "p41-5"],
    galleryAlt: {
      "p39-2": "Several plated restaurant dishes seen from above",
      "p39-3": "A green drink served in a halved coconut",
      "p40-2": "A Korean meal of kimchi and tofu stew seen from above",
      "p40-3": "A white bowl with a small plated dish and scattered garnish",
      "p40-4": "Two glasses of a green drink with fresh herbs",
      "p41-2": "A bowl of curry with vegetables and basil",
      "p41-3": "A fish dish plated with vegetables on a dark plate",
      "p41-4": "A bowl of ramen with corn, greens and an egg",
      "p41-5": "A bowl of a spiced dish with chopsticks and dried chillies",
    },
    captions: [
      { label: "p39b46", items: ["p39b47@0-0", "p39b47@1-1"] },
      { label: "p40b30", items: ["p40b31@0-1", "p40b31@2-2", "p40b31@3-3"] },
      { label: "p41b5", items: ["p41b6@0-0", "p41b6@1-1", "p41b6@2-2"] },
    ],
    uses: ["p38b0", "p38b7", "p38b8", "p38b10", "p38b11", "p40b0"],
  },
  "sweet-devotion-modak-traditions": {
    gallery: ["p56-2", "p56-4", "p57-2", "p57-3", "p57-4"],
    galleryAlt: {
      "p56-2": "Illustration of modaks in several colours",
      "p56-4": "Illustration of a woman preparing dough beside two bowls",
      "p57-2": "Illustration of a plate of fried modaks",
      "p57-3": "Illustration of an offering platter with sweets and a coconut",
      "p57-4": "Illustration of Lord Ganesha holding a modak",
    },
    uses: ["p55b1", "p55b10", "p55b11", "p55b12", "p56b31", "p57b53"],
  },
  "saving-the-greater-one-horned-rhino": {
    uses: ["p65b0", "p66b0"],
  },
  "ladakh-roof-of-the-world": {
    // the lead photograph (p69-1) is the hero, shown above the photographs
    gallery: ["p69-3", "p69-4", "p70-1", "p70-2", "p71-1", "p71-2", "p72-1", "p72-2", "p72-3", "p72-4"],
    galleryAlt: {
      "p69-3": "An elderly woman in traditional dress holding a hand prayer wheel",
      "p69-4": "A colourful mural painting depicting the life of the Buddha",
      "p70-1": "A turquoise lake beneath bare brown mountains",
      "p70-2": "Yaks grazing beside a blue lake",
      "p71-1": "A clear stream running through a rocky valley past trees",
      "p71-2": "A line of camel riders crossing a sandy valley below mountains",
      "p72-1": "Two monks in red robes blowing long horns",
      "p72-2": "A decorated ritual mask featuring skulls",
      "p72-3": "Young monks in red robes resting on a hillside",
      "p72-4": "A row of prayer wheels set in a red wall",
    },
    captions: [
      { label: "p69b1", items: ["p69b2@0-8", "p69b2@9-10", "p69b2@11-14"] },
      { label: "p70b0", items: ["p70b1@0-3", "p70b1@4-7"] },
      { label: "p71b0", items: ["p71b1@0-3", "p71b1@4-7"] },
      { label: "p72b0", items: ["p72b1@0-3", "p72b1@4-5", "p72b1@6-7", "p72b1@8-10"] },
    ],
    uses: ["p69b3", "p69b4", "p70b2", "p72b2"],
  },
  "my-hometown-gwalior": {
    gallery: ["p74-2", "p74-4", "p75-1", "p75-2", "p75-3", "p75-4"],
    galleryAlt: {
      "p74-2": "A tall carved stone temple",
      "p74-4": "Portrait of a woman in a black top with a red lanyard",
      "p75-1": "A large seated statue carved into a rock face",
      "p75-2": "A statue of a rider on a rearing white horse",
      "p75-3": "Bowls of poha and jalebi",
      "p75-4": "An ornately carved stone temple under a blue sky",
    },
    uses: ["p74b0", "p74b4", "p74b5", "p74b31"],
  },
  "icons-of-new-india": {
    gallery: ["p53-2", "p53-3", "p54-2", "p54-3", "p55-2", "p55-3", "p55-4"],
    galleryAlt: {
      "p53-2": "A narrow view of a pine tree against a rocky mountainside",
      "p53-3": "A road leading to a tunnel entrance beneath a snowy mountain slope",
      "p54-2": "A river winding through a broad mountain valley",
      "p54-3": "A railway arch bridge spanning a deep river gorge",
      "p55-2": "A narrow view of a green hillside",
      "p55-3": "The glass-fronted facade of a railway station with cars parked in front",
      "p55-4": "A railway platform with passengers and an exit sign",
    },
    captions: [
      { label: "p54b11", items: ["p54b12@0-0", "p54b12@1-2"] },
      { label: "p55b5", items: ["p55b6@0-1", "p55b6@2-3"] },
      { items: ["p55b19", "p55b20"] }, // name printed beside two photographs
    ],
    uses: ["p52b0", "p52b6", "p52b7", "p52b8", "p54b0"],
  },
  "from-estate-to-espresso": {
    gallery: ["p58-1", "p58-2", "p58-3", "p59-1", "p59-2", "p59-3", "p59-4"],
    galleryAlt: {
      "p58-1": "A worker picking coffee cherries among dense green bushes",
      "p58-2": "A layered coffee drink garnished with a slice of orange",
      "p58-3": "A woman smiling as she holds a cup of coffee",
      "p59-1": "Coffee beans being roasted in a drum",
      "p59-2": "Visitors at a coffee stall",
      "p59-3": "A man serving coffee to two guests at an outdoor table",
      "p59-4": "A glass of coffee and a steel jug on a wooden tray",
    },
    uses: ["p57b2", "p57b3", "p57b5", "p57b11", "p58b12", "p59b9"],
  },
  "sittong-orange-valley-hills": {
    // the lead photograph, printed across the opening spread
    hero: "p66-1+p67-1",
    heroAlt: "Snow-capped peaks above a sea of cloud, with horses grazing on a hillside",
    gallery: ["p68-1", "p68-2", "p68-3", "p68-4"],
    galleryAlt: {
      "p66-1+p67-1": "Snow-capped peaks above a sea of cloud, with horses grazing on a hillside, across the opening spread",
      "p68-1": "A steel bridge over a rocky river surrounded by forest",
      "p68-2": "A painted mask at a monastery",
      "p68-3": "Oranges ripening on a tree",
      "p68-4": "A plate of momos with two dipping sauces",
    },
    captions: [
      { label: "p68b6", items: ["p68b7@0-2", "p68b7@3-4", ["p68b7@5-5", "p68b8"]] },
      { label: "p68b9", items: ["p68b11"] },
    ],
    uses: ["p66b1", "p66b2", "p66b8", "p66b9", "p66b11", "p66b12", "p68b17"],
  },
  "my-hometown-wayanad": {
    gallery: ["p74-2", "p74-4", "p75-1", "p75-2", "p75-3", "p75-4", "p75-5"],
    galleryAlt: {
      "p74-2": "A man walking through a green field beneath tall areca palms",
      "p74-4": "Portrait of a young woman in a SpiceJet uniform",
      "p75-1": "A mahout riding an elephant along a forest path",
      "p75-2": "Fried fish served on a banana leaf with lime and a dip",
      "p75-3": "A woman picking tea leaves among tea bushes",
      "p75-4": "A small boat on a calm lake under a cloudy sky",
      "p75-5": "The dark entrance of a rock cave",
    },
    uses: ["p74b0", "p74b4", "p74b5", "p74b10"],
  },
  "varanasi-the-eternal-city": {
    // the lead photograph, printed across the opening spread
    hero: "p56-1+p57-1",
    heroAlt: "Old riverside buildings and ghats in hazy golden light, with boats moored along the river",
    gallery: ["p57-2", "p58-1", "p58-2", "p58-3"],
    galleryAlt: {
      "p56-1+p57-1": "Old riverside buildings and ghats in hazy golden light, with boats moored along the river, across the opening spread",
      "p57-2": "A row of priests holding up lamps during a riverside evening ritual",
      "p58-1": "Brightly coloured silk saris with woven patterns",
      "p58-2": "A plate of chaat topped with sev",
      "p58-3": "Musicians performing on stage",
    },
    captions: [{ label: "p58b47", items: ["p58b48@0-2", "p58b48@3-4", "p58b48@5-7"] }],
    uses: ["p56b1", "p56b2", "p56b3", "p56b5", "p56b11", "p58b54"],
  },
  "day-in-a-city-pune": {
    // the lead photograph, printed across the opening spread
    hero: "p42-1+p43-1",
    heroAlt: "A road winding through green hills above a lake",
    gallery: ["p43-2", "p43-3", "p44-1", "p44-2", "p44-3"],
    galleryAlt: {
      "p42-1+p43-1": "A road winding through green hills above a lake, across the opening spread",
      "p43-2": "A hilltop fort surrounded by trees",
      "p43-3": "The stone gateway and walls of a fort",
      "p44-1": "Cups of tea beside a bowl of round snacks",
      "p44-2": "A white building with a tower seen through trees",
      "p44-3": "A city highway lined with high-rise buildings at dusk",
    },
    uses: ["p42b5", "p42b7", "p42b8", "p42b9", "p44b0"],
    ignore: ["p44b7"], // printed stop numbers
  },
  "live-long-travel-longer": {
    gallery: ["p54-1", "p54-2", "p54-3", "p55-1", "p55-2"],
    galleryAlt: {
      "p54-1": "A woman meditating in a curved, cave-like alcove",
      "p54-2": "A palace-like resort on a hilltop with terraced gardens",
      "p54-3": "A therapist placing glass cupping cups on the back of a woman lying face down",
      "p55-1": "Two people in white walking along a garden path",
      "p55-2": "A tray of healthy snacks and fresh juices",
    },
    captions: [
      { label: "p54b6", items: ["p54b7@0-1", "p54b7@2-2", "p54b7@3-3"] },
      { label: "p55b26", items: ["p55b27@0-0", "p55b27@1-1"] },
    ],
    uses: ["p52b0", "p52b2", "p52b3", "p52b4", "p54b0"],
  },
  "japanese-desserts-india": {
    gallery: ["p64-1", "p65-1", "p65-2"],
    galleryAlt: {
      "p64-1": "A caramel pudding cake topped with a flower",
      "p65-1": "Sauce being poured over a plated dessert",
      "p65-2": "A scoop of dark ice cream in a glass bowl with berries",
    },
    captions: [{ items: ["p64b9"] }, { items: ["p65b1", "p65b2"] }],
    uses: ["p63b0", "p63b1", "p63b2", "p63b11", "p64b15", "p65b8"],
  },
  "fur-all-pet-yoga": {
    gallery: ["p68-1", "p68-2", "p69-1", "p69-2"],
    galleryAlt: {
      "p68-1": "A woman in a yoga pose beside a black dog on a mat",
      "p68-2": "A man and a woman doing yoga lunges with a small dog between them",
      "p69-1": "A man meditating on a mat with a cat lying beside him",
      "p69-2": "A woman in a downward-dog pose with a cat on the mat",
    },
    uses: ["p67b0", "p67b2", "p67b3", "p67b6", "p68b11", "p69b15"],
  },
  "my-hometown-jaipur": {
    gallery: ["p74-2", "p74-5", "p75-1", "p75-2", "p75-3"],
    galleryAlt: {
      "p74-2": "Fort walls running along a green hillside above a city",
      "p74-5": "Portrait of a man in a black suit and red tie in front of a SpiceJet banner",
      "p75-1": "A sandstone fort and palace complex under a blue sky",
      "p75-2": "A plate of fried pakoras with a glass of tea",
      "p75-3": "The honeycombed pink facade of a palace",
    },
    uses: ["p74b0", "p74b6", "p74b7", "p74b11"],
  },
};
