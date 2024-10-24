const fs = require("fs");

// Read the issue body from the provided file path
const issueBody = fs.readFileSync(process.argv[2], "utf8");

// Debug the full issue body
console.log("Issue body content:", issueBody);

const data = {};
const regex = /###\s*(.*?)\s*\n\s*([\s\S]*?)(?=\n###|\n*$)/g;
let match;
let matchFound = false;

while ((match = regex.exec(issueBody)) !== null) {
  matchFound = true;
  const key = match[1].trim();
  let value = match[2].trim();

  // Process checkboxes and multi-line inputs
  if (["Purposes", "Stack Levels", "Types", "Rewards"].includes(key)) {
    value = value.split("\n").map((v) => v.trim());
  } else if (
    [
      "Websites",
      "Documentation",
      "Explorers",
      "Repositories",
      "Social Media",
      "Technologies",
      "Networks",
    ].includes(key)
  ) {
    // Split into lines, filter empty ones, and trim
    value = value
      .split("\n")
      .filter((v) => v.trim() !== "")
      .map((v) => v.trim());
  }

  // Map keys to match JSON schema property names
  const keyMap = {
    "Project Name": "name",
    Slug: "slug",
    Description: "description",
    Websites: "websites",
    Documentation: "documentation",
    Explorers: "explorers",
    Repositories: "repositories",
    "Social Media": "social",
    Networks: "networks",
    Purposes: "purposes",
    "Stack Levels": "stackLevels",
    Technologies: "technologies",
    Types: "types",
    Rewards: "rewards",
  };

  data[keyMap[key] || key] = value;
}

if (!matchFound) {
  console.error("No matches found in the issue body!");
  process.exit(1);
}

// Ensure 'slug' exists
if (!data.slug) {
  console.error("Error: Slug not found in issue body.");
  process.exit(1);
}

// Set the slug output using the GITHUB_OUTPUT variable
const output = process.env.GITHUB_OUTPUT;
fs.writeFileSync(output, `slug=${data.slug}\n`);

// Helper function to filter selected checkboxes
function filterSelectedCheckboxes(options) {
  return options
    .filter((option) => {
      const trimmedOption = option.trim();
      return (
        trimmedOption.startsWith("- [X]") || trimmedOption.startsWith("- [x]")
      );
    })
    .map((option) => option.replace(/- \[[xX]\] /, "").trim());
}

// Helper function to map repository-like entries with labels and URLs
function mapLabelledEntries(entries) {
  return entries.map((entry) => {
    const [label, url] = entry.includes(" - ")
      ? entry.split(" - ")
      : ["", entry];
    return { label: label.trim(), url: url.trim() };
  });
}

// Map the data to the required JSON structure
const outputJson = {
  name: data.name,
  slug: data.slug,
  description: data.description,
  richText: "", // Add if needed
  links: {
    website: mapLabelledEntries(data.websites || []),
    docs: mapLabelledEntries(data.documentation || []),
    explorer: mapLabelledEntries(data.explorers || []),
    repository: mapLabelledEntries(data.repositories || []),
    social: mapLabelledEntries(data.social || []),
  },
  attributes: {
    networks: data.networks || [],
    purposes: filterSelectedCheckboxes(data.purposes || []),
    stackLevels: filterSelectedCheckboxes(data.stackLevels || []),
    technologies: data.technologies || [],
    types: filterSelectedCheckboxes(data.types || []),
    rewards:
      data.rewards &&
      data.rewards.some(
        (option) =>
          option.trim().startsWith("- [X]") || option.trim().startsWith("- [x]")
      ),
  },
};

// Debug the final JSON structure
console.log("Generated JSON:", outputJson);

// Write the output JSON to the desired location
fs.writeFileSync(
  `data/projects/${data.slug}.json`,
  JSON.stringify(outputJson, null, 2)
);
