import { User } from "./auth";

/**
 * Storage module (robust)
 * - Attempts backend first (multiple candidate bases and paths)
 * - Normalizes backend shapes to frontend Student shape
 * - Falls back to seeded localStorage when offline or backend fails
 */

/* ---------- Types ---------- */
export interface Student {
  id: string;
  user_id?: string | null;
  name: string;
  age: number;
  class: string;
  subjects: string[];
  grades: Record<string, number>;
  // additional fields
  address?: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
  parent?: {
    name: string;
    phone: string;
    relation: string;
  };
  class_teacher?: {
    name: string;
    phone?: string;
    email?: string;
  };
  subject_heads?: Record<string, { name: string; phone?: string; email?: string }>;
  created_at: string;
  updated_at: string;
}

/* ---------- Local storage seeding ---------- */
const KEY = "crk_students";

function load(): Student[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Student[];
  } catch (e) {
    console.error("Failed to load students from local cache:", e);
    return [];
  }
}

function save(list: Student[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

/* ---------- API base resolution ---------- */
const CANDIDATE_BASES = [
  (import.meta.env.VITE_API_BASE as string) || "",
  "http://localhost:3001",
  "http://localhost:4000",
].filter(Boolean);

const API_BASE = CANDIDATE_BASES[0] || "http://localhost:3001";

function candidateUrlsFor(base: string, path: string) {
  if (path.startsWith("/api/")) {
    return [`${base}${path}`, `${base}${path.replace(/^\/api/, "")}`];
  }
  return [`${base}${path}`, `${base}/api${path.startsWith("/") ? path : "/" + path}`];
}

/* ---------- Network helpers ---------- */
async function tryFetchJson(candidates: string[]): Promise<any> {
  for (const url of candidates) {
    try {
      console.debug("[storage] trying url:", url);
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.warn(`[storage] ${url} returned ${resp.status} ${resp.statusText}`, text);
        continue;
      }
      const data = await resp.json();
      console.debug("[storage] success from", url);
      return data;
    } catch (err) {
      console.warn("[storage] fetch error for", url, err);
      continue;
    }
  }
  throw new Error("All fetch candidates failed");
}

async function tryFetchWithBody(method: "POST" | "PUT" | "DELETE", path: string, body?: any): Promise<any> {
  const candidates: string[] = [];
  for (const base of CANDIDATE_BASES) {
    candidates.push(...candidateUrlsFor(base, path));
  }

  for (const url of candidates) {
    try {
      console.debug(`[storage] ${method} ${url}`);
      const resp = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.warn(`[storage] ${url} returned ${resp.status} ${resp.statusText}`, text);
        continue;
      }
      const data = await resp.json().catch(() => null);
      return data;
    } catch (err) {
      console.warn(`[storage] ${method} failed for ${url}`, err);
      continue;
    }
  }

  throw new Error(`${method} failed for all candidates`);
}

/* ---------- Normalizer: raw backend doc -> Student ---------- */
function cryptoRandomId() {
  return (Math.random().toString(36).slice(2, 9) + Date.now().toString(36)).slice(0, 20);
}

