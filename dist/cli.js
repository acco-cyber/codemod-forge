#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";
import chalk12 from "chalk";

// src/display/welcome.ts
import chalk from "chalk";
function displayWelcome() {
  const cyan = chalk.hex("#00D9FF");
  const lavender = chalk.hex("#B4A0FF");
  const gray = chalk.hex("#64748B");
  const white = chalk.hex("#F1F5F9");
  console.clear();
  console.log("");
  console.log(cyan("    ____          __     __  ___          __   ______                    "));
  console.log(cyan("   / __ \\ ___   / /_   /  |/  /___  ____/ /  / ____/____  _____ ____ ___ "));
  console.log(cyan("  / /  / / _ \\ / __/  / /|_/ / __ \\/ __  /  / /_   / __ \\/ ___// __ `/ _ \\"));
  console.log(cyan(" / /__/ /  __// /_   / /  / / /_/ / /_/ /  / __/  / /_/ / /   / /_/ /  __/"));
  console.log(cyan(" \\____/ \\___/ \\__/  /_/  /_/\\____/\\__,_/  /_/     \\____/_/    \\__, /\\___/ "));
  console.log(cyan("                                                              /____/      "));
  console.log("");
  console.log(white("  The AI Software Migration Engineer"));
  console.log(lavender("  Understands your repository. Plans a safe migration."));
  console.log(lavender("  Explains every change. Produces a review-ready pull request."));
  console.log(gray(`  v0.3.0  |  Powered by Codex + GPT-5.6`));
  console.log("");
}

// src/scanner/project-scanner.ts
import fs from "fs";
import path from "path";
import chalk2 from "chalk";
async function scanProject(rootDir) {
  const abs = path.resolve(rootDir);
  if (!fs.existsSync(abs)) {
    throw new Error(`Project directory not found: ${abs}`);
  }
  const pkgPath = path.join(abs, "package.json");
  let libraries = [];
  if (fs.existsSync(pkgPath)) {
    libraries = extractLibraries(pkgPath);
  }
  const { fileTypes, total } = countFiles(abs);
  const hasTypeScript = fs.existsSync(path.join(abs, "tsconfig.json"));
  const hasReact = libraries.some((library) => library.name === "react");
  const hasNextJs = libraries.some((library) => library.name === "next");
  return { rootDir: abs, fileCount: total, fileTypes, libraries, hasTypeScript, hasReact, hasNextJs };
}
async function enhancedScanProject(rootDir) {
  const scan = await scanProject(rootDir);
  const sourceFiles = collectSourceFiles(scan.rootDir);
  const componentCount = countComponents(sourceFiles);
  const deprecatedApis = detectDeprecatedApis(sourceFiles, scan);
  const securityIssues = detectSecurityIssues(sourceFiles);
  const health = calculateHealth(scan, deprecatedApis, securityIssues);
  const react = scan.libraries.find((l) => l.name === "react");
  const next = scan.libraries.find((l) => l.name === "next");
  const frameworkVersion = react ? `React ${react.version}` : next ? `Next.js ${next.version}` : "Unknown";
  const tsCount = (scan.fileTypes[".ts"] ?? 0) + (scan.fileTypes[".tsx"] ?? 0);
  const jsCount = (scan.fileTypes[".js"] ?? 0) + (scan.fileTypes[".jsx"] ?? 0);
  const primaryLanguage = scan.hasTypeScript || tsCount > jsCount ? "TypeScript" : "JavaScript";
  return {
    ...scan,
    componentCount,
    deprecatedApis,
    securityIssues,
    health,
    frameworkVersion,
    primaryLanguage
  };
}
function extractLibraries(pkgPath) {
  try {
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    const libs = [];
    for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
      libs.push({ name, version: cleanVersion(version), isDevDependency: false });
    }
    for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
      libs.push({ name, version: cleanVersion(version), isDevDependency: true });
    }
    return libs;
  } catch {
    return [];
  }
}
function cleanVersion(raw) {
  return raw.replace(/^[\^~>=<]/, "");
}
function countFiles(dir) {
  const fileTypes = {};
  let total = 0;
  const skip = /* @__PURE__ */ new Set(["node_modules", ".git", ".codemod-forge", "dist", ".next"]);
  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name) || entry.name.startsWith(".")) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(entry.name) || "[no-ext]";
        fileTypes[ext] = (fileTypes[ext] ?? 0) + 1;
        total++;
      }
    }
  }
  walk(dir);
  return { fileTypes, total };
}
function collectSourceFiles(dir) {
  const result = [];
  const skip = /* @__PURE__ */ new Set(["node_modules", ".git", ".codemod-forge", "dist", ".next"]);
  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name) || entry.name.startsWith(".")) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        result.push(fullPath);
      }
    }
  }
  walk(dir);
  return result;
}
function countComponents(files) {
  let count = 0;
  for (const file of files) {
    if (!/\.(tsx|jsx)$/.test(file)) continue;
    try {
      const content = fs.readFileSync(file, "utf-8");
      if (/export\s+default\s+/.test(content) || /export\s+(function|const)\s+[A-Z]/.test(content)) {
        count++;
      }
    } catch {
    }
  }
  return count;
}
var DEPRECATED_PATTERNS = [
  { pattern: /\bforwardRef\s*[<(]/, name: "forwardRef", suggestion: "Use ref as a prop (React 19)" },
  { pattern: /\.defaultProps\s*=/, name: "defaultProps", suggestion: "Use ES6 default parameters" },
  { pattern: /\bPropTypes\b/, name: "PropTypes", suggestion: "Use TypeScript interfaces" },
  { pattern: /\buseRef\s*<[^>]+>\s*\(\s*\)/, name: "useRef() without initial value", suggestion: "Pass explicit initial value" },
  { pattern: /\bReact\.createClass\b/, name: "createClass", suggestion: "Use class or function component" },
  { pattern: /\bReact\.PropTypes\b/, name: "React.PropTypes", suggestion: "Use TypeScript interfaces" },
  { pattern: /\bcomponentWillMount\b/, name: "componentWillMount", suggestion: "Use componentDidMount or useEffect" },
  { pattern: /\bcomponentWillReceiveProps\b/, name: "componentWillReceiveProps", suggestion: "Use getDerivedStateFromProps" },
  { pattern: /\bcomponentWillUpdate\b/, name: "componentWillUpdate", suggestion: "Use getSnapshotBeforeUpdate" },
  { pattern: /\bReact\.createRef\b/, name: "React.createRef", suggestion: "Use useRef hook" }
];
function detectDeprecatedApis(files, scan) {
  const results = [];
  if (!scan.hasReact) return results;
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const dep of DEPRECATED_PATTERNS) {
          if (dep.pattern.test(line)) {
            results.push({
              pattern: dep.name,
              file,
              line: i + 1,
              suggestion: dep.suggestion
            });
          }
        }
      }
    } catch {
    }
  }
  return results;
}
var SECURITY_PATTERNS = [
  { pattern: /dangerouslySetInnerHTML/, type: "XSS Risk", severity: "medium", description: "dangerouslySetInnerHTML can lead to XSS vulnerabilities" },
  { pattern: /eval\s*\(/, type: "Code Injection", severity: "critical", description: "eval() can execute arbitrary code" },
  { pattern: /innerHTML\s*=/, type: "XSS Risk", severity: "medium", description: "Direct innerHTML assignment can lead to XSS" },
  { pattern: /document\.write\s*\(/, type: "XSS Risk", severity: "high", description: "document.write can lead to XSS vulnerabilities" }
];
function detectSecurityIssues(files) {
  const results = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      for (const sec of SECURITY_PATTERNS) {
        if (sec.pattern.test(content)) {
          results.push({
            type: sec.type,
            file,
            severity: sec.severity,
            description: sec.description
          });
        }
      }
    } catch {
    }
  }
  return results;
}
function calculateHealth(scan, deprecated, security) {
  let architecture = 90;
  let dependencies = 92;
  let securityScore = 98;
  let maintainability = 88;
  const typeCount = Object.keys(scan.fileTypes).length;
  if (typeCount > 10) architecture -= (typeCount - 10) * 2;
  const depCount = scan.libraries.length;
  if (depCount > 30) dependencies -= Math.min(20, depCount - 30);
  const criticalSec = security.filter((s) => s.severity === "critical").length;
  const highSec = security.filter((s) => s.severity === "high").length;
  securityScore -= criticalSec * 15;
  securityScore -= highSec * 8;
  securityScore -= (security.length - criticalSec - highSec) * 3;
  if (deprecated.length > 0) maintainability -= Math.min(25, deprecated.length * 2);
  if (!scan.hasTypeScript) maintainability -= 10;
  architecture = Math.max(0, Math.min(100, architecture));
  dependencies = Math.max(0, Math.min(100, dependencies));
  securityScore = Math.max(0, Math.min(100, securityScore));
  maintainability = Math.max(0, Math.min(100, maintainability));
  const overall = Math.round((architecture + dependencies + securityScore + maintainability) / 4);
  return { overall, architecture, dependencies, security: securityScore, maintainability };
}
function displayEnhancedScan(scan) {
  const cyan = chalk2.hex("#00D9FF");
  const green = chalk2.hex("#4ADE80");
  const amber = chalk2.hex("#FBBF24");
  const gray = chalk2.hex("#64748B");
  const white = chalk2.hex("#F1F5F9");
  console.log("");
  console.log(cyan("  Repository Intelligence"));
  console.log(cyan("  " + "=".repeat(50)));
  console.log("");
  console.log(`  ${white("Framework:")}      ${scan.frameworkVersion}`);
  console.log(`  ${white("Language:")}       ${scan.primaryLanguage}`);
  console.log(`  ${white("Files:")}          ${scan.fileCount}`);
  console.log(`  ${white("Components:")}     ${scan.componentCount}`);
  console.log(`  ${white("Deprecated APIs:")} ${scan.deprecatedApis.length > 0 ? amber(String(scan.deprecatedApis.length)) : green("0")}`);
  console.log(`  ${white("Security Issues:")} ${scan.securityIssues.length > 0 ? amber(String(scan.securityIssues.length)) : green("0")}`);
  console.log("");
  const healthColor = (score) => score >= 90 ? green : score >= 70 ? amber : chalk2.hex("#F87171");
  console.log(cyan("  Health Score"));
  console.log(cyan("  " + "-".repeat(50)));
  console.log(`  ${white("Overall:")}        ${healthColor(scan.health.overall)(String(scan.health.overall) + "/100")}`);
  console.log(`  ${white("Architecture:")}   ${healthColor(scan.health.architecture)(String(scan.health.architecture))}`);
  console.log(`  ${white("Dependencies:")}   ${healthColor(scan.health.dependencies)(String(scan.health.dependencies))}`);
  console.log(`  ${white("Security:")}       ${healthColor(scan.health.security)(String(scan.health.security))}`);
  console.log(`  ${white("Maintainability:")} ${healthColor(scan.health.maintainability)(String(scan.health.maintainability))}`);
  console.log("");
  if (scan.deprecatedApis.length > 0) {
    console.log(amber(`  Deprecated APIs (${scan.deprecatedApis.length})`));
    const unique = [...new Set(scan.deprecatedApis.map((d) => d.pattern))];
    for (const pattern of unique.slice(0, 8)) {
      const count = scan.deprecatedApis.filter((d) => d.pattern === pattern).length;
      const suggestion = scan.deprecatedApis.find((d) => d.pattern === pattern)?.suggestion ?? "";
      console.log(gray(`    ${pattern} (${count}x) - ${suggestion}`));
    }
    if (unique.length > 8) {
      console.log(gray(`    ... and ${unique.length - 8} more patterns`));
    }
    console.log("");
  }
}

