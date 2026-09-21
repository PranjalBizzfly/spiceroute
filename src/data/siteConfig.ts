import { PartnerBrand, StatItem } from "@/types";

export const siteConfig = {
  name: "Spice Route",
  tagline: "The Inflight Magazine of SpiceJet",
  // Verbatim from the spiceroutemagazine.in homepage hero
  description:
    "SpiceRoute, SpiceJet’s in-flight magazine, brings you engaging content on travel, lifestyle, food, culture, and more.",
  publisher: {
    name: "NKN Media FZ LLC",
    // Verbatim from "About NKN Media" on spiceroutemagazine.in/about
    about: [
      "Since 1999, NKN Media has been a leading global communications firm, operating across numerous countries such as India, United Arab Emirates, Singapore, Bahrain, Malaysia, Sri Lanka, the United Kingdom, and Canada. Specializing in a wide range of media services including Television, Print, Digital, Travel Media, Radio, Cinema, and OOH, NKN Media is a powerhouse in the industry with a comprehensive 360-degree approach to meeting clients’ needs.",
      "NKN Media proudly holds prestigious partnerships with top media brands like NDTV, Aaj Tak, Republic TV, India TV, India Today, Times Now, and Zoom TV, including the publishing of SpiceJet’s in-flight magazine, Spice Route. With a vision to excel as a global media outsourcing company, NKN Media prioritizes delivering value to clients and fostering organizational growth. NKN’s commitment to innovation and service excellence ensures the ongoing provision of premium media solutions.",
    ],
    // First sentence of the second paragraph above, used beside the partner logos
    partnerships:
      "NKN Media proudly holds prestigious partnerships with top media brands like NDTV, Aaj Tak, Republic TV, India TV, India Today, Times Now, and Zoom TV, including the publishing of SpiceJet’s in-flight magazine, Spice Route.",
    ceo: {
      name: "Mr. Abdul Majid Khan",
      role: "Chief Executive Officer, NKN Media",
      // Verbatim from the "CEO's Note" on spiceroutemagazine.in/about. It is
      // written in the third person, so it is never set as a quotation.
      note: [
        "Mr. Abdul Majid Khan, a seasoned media professional boasting over 24 years of experience in both Indian and international media organizations. Known for his innovative approach and a keen eye for discovering new avenues of growth, Mr. Khan is guided by strong values of agility, adaptability, resilience, and competence.",
        "As the CEO, he shoulders the challenging responsibility of driving revenue growth for partner satellite channels in India and Dubai, along with forging new media partnerships. Mr. Khan’s exceptional adaptability skills and practical techniques are not only noteworthy but also highly relevant in today’s dynamic world.",
      ],
    },
  },
  spiceJet: {
    name: "SpiceJet",
    // Verbatim from the "About Spice Route" section of spiceroutemagazine.in
    overview:
      "SpiceJet, a leading private airline in India, operates from its headquarters in Gurgaon. Recognized for its industry-leading passenger load factor and ranking as the second-largest domestic carrier by market share (as per DGCA reports), SpiceJet connects 53 Domestic and 10 International destinations.",
    // Verbatim line under "SpiceJet in Numbers" on the source homepage
    regional:
      "Flying to over 63 destinations, SpiceJet is the India’s largest regional player operating multiple daily flights under UDAN, the Regional Connectivity Scheme.",
    // Verified in NKN Media's media library ("MEDIA KIT 2025-26"). The former
    // /2025/11/ copy of this file returns 404.
    mediaKitUrl:
      "https://nknmedia.ae/wp-content/uploads/2026/06/SpiceRoute-Mediakit-2025.pdf",
  },
  spiceRoute: {
    // Verbatim from the "About Spice Route" section of spiceroutemagazine.in
    about: [
      "Spice Route, the in-flight magazine of SpiceJet, stands as a testament to excellence in publication, marking 17 years of consistent readership. Published by NKN Media, it reaches an audience of over one million passengers monthly, solidifying its position as one of the most widely circulated in-flight magazines.",
      "With a focus on delivering high-quality, diverse content, Spice Route explores topics such as travel, lifestyle, fashion, cuisine, cinema, culture, and spirituality, offering passengers an engaging and sophisticated reading experience throughout their journey.",
    ],
    // Source homepage advertising band
    advertisingNote:
      "Have questions? Contact us, and our team will assist you with advertising opportunities in SpiceRoute.",
  },
  contact: {
    email: "info@nknmedia.in",
    phoneDubai: "+971 52 822 8316",
    phoneIndia: "+91 98404 38680",
    whatsapp: "+971 52 219 3009",
    whatsappUrl: "https://wa.me/971522193009",
    // Verbatim from the source site footer ("Get in Touch")
    address:
      "Dubai Media City Building 6 – 1st floor – Office # 109 King Salman Bin Abdulaziz Al Saud St – Al Sufouh – Al Sufouh 2 – Dubai",
    socials: {
      twitter: "https://twitter.com/nkn_media",
      facebook: "https://facebook.com/nknmedia.ae",
      instagram: "https://instagram.com/nknmedia.ae",
      linkedin: "https://linkedin.com/company/nkn-media",
    },
  },
  pillars: [
    {
      title: "Leading Airline",
      description:
        "SpiceJet efficiently connects 53 domestic and 10 international destinations, offering reliability and accessibility.",
      icon: "airplane",
    },
    {
      title: "Diverse Content",
      description:
        "Covers travel, lifestyle, cuisine, cinema, culture, spirituality, and fashion for engaging passenger experiences.",
      icon: "book-open",
    },
    {
      title: "In-Flight Magazine",
      description:
        "Spice Route, celebrating 17 years of excellence, offers diverse, engaging content to over one million monthly passengers worldwide.",
      icon: "sparkles",
    },
    {
      title: "Passenger Experience",
      description:
        "Delivers sophisticated reading and cultural enrichment, enhancing passenger journeys with engaging, high-quality content.",
      icon: "compass",
    },
  ],
  // "SpiceJet in Numbers" on the spiceroutemagazine.in homepage: the source
  // labels and counter values (data-to-value), nothing added.
  // Source footnote: "*Data Source: DGCA, FYI 2023-24".
  stats: [
    { id: "passengers-fy24", label: "Passengers Flown in FY 2024", value: "14", numericValue: 14, suffix: "M+" },
    { id: "passenger-load-factor", label: "Passenger Load Factor", value: "90", numericValue: 90, suffix: "%" },
    { id: "consecutive-months", label: "Consecutive Months", value: "58", numericValue: 58 },
    { id: "market-share", label: "Market Share", value: "10", numericValue: 10, suffix: "%" },
    { id: "domestic-flown", label: "Passengers Flown — Domestic", value: "402,949,078", numericValue: 402949078 },
    { id: "intl-flown", label: "Passengers Flown — International", value: "7,119,400", numericValue: 7119400 },
    { id: "domestic-departures", label: "Domestic Departures Daily", value: "320", numericValue: 320 },
    { id: "intl-departures", label: "International Departures Daily", value: "35", numericValue: 35 },
  ] as StatItem[],
  partners: [
    { name: "Aaj Tak", logo: "/images/aajtak.webp" },
    { name: "NDTV", logo: "/images/ndtv.webp" },
    { name: "Republic TV", logo: "/images/republic.webp" },
    { name: "India Today", logo: "/images/indiatoday.webp" },
    { name: "India TV", logo: "/images/indiatv.webp" },
    { name: "Times Now", logo: "/images/timesnow.webp" },
    { name: "Zoom TV", logo: "/images/zoom.webp" },
    { name: "ABP News", logo: "/images/abp.webp" },
    { name: "PTC Network", logo: "/images/ptc.webp" },
    { name: "Ultimate", logo: "/images/ultimate.webp" },
  ] as PartnerBrand[],
};
