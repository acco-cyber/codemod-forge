import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import type {
  DetectedLibrary,
  ProjectScan,
  EnhancedProjectScan,
  DeprecatedApi,
  SecurityIssue,
  HealthMetrics,
} from '../types/index.js';

export async function scanProject(rootDir: string): Promise<ProjectScan> {
  const abs = path.resolve(rootDir);
  if (!fs.existsSync(abs)) {
    throw new Error(`Project directory not found: ${abs}`);
  }

  const pkgPath = path.join(abs, 'package.json');
  let libraries: DetectedLibrary[] = [];
  if (fs.existsSync(pkgPath)) {
    libraries = extractLibraries(pkgPath);
  }

  const { fileTypes, total } = countFiles(abs);
  const hasTypeScript = fs.existsSync(path.join(abs, 'tsconfig.json'));
  const hasReact = libraries.some(library => library.name === 'react');
  const hasNextJs = libraries.some(library => library.name === 'next');

  return { rootDir: abs, fileCount: total, fileTypes, libraries, hasTypeScript, hasReact, hasNextJs };
}

/** Enhanced scan with component counting, deprecated APIs, security, and health score. */
export async function enhancedScanProject(rootDir: string): Promise<EnhancedProjectScan> {
  const scan = await scanProject(rootDir);
  const sourceFiles = collectSourceFiles(scan.rootDir);
  const componentCount = countComponents(sourceFiles);
  const deprecatedApis = detectDeprecatedApis(sourceFiles, scan);
  const securityIssues = detectSecurityIssues(sourceFiles);
  const health = calculateHealth(scan, deprecatedApis, securityIssues);

  const react = scan.libraries.find(l => l.name === 'react');
  const next = scan.libraries.find(l => l.name === 'next');
  const frameworkVersion = react
    ? `React ${react.version}`
    : next
      ? `Next.js ${next.version}`
      : 'Unknown';

  const tsCount = (scan.fileTypes['.ts'] ?? 0) + (scan.fileTypes['.tsx'] ?? 0);
  const jsCount = (scan.fileTypes['.js'] ?? 0) + (scan.fileTypes['.jsx'] ?? 0);
  const primaryLanguage = scan.hasTypeScript || tsCount > jsCount ? 'TypeScript' : 'JavaScript';

  return {
    ...scan,
    componentCount,
    deprecatedApis,
    securityIssues,
    health,
    frameworkVersion,
    primaryLanguage,
  };
}

function extractLibraries(pkgPath: string): DetectedLibrary[] {
  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    const libs: DetectedLibrary[] = [];

    for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
      libs.push({ name, version: cleanVersion(version as string), isDevDependency: false });
    }

    for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
      libs.push({ name, version: cleanVersion(version as string), isDevDependency: true });
    }

    return libs;
  } catch {
    return [];
  }
}

function cleanVersion(raw: string): string {
  return raw.replace(/^[\^~>=<]/, '');
}

function countFiles(dir: string): { fileTypes: Record<string, number>; total: number } {
  const fileTypes: Record<string, number> = {};
  let total = 0;
  const skip = new Set(['node_modules', '.git', '.codemod-forge', 'dist', '.next']);

  function walk(currentDir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (skip.has(entry.name) || entry.name.startsWith('.')) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(entry.name) || '[no-ext]';
        fileTypes[ext] = (fileTypes[ext] ?? 0) + 1;
        total++;
      }
    }
  }

  walk(dir);
  return { fileTypes, total };
}

function collectSourceFiles(dir: string): string[] {
  const result: string[] = [];
  const skip = new Set(['node_modules', '.git', '.codemod-forge', 'dist', '.next']);

  function walk(currentDir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name) || entry.name.startsWith('.')) continue;
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

function countComponents(files: string[]): number {
  let count = 0;
  for (const file of files) {
    if (!/\.(tsx|jsx)$/.test(file)) continue;
    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (/export\s+default\s+/.test(content) || /export\s+(function|const)\s+[A-Z]/.test(content)) {
        count++;
      }
    } catch {
      // skip unreadable files
    }
  }
  return count;
}

