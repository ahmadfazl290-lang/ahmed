export function normalizeAnswer(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[’]/g, "'").replace(/[.!?,;:]/g, '').replace(/\s+/g, ' ').trim();
}

// Open responses receive completion checks, never a claimed language grade.
export function gradeAnswer(item, answer) {
  const text = String(answer || '').trim();
  if (!text || !item) return 0;
  const norm = normalizeAnswer(text);
  if (['mcq', 'fill'].includes(item.type)) {
    return (item.accepted || []).some(a => normalizeAnswer(a) === norm) ? 1 : 0;
  }
  if (item.type === 'short') {
    if (/\b(?:not|never|incorrect|wrong)\b/.test(norm)) return 0;
    return (item.accepted || []).some(a => {
      const phrase = normalizeAnswer(a);
      return (` ${norm} `).includes(` ${phrase} `);
    }) ? 1 : 0;
  }
  const words = norm.match(/[a-z]+(?:'[a-z]+)?/g) || [];
  if (words.length < (item.minWords || 6)) return 0.2;
  if (new Set(words).size / words.length < 0.4) return 0.2;
  if (words.join('').length / Math.max(text.replace(/\s/g, '').length, 1) < 0.6) return 0.2;
  if (item.requiredWord && !(` ${norm} `).includes(` ${normalizeAnswer(item.requiredWord)} `)) return 0.3;
  // A completed practice response may earn activity credit, but not CEFR evidence.
  return 0.6;
}

export function isObjective(item) {
  return ['mcq', 'fill'].includes(item.type);
}
