const fs = require("fs");

// Helper function to filter "_No response_" and empty values
function filterNoResponse(value) {
  if (
    typeof value === "string" &&
    (value === "_No response_" || !value.trim())
  ) {
    return [];
  }
  // If value is an array, return the array after filtering any empty strings or "_No response_"
  if (Array.isArray(value)) {
    return value.filter((v) => v !== "_No response_" && v.trim() !== "");
  }
  return value;
}

// Helper function to handle fields that might be a single string or a multi-line string
function handleMultiLineField(input) {
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === "string") {
    return input
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }
  return [];
}

const issueBody = fs.readFileSync(process.argv[2], "utf8");

console.log("Issue body content:", issueBody);

const data = {};
const regex = /###\s*(.*?)\s*\n\s*([\s\S]*?)(?=\n###|\n*$)/g;
let match;
let matchFound = false;

while ((match = regex.exec(issueBody)) !== null) {
  matchFound = true;
  const key = match[1].trim();
  let value = match[2].trim();

  if (
    ["Purposes", "Stack Levels", "Types", "Rewards", "Technologies"].includes(
      key
    )
  ) {
    value = value.split("\n").map((v) => v.trim());
  } else if (
    [
      "Websites",
      "Documentation",
      "Explorers",
      "Repositories",
      "Social Media",
      "Networks",
    ].includes(key)
  ) {
    value = filterNoResponse(value);
    value = handleMultiLineField(value);
  }

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

if (!data.slug) {
  console.error("Error: Slug not found in issue body.");
  process.exit(1);
}

const output = process.env.GITHUB_OUTPUT;
fs.writeFileSync(output, `slug=${data.slug}\n`);

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

function mapLabelledEntries(entries, fieldType = "") {
  console.log("Mapping labelled entries for field:", fieldType, entries);

  return entries.map((entry) => {
    const lastHyphenIndex = entry.lastIndexOf(" - ");

    if (lastHyphenIndex === -1) {
      if (fieldType === "website") {
        const url = entry.trim();
        const label = url.replace(/^https?:\/\//, "").split("/")[0];
        return { label, url };
      }

      return { label: "", url: entry.trim() };
    }

    const label = entry.slice(0, lastHyphenIndex).trim();
    const url = entry.slice(lastHyphenIndex + 3).trim();

    return { label, url };
  });
}

console.log("Extracted data before processing links:", data);

const outputJson = {
  name: data.name,
  slug: data.slug,
  description: data.description,
  richText: "",
  links: {
    website: mapLabelledEntries(data.websites || [], "website"),
    docs: mapLabelledEntries(data.documentation || []),
    explorer: mapLabelledEntries(data.explorers || []),
    repository: mapLabelledEntries(data.repositories || []),
    social: mapLabelledEntries(data.social || []),
  },
  attributes: {
    networks: handleMultiLineField(data.networks || []),
    purposes: filterSelectedCheckboxes(data.purposes || []),
    stackLevels: filterSelectedCheckboxes(data.stackLevels || []),
    technologies: filterSelectedCheckboxes(data.technologies || []),
    types: filterSelectedCheckboxes(data.types || []),
    rewards:
      data.rewards &&
      data.rewards.some(
        (option) =>
          option.trim().startsWith("- [X]") || option.trim().startsWith("- [x]")
      ),
  },
};

console.log("Generated JSON:", outputJson);

fs.writeFileSync(
  `data/projects/${data.slug}.json`,
  JSON.stringify(outputJson, null, 2) + "\n",
  { encoding: "utf8" }
);
