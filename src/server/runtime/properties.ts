export type PropertiesMap = Record<string, string>;

export function parseProperties(content: string): PropertiesMap {
  const result: PropertiesMap = {};
  const lines = (content || '').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;

    const separatorIndex = findSeparatorIndex(line);
    if (separatorIndex < 0) {
      result[decodeEscapes(line)] = '';
      continue;
    }

    const key = decodeEscapes(line.slice(0, separatorIndex).trim());
    const value = decodeEscapes(line.slice(separatorIndex + 1).trim());
    result[key] = value;
  }

  return result;
}

function findSeparatorIndex(line: string): number {
  let escaped = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '=' || ch === ':' || ch === ' ') {
      return i;
    }
  }
  return -1;
}

function decodeEscapes(input: string): string {
  return input
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\:/g, ':')
    .replace(/\\=/g, '=')
    .replace(/\\\\/g, '\\');
}

export function getScopedProperties(all: PropertiesMap, prefix: string): PropertiesMap {
  const scoped: PropertiesMap = {};
  const normalizedPrefix = `${prefix}.`;
  Object.entries(all).forEach(([key, value]) => {
    if (!key.startsWith(normalizedPrefix)) return;
    scoped[key.slice(normalizedPrefix.length)] = value;
  });
  return scoped;
}
