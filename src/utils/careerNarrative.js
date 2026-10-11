// Legacy in-memory profiles stored this preference under `team`.
// It controls language only, never simulation or event eligibility.
export const narrativeGender = (profile) => profile?.gender ?? profile?.team;
export function messageForProfile(text, profile) {
  const gender = narrativeGender(profile);
  const selected = typeof text === 'string' ? text : text?.[gender] ?? '';
  // Resolve explicit regular o/a and os/as markers only. Do not guess the
  // gender of unmarked words, names, or irregular forms; use full variants for those.
  return selected.replace(/(?<![\p{L}\p{N}_/])([\p{L}]+?)(o|os)\/(a|as)(?![\p{L}\p{N}_/])/giu, (match, stem, masculine, feminine) => {
    if (masculine.length !== feminine.length) return match;
    if (gender !== 'masculino' && gender !== 'femenino') return match;
    const ending = gender === 'femenino' ? feminine : masculine;
    return stem + (masculine === masculine.toUpperCase() ? ending.toUpperCase() : ending);
  });
}