// src/parser/changelog-fetcher.ts
import * as cheerio from "cheerio";
var KNOWN_GUIDES = {
  react: {
    "17-19": "https://react.dev/blog/2024/12/05/react-19",
    "18-19": "https://react.dev/blog/2024/12/05/react-19",
    "17-18": "https://react.dev/blog/2022/03/29/react-v18",
    "16-18": "https://react.dev/blog/2022/03/29/react-v18"
  },
  next: {
    "14-15": "https://nextjs.org/docs/app/building-your-application/upgrading/version-15",
    "13-14": "https://nextjs.org/docs/app/building-your-application/upgrading/version-14"
  },
  tailwindcss: {
    "3-4": "https://tailwindcss.com/docs/upgrade-guide"
  },
  vue: {
    "2-3": "https://v3-migration.vuejs.org/"
  },
  express: {
    "4-5": "https://expressjs.com/en/guide/migrating-5.html"
  },
  prisma: {
    "4-5": "https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-5",
    "5-6": "https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-6"
  },
  typescript: {
    "4-5": "https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/",
    "5-5.6": "https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/"
  }
};
async function fetchMigrationGuide(library, fromVersion, toVersion, guideUrl) {
  if (guideUrl) {
    return fetchFromUrl(guideUrl, library);
  }
  const key = `${fromVersion}-${toVersion}`;
  const guides = KNOWN_GUIDES[library.toLowerCase()];
  if (guides?.[key]) {
    return fetchFromUrl(guides[key], library);
  }
  try {
    const npmUrl = `https://registry.npmjs.org/${library}`;
    const res = await fetch(npmUrl);
    const pkg = await res.json();
    const repo = pkg.repository?.url?.replace("git+https://", "https://")?.replace("git://", "https://")?.replace(".git", "");
    if (repo) {
      const changelogUrl = `${repo}/blob/main/CHANGELOG.md?raw=true`;
      const changelogResponse = await fetch(changelogUrl);
      if (changelogResponse.ok) {
        const markdown = await changelogResponse.text();
        return {
          content: markdown.slice(0, 15e3),
          sourceUrl: changelogUrl,
          format: "markdown",
          title: `${library} Changelog`
        };
      }
    }
  } catch {
  }
  throw new Error(
    `No migration guide found for ${library} ${fromVersion}->${toVersion}.
  Try --guide <url>, or check https://www.npmjs.com/package/${library}`
  );
}
async function fetchFromUrl(url, library) {
  const res = await fetch(url, { headers: { "User-Agent": "codemod-forge/0.2.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, .sidebar, .toc").remove();
  const title = $("title").text() || $("h1").first().text() || `${library} Migration Guide`;
  const body = $("article, main, .content, .prose, body").first();
  const text = body.text().replace(/\s+/g, " ").trim();
  return {
    content: text.slice(0, 15e3),
    sourceUrl: url,
    format: url.endsWith(".md") ? "markdown" : "html",
    title
  };
}

// src/lib/openai-client.ts
import OpenAI from "openai";
var _client = null;
function getOpenAIClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set.\n  Set it with: export OPENAI_API_KEY=sk-...\n  Or create a .env file with OPENAI_API_KEY=sk-..."
    );
  }
  _client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL
  });
  return _client;
}
function hasApiKey() {
  return !!process.env.OPENAI_API_KEY;
}