const DEPRECATED_PATTERNS: Array<{ pattern: RegExp; name: string; suggestion: string }> = [
  { pattern: /\bforwardRef\s*[<(]/, name: 'forwardRef', suggestion: 'Use ref as a prop (React 19)' },
  { pattern: /\.defaultProps\s*=/, name: 'defaultProps', suggestion: 'Use ES6 default parameters' },
  { pattern: /\bPropTypes\b/, name: 'PropTypes', suggestion: 'Use TypeScript interfaces' },
  { pattern: /\buseRef\s*<[^>]+>\s*\(\s*\)/, name: 'useRef() without initial value', suggestion: 'Pass explicit initial value' },
  { pattern: /\bReact\.createClass\b/, name: 'createClass', suggestion: 'Use class or function component' },
  { pattern: /\bReact\.PropTypes\b/, name: 'React.PropTypes', suggestion: 'Use TypeScript interfaces' },
  { pattern: /\bcomponentWillMount\b/, name: 'componentWillMount', suggestion: 'Use componentDidMount or useEffect' },
  { pattern: /\bcomponentWillReceiveProps\b/, name: 'componentWillReceiveProps', suggestion: 'Use getDerivedStateFromProps' },
  { pattern: /\bcomponentWillUpdate\b/, name: 'componentWillUpdate', suggestion: 'Use getSnapshotBeforeUpdate' },
  { pattern: /\bReact\.createRef\b/, name: 'React.createRef', suggestion: 'Use useRef hook' },
];

function detectDeprecatedApis(files: string[], scan: ProjectScan): DeprecatedApi[] {
  const results: DeprecatedApi[] = [];
  if (!scan.hasReact) return results;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        for (const dep of DEPRECATED_PATTERNS) {
          if (dep.pattern.test(line)) {
            results.push({
              pattern: dep.name,
              file: file,
              line: i + 1,
              suggestion: dep.suggestion,
            });
          }
        }
      }
    } catch {
      // skip unreadable files
    }
  }
  return results;
}

const SECURITY_PATTERNS: Array<{ pattern: RegExp; type: string; severity: SecurityIssue['severity']; description: string }> = [
  { pattern: /dangerouslySetInnerHTML/, type: 'XSS Risk', severity: 'medium', description: 'dangerouslySetInnerHTML can lead to XSS vulnerabilities' },
  { pattern: /eval\s*\(/, type: 'Code Injection', severity: 'critical', description: 'eval() can execute arbitrary code' },
  { pattern: /innerHTML\s*=/, type: 'XSS Risk', severity: 'medium', description: 'Direct innerHTML assignment can lead to XSS' },
  { pattern: /document\.write\s*\(/, type: 'XSS Risk', severity: 'high', description: 'document.write can lead to XSS vulnerabilities' },
];

function detectSecurityIssues(files: string[]): SecurityIssue[] {
  const results: SecurityIssue[] = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      for (const sec of SECURITY_PATTERNS) {
        if (sec.pattern.test(content)) {
          results.push({
            type: sec.type,
            file,
            severity: sec.severity,
            description: sec.description,
          });
        }
      }
    } catch {
      // skip unreadable files
    }
  }
  return results;
}

function calculateHealth(scan: ProjectScan, deprecated: DeprecatedApi[], security: SecurityIssue[]): HealthMetrics {
  let architecture = 90;
  let dependencies = 92;
  let securityScore = 98;
  let maintainability = 88;

  // Architecture: penalize if too many file types or very large projects
  const typeCount = Object.keys(scan.fileTypes).length;
  if (typeCount > 10) architecture -= (typeCount - 10) * 2;

  // Dependencies: penalize for large dependency count
  const depCount = scan.libraries.length;
  if (depCount > 30) dependencies -= Math.min(20, (depCount - 30));

  // Security: penalize for each issue
  const criticalSec = security.filter(s => s.severity === 'critical').length;
  const highSec = security.filter(s => s.severity === 'high').length;
  securityScore -= criticalSec * 15;
  securityScore -= highSec * 8;
  securityScore -= (security.length - criticalSec - highSec) * 3;

  // Maintainability: penalize for deprecated APIs
  if (deprecated.length > 0) maintainability -= Math.min(25, deprecated.length * 2);
  if (!scan.hasTypeScript) maintainability -= 10;

  // Clamp all scores
  architecture = Math.max(0, Math.min(100, architecture));
  dependencies = Math.max(0, Math.min(100, dependencies));
  securityScore = Math.max(0, Math.min(100, securityScore));
  maintainability = Math.max(0, Math.min(100, maintainability));

  const overall = Math.round((architecture + dependencies + securityScore + maintainability) / 4);

  return { overall, architecture, dependencies, security: securityScore, maintainability };
}

