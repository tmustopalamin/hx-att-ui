import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const appRoot = path.join(root, "app");
const staticSourceFile = path.join(appRoot, "i18n", "staticTextSources.ts");
const includeExtensions = new Set([".tsx", ".ts"]);
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

const visibleAttributeNames = new Set([
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

const visiblePropertyNames = new Set([
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
]);

const sourceMap = new Map();
const hashText = (value) => {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const normalizeText = (value) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\u00a0/g, " ");

if (fs.existsSync(staticSourceFile)) {
  const existingCatalog = fs.readFileSync(staticSourceFile, "utf8");
  for (const match of existingCatalog.matchAll(
    /"(static\.[^"]+)"\s*:\s*"((?:\\.|[^"\\])*)"/g,
  )) {
    try {
      sourceMap.set(match[1], JSON.parse(`"${match[2]}"`));
    } catch {
      // Ignore a malformed generated entry; the current source will rebuild it.
    }
  }
}

const isVisibleText = (value) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length > 240) return false;
  if (!/[A-Za-z\u00C0-\u024F\u4E00-\u9FFF]/.test(normalized)) return false;
  if (/^(true|false|null|undefined)$/i.test(normalized)) return false;
  return true;
};

const getKey = (value) => {
  const source = normalizeText(value);
  const key = `static.${hashText(source)}`;
  sourceMap.set(key, source);
  return key;
};

const isFunctionLike = (node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node);

const functionName = (node) => {
  if (ts.isFunctionDeclaration(node)) return node.name?.text ?? "";
  if (node.parent && ts.isVariableDeclaration(node.parent)) {
    return ts.isIdentifier(node.parent.name) ? node.parent.name.text : "";
  }
  return "";
};

const isLikelyComponent = (node) => {
  const name = functionName(node);
  if (name && /^[A-Z]/.test(name)) return true;
  if (
    node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
    )
  )
    return true;
  return false;
};

const getFunctionAncestors = (node) => {
  const functions = [];
  let current = node.parent;
  while (current) {
    if (isFunctionLike(current)) functions.push(current);
    current = current.parent;
  }
  return functions;
};

const getComponentFunction = (node) => {
  const functions = getFunctionAncestors(node).reverse();
  return functions.find(isLikelyComponent) ?? functions[0] ?? null;
};

const getFunctionBody = (node) => {
  if (node.body && ts.isBlock(node.body)) return node.body;
  return null;
};

const hasUseI18nImport = (sourceFile) => {
  let found = false;
  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (
      node.moduleSpecifier.getText(sourceFile).replaceAll('"', "") !==
      "@/app/i18n"
    )
      return;
    found = true;
  });
  return found;
};

const existingTranslator = (sourceText) => {
  if (/(?:const|let)\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\s*\(/.test(sourceText))
    return "t";
  if (
    /(?:const|let)\s*\{[^}]*\bi18nT\b[^}]*\}\s*=\s*useI18n\s*\(/.test(
      sourceText,
    )
  )
    return "i18nT";
  return null;
};

const hasTranslator = (sourceText, body, translator) => {
  const bodyText = sourceText.slice(body.pos, body.end);
  return new RegExp(
    `(?:const|let)\\s*\\{[^}]*\\b${translator}\\b[^}]*\\}\\s*=\\s*useI18n\\s*\\(`,
  ).test(bodyText);
};

const collectFiles = (directory) => {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(absolute));
    else if (
      includeExtensions.has(path.extname(entry.name)) &&
      !ignoredFiles.has(entry.name) &&
      !entry.name.endsWith(".d.ts")
    )
      files.push(absolute);
  }
  return files;
};

const replacementsForFile = (fileName) => {
  const sourceText = fs.readFileSync(fileName, "utf8");
  if (!sourceText.includes("use client") && !sourceText.includes("useI18n"))
    return null;

  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const replacements = [];
  const functions = new Set();
  const translator = existingTranslator(sourceText) ?? "i18nT";

  const addReplacement = (node, replacement) => {
    const component = getComponentFunction(node);
    const body = component && getFunctionBody(component);
    if (!body) return;
    replacements.push({
      start: node.getStart(sourceFile),
      end: node.end,
      replacement,
    });
    functions.add(component);
  };

  const visit = (node) => {
    if (ts.isJsxText(node) && isVisibleText(node.getText(sourceFile))) {
      const raw = node.getText(sourceFile);
      const normalized = normalizeText(raw);
      const key = getKey(normalized);
      const leading = /^\s/.test(raw) ? '{" "}' : "";
      const trailing = /\s$/.test(raw) ? '{" "}' : "";
      addReplacement(node, `${leading}{${translator}("${key}")}${trailing}`);
    }

    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      const initializer = node.initializer;
      if (
        visibleAttributeNames.has(name) &&
        initializer &&
        ts.isStringLiteral(initializer) &&
        isVisibleText(initializer.text)
      ) {
        const key = getKey(initializer.text);
        addReplacement(initializer, `{${translator}("${key}")}`);
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/["']/g, "");
      const initializer = node.initializer;
      if (
        visiblePropertyNames.has(name) &&
        ts.isStringLiteral(initializer) &&
        isVisibleText(initializer.text)
      ) {
        const key = getKey(initializer.text);
        addReplacement(initializer, `${translator}("${key}")`);
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!replacements.length) return null;

  const insertion = [];
  for (const component of functions) {
    const body = getFunctionBody(component);
    if (!body || hasTranslator(sourceText, body, translator)) continue;
    insertion.push({
      start: body.getStart(sourceFile) + 1,
      end: body.getStart(sourceFile) + 1,
      replacement: "\n  const { t: i18nT } = useI18n();",
    });
  }

  const importsI18n = hasUseI18nImport(sourceFile);
  if (!importsI18n) {
    const directive = sourceText.match(/^\s*["']use client["'];?\s*/);
    insertion.push({
      start: directive ? directive[0].length : 0,
      end: directive ? directive[0].length : 0,
      replacement: 'import { useI18n } from "@/app/i18n";\n',
    });
  }

  return { sourceText, replacements: [...replacements, ...insertion] };
};

const applyReplacements = ({ sourceText, replacements }) => {
  const sorted = [...replacements].sort((a, b) => b.start - a.start);
  let output = sourceText;
  for (const replacement of sorted) {
    output = `${output.slice(0, replacement.start)}${replacement.replacement}${output.slice(
      replacement.end,
    )}`;
  }
  return output;
};

const files = collectFiles(appRoot);
let changedFiles = 0;
for (const fileName of files) {
  const plan = replacementsForFile(fileName);
  if (!plan) continue;
  const output = applyReplacements(plan);
  if (output === plan.sourceText) continue;
  fs.writeFileSync(fileName, output, "utf8");
  changedFiles += 1;
}

const sourceEntries = [...sourceMap.entries()].sort(([a], [b]) =>
  a.localeCompare(b),
);
const sourceLines = [
  "// Generated from user-facing static UI literals. Keep keys stable.",
  "const staticTextSources = {",
  ...sourceEntries.map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  ),
  "} as const;",
  "",
  "export default staticTextSources;",
  "",
];
fs.mkdirSync(path.dirname(staticSourceFile), { recursive: true });
fs.writeFileSync(staticSourceFile, sourceLines.join("\n"), "utf8");

console.log(
  `Migrated ${changedFiles} files and collected ${sourceEntries.length} static strings.`,
);