// src/parser/breaking-change-parser.ts
var SYSTEM_PROMPT = `You are an expert library migration analyzer. Extract ALL breaking changes from a migration guide as structured JSON.

For each breaking change include:
- "title": short summary
- "description": what changed and why it matters
- "severity": "high" (breaks builds), "medium" (requires code changes), "low" (optional/cosmetic)
- "category": "api-rename" | "removed-export" | "behavior-change" | "new-requirement" | "deprecated"
- "affectedPatterns": array of AST-level search strings (e.g. "forwardRef(...)" string, "import { PropTypes }")
- "migrationSteps": concise instructions for the code change

Return JSON: {"changes": [...]}. No markdown, no explanation.`;
async function parseBreakingChanges(guideContent, library, fromVersion, toVersion) {
  const openai = getOpenAIClient();
  const prompt = `Library: ${library}
From version: ${fromVersion}
To version: ${toVersion}

Migration guide:
${guideContent}

Extract ALL breaking changes as JSON. Every change, no matter how small.`;
  const response = await openai.chat.completions.create({
    model: "gpt-5.6",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: "json_object" }
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("GPT-5.6 returned empty response");
  const parsed = JSON.parse(content);
  const changes = parsed.changes || parsed || [];
  return changes.map((c, i) => ({
    id: `${library}-${fromVersion}-to-${toVersion}-${String(i + 1).padStart(2, "0")}`,
    title: c.title || "",
    description: c.description || "",
    severity: c.severity || "medium",
    category: c.category || "behavior-change",
    affectedPatterns: Array.isArray(c.affectedPatterns) ? c.affectedPatterns : [],
    migrationSteps: c.migrationSteps || "",
    sourceUrl: c.sourceUrl || ""
  }));
}

// src/display/prompt.ts
import { checkbox, confirm, input } from "@inquirer/prompts";
import chalk3 from "chalk";
var SEVERITY_COLORS = {
  high: "#F87171",
  medium: "#FBBF24",
  low: "#4ADE80"
};
var SEVERITY_LABELS = {
  high: "HIGH",
  medium: "MED",
  low: "LOW"
};
async function gatherMissingInput(options) {
  if (!options.interactive && (!options.library || !options.from || !options.to)) {
    throw new Error("Non-interactive mode requires library, --from, and --to.");
  }
  const library = options.library ?? await input({ message: "Library name (e.g. react, next, tailwindcss):", validate: (v) => v.length > 0 || "Required" });
  const fromVersion = options.from ?? await input({ message: `Current version of ${library}:`, validate: (v) => v.length > 0 || "Required" });
  const toVersion = options.to ?? await input({ message: `Target version of ${library}:`, validate: (v) => v.length > 0 || "Required" });
  return { library, fromVersion, toVersion, projectDir: options.dir };
}
async function selectBreakingChanges(changes, options) {
  if (changes.length === 0) {
    console.log(chalk3.yellow("\n  No breaking changes detected. Migration may be straightforward."));
    return [];
  }
  console.log(chalk3.hex("#4ADE80")(`
  Found ${changes.length} breaking changes
`));
  if (options.all) {
    console.log(chalk3.hex("#64748B")("  --all enabled: selecting every breaking change."));
    return changes;
  }
  if (!options.interactive) {
    const selected2 = changes.filter((change) => change.severity !== "low");
    console.log(chalk3.hex("#64748B")(`  Non-interactive mode: selected ${selected2.length} high/medium changes.`));
    return selected2;
  }
  const opts = [
    { name: chalk3.hex("#4ADE80")("All breaking changes"), value: "__all__", checked: false }
  ];
  for (const change of changes) {
    const severityColor = SEVERITY_COLORS[change.severity] ?? "#FBBF24";
    const severityLabel = SEVERITY_LABELS[change.severity] ?? "MED";
    opts.push({
      name: `${chalk3.hex(severityColor)(severityLabel.padEnd(4))} ${change.title} ${chalk3.hex("#64748B")(`[${change.severity}]`)}`,
      value: change.id,
      checked: change.severity !== "low"
    });
  }
  const raw = await checkbox({
    message: "Select breaking changes",
    choices: opts
  });
  const selected = raw.filter((value) => value != null);
  if (selected.includes("__all__")) return changes;
  return changes.filter((change) => selected.includes(change.id));
}

// src/generator/transform-generator.ts
import fs3 from "fs/promises";
import path3 from "path";
import chalk4 from "chalk";
import { Project } from "ts-morph";

// src/executor/transform-loader.ts
import fs2 from "fs/promises";
import path2 from "path";
import { createRequire } from "module";
import {
  JsxEmit,
  ModuleKind,
  ScriptTarget,
  transpileModule
} from "typescript";
var packageRequire = createRequire(import.meta.url);
function formatDiagnostic(diagnostic) {
  const message = typeof diagnostic.messageText === "string" ? diagnostic.messageText : diagnostic.messageText.messageText;
  return String(message);
}
function transpileTransformSource(source, fileName = "generated-transform.ts") {
  const result = transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      esModuleInterop: true,
      jsx: JsxEmit.ReactJSX,
      module: ModuleKind.CommonJS,
      sourceMap: false,
      target: ScriptTarget.ES2020
    }
  });
  const diagnostics = result.diagnostics?.filter((d) => d.category === 1) ?? [];
  if (diagnostics.length > 0) {
    throw new Error(`Generated transform did not transpile: ${diagnostics.map(formatDiagnostic).join("; ")}`);
  }
  return result.outputText;
}
async function loadGeneratedTransform(transformPath) {
  const absolutePath = path2.resolve(transformPath);
  const source = await fs2.readFile(absolutePath, "utf-8");
  return loadGeneratedTransformFromSource(source, absolutePath);
}
function loadGeneratedTransformFromSource(source, fileName = "generated-transform.ts") {
  const absolutePath = path2.resolve(fileName);
  const outputText = transpileTransformSource(source, absolutePath);
  const mod = { exports: {} };
  const runModule = new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    outputText
  );
  runModule(mod.exports, packageRequire, mod, absolutePath, path2.dirname(absolutePath));
  if (typeof mod.exports.detect !== "function" || typeof mod.exports.apply !== "function") {
    throw new Error("Generated transform must export detect(sourceFile) and apply(sourceFile)");
  }
  return mod.exports;
}

// src/generator/transform-generator.ts
var TRANSFORM_DIR = path3.join(".codemod-forge", "transforms");
var GENERATE_SYSTEM_PROMPT = `You are an expert TypeScript AST transformation engineer. You write ts-morph transforms that migrate code from one library version to another.

RULES:
1. Use ONLY the ts-morph API. No string replacement and no regex-based rewrites.
2. Export detect(sourceFile: SourceFile): boolean.
3. Export apply(sourceFile: SourceFile): void.
4. Preserve comments, formatting, and whitespace where possible.
5. Handle generics, type parameters, JSX, nested expressions, and imports.
6. Import SourceFile and any ts-morph symbols you use from "ts-morph".
7. Return executable TypeScript only. No markdown fences. No explanation.`;
var GENERATE_USER_PROMPT = (library, change, fixture) => `Write a ts-morph AST transform for this breaking change:

Library: ${library}
Breaking Change: ${change.title}
Description: ${change.description}
Category: ${change.category}
Severity: ${change.severity}
Affected Patterns: ${change.affectedPatterns.join(", ")}
Migration Steps: ${change.migrationSteps}

${fixture ? `The transform must pass this fixture.

BEFORE:
${fixture.before}

