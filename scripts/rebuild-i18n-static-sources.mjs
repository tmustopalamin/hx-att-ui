import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const root = process.cwd();
const appRoot = path.join(root, "app");
const outputFile = path.join(appRoot, "i18n", "staticTextSources.ts");
const ignoredDirectories = new Set([
  "node_modules",
  ".next",
  "coverage",
  "i18n",
  "services",
  "types",
]);
const ignoredFiles = new Set([
  "I18nProvider.test.tsx",
  "PrimeDatePicker.test.tsx",
  "PrimeReactLocaleProvider.test.tsx",
  "ActionConfirmDialog.test.tsx",
]);
const visibleAttributes = new Set([
  "title",
  "description",
  "placeholder",
  "header",
  "tooltip",
  "label",
  "emptyMessage",
  "loadingMessage",
  "filterPlaceholder",
  "currentPageReportTemplate",
  "chooseLabel",
  "cancelLabel",
  "hint",
  "suffix",
  "text",
]);
const visibleProperties = new Set([
  "title",
  "description",
  "placeholder",
  "header",
  "tooltip",
  "label",
  "emptyMessage",
  "loadingMessage",
  "summary",
  "action",
  "confirmLabel",
  "cancelLabel",
  "required",
  "message",
  "chooseLabel",
  "cancelLabel",
  "hint",
  "suffix",
  "text",
  "detail",
]);
const nonVisualValueComponents = new Set([
  "AutoComplete",
  "Calendar",
  "Checkbox",
  "Dropdown",
  "InputNumber",
  "InputSwitch",
  "InputText",
  "MultiSelect",
  "Password",
  "RadioButton",
  "SelectButton",
  "Slider",
  "TriStateCheckbox",
]);

const normalize = (value) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\u00a0/g, " ");

const hashText = (value) => {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const isVisibleText = (value) => {
  const normalized = normalize(value);
  return (
    normalized.length > 0 &&
    normalized.length <= 240 &&
    /[A-Za-z\u00C0-\u024F\u4E00-\u9FFF]/.test(normalized) &&
    !/^(true|false|null|undefined)$/i.test(normalized)
  );
};

const isVisualValueAttribute = (node, sourceFile) => {
  if (node.name?.getText(sourceFile) !== "value") return true;
  const openingElement = node.parent?.parent;
  const tagName = openingElement?.tagName?.getText(sourceFile) ?? "";
  return !nonVisualValueComponents.has(tagName.split(".").pop());
};

const parseSource = (fileName, sourceText) =>
  ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

const filesIn = (directory) => {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesIn(absolute));
    else if (
      (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) &&
      !entry.name.endsWith(".d.ts") &&
      !ignoredFiles.has(entry.name)
    ) {
      files.push(absolute);
    }
  }
  return files;
};

const readExistingCatalog = () => {
  const entries = new Map();
  if (!fs.existsSync(outputFile)) return entries;
  const source = fs.readFileSync(outputFile, "utf8");
  for (const match of source.matchAll(
    /("(static\.[^"]+)"\s*:\s*)("(?:\\.|[^"\\])*")/g,
  )) {
    try {
      entries.set(match[2], JSON.parse(match[3]));
    } catch {
      // Ignore malformed generated entries; source literals will be rebuilt.
    }
  }
  return entries;
};

const existingEntries = readExistingCatalog();
const sourceMap = new Map();
const referencedKeys = new Set();
const supplementalSources = new Map([
  // These keys were introduced in the pre-existing working tree and have no
  // source literal left to recover after the first migration pass.
  ["static.108t1hg", "Copyright"],
  ["static.112tcox", "Not available"],
  ["static.142kvve", "·"],
  ["static.19xoda3", "·"],
  ["static.1wtopll", "(0–100)"],
  ["static.hnl64v", "to"],
  ["static.syyan8", "·"],
]);

const addSource = (value) => {
  const source = normalize(value);
  if (!isVisibleText(source)) return;
  sourceMap.set(`static.${hashText(source)}`, source);
};

const collectFromSource = (fileName, sourceText) => {
  const sourceFile = parseSource(fileName, sourceText);
  const visit = (node) => {
    if (ts.isStringLiteral(node) && node.text.startsWith("static.")) {
      referencedKeys.add(node.text);
    }

    if (ts.isJsxText(node)) addSource(node.getText(sourceFile));

    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      if (
        visibleAttributes.has(name) &&
        isVisualValueAttribute(node, sourceFile) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      ) {
        addSource(node.initializer.text);
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/["']/g, "");
      if (visibleProperties.has(name) && ts.isStringLiteral(node.initializer)) {
        addSource(node.initializer.text);
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
};

const gitFiles = execFileSync(
  "git",
  [
    "-c",
    "safe.directory=C:/Users/toto/Documents/attendance-hx/code/ui",
    "ls-files",
    "app",
  ],
  { cwd: root, encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter((file) => /\.(tsx|ts)$/.test(file))
  .filter(
    (file) => !file.split(/[\\/]/).some((part) => ignoredDirectories.has(part)),
  )
  .filter((file) => !ignoredFiles.has(path.basename(file)));

for (const file of gitFiles) {
  try {
    const source = execFileSync(
      "git",
      [
        "-c",
        "safe.directory=C:/Users/toto/Documents/attendance-hx/code/ui",
        "show",
        `HEAD:${file}`,
      ],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    collectFromSource(file, source);
  } catch {
    // A deleted or unusual source file does not block rebuilding the catalog.
  }
}

for (const file of filesIn(appRoot)) {
  collectFromSource(file, fs.readFileSync(file, "utf8"));
}

// Only keep entries referenced by the migrated UI. This drops accidental code
// fragments from older regex-based catalog generations and keeps the bundle
// focused on copy that can actually be rendered.
for (const key of referencedKeys) {
  if (!sourceMap.has(key) && existingEntries.has(key)) {
    sourceMap.set(key, existingEntries.get(key));
  }
  if (!sourceMap.has(key) && supplementalSources.has(key)) {
    sourceMap.set(key, supplementalSources.get(key));
  }
}

const lines = [
  "// Generated from user-facing static UI literals. Keep keys stable.",
  "const staticTextSources = {",
  ...[...sourceMap.entries()]
    .filter(([key]) => referencedKeys.has(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
    ),
  "} as const;",
  "",
  "export default staticTextSources;",
  "",
];
fs.writeFileSync(outputFile, lines.join("\n"), "utf8");
console.log(`Rebuilt ${sourceMap.size} referenced static source entries.`);
