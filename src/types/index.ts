// Breaking Change
export interface BreakingChange {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category: 'api-rename' | 'removed-export' | 'behavior-change' | 'new-requirement' | 'deprecated';
  affectedPatterns: string[];
  migrationSteps: string;
  sourceUrl: string;
}

// Generated Transform
export interface Transform {
  name: string;
  description: string;
  breakingChangeId: string;
  sourceFile: string;
  fixtureCount: number;
  affectedFiles: number;
  applied: boolean;
  skipped: boolean;
  safeToApply?: boolean;
  confidenceScore?: number;
  confidenceReason?: string;
  validationIssueCount?: number;
  criticalIssueCount?: number;
}

// Dry Run Result
export interface FileDiff {
  filePath: string;
  original: string;
  modified: string;
  lineCount: { added: number; removed: number };
}

export interface TransformError {
  transformName: string;
  message: string;
  filePath?: string;
  lineNumber?: number;
}

export interface DryRunResult {
  transform: Transform;
  fileDiffs: FileDiff[];
  totalChanges: number;
  errors: TransformError[];
}

// Project Scan
export interface DetectedLibrary {
  name: string;
  version: string;
  isDevDependency: boolean;
}

export interface ProjectScan {
  rootDir: string;
  fileCount: number;
  fileTypes: Record<string, number>;
  libraries: DetectedLibrary[];
  hasTypeScript: boolean;
  hasReact: boolean;
  hasNextJs: boolean;
}

// Migration Guide
export interface FetchResult {
  content: string;
  sourceUrl: string;
  format: 'html' | 'markdown' | 'text';
  title: string;
}

// Validation
export interface ValidationIssue {
  line: number;
  description: string;
  suggestion: string;
  severity: 'critical' | 'warning';
}

export interface ValidationResult {
  transform: Transform;
  issues: ValidationIssue[];
  safeToApply: boolean;
}

// Report
export interface TransformResult {
  name: string;
  status: 'applied' | 'skipped' | 'manual-review';
  filesChanged: number;
  changes: number;
  edgeCases: string[];
}

export interface MigrationReport {
  library: string;
  fromVersion: string;
  toVersion: string;
  timestamp: string;
  codexSessionId: string;
  transformsApplied: number;
  transformsSkipped: number;
  totalFilesChanged: number;
  totalChanges: number;
  edgeCasesCaught: number;
  generationTime: number;
  details: TransformResult[];
}

// CLI Options
export interface CliOptions {
  library?: string;
  from?: string;
  to?: string;
  guide?: string;
  dir: string;
  dryRun: boolean;
  interactive: boolean;
  all: boolean;
  yes: boolean;
  verbose: boolean;
}

// Migration Source
export interface MigrationSource {
  library: string;
  guideUrl: string;
  versionPattern: RegExp;
  parser: 'generic' | 'react-docs' | 'nextjs-docs' | 'npm-changelog';
}

// Fixture
export interface Fixture {
  name: string;
  before: string;
  after: string;
  description: string;
}

// Enhanced Project Scan
export interface DeprecatedApi {
  pattern: string;
  file: string;
  line: number;
  suggestion: string;
}

export interface SecurityIssue {
  type: string;
  file: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface HealthMetrics {
  overall: number;
  architecture: number;
  dependencies: number;
  security: number;
  maintainability: number;
}

export interface EnhancedProjectScan extends ProjectScan {
  componentCount: number;
  deprecatedApis: DeprecatedApi[];
  securityIssues: SecurityIssue[];
  health: HealthMetrics;
  frameworkVersion: string;
  primaryLanguage: string;
}

// Migration Plan
export interface PlanStep {
  id: string;
  title: string;
  description: string;
  affectedFiles: number;
  estimatedMinutes: number;
  risk: 'low' | 'medium' | 'high';
  status: 'pending' | 'running' | 'done' | 'failed';
}

export interface MigrationPlan {
  library: string;
  fromVersion: string;
  toVersion: string;
  steps: PlanStep[];
  totalFiles: number;
  estimatedMinutes: number;
  readinessPercent: number;
}

// Impact Report
export interface ImpactReport {
  healthBefore: number;
  healthAfter: number;
  deprecatedBefore: number;
  deprecatedAfter: number;
  securityBefore: number;
  securityAfter: number;
  frameworkBefore: string;
  frameworkAfter: string;
  filesChanged: number;
  timeSavedHours: number;
  confidence: number;
  prReady: boolean;
}
