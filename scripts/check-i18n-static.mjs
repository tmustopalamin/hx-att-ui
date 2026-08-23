import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const appRoot = path.join(root, "app");
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
  "LoadingDataTable.tsx",
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
const staticCatalog = fs.existsSync(
  path.join(appRoot, "i18n", "staticTextSources.ts"),
)
  ? fs.readFileSync(path.join(appRoot, "i18n", "staticTextSources.ts"), "utf8")
  : "";
const staticCatalogKeys = new Set(
  [...staticCatalog.matchAll(/"(static\.[^"]+)"\s*:/g)].map(
    (match) => match[1],
  ),
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
    )
      files.push(absolute);
  }
  return files;
};

const visible = (value) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return (
    normalized.length > 0 &&
    normalized.length <= 240 &&
    /[A-Za-z\u00C0-\u024F\u4E00-\u9FFF]/.test(normalized)
  );
};

const isVisualValueAttribute = (node, sourceFile) => {
  if (node.name?.getText(sourceFile) !== "value") return true;
  const openingElement = node.parent?.parent;
  const tagName = openingElement?.tagName?.getText(sourceFile) ?? "";
  return !nonVisualValueComponents.has(tagName.split(".").pop());
};

const isTranslatedExpression = (node, sourceFile) => {
  if (!node) return false;
  const text = node.getText(sourceFile);
  return /(?:i18nT|tText|\bt)\s*\(/.test(text);
};

const isComparisonLiteral = (node) => {
  const parent = node.parent;
  if (!parent || !ts.isBinaryExpression(parent)) return false;
  return new Set([
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
  ]).has(parent.operatorToken.kind);
};

const hasUntranslatedOutput = (node, sourceFile) => {
  if (!node || isTranslatedExpression(node, sourceFile)) return false;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return (
      visible(node.text) &&
      !node.text.startsWith("static.") &&
      !isComparisonLiteral(node)
    );
  }
  if (ts.isTemplateExpression(node)) {
    const text = [
      node.head.text,
      ...node.templateSpans.map((span) => span.literal.text),
    ].join(" ");
    return visible(text);
  }
  if (ts.isParenthesizedExpression(node)) {
    return hasUntranslatedOutput(node.expression, sourceFile);
  }
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    return hasUntranslatedOutput(node.expression, sourceFile);
  }
  if (ts.isConditionalExpression(node)) {
    return (
      hasUntranslatedOutput(node.whenTrue, sourceFile) ||
      hasUntranslatedOutput(node.whenFalse, sourceFile)
    );
  }
  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (
      operator === ts.SyntaxKind.QuestionQuestionToken ||
      operator === ts.SyntaxKind.BarBarToken ||
      operator === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      return (
        hasUntranslatedOutput(node.left, sourceFile) ||
        hasUntranslatedOutput(node.right, sourceFile)
      );
    }
    return false;
  }
  // Function calls, property access, object literals, and callback bodies
  // produce dynamic values. Their string arguments are not UI copy by
  // themselves (for example getErrorMessage(error, "message")).
  return false;
};

const findings = [];
for (const fileName of filesIn(appRoot)) {
  const sourceText = fs.readFileSync(fileName, "utf8");
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const relative = path.relative(root, fileName);
  const isSidebarMenu = relative.endsWith("SidebarMenu.tsx");
  const isMetadataProperty = (node) => {
    let parent = node.parent;
    while (parent) {
      if (
        ts.isVariableDeclaration(parent) &&
        parent.name.getText(sourceFile) === "metadata"
      ) {
        return true;
      }
      if (ts.isFunctionDeclaration(parent) || ts.isArrowFunction(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return false;
  };
  const visit = (node) => {
    if (ts.isStringLiteral(node) && node.text.startsWith("static.")) {
      if (!staticCatalogKeys.has(node.text)) {
        findings.push(
          `${relative}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}: missing static catalog key ${node.text}`,
        );
      }
    }
    if (ts.isJsxText(node) && visible(node.getText(sourceFile))) {
      findings.push(
        `${relative}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}: JSX text`,
      );
    }
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
      !isTranslatedExpression(node.expression, sourceFile) &&
      hasUntranslatedOutput(node.expression, sourceFile)
    ) {
      findings.push(
        `${relative}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}: JSX expression`,
      );
    }
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      if (
        visibleAttributes.has(name) &&
        isVisualValueAttribute(node, sourceFile) &&
        node.initializer
      ) {
        if (
          ts.isStringLiteral(node.initializer) &&
          visible(node.initializer.text) &&
          !node.initializer.text.startsWith("static.")
        ) {
          findings.push(
            `${relative}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}: ${name}`,
          );
        }
        if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          !isTranslatedExpression(node.initializer.expression, sourceFile) &&
          hasUntranslatedOutput(node.initializer.expression, sourceFile)
        ) {
          findings.push(
            `${relative}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}: ${name} expression`,
          );
        }
      }
    }
    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sourceFile).replace(/["']/g, "");
      if (
        visibleProperties.has(name) &&
        !(isSidebarMenu && name === "label") &&
        !(
          isMetadataProperty(node) &&
          (name === "title" || name === "description")
        ) &&
        ts.isStringLiteral(node.initializer) &&
        visible(node.initializer.text) &&
        !isTranslatedExpression(node.initializer, sourceFile)
      ) {
        findings.push(
          `${relative}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}: ${name}`,
        );
      }
      if (
        visibleProperties.has(name) &&
        !(isSidebarMenu && name === "label") &&
        !isTranslatedExpression(node.initializer, sourceFile) &&
        !ts.isStringLiteral(node.initializer) &&
        hasUntranslatedOutput(node.initializer, sourceFile)
      ) {
        findings.push(
          `${relative}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}: ${name} expression`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

if (findings.length) {
  console.error(`Found ${findings.length} untranslated visible UI literals:`);
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log("No untranslated visible UI literals found.");
}
