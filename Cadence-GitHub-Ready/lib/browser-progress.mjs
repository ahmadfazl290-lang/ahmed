/** Browser learning records only. This identity never grants access to account APIs. */
export function createBrowserProgress(identity, local, newId = () => crypto.randomUUID()) {
  let id, email, prefix, mode;
  if (identity?.kind === 'account') {
    const subject = identity.subject;
    if (typeof subject !== 'string' || !subject.trim() || subject.length > 512) throw new Error('INVALID_LEARNING_IDENTITY');
    id = subject;
    // The historical learner indexes by lowercase email. A reversible, lowercase
    // encoding of the validated subject avoids collisions and email-change resets.
    email = Array.from(new TextEncoder().encode(subject), value => value.toString(16).padStart(2, '0')).join('') + '@account.invalid';
    prefix = 'cadence:account-data:' + encodeURIComponent(subject) + ':';
    mode = 'hosted';
  } else if (identity?.kind === 'guest') {
    id = local.getItem('cadence:guest-id');
    if (!id) { id = newId(); local.setItem('cadence:guest-id', id); }
    email = `${id}@guest.invalid`;
    prefix = 'cadence:guest-data:';
    mode = 'guest';
  } else {
    throw new Error('INVALID_LEARNING_IDENTITY');
  }
  // Fail visibly before the learner's safeGet can mistake an unreadable record
  // for a new student. No migration, rewriting, or removal of existing records.
  local.getItem(prefix + 'profile:' + email.toLowerCase());
  let active = true;
  const ownKey = key => typeof key === 'string' && (key.endsWith(':' + email.toLowerCase()) || key.includes(':' + email.toLowerCase() + ':'));
  const requireOwnKey = key => {
    if (!active) throw new Error('LEARNING_SESSION_CHANGED');
    if (!ownKey(key)) throw new Error('FOREIGN_LEARNING_RECORD');
  };
  return {
    session: {mode, development:false, emailAuth:false, emailConfigured:false, localProgress:true, user:{userId:id, email, displayName:'فێرخواز'}},
    storage: {
      get: async key => { requireOwnKey(key); const value = local.getItem(prefix + key); return value === null ? null : {key, value}; },
      set: async (key, value) => { requireOwnKey(key); local.setItem(prefix + key, value); return {key, value}; },
      delete: async key => { requireOwnKey(key); local.removeItem(prefix + key); return {key, deleted:true}; },
    },
    dispose: () => { active = false; },
  };
}
