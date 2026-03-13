type SanitizeTextOptions = {
  maxLength?: number;
  trim?: boolean;
  collapseWhitespace?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
};

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;
const CONTROL_CHARS_EXCEPT_NEWLINES_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const REPEATED_NEWLINES_RE = /\n{3,}/g;

function toInputString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  try {
    return value.normalize("NFC");
  } catch {
    return value;
  }
}

function applyCaseTransforms(value: string, options: SanitizeTextOptions) {
  if (options.lowercase) {
    return value.toLowerCase();
  }

  if (options.uppercase) {
    return value.toUpperCase();
  }

  return value;
}

export function sanitizeSingleLineInput(value: unknown, options: SanitizeTextOptions = {}) {
  const {
    maxLength,
    trim = true,
    collapseWhitespace = true,
  } = options;

  let normalized = toInputString(value).replace(CONTROL_CHARS_RE, " ");

  if (collapseWhitespace) {
    normalized = normalized.replace(/\s+/g, " ");
  }

  if (trim) {
    normalized = normalized.trim();
  }

  normalized = applyCaseTransforms(normalized, options);

  if (typeof maxLength === "number" && maxLength >= 0 && normalized.length > maxLength) {
    normalized = normalized.slice(0, maxLength);
  }

  return normalized;
}

export function sanitizeMultilineInput(value: unknown, options: SanitizeTextOptions = {}) {
  const {
    maxLength,
    trim = true,
    collapseWhitespace = true,
  } = options;

  let normalized = toInputString(value)
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS_EXCEPT_NEWLINES_RE, "");

  if (collapseWhitespace) {
    normalized = normalized
      .split("\n")
      .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
      .join("\n")
      .replace(REPEATED_NEWLINES_RE, "\n\n");
  }

  if (trim) {
    normalized = normalized.trim();
  }

  normalized = applyCaseTransforms(normalized, options);

  if (typeof maxLength === "number" && maxLength >= 0 && normalized.length > maxLength) {
    normalized = normalized.slice(0, maxLength);
  }

  return normalized;
}

export function sanitizeEmailInput(value: unknown) {
  return sanitizeSingleLineInput(value, {
    lowercase: true,
    maxLength: 254,
  });
}

export function sanitizePasswordInput(value: unknown) {
  return sanitizeSingleLineInput(value, {
    collapseWhitespace: false,
    maxLength: 256,
  });
}

export function sanitizeIdInput(value: unknown, maxLength = 120) {
  return sanitizeSingleLineInput(value, { maxLength });
}

export function sanitizeSlugInput(value: unknown, maxLength = 64) {
  return sanitizeSingleLineInput(value, {
    lowercase: true,
    maxLength,
  });
}

export function sanitizeSearchInput(value: unknown, maxLength = 80) {
  return sanitizeSingleLineInput(value, { maxLength });
}

export function sanitizeIpInput(value: unknown) {
  const normalized = sanitizeSingleLineInput(value, {
    collapseWhitespace: false,
    maxLength: 128,
  });

  if (!normalized) {
    return "unknown";
  }

  return normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
}

export function sanitizeSlugListInput(value: unknown, options?: { maxItems?: number; maxItemLength?: number }) {
  const maxItems = options?.maxItems ?? 50;
  const maxItemLength = options?.maxItemLength ?? 64;
  const normalized = sanitizeSingleLineInput(value, {
    collapseWhitespace: false,
    maxLength: Math.max(1, maxItems * (maxItemLength + 1)),
  });

  return Array.from(
    new Set(
      normalized
        .split(",")
        .map((entry) => sanitizeSlugInput(entry, maxItemLength))
        .filter(Boolean)
    )
  ).slice(0, maxItems);
}
