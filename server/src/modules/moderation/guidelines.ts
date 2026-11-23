export const communityGuidelines = [
  {
    id: "respect",
    title: "Treat people with respect",
    description: "Do not threaten, harass, target, or demean another person. Do not attack someone because of a protected identity or characteristic.",
  },
  {
    id: "professional",
    title: "Keep the community useful",
    description: "Share content connected to skills, work, learning, collaboration, and opportunities. Avoid repeated off-topic promotion or spam.",
  },
  {
    id: "honesty",
    title: "Be honest about who you are and what you offer",
    description: "Do not impersonate people or organizations, invent credentials, post deceptive offers, or use SkillBridge to scam or phish members.",
  },
  {
    id: "privacy",
    title: "Respect privacy and consent",
    description: "Do not publish another person’s private contact details, home address, identity documents, or private messages without permission.",
  },
  {
    id: "safety",
    title: "Keep people safe",
    description: "Do not promote violence, make credible threats, sexually harass members, or share exploitative sexual content. Report urgent safety concerns.",
  },
  {
    id: "rights",
    title: "Respect other people’s work",
    description: "Share work you own or have permission to use. Give credit when you use another person’s ideas or materials.",
  },
  {
    id: "reporting",
    title: "Report concerns in good faith",
    description: "Use the report controls for specific content or behavior. Do not retaliate against members or organize false or repeated reports.",
  },
] as const;

export const communityGuidelinesText = communityGuidelines
  .map((rule) => `${rule.title}: ${rule.description}`)
  .join("\n");

export const moderationContext = "SkillBridge is a professional network. Allow respectful disagreement, criticism of work or organizations, discussion of difficult experiences, educational discussion of harmful topics, and quoted content used to report or condemn abuse. Do not treat a topic, identity, profanity, or negative opinion alone as a violation. When context is unclear, recommend human review.";
