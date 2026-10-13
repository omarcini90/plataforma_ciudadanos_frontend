/** Misma etiqueta de tipo de apoyo, sin distinguir mayúsculas ni espacios laterales. */
export function supportTypeKey(name) {
  return String(name ?? '').trim().toLocaleLowerCase('es');
}

/**
 * Una opción por etiqueta. Si hay programa, solo los tipos de ese programa.
 * Varios programas con el mismo nombre quedan en una sola opción.
 */
export function homologatedSupportTypes(types, programId = null) {
  const scoped =
    programId == null || programId === ''
      ? types
      : types.filter((type) => Number(type.program_id) === Number(programId));
  const grouped = new Map();
  for (const type of scoped) {
    const key = supportTypeKey(type.name);
    if (!key) continue;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        key,
        name: String(type.name).trim(),
        programs: 1,
        active: type.is_active !== false,
      });
      continue;
    }
    current.programs += 1;
    current.active = current.active || type.is_active !== false;
  }
  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Programas que tienen un tipo con esa etiqueta. Sin etiqueta, devuelve todos. */
export function programsForSupportType(programs, types, typeLabel) {
  const key = supportTypeKey(typeLabel);
  if (!key) return programs;
  const ids = new Set();
  for (const type of types) {
    if (supportTypeKey(type.name) === key && type.program_id != null) {
      ids.add(Number(type.program_id));
    }
  }
  return programs.filter((program) => ids.has(Number(program.id)));
}

export function programHasSupportType(types, programId, typeLabel) {
  const key = supportTypeKey(typeLabel);
  if (!programId || !key) return true;
  if (!types.length) return true;
  return types.some(
    (type) => Number(type.program_id) === Number(programId) && supportTypeKey(type.name) === key,
  );
}

export function supportFilterParams(programId, typeLabel) {
  const params = {};
  if (programId) params.program_id = Number(programId);
  const name = String(typeLabel ?? '').trim();
  if (name) params.support_type_name = name;
  return params;
}
