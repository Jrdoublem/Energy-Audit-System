// Lightweight, localStorage-only user store + sessionStorage session —
// no backend exists yet, so this mirrors the pattern already used by
// factoryStore.js / settingsStore.js / equipment/categories.js.
const USERS_KEY = 'users';
const SESSION_KEY = 'authUser';

const SEED_USERS = [
  { id: 'u_admin', name: 'Admin User', email: 'admin@enginspect.com', password: 'admin1234', role: 'admin', factories: [] },
  { id: 'u_engineer', name: 'วิศวกร ทดสอบ', email: 'engineer@enginspect.com', password: 'engineer1234', role: 'engineer', factories: ['โรงงาน A'] },
  { id: 'u_engineer2', name: 'วิศวกร มานะ', email: 'mana@enginspect.com', password: 'engineer1234', role: 'engineer', factories: ['โรงงาน A'] },
];

export function loadUsers() {
  try {
    const saved = JSON.parse(localStorage.getItem(USERS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* ignore corrupt data */ }
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  return SEED_USERS;
}

export function saveUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

export function login(email, password) {
  const user = loadUsers().find((u) => u.email === email && u.password === password);
  if (!user) return null;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    id: user.id, name: user.name, role: user.role, factories: user.factories || [],
  }));
  return user;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (saved && typeof saved === 'object') return saved;
  } catch { /* ignore corrupt data */ }
  return { id: null, name: 'Admin', role: 'admin', factories: [] };
}
