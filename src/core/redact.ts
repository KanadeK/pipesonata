const credentialPatterns: Array<[RegExp, string]> = [
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "[REDACTED]"],
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [REDACTED]"],
  [
    /(\b(?:password|passwd|pwd|token|secret|cookie|authorization)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
    "$1[REDACTED]",
  ],
  [/(https?:\/\/[^:\s/@]+:)[^@\s/]+@/gi, "$1[REDACTED]@"],
];

export function redactSensitiveText(value: string): string {
  return credentialPatterns.reduce(
    (redacted, [pattern, replacement]) => redacted.replace(pattern, replacement),
    value,
  );
}
