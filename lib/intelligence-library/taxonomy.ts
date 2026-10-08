// Keep these values aligned with the extraction contract in
// scripts/intelligence/enums.py. Geography is excluded because the extractor
// returns structured country and jurisdiction values. ZAP relevance is a
// project-specific database field rather than an extraction enum.
const INTELLIGENCE_TAXONOMY = {
  exploitationTypes: [
    "financial sextortion",
    "AI-generated CSAM",
    "online grooming",
    "deepfake abuse",
    "offender networks",
    "nihilistic violent networks",
    "other",
  ],
  platforms: [
    "Roblox",
    "Discord",
    "Telegram",
    "Snapchat",
    "Instagram",
    "other",
  ],
  technologies: [
    "generative AI",
    "deepfakes/synthetic media",
    "cryptocurrency",
    "encrypted messaging",
    "gaming platforms",
    "social media",
    "emerging technology",
    "other",
  ],
  affectedPopulations: [
    "children",
    "adolescents",
    "boys",
    "girls",
    "male survivors",
    "other",
  ],
  offenderTactics: [
    "grooming",
    "recruitment",
    "coercion",
    "threats",
    "financial demands",
    "impersonation",
    "image manipulation",
    "payment demands",
    "networked offending",
    "other",
  ],
  intelTypes: [
    "research finding",
    "case/prosecution",
    "court decision",
    "legislation",
    "policy/regulatory change",
    "platform update",
    "safety update",
    "professional guidance",
    "other",
  ],
} as const;

export default INTELLIGENCE_TAXONOMY;
