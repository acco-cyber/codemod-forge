import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import {
  JsxEmit,
  ModuleKind,
  ScriptTarget,
  transpileModule,
  type Diagnostic,
} from 'typescript';
import type { SourceFile } from 'ts-morph';

export interface ExecutableTransform {
  detect: (sourceFile: SourceFile) => boolean;
  apply: (sourceFile: SourceFile) => void;
}

const packageRequire = createRequire(import.meta.url);

function formatDiagnostic(diagnostic: Diagnostic): string {
  const message = typeof diagnostic.messageText === 'string'
    ? diagnostic.messageText
    : diagnostic.messageText.messageText;
  return String(message);
}

export function transpileTransformSource(source: string, fileName = 'generated-transform.ts'): string {
  const result = transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      esModuleInterop: true,
      jsx: JsxEmit.ReactJSX,
      module: ModuleKind.CommonJS,
      sourceMap: false,
      target: ScriptTarget.ES2020,
    },
  });

  const diagnostics = result.diagnostics?.filter(d => d.category === 1) ?? [];
  if (diagnostics.length > 0) {
    throw new Error(`Generated transform did not transpile: ${diagnostics.map(formatDiagnostic).join('; ')}`);
  }

  return result.outputText;
}

export async function loadGeneratedTransform(transformPath: string): Promise<ExecutableTransform> {
  const absolutePath = path.resolve(transformPath);
  const source = await fs.readFile(absolutePath, 'utf-8');
  return loadGeneratedTransformFromSource(source, absolutePath);
}

export function loadGeneratedTransformFromSource(
  source: string,
  fileName = 'generated-transform.ts'
): ExecutableTransform {
  const absolutePath = path.resolve(fileName);
  const outputText = transpileTransformSource(source, absolutePath);
  const mod: { exports: Record<string, unknown> } = { exports: {} };

  const runModule = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    outputText
  );

  runModule(mod.exports, packageRequire, mod, absolutePath, path.dirname(absolutePath));

  if (typeof mod.exports.detect !== 'function' || typeof mod.exports.apply !== 'function') {
    throw new Error('Generated transform must export detect(sourceFile) and apply(sourceFile)');
  }

  return mod.exports as unknown as ExecutableTransform;
}
