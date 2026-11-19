import taxonomy from "@/scripts/intelligence/taxonomy.json";

const INTELLIGENCE_TAXONOMY = {
  exploitationTypes: Object.values(taxonomy.exploitationTypes),
  platforms: Object.values(taxonomy.platforms),
  technologies: Object.values(taxonomy.technologies),
  affectedPopulations: Object.values(taxonomy.affectedPopulations),
  offenderTactics: Object.values(taxonomy.offenderTactics),
  intelTypes: Object.values(taxonomy.intelTypes),
};

export default INTELLIGENCE_TAXONOMY;