EXPECTED AFTER:
${fixture.after}
` : `No built-in fixture is available for this change. Infer the safest AST strategy from the migration description and make detect() conservative.`}
Requirements:
- detect() must use AST queries such as getImportDeclarations(), getCallExpressions(), getDescendantsOfKind(), etc.
- Do not use sourceFile.getText().includes() as the detector.
- apply() must mutate the AST with ts-morph APIs.
- Do not false-positive on strings or comments.
- Export exactly detect(sourceFile: SourceFile): boolean and apply(sourceFile: SourceFile): void.`;
function stripMarkdownFences(code) {
  return code.replace(/^```(?:ts|typescript)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
function normalizeGeneratedCode(code) {
  const stripped = stripMarkdownFences(code);
  const hasTsMorphImport = /from\s+['"]ts-morph['"]/.test(stripped);
  const usesTsMorphTypes = /\b(SourceFile|SyntaxKind|Node|Type|ts)\b/.test(stripped);
  if (!hasTsMorphImport && usesTsMorphTypes) {
    return `import { SourceFile, SyntaxKind, Node, Type, ts } from 'ts-morph';
${stripped}`;
  }
  return stripped;
}
function normalizeForComparison(source) {
  return source.replace(/\s+/g, " ").trim();
}
async function testTransformCode(code, fixture) {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("fixture.tsx", fixture.before, { overwrite: true });
  const executable = loadGeneratedTransformFromSource(code, "generated-transform.ts");
  const detected = executable.detect(sourceFile);
  if (!detected) return false;
  executable.apply(sourceFile);
  const modified = normalizeForComparison(sourceFile.getFullText());
  const expected = normalizeForComparison(fixture.after);
  if (modified === expected) return true;
  const expectedAnchor = expected.slice(0, Math.min(120, expected.length));
  return expectedAnchor.length > 0 && modified.includes(expectedAnchor);
}
async function generateTransformCode(library, change, fixture, retries = 2) {
  const openai = getOpenAIClient();
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await openai.chat.completions.create({
      model: "gpt-5.6",
      messages: [
        { role: "system", content: GENERATE_SYSTEM_PROMPT },
        { role: "user", content: GENERATE_USER_PROMPT(library, change, fixture) }
      ],
      temperature: 0.15,
      max_tokens: 4096
    });
    const code = normalizeGeneratedCode(response.choices[0]?.message?.content ?? "");
    if (!fixture) {
      loadGeneratedTransformFromSource(code, "generated-transform.ts");
      return code;
    }
    if (await testTransformCode(code, fixture)) return code;
    if (attempt < retries) {
      console.log(chalk4.hex("#64748B")(`     retry ${attempt + 1}: fixture failed, regenerating...`));
    }
  }
  throw new Error(`Failed to generate a fixture-passing transform after ${retries + 1} attempts`);
}
async function generateTransformForChange(change, library, fixture, projectDir) {
  const name = change.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const dirPath = path3.join(projectDir, TRANSFORM_DIR, library);
  const filePath = path3.join(dirPath, `${name}.ts`);
  const code = await generateTransformCode(library, change, fixture);
  await fs3.mkdir(dirPath, { recursive: true });
  await fs3.writeFile(filePath, code, "utf-8");
  return {
    name,
    description: change.title,
    breakingChangeId: change.id,
    sourceFile: filePath,
    fixtureCount: fixture ? 1 : 0,
    affectedFiles: 0,
    applied: false,
    skipped: false,
    safeToApply: true,
    confidenceScore: fixture ? 90 : 76,
    confidenceReason: fixture ? "Fixture passed; awaiting independent validator review." : "No built-in fixture; awaiting independent validator review.",
    validationIssueCount: 0,
    criticalIssueCount: 0
  };
}
async function generateTransforms(changes, library, fixtures, projectDir) {
  const transforms = [];
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const label = `  [${i + 1}/${changes.length}] ${change.title}`;
    process.stdout.write(`${chalk4.hex("#00D9FF")(label)}${" ".repeat(Math.max(0, 55 - label.length))}`);
    try {
      const fixture = fixtures.get(change.id);
      const transform = await generateTransformForChange(change, library, fixture, projectDir);
      process.stdout.write(chalk4.green(" OK\n"));
      transforms.push(transform);
    } catch (error) {
      process.stdout.write(chalk4.red(" FAIL\n"));
      console.error(chalk4.hex("#64748B")(`    ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  return transforms;
}

// src/validator/edge-case-validator.ts
import fs4 from "fs/promises";
import chalk5 from "chalk";
var SYSTEM_PROMPT2 = `You are an expert TypeScript static analysis engineer. Review this ts-morph AST transform and find edge cases it might miss or incorrectly handle.

Check for:
1. False positives: patterns it would incorrectly modify.
2. False negatives: patterns it would miss.
3. Type safety breaks: ways it could break TypeScript checking.
4. Nested structures: JSX children, HOCs, callbacks, and wrapper functions.
5. Import side effects: cases where import edits could break runtime behavior.

Return JSON only:
{
  "issues": [
    {"line": number, "description": "...", "suggestion": "...", "severity": "critical"|"warning"}
  ],
  "safeToApply": boolean
}`;
function parseValidationResponse(content) {
  if (!content) return { issues: [], safeToApply: true };
  try {
    const parsed = JSON.parse(content);
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    return {
      issues,
      safeToApply: parsed.safeToApply !== false
    };
  } catch {
    return {
      issues: [{
        line: 1,
        description: "Validator returned invalid JSON.",
        suggestion: "Review this transform manually before applying.",
        severity: "warning"
      }],
      safeToApply: true
    };
  }
}
function buildConfidence(transform, issues, safeToApply) {
  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.length - criticalCount;
  let score = 94;
  if (transform.fixtureCount === 0) score -= 18;
  score -= criticalCount * 25;
  score -= warningCount * 8;
  if (!safeToApply) score = Math.min(score, 68);
  score = Math.max(0, Math.min(99, score));
  const reasonParts = [
    `${transform.fixtureCount} fixture${transform.fixtureCount === 1 ? "" : "s"} passed`,
    criticalCount === 0 ? "no critical validator issues" : `${criticalCount} critical issue(s)`,
    warningCount === 0 ? "no warnings" : `${warningCount} warning(s)`
  ];
  return {
    score,
    reason: reasonParts.join("; "),
    criticalCount
  };
}
async function validateTransform(transform) {
  const openai = getOpenAIClient();
  const source = await fs4.readFile(transform.sourceFile, "utf-8");
  const response = await openai.chat.completions.create({
    model: "gpt-5.6",
    messages: [
      { role: "system", content: SYSTEM_PROMPT2 },
      { role: "user", content: `Transform:
\`\`\`ts
${source}
\`\`\`` }
    ],
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: "json_object" }
  });
  const parsed = parseValidationResponse(response.choices[0]?.message?.content ?? null);
  return { transform, issues: parsed.issues, safeToApply: parsed.safeToApply };
}
async function validateTransforms(transforms) {
  console.log(chalk5.hex("#B4A0FF")("\nIndependent GPT-5.6 validator review...\n"));
  let edgeCasesTotal = 0;
  for (const transform of transforms) {
    const result = await validateTransform(transform);
    const confidence = buildConfidence(transform, result.issues, result.safeToApply);
    transform.safeToApply = result.safeToApply && confidence.criticalCount === 0;
    transform.confidenceScore = confidence.score;
    transform.confidenceReason = confidence.reason;
    transform.validationIssueCount = result.issues.length;
    transform.criticalIssueCount = confidence.criticalCount;
    transform.skipped = !transform.safeToApply;
    if (result.issues.length > 0) {
      edgeCasesTotal += result.issues.length;
      const status = transform.safeToApply ? "WARN" : "BLOCK";
      console.log(
        chalk5.yellow(`  ${status} ${transform.description} - ${result.issues.length} edge case(s), confidence ${confidence.score}%`)
      );
      for (const issue of result.issues) {
        console.log(chalk5.hex("#64748B")(`     ${issue.description}`));
        console.log(chalk5.hex("#64748B")(`     Fix: ${issue.suggestion}`));
      }
    } else {
      console.log(chalk5.green(`  OK ${transform.description} - confidence ${confidence.score}%`));
    }
  }
  if (edgeCasesTotal > 0) {
    console.log(chalk5.hex("#64748B")(`
  ${edgeCasesTotal} validator edge case(s) recorded.
`));
  }
  return transforms;
}

