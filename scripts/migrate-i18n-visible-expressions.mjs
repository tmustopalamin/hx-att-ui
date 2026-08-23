import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const appRoot = path.join(root, "app");
const staticSourceFile = path.join(appRoot, "i18n", "staticTextSources.ts");
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
  "value",
  "alt",
  "aria-label",
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
  "detail",
  "chooseLabel",
  "cancelLabel",
  "hint",
  "suffix",
  "text",
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
const translatedCallNames = new Set([
  "showWarning",
  "showSuccess",
  "showError",
  "notify",
  "toast",
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

const sourceMap = new Map();
if (fs.existsSync(staticSourceFile)) {
  const existing = fs.readFileSync(staticSourceFile, "utf8");
  for (const match of existing.matchAll(
    /"(static\.[^"]+)"\s*:\s*"((?:\\.|[^"\\])*)"/g,
  )) {
    try {
      sourceMap.set(match[1], JSON.parse(`"${match[2]}"`));
    } catch {
      // Keep the migration resilient if a generated entry is malformed.
    }
  }
}

const getKey = (value) => {
  const source = normalize(value);
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
  return Boolean(name && /^[A-Z]/.test(name));
};

const getComponentFunction = (node) => {
  let current = node.parent;
  let firstFunction = null;
  while (current) {
    if (isFunctionLike(current)) {
      firstFunction ??= current;
      if (isLikelyComponent(current)) return current;
    }
    current = current.parent;
  }
  return firstFunction;
};

const getFunctionBody = (node) =>
  node?.body && ts.isBlock(node.body) ? node.body : null;

const translatorFromSource = (sourceText) => {
  const match = sourceText.match(
    /(?:const|let)\s*\{[^}]*\bt\b\s*(?::\s*([A-Za-z_$][\w$]*))?[^}]*\}\s*=\s*useI18n\s*\(/,
  );
  if (!match) return "i18nT";
  return match[1] || "t";
};

const hasUseI18nImport = (sourceFile) => {
  let found = false;
  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (
      node.moduleSpecifier.getText(sourceFile).replaceAll('"', "") ===
      "@/app/i18n"
    ) {
      found = true;
    }
  });
  return found;
};

const hasTranslatorInBody = (sourceText, body, translator) => {
  const bodyText = sourceText.slice(body.pos, body.end);
  const binding =
    translator === "t"
      ? "(?:t\\b|t\\s*:\\s*[A-Za-z_$][\\w$]*)"
      : `(?:${translator}\\b|t\\s*:\\s*${translator}\\b)`;
  return new RegExp(
    `(?:const|let)\\s*\\{[^}]*${binding}[^}]*\\}\\s*=\\s*useI18n\\s*\\(`,
  ).test(bodyText);
};

const isTranslatorCall = (node, sourceFile) => {
  let current = node.parent;
  while (current) {
    if (ts.isCallExpression(current)) {
      const expression = current.expression.getText(sourceFile);
      if (
        expression === "t" ||
        expression === "i18nT" ||
        expression === "tText"
      ) {
        return true;
      }
    }
    if (ts.isStatement(current)) break;
    current = current.parent;
  }
  return false;
};

const isConditionString = (node) => {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isBinaryExpression(parent)) {
    const operator = parent.operatorToken.kind;
    const comparisonOperators = new Set([
      ts.SyntaxKind.EqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ts.SyntaxKind.GreaterThanToken,
      ts.SyntaxKind.GreaterThanEqualsToken,
      ts.SyntaxKind.LessThanToken,
      ts.SyntaxKind.LessThanEqualsToken,
      ts.SyntaxKind.InKeyword,
      ts.SyntaxKind.InstanceOfKeyword,
    ]);
    if (comparisonOperators.has(operator)) return true;
  }
  let current = parent;
  while (current) {
    if (ts.isConditionalExpression(current) && current.condition !== node) {
      return (
        current.condition === node ||
        (current.condition.getStart() <= node.getStart() &&
          node.getEnd() <= current.condition.end)
      );
    }
    if (ts.isJsxExpression(current) || ts.isPropertyAssignment(current)) break;
    current = current.parent;
  }
  return false;
};

const rewriteOutput = (node, sourceFile, translator) => {
  if (!node || isTranslatorCall(node, sourceFile)) return null;

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (isConditionString(node) || !isVisibleText(node.text)) return null;
    return `${translator}(${JSON.stringify(getKey(node.text))})`;
  }

  if (ts.isTemplateExpression(node)) {
    const staticParts = [node.head.text];
    const expressions = [];
    for (const span of node.templateSpans) {
      expressions.push(
        rewriteOutput(span.expression, sourceFile, translator) ??
          span.expression.getText(sourceFile),
      );
      staticParts.push(span.literal.text);
    }
    const source = normalize(
      staticParts.reduce(
        (result, part, index) =>
          `${result}${part}${index < expressions.length ? `{p${index}}` : ""}`,
        "",
      ),
    );
    if (!isVisibleText(source)) return null;
    const key = getKey(source);
    if (expressions.length === 0)
      return `${translator}(${JSON.stringify(key)})`;
    return `${translator}(${JSON.stringify(key)}, { ${expressions
      .map((expression, index) => `p${index}: ${expression}`)
      .join(", ")} })`;
  }

  if (ts.isConditionalExpression(node)) {
    const whenTrue = rewriteOutput(node.whenTrue, sourceFile, translator);
    const whenFalse = rewriteOutput(node.whenFalse, sourceFile, translator);
    if (!whenTrue && !whenFalse) return null;
    return `${node.condition.getText(sourceFile)} ? ${whenTrue ?? node.whenTrue.getText(sourceFile)} : ${whenFalse ?? node.whenFalse.getText(sourceFile)}`;
  }

  if (ts.isParenthesizedExpression(node)) {
    const inner = rewriteOutput(node.expression, sourceFile, translator);
    return inner ? `(${inner})` : null;
  }

  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (
      operator === ts.SyntaxKind.QuestionQuestionToken ||
      operator === ts.SyntaxKind.BarBarToken ||
      operator === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      const right = rewriteOutput(node.right, sourceFile, translator);
      return right
        ? `${node.left.getText(sourceFile)} ${node.operatorToken.getText(sourceFile)} ${right}`
        : null;
    }
  }

  return null;
};