function normalizeRawToStudent(raw: any): Student {
  if (!raw || typeof raw !== "object") {
    // return minimal seeded student if invalid
    const now = new Date().toISOString();
    return {
      id: cryptoRandomId(),
      user_id: null,
      name: "Unnamed",
      age: 0,
      class: "Unknown",
      subjects: [],
      grades: {},
      created_at: now,
      updated_at: now,
    };
  }

  const pick = (...names: string[]) => {
    for (const n of names) {
      if (raw[n] !== undefined && raw[n] !== null) return raw[n];
    }
    return undefined;
  };

  const id = String(pick("id", "_id", "studentId", "id_str") ?? cryptoRandomId());
  const cls = String(pick("class", "className", "grade", "standard") ?? "Unknown");
  const created_at = String(pick("created_at", "createdAt", "created") ?? new Date().toISOString());
  const updated_at = String(pick("updated_at", "updatedAt", "updated") ?? created_at);

  // name and age
  const name = String(pick("name", "fullName", "student_name") ?? "Unnamed");
  const age = Number(pick("age", "studentAge", "age_in_years")) || 0;

  // subjects
  let subjectsRaw = pick("subjects", "subjectList", "subjects_csv", "subjects_str");
  let subjects: string[] = [];
  if (Array.isArray(subjectsRaw)) subjects = subjectsRaw.map(String);
  else if (typeof subjectsRaw === "string") subjects = subjectsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
  else subjects = [];

  // grades — object or stringified object or comma list
  let gradesRaw = pick("grades", "scoreMap", "marks", "marks_map");
  let grades: Record<string, number> = {};
  if (typeof gradesRaw === "string") {
    try {
      gradesRaw = JSON.parse(gradesRaw);
    } catch (e) {
      // fallback: parse comma pairs like "Math:90,Physics:85"
      try {
        const obj: Record<string, number> = {};
        gradesRaw.split(",").forEach((pair: string) => {
          const [k, v] = pair.split(":").map((s: string) => s && s.trim());
          if (k) obj[k] = Math.round(Number(v) || 0);
        });
        gradesRaw = obj;
      } catch (e2) {
        gradesRaw = {};
      }
    }
  }
  if (gradesRaw && typeof gradesRaw === "object" && !Array.isArray(gradesRaw)) {
    for (const k of Object.keys(gradesRaw)) {
      const v = gradesRaw[k];
      const num = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, "")) || 0;
      grades[k] = Math.round(num);
    }
  }

  // parent, class_teacher, address, subject_heads
  const parent = pick("parent", "guardian", "parentInfo") ?? undefined;
  const class_teacher = pick("class_teacher", "classTeacher", "teacher") ?? undefined;
  const address = pick("address", "addr", "location") ?? undefined;
  const subject_heads = pick("subject_heads", "subjectHeads") ?? {};

  return {
    id,
    user_id: pick("user_id", "userId") ?? null,
    name,
    age,
    class: cls,
    subjects,
    grades,
    address,
    parent,
    class_teacher,
    subject_heads,
    created_at,
    updated_at,
  } as Student;
}

/* ---------- Local fallback helpers ---------- */
function addLocalStudent(data: Omit<Student, "id" | "created_at" | "updated_at">): Student {
  const list = load();
  const now = new Date().toISOString();
  const student: Student = {
    ...data,
    id: cryptoRandomId(),
    created_at: now,
    updated_at: now,
  } as Student;
  list.unshift(student);
  save(list);
  return student;
}