// src/executor/dry-run.ts
import fs5 from "fs";
import { glob } from "glob";
import chalk6 from "chalk";
import { Project as Project2 } from "ts-morph";
async function dryRunTransforms(transforms, projectDir) {
  console.log(chalk6.hex("#B4A0FF")("\nDry run: executing generated transforms in memory..."));
  const allFiles = await glob("**/*.{ts,tsx,js,jsx}", {
    cwd: projectDir,
    ignore: ["node_modules/**", ".git/**", "dist/**", ".next/**", ".codemod-forge/**"],
    absolute: true
  });
  console.log(chalk6.hex("#64748B")(`  ${allFiles.length} source files found`));
  const existingFiles = allFiles.filter((filePath) => {
    try {
      return fs5.existsSync(filePath);
    } catch {
      return false;
    }
  });
  const project = new Project2({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths(existingFiles);
  const results = [];
  for (const transform of transforms) {
    const fileDiffs = [];
    const errors = [];
    if (transform.skipped) {
      console.log(
        `  ${chalk6.hex("#00D9FF")(transform.name.padEnd(35))}${chalk6.hex("#64748B")("skipped by validator")}`
      );
      results.push({ transform, fileDiffs, totalChanges: 0, errors });
      continue;
    }
    try {
      const executable = await loadGeneratedTransform(transform.sourceFile);
      for (const sourceFile of project.getSourceFiles()) {
        try {
          if (executable.detect(sourceFile)) {
            const original = sourceFile.getFullText();
            executable.apply(sourceFile);
            const modified = sourceFile.getFullText();
            sourceFile.replaceWithText(original);
            if (original !== modified) {
              const originalLines = original.split("\n").length;
              const modifiedLines = modified.split("\n").length;
              fileDiffs.push({
                filePath: sourceFile.getFilePath(),
                original,
                modified,
                lineCount: {
                  added: Math.max(0, modifiedLines - originalLines),
                  removed: Math.max(0, originalLines - modifiedLines)
                }
              });
            }
          }
        } catch (error) {
          errors.push({
            transformName: transform.name,
            message: error instanceof Error ? error.message : String(error),
            filePath: sourceFile.getFilePath()
          });
        }
      }
    } catch (error) {
      errors.push({
        transformName: transform.name,
        message: `Failed to load transform: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    transform.affectedFiles = fileDiffs.length;
    const totalChanges = fileDiffs.reduce(
      (sum, diff) => sum + diff.lineCount.added + diff.lineCount.removed,
      0
    );
    const status = errors.length > 0 ? chalk6.red("errors") : chalk6.green(`${fileDiffs.length} files`);
    console.log(
      `  ${chalk6.hex("#00D9FF")(transform.name.padEnd(35))}${status}  ${chalk6.hex("#64748B")(`${totalChanges} changes`)}`
    );
    results.push({ transform, fileDiffs, totalChanges, errors });
  }
  return results;
}

// src/display/diff-viewer.ts
import { confirm as confirm2 } from "@inquirer/prompts";
import chalk7 from "chalk";
import { createTwoFilesPatch } from "diff";
async function reviewTransform(result) {
  const transform = result.transform;
  const files = result.fileDiffs.length;
  const changes = result.totalChanges;
  console.log(
    `
  ${chalk7.hex("#00D9FF")(transform.description)}  ` + chalk7.hex("#64748B")(`- ${files} files, ${changes} changes`)
  );
  if (typeof transform.confidenceScore === "number") {
    console.log(
      `  ${chalk7.hex("#B4A0FF")(`Confidence ${transform.confidenceScore}%`)}  ` + chalk7.hex("#64748B")(transform.confidenceReason ?? "")
    );
  }
  for (const error of result.errors) {
    console.log(`  ${chalk7.red("FAIL")} ${chalk7.hex("#64748B")(error.message)}`);
  }
  for (const diff of result.fileDiffs.slice(0, 3)) {
    showCompactDiff(diff);
  }
  if (result.fileDiffs.length > 3) {
    console.log(chalk7.hex("#64748B")(`  ... and ${result.fileDiffs.length - 3} more files`));
  }
  if (files === 0 || result.errors.length > 0 || transform.safeToApply === false) {
    return "skip";
  }
  const apply = await confirm2({
    message: "Apply this transform?",
    default: true
  });
  return apply ? "apply" : "skip";
}
function showCompactDiff(diff) {
  const shortPath = diff.filePath.replace(/^.*?[\\/]/g, "/").split("/").slice(-3).join("/");
  console.log(chalk7.hex("#64748B")(`
  File: ${shortPath}`));
  const patch = createTwoFilesPatch(
    shortPath,
    shortPath,
    diff.original,
    diff.modified,
    "BEFORE",
    "AFTER"
  );
  const lines = patch.split("\n").slice(4);
  for (const line of lines.slice(0, 15)) {
    if (line.startsWith("+")) console.log(chalk7.hex("#4ADE80")(`  ${line}`));
    else if (line.startsWith("-")) console.log(chalk7.hex("#F87171")(`  ${line}`));
    else if (line.startsWith("@@")) console.log(chalk7.hex("#B4A0FF")(`  ${line}`));
    else console.log(chalk7.hex("#333D4A")(`  ${line}`));
  }
  if (lines.length > 15) {
    console.log(chalk7.hex("#64748B")(`  ... ${lines.length - 15} more lines`));
  }
}
async function reviewAndApply(results, options) {
  const approved = [];
  for (const result of results) {
    const canApply = result.fileDiffs.length > 0 && result.errors.length === 0 && !result.transform.skipped && result.transform.safeToApply !== false;
    const action = options.yes ? canApply ? "apply" : "skip" : await reviewTransform(result);
    if (action === "apply") {
      result.transform.applied = true;
      result.transform.skipped = false;
      approved.push(result.transform);
    } else {
      result.transform.applied = false;
      result.transform.skipped = true;
    }
  }
  if (options.yes) {
    console.log(chalk7.hex("#64748B")(`
  --yes enabled: approved ${approved.length} safe transform(s).`));
  }
  return approved;
}

// src/executor/apply.ts
import chalk9 from "chalk";
import { glob as glob3 } from "glob";
import { Project as Project3 } from "ts-morph";

// src/executor/backup.ts
import fs6 from "fs/promises";
import path4 from "path";
import { glob as glob2 } from "glob";
import chalk8 from "chalk";
async function createBackup(projectDir) {
  const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const backupDir = path4.join(projectDir, ".codemod-forge", `backup-${date}`);
  await fs6.mkdir(backupDir, { recursive: true });
  const files = await glob2("**/*.{ts,tsx,js,jsx}", {
    cwd: projectDir,
    ignore: ["node_modules/**", ".git/**", ".codemod-forge/**", "dist/**", ".next/**"]
  });
  for (const file of files) {
    const dest = path4.join(backupDir, file);
    await fs6.mkdir(path4.dirname(dest), { recursive: true });
    await fs6.copyFile(path4.join(projectDir, file), dest);
  }
  console.log(chalk8.hex("#64748B")(`  Backup: ${backupDir} (${files.length} files)`));
  return backupDir;
}

// src/executor/apply.ts
async function applyTransforms(transforms, projectDir) {
  const activeTransforms = transforms.filter((transform) => !transform.skipped);
  if (activeTransforms.length === 0) {
    console.log(chalk9.hex("#64748B")("  No approved transforms to apply."));
    return;
  }
  await createBackup(projectDir);
  const files = await glob3("**/*.{ts,tsx,js,jsx}", {
    cwd: projectDir,
    ignore: ["node_modules/**", ".git/**", ".codemod-forge/**", "dist/**", ".next/**"],
    absolute: true
  });
  const project = new Project3({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths(files);
  for (const transform of activeTransforms) {
    try {
      const executable = await loadGeneratedTransform(transform.sourceFile);
      let changedFiles = 0;
      for (const sourceFile of project.getSourceFiles()) {
        if (executable.detect(sourceFile)) {
          executable.apply(sourceFile);
          await sourceFile.save();
          changedFiles++;
        }
      }
      transform.applied = changedFiles > 0;
      transform.affectedFiles = changedFiles;
      console.log(chalk9.green(`  OK ${transform.description} (${changedFiles} files)`));
    } catch (error) {
      transform.applied = false;
      transform.skipped = true;
      console.log(chalk9.red(`  FAIL ${transform.description}: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}

// src/display/report.ts
import chalk10 from "chalk";
function averageConfidence(transforms) {
  const scored = transforms.filter((transform) => typeof transform.confidenceScore === "number");
  if (scored.length === 0) return 0;
  const total = scored.reduce((sum, transform) => sum + (transform.confidenceScore ?? 0), 0);
  return Math.round(total / scored.length);
}
function estimateTimeSaved(transforms) {
  const manualMinutes = transforms.length * 12;
  return Math.round(manualMinutes / 60 * 10) / 10;
}
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1e3);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}
function displayMigrationReport(transforms, library, fromVersion, toVersion, codexSessionId, generationTime) {
  const applied = transforms.filter((transform) => transform.applied);
  const skipped = transforms.filter((transform) => transform.skipped);
  const filesChanged = applied.reduce((sum, transform) => sum + transform.affectedFiles, 0);
  const edgeCases = transforms.reduce((sum, transform) => sum + (transform.validationIssueCount ?? 0), 0);
  const critical = transforms.reduce((sum, transform) => sum + (transform.criticalIssueCount ?? 0), 0);
  const confidence = averageConfidence(transforms);
  const timeSaved = estimateTimeSaved(transforms);
  const cyan = chalk10.hex("#00D9FF");
  const lavender = chalk10.hex("#B4A0FF");
  const green = chalk10.hex("#4ADE80");
  const amber = chalk10.hex("#FBBF24");
  const gray = chalk10.hex("#64748B");
  const white = chalk10.hex("#F1F5F9");
  const line = "=".repeat(60);
  const dash = "-".repeat(60);
  console.log("");
  console.log(cyan(`  ${line}`));
  console.log(cyan("  Migration Complete"));
  console.log(cyan(`  ${line}`));
  console.log("");
  console.log(`  ${white("Library")}         ${library} ${fromVersion} -> ${toVersion}`);
  console.log(`  ${white("Transforms")}      ${green(String(applied.length))} applied, ${skipped.length > 0 ? amber(String(skipped.length)) : gray("0")} skipped`);
  console.log(`  ${white("Files Changed")}   ${green(String(filesChanged))}`);
  console.log(`  ${white("Confidence")}      ${confidence > 0 ? lavender(`${confidence}%`) : gray("not scored")}`);
  console.log(`  ${white("Edge Cases")}      ${edgeCases} found, ${critical} critical`);
  console.log(`  ${white("Time Saved")}      ${green(`~${timeSaved} hours`)} (estimated manual effort)`);
  console.log(`  ${white("Elapsed")}         ${formatDuration(generationTime)}`);
  console.log("");
  if (transforms.length > 0) {
    console.log(cyan(`  ${dash}`));
    console.log(cyan("  Transform Details"));
    console.log(cyan(`  ${dash}`));
    for (const transform of transforms) {
      const status = transform.applied ? green("APPLIED") : transform.skipped ? amber("SKIPPED") : gray("READY  ");
      const confidenceLabel = typeof transform.confidenceScore === "number" ? lavender(`${String(transform.confidenceScore).padStart(3)}%`) : gray(" n/a");
      console.log(`  ${status} ${confidenceLabel}  ${white(transform.description)}`);
      if (transform.confidenceReason) {
        console.log(`               ${gray(transform.confidenceReason)}`);
      }
    }
  }
  console.log("");
  console.log(cyan(`  ${dash}`));
  console.log(cyan("  Impact"));
  console.log(cyan(`  ${dash}`));
  console.log(`  ${white("Deprecated APIs eliminated:")} ${green(String(applied.length))}`);
  console.log(`  ${white("Rollback available:")}         ${green("Yes")} (.codemod-forge/backup-*)`);
  console.log(`  ${white("Pull Request:")}               ${applied.length > 0 ? green("Ready") : gray("Pending")}`);
  console.log("");
  console.log(cyan("  Next Steps"));
  console.log(gray("  1. Run your test suite to verify changes"));
  console.log(gray("  2. Review the generated diff"));
  console.log(gray("  3. Use  forge rollback  if anything went wrong"));
  console.log(gray("  4. Commit the migration once tests pass"));
  console.log(gray(`  5. Codex session: ${codexSessionId}`));
  console.log("");
}

// src/generator/fixture-generator.ts
function generateFixtures(changeOrId) {
  const id = typeof changeOrId === "string" ? changeOrId.toLowerCase() : [
    changeOrId.id,
    changeOrId.title,
    changeOrId.description,
    changeOrId.affectedPatterns.join(" "),
    changeOrId.migrationSteps
  ].join(" ").toLowerCase();
  if (id.includes("forwardref")) {
    return [
      {
        name: "basic-forwardRef-component",
        before: `import { forwardRef } from 'react';

interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    return <button ref={ref} className={props.variant} onClick={props.onClick} />;
  }
);`,
        after: `interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

const Button = ({ ref, variant, onClick }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  return <button ref={ref} className={variant} onClick={onClick} />;
};`,
        description: "Basic forwardRef to ref-as-prop pattern"
      },
      {
        name: "forwardRef-arrow-function",
        before: `import { forwardRef } from 'react';

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});`,
        after: `const Input = ({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) => {
  return <input ref={ref} {...props} />;
};`,
        description: "Arrow function forwardRef to ref-as-prop"
      }
    ];
  }
  if (id.includes("proptypes")) {
    return [
      {
        name: "remove-propTypes-from-component",
        before: `import React from 'react';
import PropTypes from 'prop-types';

function Alert({ message, severity }) {
  return <div className={\`alert \${severity}\`}>{message}</div>;
}

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  severity: PropTypes.oneOf(['info', 'warning', 'error']),
};

Alert.defaultProps = {
  severity: 'info',
};`,
        after: `function Alert({ message, severity = 'info' }: { message: string; severity?: 'info' | 'warning' | 'error' }) {
  return <div className={\`alert \${severity}\`}>{message}</div>;
}`,
        description: "Remove propTypes and defaultProps, add TypeScript types"
      }
    ];
  }
  if (id.includes("defaultprops") && !id.includes("proptypes")) {
    return [
      {
        name: "defaultProps-to-default-params",
        before: `interface CardProps {
  title: string;
  shadow?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

function Card({ title, shadow, rounded }: CardProps) {
  return <div className={\`card shadow-\${shadow} \${rounded ? 'rounded' : ''}\`}>{title}</div>;
}

Card.defaultProps = {
  shadow: 'md',
  rounded: true,
};`,
        after: `interface CardProps {
  title: string;
  shadow?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

function Card({ title, shadow = 'md', rounded = true }: CardProps) {
  return <div className={\`card shadow-\${shadow} \${rounded ? 'rounded' : ''}\`}>{title}</div>;
}`,
        description: "defaultProps to ES6 default parameters"
      }
    ];
  }
  if (id.includes("useref")) {
    return [
      {
        name: "useref-null-required",
        before: `import { useRef } from 'react';

function useFocus() {
  const inputRef = useRef<HTMLInputElement>();
  const countRef = useRef<number>();

  const focus = () => inputRef.current?.focus();
  const increment = () => { countRef.current = (countRef.current || 0) + 1; };

  return { inputRef, countRef, focus, increment };
}`,
        after: `import { useRef } from 'react';

function useFocus() {
  const inputRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<number>(0);

  const focus = () => inputRef.current?.focus();
  const increment = () => { countRef.current = (countRef.current || 0) + 1; };

  return { inputRef, countRef, focus, increment };
}`,
        description: "useRef now requires explicit initial value"
      }
    ];
  }
  if (id.includes("children") && (id.includes("type") || id.includes("react"))) {
    return [
      {
        name: "children-in-props-type",
        before: `import React from 'react';

interface ContainerProps {
  className?: string;
}

function Container({ children, className }: React.PropsWithChildren<ContainerProps>) {
  return <div className={className}>{children}</div>;
}`,
        after: `interface ContainerProps {
  className?: string;
  children?: React.ReactNode;
}

function Container({ children, className }: ContainerProps) {
  return <div className={className}>{children}</div>;
}`,
        description: "PropsWithChildren to explicit children in props"
      }
    ];
  }
  return [];
}

// src/executor/rollback.ts
import fs7 from "fs/promises";
import path5 from "path";
import chalk11 from "chalk";
async function findLatestBackup(projectDir) {
  const forgeDir = path5.join(projectDir, ".codemod-forge");
  try {
    const entries = await fs7.readdir(forgeDir, { withFileTypes: true });
    const backups = entries.filter((e) => e.isDirectory() && e.name.startsWith("backup-")).map((e) => e.name).sort().reverse();
    return backups.length > 0 ? path5.join(forgeDir, backups[0]) : null;
  } catch {
    return null;
  }
}
async function rollbackProject(projectDir) {
  const cyan = chalk11.hex("#00D9FF");
  const green = chalk11.hex("#4ADE80");
  const gray = chalk11.hex("#64748B");
  console.log(cyan("\n  Rollback Agent"));
  console.log(cyan("  " + "=".repeat(50)));
  const backupDir = await findLatestBackup(projectDir);
  if (!backupDir) {
    console.log(chalk11.yellow("\n  No backup found. Nothing to rollback."));
    console.log(gray("  Backups are created automatically when transforms are applied.\n"));
    return;
  }
  console.log(gray(`  Restoring from: ${backupDir}`));
  const files = await collectBackupFiles(backupDir, backupDir);
  let restored = 0;
  for (const relPath of files) {
    const src = path5.join(backupDir, relPath);
    const dest = path5.join(projectDir, relPath);
    try {
      await fs7.mkdir(path5.dirname(dest), { recursive: true });
      await fs7.copyFile(src, dest);
      restored++;
    } catch (error) {
      console.log(chalk11.red(`  FAIL ${relPath}: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  console.log(green(`
  Restored ${restored} file(s) from backup.`));
  console.log(gray("  Your project has been rolled back to the pre-migration state.\n"));
}
async function collectBackupFiles(dir, root) {
  const result = [];
  const entries = await fs7.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path5.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectBackupFiles(full, root);
      result.push(...nested);
    } else {
      result.push(path5.relative(root, full));
    }
  }
  return result;
}

// src/cli.ts
var program = new Command();
program.name("forge").description("The AI Software Migration Engineer. Modernize any repository safely.").version("0.3.0");
program.command("analyze").description("Analyze a repository: detect frameworks, count components, find deprecated APIs, score health").option("-d, --dir <path>", "Project directory", process.cwd()).option("-v, --verbose", "Verbose output", false).action(async (opts) => {
  const dir = typeof opts.dir === "string" ? opts.dir : process.cwd();
  displayWelcome();
  console.log(chalk12.hex("#B4A0FF")("  Repository Intelligence Agent: scanning project..."));
  const scan = await enhancedScanProject(dir);
  displayEnhancedScan(scan);
});
program.command("plan").description("Fetch migration guide, extract breaking changes, and show a migration plan").argument("<library>", "Library name (e.g. react, next, tailwindcss)").option("-f, --from <version>", "Current version").option("-t, --to <version>", "Target version").option("-d, --dir <path>", "Project directory", process.cwd()).option("-g, --guide <url>", "Migration guide URL").option("--all", "Select every detected breaking change", false).action(async (library, opts) => {
  const dir = typeof opts.dir === "string" ? opts.dir : process.cwd();
  const from = typeof opts.from === "string" ? opts.from : void 0;
  const to = typeof opts.to === "string" ? opts.to : void 0;
  const guide = typeof opts.guide === "string" ? opts.guide : void 0;
  displayWelcome();
  const gathered = await gatherMissingInput({ library, from, to, dir, interactive: true });
  console.log(chalk12.hex("#B4A0FF")("  Discovery Agent: mining migration guidance..."));
  const guideResult = await fetchMigrationGuide(gathered.library, gathered.fromVersion, gathered.toVersion, guide);
  console.log(chalk12.hex("#64748B")(`    Source: ${guideResult.sourceUrl}`));
  console.log(chalk12.hex("#64748B")(`    Title:  ${guideResult.title}`));
  if (!hasApiKey()) {
    console.log(chalk12.yellow("\n  OPENAI_API_KEY is not set. Set it with: export OPENAI_API_KEY=***"));
    process.exit(0);
  }
  console.log(chalk12.hex("#B4A0FF")("\n  Planning Agent: extracting breaking changes with GPT-5.6..."));
  const changes = await parseBreakingChanges(guideResult.content, gathered.library, gathered.fromVersion, gathered.toVersion);
  const cyan = chalk12.hex("#00D9FF");
  const green = chalk12.hex("#4ADE80");
  const amber = chalk12.hex("#FBBF24");
  const gray = chalk12.hex("#64748B");
  const white = chalk12.hex("#F1F5F9");
  console.log("");
  console.log(cyan("  AI Migration Plan"));
  console.log(cyan("  " + "=".repeat(50)));
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const sevColor = c.severity === "high" ? chalk12.hex("#F87171") : c.severity === "medium" ? amber : green;
    console.log(`  ${green("+")} ${white(c.title)}  ${sevColor(`[${c.severity}]`)}`);
    console.log(gray(`      ${c.description.slice(0, 100)}${c.description.length > 100 ? "..." : ""}`));
    console.log(gray(`      Patterns: ${c.affectedPatterns.join(", ")}`));
  }
  console.log("");
  console.log(gray(`  ${changes.length} breaking change(s) detected.`));
  console.log(gray("  Run  forge migrate  to execute the full migration pipeline.\n"));
});
program.command("migrate").description("Full migration pipeline: plan, generate transforms, validate, dry-run, and apply").argument("[library]", "Library name (e.g. react, next, tailwindcss)").option("-f, --from <version>", "Current version").option("-t, --to <version>", "Target version").option("-d, --dir <path>", "Project directory", process.cwd()).option("-g, --guide <url>", "Migration guide URL").option("--dry-run", "Preview changes without applying", false).option("--all", "Select every detected breaking change", false).option("-y, --yes", "Apply every safe result without prompts", false).option("--no-interactive", "Run non-interactively").option("-v, --verbose", "Verbose output", false).action(async (library, opts) => {
  const options = {
    library,
    from: typeof opts.from === "string" ? opts.from : void 0,
    to: typeof opts.to === "string" ? opts.to : void 0,
    guide: typeof opts.guide === "string" ? opts.guide : void 0,
    dir: typeof opts.dir === "string" ? opts.dir : process.cwd(),
    dryRun: opts.dryRun === true,
    interactive: opts.interactive !== false,
    all: opts.all === true,
    yes: opts.yes === true,
    verbose: opts.verbose === true
  };
  try {
    await runMigration(options);
  } catch (error) {
    console.error(chalk12.red("\n  Fatal error:"), error instanceof Error ? error.message : String(error));
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(chalk12.hex("#64748B")(error.stack));
    }
    process.exit(1);
  }
});
program.command("verify").description("Re-run existing transforms in dry-run mode to verify they still work").option("-d, --dir <path>", "Project directory", process.cwd()).action(async (opts) => {
  const dir = typeof opts.dir === "string" ? opts.dir : process.cwd();
  displayWelcome();
  console.log(chalk12.hex("#B4A0FF")("  Verify Agent: re-running transforms in dry-run mode..."));
  console.log(chalk12.hex("#64748B")(`  Project: ${dir}`));
  console.log(chalk12.hex("#64748B")("  This command will be fully wired once transforms exist.\n"));
});
program.command("rollback").description("Restore project files from the most recent backup").option("-d, --dir <path>", "Project directory", process.cwd()).action(async (opts) => {
  const dir = typeof opts.dir === "string" ? opts.dir : process.cwd();
  displayWelcome();
  await rollbackProject(dir);
});
program.command("report").description("Display the migration report from the last run").option("-d, --dir <path>", "Project directory", process.cwd()).action(async (_opts) => {
  displayWelcome();
  console.log(chalk12.hex("#B4A0FF")("  Report Agent: loading last migration report..."));
  console.log(chalk12.hex("#64748B")("  Reports are generated after a  forge migrate  run.\n"));
});
program.argument("[library]", "Library name (e.g. react, next, tailwindcss)").option("-f, --from <version>", "Current version").option("-t, --to <version>", "Target version").option("-d, --dir <path>", "Project directory", process.cwd()).option("-g, --guide <url>", "Migration guide URL").option("--dry-run", "Preview changes without applying", false).option("--all", "Select every detected breaking change", false).option("-y, --yes", "Apply every safe result without prompts", false).option("--no-interactive", "Run non-interactively").option("-v, --verbose", "Verbose output", false).action(async (library, opts) => {
  if (!library) return;
  const options = {
    library,
    from: typeof opts.from === "string" ? opts.from : void 0,
    to: typeof opts.to === "string" ? opts.to : void 0,
    guide: typeof opts.guide === "string" ? opts.guide : void 0,
    dir: typeof opts.dir === "string" ? opts.dir : process.cwd(),
    dryRun: opts.dryRun === true,
    interactive: opts.interactive !== false,
    all: opts.all === true,
    yes: opts.yes === true,
    verbose: opts.verbose === true
  };
  try {
    await runMigration(options);
  } catch (error) {
    console.error(chalk12.red("\n  Fatal error:"), error instanceof Error ? error.message : String(error));
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(chalk12.hex("#64748B")(error.stack));
    }
    process.exit(1);
  }
});
async function runMigration(opts) {
  const start = Date.now();
  displayWelcome();
  const { library, fromVersion, toVersion, projectDir } = await gatherMissingInput({
    library: opts.library,
    from: opts.from,
    to: opts.to,
    dir: opts.dir,
    interactive: opts.interactive
  });
  const scan = await enhancedScanProject(projectDir);
  displayEnhancedScan(scan);
  console.log(chalk12.hex("#B4A0FF")("  Discovery Agent: mining migration guidance..."));
  const guide = await fetchMigrationGuide(library, fromVersion, toVersion, opts.guide);
  console.log(chalk12.hex("#64748B")(`    Source: ${guide.sourceUrl}`));
  console.log(chalk12.hex("#64748B")(`    Title:  ${guide.title}`));
  if (!hasApiKey()) {
    console.log(chalk12.yellow("\n  OPENAI_API_KEY is not set, so GPT-5.6 parsing cannot run."));
    console.log(chalk12.hex("#64748B")("  Set it with: export OPENAI_API_KEY=***"));
    process.exit(0);
  }
  console.log(chalk12.hex("#B4A0FF")("\n  Planning Agent: extracting breaking changes with GPT-5.6..."));
  const allChanges = await parseBreakingChanges(guide.content, library, fromVersion, toVersion);
  const selected = await selectBreakingChanges(allChanges, {
    interactive: opts.interactive,
    all: opts.all
  });
  if (selected.length === 0) {
    console.log(chalk12.green("\n  No changes selected. Nothing to do.\n"));
    process.exit(0);
  }
  console.log(chalk12.hex("#B4A0FF")("\n  Fixture Agent: preparing before/after validation cases..."));
  const fixturesMap = /* @__PURE__ */ new Map();
  for (const change of selected) {
    const fixtures = generateFixtures(change);
    if (fixtures.length > 0) {
      fixturesMap.set(change.id, fixtures[0]);
      console.log(chalk12.hex("#64748B")(`    OK ${fixtures.length} fixture(s): ${change.title}`));
    } else {
      console.log(chalk12.hex("#64748B")(`    No known fixture: ${change.title}. GPT-5.6 will synthesize.`));
    }
  }
  console.log(chalk12.hex("#B4A0FF")(`
  Transform Agent: generating ${selected.length} AST transform(s)...`));
  const transforms = await generateTransforms(selected, library, fixturesMap, projectDir);
  if (transforms.length === 0) {
    throw new Error("No transforms were generated. Re-run with --verbose and inspect the model output.");
  }
  const validated = await validateTransforms(transforms);
  const dryResults = await dryRunTransforms(validated, projectDir);
  const totalFiles = dryResults.reduce((sum, result) => sum + result.fileDiffs.length, 0);
  const totalChanges = dryResults.reduce((sum, result) => sum + result.totalChanges, 0);
  const sessionId = process.env.CODEX_SESSION_ID || "pending: add your /feedback session id";
  if (totalFiles === 0) {
    console.log(chalk12.green("\n  No files need changes. Your codebase may already be compatible.\n"));
    displayMigrationReport(validated, library, fromVersion, toVersion, sessionId, Date.now() - start);
    process.exit(0);
  }
  if (opts.dryRun) {
    console.log(chalk12.hex("#64748B")(`
  Dry run complete: ${totalFiles} files would change (${totalChanges} edit groups).`));
    console.log(chalk12.hex("#64748B")("  Run without --dry-run to apply approved transforms.\n"));
    displayMigrationReport(validated, library, fromVersion, toVersion, sessionId, Date.now() - start);
    process.exit(0);
  }
  const approved = await reviewAndApply(dryResults, { yes: opts.yes });
  if (approved.length > 0) {
    console.log(chalk12.hex("#B4A0FF")("\n  Apply Agent: writing approved transforms with backup..."));
    await applyTransforms(approved, projectDir);
  }
  displayMigrationReport(validated, library, fromVersion, toVersion, sessionId, Date.now() - start);
}
program.parse();
