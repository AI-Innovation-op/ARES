import path from 'node:path';
import { builtinModules } from 'node:module';
import ts from 'typescript';
import type { SourceAnalyzer } from '../architecture/application/analyze-architecture.js';
import type {
  ArchitectureFacts,
  Dependency,
  ModuleFacts,
  ParseIssue,
} from '../architecture/domain/architecture.js';
import type { Snapshot } from '../shared/domain/source-path.js';

export class TypeScriptImports implements SourceAnalyzer {
  parse(snapshot: Snapshot): ArchitectureFacts {
    const canonical = (name: string) => {
      const absolute = path.resolve(name).replaceAll('\\', '/');
      return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
    };
    const sources = new Map(
      snapshot.files.map((file) => [canonical(path.resolve(snapshot.root, file.path)), file]),
    );
    const directories = new Set<string>();
    for (const file of sources.keys()) {
      let dir = path.dirname(file);
      while (!directories.has(canonical(dir))) {
        directories.add(canonical(dir));
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
    const host: ts.ModuleResolutionHost = {
      fileExists: (name) => sources.has(canonical(name)),
      readFile: (name) => sources.get(canonical(name))?.content,
      directoryExists: (name) => directories.has(canonical(name)),
      getCurrentDirectory: () => snapshot.root,
    };
    const modules: ModuleFacts[] = [],
      parseIssues: ParseIssue[] = [],
      unsupportedFiles: string[] = [];
    const builtins = new Set(builtinModules.map((name) => name.replace(/^node:/, '')));
    let options: ts.CompilerOptions = {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      allowJs: true,
      jsx: ts.JsxEmit.Preserve,
    };
    const config = snapshot.files.find((file) => file.path === 'tsconfig.json');
    if (config) {
      const parsed = ts.parseConfigFileTextToJson('tsconfig.json', config.content);
      if (parsed.error)
        parseIssues.push({
          path: config.path,
          line: 1,
          message: ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n'),
        });
      else {
        const converted = ts.convertCompilerOptionsFromJson(
          parsed.config.compilerOptions || {},
          snapshot.root,
        );
        options = { ...options, ...converted.options };
        for (const issue of converted.errors)
          parseIssues.push({
            path: config.path,
            line: 1,
            message: ts.flattenDiagnosticMessageText(issue.messageText, '\n'),
          });
        if (parsed.config.extends)
          parseIssues.push({
            path: config.path,
            line: 1,
            message:
              'tsconfig.extends no se carga fuera de la instantánea; revisa las opciones heredadas.',
          });
      }
    }
    for (const file of snapshot.files) {
      if (!/\.(?:[cm]?[jt]sx?|vue)$/i.test(file.path)) {
        if (/\.(?:py|cs|go|rs|java|rb|php|kt|swift|c|cpp|h|hpp|sh|sql)$/i.test(file.path))
          unsupportedFiles.push(file.path);
        continue;
      }
      const dependencies: Dependency[] = [];
      const blocks = file.path.endsWith('.vue')
        ? [...file.content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((match) => ({
            text: match[1],
            offset: match.index! + match[0].indexOf('>') + 1,
            jsx: /lang\s*=\s*["'](?:tsx|jsx)["']/i.test(match[0].slice(0, match[0].indexOf('>'))),
          }))
        : [{ text: file.content, offset: 0, jsx: /\.[jt]sx$/.test(file.path) }];
      for (const block of blocks) {
        const source = ts.createSourceFile(
          file.path,
          block.text,
          ts.ScriptTarget.Latest,
          true,
          block.jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );
        const lineAt = (position: number) =>
          file.content.slice(0, block.offset + position).split('\n').length;
        const diagnostics =
          (source as ts.SourceFile & { parseDiagnostics?: readonly ts.DiagnosticWithLocation[] })
            .parseDiagnostics || [];
        for (const issue of diagnostics)
          parseIssues.push({
            path: file.path,
            line: lineAt(issue.start ?? 0),
            message: ts.flattenDiagnosticMessageText(issue.messageText, '\n'),
          });
        const add = (value: ts.StringLiteralLike, typeOnly: boolean) => {
          const specifier = value.text;
          let dependency: Dependency;
          if (specifier.startsWith('node:') || builtins.has(specifier))
            dependency = {
              specifier,
              line: lineAt(value.getStart(source)),
              kind: 'platform',
              typeOnly,
            };
          else {
            const resolved = ts.resolveModuleName(
              specifier,
              path.resolve(snapshot.root, file.path),
              options,
              host,
            ).resolvedModule;
            let target = resolved && sources.get(canonical(resolved.resolvedFileName));
            if (!target && specifier.startsWith('.'))
              target = sources.get(
                canonical(path.resolve(snapshot.root, path.dirname(file.path), specifier)),
              );
            const mapped = Object.keys(options.paths || {}).some((pattern) => {
              const [before, after = ''] = pattern.split('*');
              return pattern.includes('*')
                ? specifier.startsWith(before) && specifier.endsWith(after)
                : specifier === pattern;
            });
            dependency = {
              specifier,
              line: lineAt(value.getStart(source)),
              kind: target
                ? 'internal'
                : specifier.startsWith('.') ||
                    path.isAbsolute(specifier) ||
                    mapped ||
                    /^[@~]\/|^#/.test(specifier)
                  ? 'unresolved'
                  : 'external',
              ...(target ? { target: target.path } : {}),
              typeOnly,
            };
          }
          if (
            !dependencies.some(
              (d) => d.line === dependency.line && d.specifier === dependency.specifier,
            )
          )
            dependencies.push(dependency);
        };
        const visit = (node: ts.Node) => {
          if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier))
            add(node.moduleSpecifier, Boolean(node.importClause?.isTypeOnly));
          else if (
            ts.isExportDeclaration(node) &&
            node.moduleSpecifier &&
            ts.isStringLiteralLike(node.moduleSpecifier)
          )
            add(node.moduleSpecifier, node.isTypeOnly);
          else if (
            ts.isImportEqualsDeclaration(node) &&
            ts.isExternalModuleReference(node.moduleReference) &&
            node.moduleReference.expression &&
            ts.isStringLiteralLike(node.moduleReference.expression)
          )
            add(node.moduleReference.expression, node.isTypeOnly);
          else if (
            ts.isCallExpression(node) &&
            (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
              (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
            node.arguments.length === 1 &&
            ts.isStringLiteralLike(node.arguments[0])
          )
            add(node.arguments[0], false);
          else if (
            ts.isImportTypeNode(node) &&
            ts.isLiteralTypeNode(node.argument) &&
            ts.isStringLiteralLike(node.argument.literal)
          )
            add(node.argument.literal, true);
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
      modules.push({ path: file.path, dependencies });
    }
    return { modules, unsupportedFiles, parseIssues };
  }
}