function updateLocalStudent(id: string, updates: Partial<Student>): Student | null {
  const list = load();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const updated: Student = {
    ...list[idx],
    ...updates,
    id,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  save(list);
  return updated;
}

function deleteLocalStudent(id: string): boolean {
  let list = load();
  const before = list.length;
  list = list.filter((s) => s.id !== id);
  save(list);
  return list.length < before;
}

/* ---------- Public API functions ---------- */

/**
 * getStudents
 * Attempts backend candidates and returns normalized Students.
 * Falls back to seeded localStorage if network/backend fails.
 */
export async function getStudents(options?: { force?: boolean }): Promise<Student[]> {
  const candidates: string[] = [];
  for (const base of CANDIDATE_BASES) {
    candidates.push(...candidateUrlsFor(base, "/students"));
    candidates.push(...candidateUrlsFor(base, "/api/students"));
  }

  try {
    const raw = await tryFetchJson(candidates);
    // raw might be array, or { data: [...] }, or paginated
    let arr: any[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (raw && Array.isArray(raw.data)) arr = raw.data;
    else if (raw && Array.isArray(raw.items)) arr = raw.items;
    else {
      console.warn("[storage] unexpected fetch payload, falling back to local", raw);
      return load();
    }
    const normalized = arr.map(normalizeRawToStudent);
    console.debug("[storage] returning normalized students count=", normalized.length);
    try {
      // Keep local cache in sync with backend so the UI and MongoDB Compass match
      save(normalized as Student[]);
    } catch (e) {
      console.warn('[storage] failed to save normalized students to local cache', e);
    }
    return normalized;
  } catch (err) {
    console.info("[storage] fetch failed for all candidates", err);
    // If caller forced network, bubble the error so UI can decide (no stale fallback)
    if (options && options.force) throw err;
    // otherwise fall back to local cache
    return load();
  }
}

/**
 * addStudent
 * Tries backend POST (candidates). On success returns normalized student.
 * On failure saves locally and returns local student object.
 */
export async function addStudent(data: Omit<Student, "id" | "created_at" | "updated_at">): Promise<{ data?: Student; error?: any }> {
  try {
    const resp = await tryFetchWithBody("POST", "/students", data);
    // possible shapes: { data: student } or student directly
    if (resp && resp.data) return { data: normalizeRawToStudent(resp.data) };
    if (resp && (resp.id || resp._id)) return { data: normalizeRawToStudent(resp) };
    // sometimes API returns { success: true, data: {...} }
    if (resp && resp.success && resp.data) {
      const student = normalizeRawToStudent(resp.data);
      try {
        const list = load();
        list.unshift(student);
        save(list);
      } catch (e) {
        console.warn('[storage] addStudent: failed to update local cache', e);
      }
      return { data: student };
    }
    if (resp && (resp.id || resp._id)) {
      const student = normalizeRawToStudent(resp);
      try {
        const list = load();
        list.unshift(student);
        save(list);
      } catch (e) {
        console.warn('[storage] addStudent: failed to update local cache', e);
      }
      return { data: student };
    }
    return { data: resp ? normalizeRawToStudent(resp) : undefined };
  } catch (err) {
    console.warn("[storage] addStudent network failed, saving locally", err);
    try {
      const local = addLocalStudent(data);
      return { data: local };
    } catch (e) {
      console.error("[storage] addStudent local save failed", e);
      return { error: e };
    }
  }
}

/**
 * updateStudent
 * Tries backend PUT, returns normalized updated student or local fallback.
 */
export async function updateStudent(id: string, updates: Partial<Student>): Promise<{ data?: Student | null; error?: any }> {
  try {
    const resp = await tryFetchWithBody("PUT", `/students/${id}`, updates);
    const updated = resp && resp.data ? normalizeRawToStudent(resp.data) : resp && (resp.id || resp._id) ? normalizeRawToStudent(resp) : resp ? normalizeRawToStudent(resp) : null;
    if (updated) {
      try {
        const list = load();
        const idx = list.findIndex((s) => s.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated, id } as Student;
        } else {
          // if not found, append
          list.unshift(updated as Student);
        }
        save(list);
      } catch (e) {
        console.warn('[storage] updateStudent: failed to update local cache', e);
      }
    }
    return { data: updated };
  } catch (err) {
    console.warn("[storage] updateStudent network failed, updating locally", err);
    try {
      const local = updateLocalStudent(id, updates);
      return { data: local };
    } catch (e) {
      console.error("[storage] updateStudent local failed", e);
      return { error: e };
    }
  }
}

/**
 * deleteStudent
 * Tries backend DELETE then local fallback.
 */
export async function deleteStudent(id: string): Promise<{ error?: any }> {
  try {
    await tryFetchWithBody("DELETE", `/students/${id}`);
    try {
      const list = load();
      const filtered = list.filter((s) => s.id !== id);
      save(filtered);
    } catch (e) {
      console.warn('[storage] deleteStudent: failed to update local cache', e);
    }
    return {};
  } catch (err) {
    console.warn("[storage] deleteStudent network failed, removing locally", err);
    try {
      const ok = deleteLocalStudent(id);
      if (ok) return {};
      return { error: "Not found locally" };
    } catch (e) {
      console.error("[storage] deleteStudent local failed", e);
      return { error: e };
    }
  }
}

/* ---------- Seed generator (kept from original) ---------- */
function generateSeedStudents(): Student[] {
  const firstNames = [
    "Aarav","Arjun","Vivaan","Sai","Rohan","Ishaan","Aditya","Krishna","Karan","Ravi",
    "Ananya","Aisha","Sanya","Isha","Priya","Diya","Kavya","Neha","Rhea","Simran"
  ];
  const lastNames = ["Sharma","Patel","Verma","Khan","Reddy","Gupta","Das","Singh","Mehta","Kumar"];

  const subjectPool = {
    lower: ["Math","English","EVS","Drawing"],
    middle: ["Math","English","Science","Social Studies","Hindi","Computer"],
    high: ["Math","English","Physics","Chemistry","Biology","History","Geography","Computer"]
  };

  const students: Student[] = [];
  const now = new Date().toISOString();

  for (let cls = 1; cls <= 10; cls++) {
    const count = 45; // ~45 students per class
    for (let i = 0; i < count; i++) {
      const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fname} ${lname}`;

      // age: approximate by class (class 1 -> age 6-7, class 10 -> 15-16)
      const baseAge = 5 + cls; // class 1 => 6
      const age = baseAge + (Math.random() < 0.5 ? 0 : 1);

      // choose subject set by class
      let subjects: string[];
      if (cls <= 3) subjects = subjectPool.lower;
      else if (cls <= 7) subjects = subjectPool.middle;
      else subjects = subjectPool.high;

      // pick 4-6 subjects for the student
      const shuffled = subjects.slice().sort(() => Math.random() - 0.5);
      const take = Math.min(Math.max(4, Math.floor(Math.random() * (shuffled.length - 3)) + 4), shuffled.length);
      const studentSubjects = shuffled.slice(0, take);

      const grades: Record<string, number> = {};
      studentSubjects.forEach((sub) => {
        // grades between 40 and 100, skewed slightly by class
        const min = 40;
        const max = 100;
        const variance = Math.floor(Math.random() * (max - min + 1));
        grades[sub] = Math.max(min, Math.min(max, Math.round(variance + (cls * 0.5))));
      });

      const address = {
        line1: `${Math.floor(1 + Math.random() * 200)} ${['MG Road','Station Road','Church Street','Park Avenue'][Math.floor(Math.random()*4)]}`,
        city: ['Mumbai','Delhi','Bengaluru','Chennai','Hyderabad'][Math.floor(Math.random()*5)],
        state: ['MH','DL','KA','TN','TG'][Math.floor(Math.random()*5)],
        zip: String(100000 + Math.floor(Math.random() * 900000)),
      };

      const parent = {
        name: `${['Mr.','Mrs.','Ms.'][Math.floor(Math.random()*3)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`,
        phone: `+91${Math.floor(600000000 + Math.random() * 399999999)}`,
        relation: Math.random() < 0.5 ? 'Father' : 'Mother'
      };

      const classTeacher = {
        name: `${['Rajesh','Sunita','Kavita','Amit','Sneha'][Math.floor(Math.random()*5)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`,
        phone: `+91${Math.floor(600000000 + Math.random() * 399999999)}`,
        email: '' + name.split(' ').join('.').toLowerCase() + `@school.edu`
      };

      const subjectHeads = studentSubjects.reduce((acc: Record<string, {name:string; phone:string; email:string;}>, sub) => {
        acc[sub] = {
          name: `${['Dr.','Mr.','Ms.'][Math.floor(Math.random()*3)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`,
          phone: `+91${Math.floor(600000000 + Math.random() * 399999999)}`,
          email: `${sub.toLowerCase().replace(/[^a-z]/g,'')}.${cls}@school.edu`
        };
        return acc;
      }, {} as Record<string, {name:string; phone:string; email:string;}>);

      const student: Student = {
        id: cryptoRandomId(),
        user_id: null,
        name,
        age,
        class: `Class ${cls}`,
        subjects: studentSubjects,
        grades,
        address,
        parent,
        class_teacher: classTeacher,
        subject_heads: subjectHeads,
        created_at: now,
        updated_at: now,
      };

      students.push(student);
    }
  }

  return students;
}