const applyReplacements = (sourceText, replacements) => {
  let output = sourceText;
  for (const replacement of [...replacements].sort(
    (a, b) => b.start - a.start,
  )) {
    output = `${output.slice(0, replacement.start)}${replacement.replacement}${output.slice(replacement.end)}`;
  }
  return output;
};

let changedFiles = 0;
let changedExpressions = 0;
for (const fileName of filesIn(appRoot)) {
  const originalSourceText = fs.readFileSync(fileName, "utf8");
  const sourceText = originalSourceText
    .replace(/(toast\(\s*)i18nT\(\"static\.9bb0pd\"\)/g, '$1"error"')
    .replace(/(toast\(\s*)i18nT\(\"static\.g72xw0\"\)/g, '$1"success"');
  if (sourceText !== originalSourceText) {
    fs.writeFileSync(fileName, sourceText, "utf8");
  }
  if (!sourceText.includes("use client") && !sourceText.includes("useI18n")) {
    continue;
  }
  const sourceFile = parseSource(fileName, sourceText);
  const translator = translatorFromSource(sourceText);
  const replacements = [];
  const components = new Set();

  const addExpressionReplacement = (node) => {
    const component = getComponentFunction(node);
    const body = getFunctionBody(component);
    if (!body) return;
    const replacement = rewriteOutput(node, sourceFile, translator);
    if (!replacement || replacement === node.getText(sourceFile)) return;
    replacements.push({
      start: node.getStart(sourceFile),
      end: node.end,
      replacement,
    });
    components.add(component);
    changedExpressions += 1;
  };

  const addDirectReplacement = (node, replacement) => {
    const component = getComponentFunction(node);
    const body = getFunctionBody(component);
    if (!body) return;
    replacements.push({
      start: node.getStart(sourceFile),
      end: node.end,
      replacement,
    });
    components.add(component);
    changedExpressions += 1;
  };

  const visit = (node) => {
    if (ts.isJsxExpression(node) && node.expression) {
      const parent = node.parent;
      if (ts.isJsxElement(parent) || ts.isJsxFragment(parent)) {
        addExpressionReplacement(node.expression);
      }
    }

    if (
      ts.isJsxAttribute(node) &&
      visibleAttributes.has(node.name.text) &&
      isVisualValueAttribute(node, sourceFile)
    ) {
      const initializer = node.initializer;
      if (
        initializer &&
        ts.isJsxExpression(initializer) &&
        initializer.expression
      ) {
        addExpressionReplacement(initializer.expression);
      } else if (
        initializer &&
        ts.isStringLiteral(initializer) &&
        isVisibleText(initializer.text) &&
        !initializer.text.startsWith("static.")
      ) {
        addDirectReplacement(
          initializer,
          `{${translator}(${JSON.stringify(getKey(initializer.text))})}`,
        );
      }
    }

    if (ts.isCallExpression(node)) {
      const callName = node.expression.getText(sourceFile);
      if (translatedCallNames.has(callName)) {
        const firstVisibleArgument =
          callName === "notify" || callName === "toast" ? 1 : 0;
        node.arguments.forEach((argument, index) => {
          if (index < firstVisibleArgument || ts.isSpreadElement(argument))
            return;
          addExpressionReplacement(argument);
        });
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/["']/g, "");
      if (visibleProperties.has(name)) {
        if (ts.isStringLiteral(node.initializer)) {
          if (
            isVisibleText(node.initializer.text) &&
            !node.initializer.text.startsWith("static.")
          ) {
            addDirectReplacement(
              node.initializer,
              `${translator}(${JSON.stringify(getKey(node.initializer.text))})`,
            );
          }
        } else {
          addExpressionReplacement(node.initializer);
        }
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!replacements.length) continue;

  const insertions = [];
  for (const component of components) {
    const body = getFunctionBody(component);
    if (!body || hasTranslatorInBody(sourceText, body, translator)) continue;
    insertions.push({
      start: body.getStart(sourceFile) + 1,
      end: body.getStart(sourceFile) + 1,
      replacement: `\n  const { t: i18nT } = useI18n();`,
    });
  }

  if (!hasUseI18nImport(sourceFile)) {
    const directive = sourceText.match(/^\s*["']use client["'];?\s*/);
    insertions.push({
      start: directive ? directive[0].length : 0,
      end: directive ? directive[0].length : 0,
      replacement: 'import { useI18n } from "@/app/i18n";\n',
    });
  }

  const output = applyReplacements(sourceText, [
    ...replacements,
    ...insertions,
  ]);
  if (output !== sourceText) {
    fs.writeFileSync(fileName, output, "utf8");
    changedFiles += 1;
  }
}

const sourceLines = [
  "// Generated from user-facing static UI literals. Keep keys stable.",
  "const staticTextSources = {",
  ...[...sourceMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
    ),
  "} as const;",
  "",
  "export default staticTextSources;",
  "",
];
fs.writeFileSync(staticSourceFile, sourceLines.join("\n"), "utf8");

console.log(
  `Migrated ${changedExpressions} visible expressions in ${changedFiles} files.`,
);
