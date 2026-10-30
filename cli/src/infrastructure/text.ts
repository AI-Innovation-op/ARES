/** Remove terminal controls including OSC hyperlinks/title/clipboard sequences. */
export function terminalText(text: string): string {
  return text.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}

export function redact(text: string): string {
  return text
    .replace(/\b(?:sk-or-v1-|sk-proj-|ghp_|github_pat_|AIza)[A-Za-z0-9_-]{12,}/g, '[REDACTED]')
    .replace(/((?:[A-Z_]*(?:API_KEY|SECRET|PASSWORD|TOKEN)|apiKey|password|secret|token)\s*[=:]\s*["']?)[^\s"'`,;}]{8,}/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]{8,}/gi, '$1[REDACTED]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]');
}

export function contextText(snapshot: { root: string; files: readonly { path: string; content: string }[]; skipped: number; truncated: boolean }, maxChars = 100_000): string {
  const parts: string[] = [];
  let remaining = maxChars;
  for (const file of snapshot.files) {
    const block = JSON.stringify({ path: file.path, content: redact(file.content) });
    if (block.length > remaining) continue;
    parts.push(block);
    remaining -= block.length;
  }
  return JSON.stringify({ format: 'ARES_SOURCE_CONTEXT', selectedFiles: parts.length, scannedFiles: snapshot.files.length, skipped: snapshot.skipped, truncated: snapshot.truncated || parts.length < snapshot.files.length }) + '\n' + parts.join('\n');
}