export function displayScanResult(scan: ProjectScan): void {
  console.log(chalk.hex('#64748B')(`  Project: ${scan.rootDir}`));
  console.log(chalk.hex('#64748B')(`  ${scan.fileCount} files found`));

  const top = Object.entries(scan.fileTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const summary = top.map(([ext, n]) => `${ext}(${n})`).join(' | ');
  console.log(chalk.hex('#64748B')(`  Top types: ${summary}`));

  if (scan.hasReact) console.log(chalk.hex('#00D9FF')('  React detected'));
  if (scan.hasNextJs) console.log(chalk.hex('#00D9FF')('  Next.js detected'));
  if (scan.hasTypeScript) console.log(chalk.hex('#00D9FF')('  TypeScript project'));

  const react = scan.libraries.find(library => library.name === 'react');
  if (react) console.log(chalk.hex('#64748B')(`  react@${react.version}`));
  console.log('');
}

export function displayEnhancedScan(scan: EnhancedProjectScan): void {
  const cyan = chalk.hex('#00D9FF');
  const green = chalk.hex('#4ADE80');
  const amber = chalk.hex('#FBBF24');
  const gray = chalk.hex('#64748B');
  const white = chalk.hex('#F1F5F9');

  console.log('');
  console.log(cyan('  Repository Intelligence'));
  console.log(cyan('  ' + '='.repeat(50)));
  console.log('');
  console.log(`  ${white('Framework:')}      ${scan.frameworkVersion}`);
  console.log(`  ${white('Language:')}       ${scan.primaryLanguage}`);
  console.log(`  ${white('Files:')}          ${scan.fileCount}`);
  console.log(`  ${white('Components:')}     ${scan.componentCount}`);
  console.log(`  ${white('Deprecated APIs:')} ${scan.deprecatedApis.length > 0 ? amber(String(scan.deprecatedApis.length)) : green('0')}`);
  console.log(`  ${white('Security Issues:')} ${scan.securityIssues.length > 0 ? amber(String(scan.securityIssues.length)) : green('0')}`);
  console.log('');

  // Health scores
  const healthColor = (score: number) => score >= 90 ? green : score >= 70 ? amber : chalk.hex('#F87171');

  console.log(cyan('  Health Score'));
  console.log(cyan('  ' + '-'.repeat(50)));
  console.log(`  ${white('Overall:')}        ${healthColor(scan.health.overall)(String(scan.health.overall) + '/100')}`);
  console.log(`  ${white('Architecture:')}   ${healthColor(scan.health.architecture)(String(scan.health.architecture))}`);
  console.log(`  ${white('Dependencies:')}   ${healthColor(scan.health.dependencies)(String(scan.health.dependencies))}`);
  console.log(`  ${white('Security:')}       ${healthColor(scan.health.security)(String(scan.health.security))}`);
  console.log(`  ${white('Maintainability:')} ${healthColor(scan.health.maintainability)(String(scan.health.maintainability))}`);
  console.log('');

  if (scan.deprecatedApis.length > 0) {
    console.log(amber(`  Deprecated APIs (${scan.deprecatedApis.length})`));
    const unique = [...new Set(scan.deprecatedApis.map(d => d.pattern))];
    for (const pattern of unique.slice(0, 8)) {
      const count = scan.deprecatedApis.filter(d => d.pattern === pattern).length;
      const suggestion = scan.deprecatedApis.find(d => d.pattern === pattern)?.suggestion ?? '';
      console.log(gray(`    ${pattern} (${count}x) - ${suggestion}`));
    }
    if (unique.length > 8) {
      console.log(gray(`    ... and ${unique.length - 8} more patterns`));
    }
    console.log('');
  }
}
