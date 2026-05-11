import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const HTML_PATH = path.join(ROOT, "Claude Daniel Spanish_writing_B1B2_103.html");
const OUT_DIR = path.join(ROOT, "data", "topics", "es", "writing");
const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

function slugify(value) {
  return String(value || "topic")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "topic";
}

function countWords(text) {
  const cleaned = String(text || "").trim();
  return cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0;
}

const html = fs.readFileSync(HTML_PATH, "utf8");
const match = html.match(/const TOPICS = (\[[\s\S]*?\]);\s*const FEATURES/);

if (!match) {
  throw new Error("Could not find TOPICS array in the HTML file.");
}

const topics = vm.runInNewContext(match[1]);
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [index, topic] of topics.entries()) {
  const examples = LEVELS
    .map((level) => {
      const body = String(topic[level] || "").trim();
      if (!body) return null;
      const label = level.toUpperCase();
      return {
        level: label,
        title: String(topic[`${level}Title`] || `${label} model`).trim(),
        body,
        wordCount: countWords(body)
      };
    })
    .filter(Boolean);

  const id = slugify(topic.id || topic.title);
  const payload = {
    id,
    language: "es",
    skill: "writing",
    order: index + 1,
    category: topic.category || "General",
    title: topic.title,
    prompt: topic.prompt,
    format: topic.format || "",
    levelRange: topic.levelRange || examples.map((example) => example.level).join(" - "),
    levels: examples.map((example) => example.level),
    examples,
    tags: [],
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), JSON.stringify(payload, null, 2) + "\n", "utf8");
}

console.log(`Migrated ${topics.length} topics to ${path.relative(ROOT, OUT_DIR)}`);
