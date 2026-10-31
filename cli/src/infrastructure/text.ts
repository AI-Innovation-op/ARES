/** Remove terminal controls including OSC hyperlinks/title/clipboard sequences. */
export function terminalText(text: string): string {
  return text
    .replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}

export function redact(text: string): string {
  return text
    .replace(
      /\b(?:sk-or-v1-|sk-proj-|ghp_|github_pat_|AIza|AQ\.|mstrl_|gsk_)[A-Za-z0-9_-]{12,}/g,
      '[REDACTED]',
    )
    .replace(
      /((?:[A-Z_]*(?:API_KEY|SECRET|PASSWORD|TOKEN)|apiKey|password|secret|token)\s*[=:]\s*["']?)[^\s"'`,;}]{8,}/gi,
      '$1[REDACTED]',
    )
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]{8,}/gi, '$1[REDACTED]')
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '[REDACTED PRIVATE KEY]',
    );
}

export function selectContext(
  snapshot: {
    root: string;
    files: readonly { path: string; content: string }[];
    skipped: number;
    truncated: boolean;
  },
  maxChars = 100_000,
  focus = '',
) {
  const parts: string[] = [];
  const includedPaths: string[] = [];
  let remaining = maxChars - 512;
  const terms = focus
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 3);
  const rank = (name: string) => {
    const lower = name.toLowerCase();
    let score = /(?:^|\/)(?:domain|application)\//.test(lower)
      ? 60
      : /(?:^|\/)src\//.test(lower)
        ? 40
        : /(?:test|spec)\./.test(lower)
          ? 30
          : /\.(?:[cm]?[jt]sx?|py|cs|go|rs|java|vue)$/.test(lower)
            ? 20
            : 0;
    if (/(?:^|\/)(?:package\.json|pyproject\.toml|go\.mod|cargo\.toml|tsconfig\.json)$/.test(lower))
      score += 55;
    if (/lock|legacy|changelog/i.test(name)) score -= 70;
    for (const term of terms) if (lower.includes(term)) score += 15;
    return score;
  };
  const ordered = [...snapshot.files].sort(
    (a, b) => rank(b.path) - rank(a.path) || a.path.localeCompare(b.path, 'en'),
  );
  for (const file of ordered) {
    const block = JSON.stringify({ path: file.path, content: redact(file.content) });
    if (block.length + 1 > remaining) continue;
    parts.push(block);
    includedPaths.push(file.path);
    remaining -= block.length + 1;
  }
  const omittedFiles = snapshot.files.length - parts.length;
  const header = JSON.stringify({
    format: 'ARES_SOURCE_CONTEXT',
    selectedFiles: parts.length,
    scannedFiles: snapshot.files.length,
    skipped: snapshot.skipped,
    omittedFiles,
    truncated: snapshot.truncated || omittedFiles > 0,
  });
  return {
    text: header + '\n' + parts.join('\n'),
    includedPaths,
    omittedPaths: snapshot.files
      .filter((file) => !includedPaths.includes(file.path))
      .map((file) => file.path),
  };
}

export function contextText(
  snapshot: Parameters<typeof selectContext>[0],
  maxChars = 100_000,
  focus = '',
): string {
  return selectContext(snapshot, maxChars, focus).text;
}
