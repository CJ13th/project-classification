// scripts/extract-data.js
const fs = require("fs");

function parseIssueBody(issueBody) {
  const data = {};
  const regex = /### (.*?)\n([\s\S]*?)(?=\n###|$)/g;
  let match;

  while ((match = regex.exec(issueBody)) !== null) {
    const key = match[1].trim().toLowerCase().replace(/ /g, "_");
    let value = match[2].trim();

    if (
      key === "purposes" ||
      key === "stack_levels" ||
      key === "types" ||
      key === "rewards"
    ) {
      value = value.split("\n").map((v) => v.trim());
    } else if (
      key === "websites" ||
      key === "documentation" ||
      key === "explorers" ||
      key === "repositories" ||
      key === "social" ||
      key === "technologies" ||
      key === "networks"
    ) {
      value = value
        .split("\n")
        .filter((v) => v.trim() !== "")
        .map((v) => v.trim());
    }

    data[key] = value;
  }

  return data;
}

const issueBody = process.argv[2];
const data = parseIssueBody(issueBody);

// Map the extracted data to your JSON schema structure
const output = {
  name: data.project_name,
  slug: data.slug,
  description: data.description,
  richText: "", // Add if needed
  links: {
    website: data.websites?.map((url) => ({ label: "", url })) || [],
    docs: data.documentation?.map((url) => ({ label: "", url })) || [],
    explorer: data.explorers?.map((url) => ({ label: "", url })) || [],
    repository:
      data.repositories?.map((entry) => {
        const [label, url] = entry.split(" - ");
        return { label: label || "", url: url || "" };
      }) || [],
    social: data.social?.map((url) => ({ label: "", url })) || [],
  },
  attributes: {
    networks: data.networks || [],
    purposes: data.purposes || [],
    stackLevels: data.stack_levels || [],
    technologies: data.technologies || [],
    types: data.types || [],
    rewards:
      data.rewards?.includes("The project can pay rewards to contributors.") ||
      false,
  },
};

// Save the output to a JSON file
fs.writeFileSync("output.json", JSON.stringify(output, null, 2));

// Output the project name for commit message
console.log(`::set-output name=name::${output.name}`);
