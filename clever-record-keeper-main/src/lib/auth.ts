export interface User {
  id: string;
  email: string;
}

export interface Session {
  user: User | null;
}

const USERS_KEY = "crk_users";
const SESSION_KEY = "crk_session";

function loadUsers(): Record<string, { id: string; email: string; password: string }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, { id: string; email: string; password: string }>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function signUp(email: string, password: string): Promise<{ error?: { message: string } }>{
  const users = loadUsers();
  if (Object.values(users).find((u) => u.email === email)) {
    return { error: { message: "User already exists" } };
  }
  const id = cryptoRandomId();
  users[id] = { id, email, password };
  saveUsers(users);
  // auto sign-in
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user: { id, email } }));
  notifyAuthChange({ user: { id, email } });
  return {};
}

export async function signInWithPassword(email: string, password: string): Promise<{ error?: { message: string } }>{
  const users = loadUsers();
  const found = Object.values(users).find((u) => u.email === email && u.password === password);
  if (!found) return { error: { message: "Invalid credentials" } };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user: { id: found.id, email: found.email } }));
  notifyAuthChange({ user: { id: found.id, email: found.email } });
  return {};
}

export async function signOut(): Promise<{ error?: { message: string } }>{
  localStorage.removeItem(SESSION_KEY);
  notifyAuthChange({ user: null });
  return {};
}

export async function getSession(): Promise<{ data: { session: Session | null } }>{
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return { data: { session: s } };
  } catch {
    return { data: { session: null } };
  }
}

export async function getUser() {
  const s = await getSession();
  return { data: { user: s.data.session?.user || null } };
}

type AuthChangeHandler = (event: string, session: Session | null) => void;
const handlers = new Set<AuthChangeHandler>();

function notifyAuthChange(session: Session | null) {
  handlers.forEach((h) => h("auth", session));
}

export function onAuthStateChange(cb: AuthChangeHandler) {
  handlers.add(cb);
  // return an object similar to supabase for compatibility
  // ensure unsubscribe returns void (not boolean) so React effect cleanup signatures are correct
  return { subscription: { unsubscribe: () => { handlers.delete(cb); } } };
}

function cryptoRandomId() {
  // simple client-side id
  return (Math.random().toString(36).slice(2, 9) + Date.now().toString(36)).slice(0, 20);
}

export function getCurrentUser() {
  const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  return s?.user || null;
}
