/* =====================================================
   SMART ATTENDANCE — Data Store & Supabase Sync Layer
   Includes LocalStorage & Supabase database integration for 
   Departments, Sections, Subjects, Users, Marks, and Attendance.
   ===================================================== */

const DEMO_MODE = false;

// ─── College Info ──────────────────────────────────────
const COLLEGE = {
  name: 'Jayaraj Anna Pakiyam CSI Collage Of Engineering',
  code: 'JC9513',
  address: '123 College Road, Chennai, Tamil Nadu',
  academicYear: '2026-27',
};

// ─── Testing Admin Account ──────────────────────────────
const TESTING_ADMIN = {
  id: 'admin_001',
  name: 'NAVEEN KARTHICK',
  firstName: 'NAVEEN',
  lastName: 'KARTHICK',
  email: 'naveenkarthickcoc001@gmail.com',
  password: 'naveen2006',
  phone: '09087467473',
  role: 'admin',
  deptId: null,
  status: 'active',
  avatar: 'NK',
  joinDate: '2026-08-10',
  college: COLLEGE.name,
};

// ─── LocalStorage & Supabase Persistence Loaders ──────
function loadStorage(key, defaultData) {
  try {
    const saved = localStorage.getItem(`sa_${key}`);
    return saved ? JSON.parse(saved) : defaultData;
  } catch (e) {
    return defaultData;
  }
}

function saveStorage(key, data) {
  try {
    localStorage.setItem(`sa_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving sa_${key}:`, e);
  }

  // Supabase Sync (if Supabase client is initialized)
  if (typeof supabaseClient !== 'undefined' && supabaseClient !== null) {
    syncToSupabase(key, data);
  }
}

// ─── Supabase Database Sync Helper ─────────────────────
async function syncToSupabase(table, data) {
  try {
    const { error } = await supabaseClient
      .from(table)
      .upsert(data, { onConflict: 'id' });
      
    if (error) {
      console.warn(`Supabase sync warning for ${table}:`, error.message);
    } else {
      console.log(`Supabase synced table ${table} successfully ✅`);
    }
  } catch (e) {
    console.error(`Supabase sync error on table ${table}:`, e);
  }
}

// ─── Data Arrays (Loaded from Storage or Defaults) ─────
let DEMO_DEPARTMENTS = loadStorage('departments', [
  { id: 'd1', name: 'Computer Science & Engineering', code: 'CSE', program: 'UG', years: 4, hod: null },
  { id: 'd2', name: 'Electronics & Communication',    code: 'ECE', program: 'UG', years: 4, hod: null },
  { id: 'd3', name: 'Information Technology',         code: 'IT',  program: 'UG', years: 4, hod: null },
]);

let DEMO_SECTIONS = loadStorage('sections', [
  { deptId: 'd1', year: 1, sections: ['A', 'B'] },
  { deptId: 'd1', year: 2, sections: ['A', 'B'] },
  { deptId: 'd2', year: 1, sections: ['A', 'B'] },
  { deptId: 'd2', year: 2, sections: ['A', 'B'] },
  { deptId: 'd3', year: 1, sections: ['A', 'B'] },
]);

let DEMO_SUBJECTS   = loadStorage('subjects', []);
let DEMO_USERS      = loadStorage('users', [TESTING_ADMIN]);
let DEMO_PENDING    = loadStorage('pending', []);
let DEMO_MARKS      = loadStorage('marks', []);
let DEMO_ATTENDANCE = loadStorage('attendance', []);
let DEMO_ATT_SUMMARY= loadStorage('att_summary', []);

// ─── Data Helper Functions ─────────────────────────────
function getDept(id) { 
  return DEMO_DEPARTMENTS.find(d => d.id === id) || {}; 
}

function getSections(deptId, year) {
  let s = DEMO_SECTIONS.find(s => s.deptId === deptId && s.year === Number(year));
  if (!s) {
    s = { deptId, year: Number(year), sections: ['A', 'B'] };
    DEMO_SECTIONS.push(s);
    saveStorage('sections', DEMO_SECTIONS);
  }
  return s.sections;
}

function addSectionToDept(deptId, year, sectionName) {
  let s = DEMO_SECTIONS.find(s => s.deptId === deptId && s.year === Number(year));
  if (!s) {
    s = { deptId, year: Number(year), sections: ['A', 'B'] };
    DEMO_SECTIONS.push(s);
  }
  const cleanSec = sectionName.trim().toUpperCase();
  if (!s.sections.includes(cleanSec)) {
    s.sections.push(cleanSec);
  }
  saveStorage('sections', DEMO_SECTIONS);
  return s.sections;
}

function removeSectionFromDept(deptId, year, sectionName) {
  let s = DEMO_SECTIONS.find(s => s.deptId === deptId && s.year === Number(year));
  if (!s) {
    s = { deptId, year: Number(year), sections: ['A', 'B'] };
    DEMO_SECTIONS.push(s);
  }
  const cleanSec = sectionName.trim().toUpperCase();
  s.sections = s.sections.filter(sec => sec !== cleanSec);
  saveStorage('sections', DEMO_SECTIONS);
  return s.sections;
}

function getSubjects(deptId, year) {
  return DEMO_SUBJECTS.filter(s => s.deptId === deptId && Number(s.year) === Number(year));
}

function getStudents(deptId, year, section) {
  return DEMO_USERS.filter(u => u.role === 'student' && u.deptId === deptId && Number(u.year) === Number(year) && u.section === section);
}

function getStudentMarks(userId) {
  return DEMO_MARKS.filter(m => m.userId === userId);
}

function isFailIAT(mark, max) { 
  return mark < (max * 0.5); 
}

function countFails(userId, iatNum) {
  const key = `iat${iatNum}`;
  return DEMO_MARKS.filter(m => m.userId === userId && isFailIAT(m[key], 50)).length;
}

// ─── Current User Session ──────────────────────────────
function currentUser() {
  const stored = sessionStorage.getItem('sa_user');
  return stored ? JSON.parse(stored) : null;
}
function isAdmin()   { const u = currentUser(); return u ? u.role === 'admin' : false;   }
function isTeacher() { const u = currentUser(); return u ? u.role === 'teacher' : false; }
function isStudent() { const u = currentUser(); return u ? u.role === 'student' : false; }

// ─── Live Dashboard Counters ───────────────────────────
const DEMO_STATS = {
  get total() { return DEMO_USERS.filter(u => u.role === 'student').length; },
  get present() { return DEMO_ATTENDANCE.filter(a => a.status === 'present').length; },
  get absent() { return DEMO_ATTENDANCE.filter(a => a.status === 'absent').length; },
  get late() { return DEMO_ATTENDANCE.filter(a => a.status === 'late').length; },
  get percentage() { return this.total > 0 ? Math.round((this.present / this.total) * 100) : 0; }
};

const DEMO_REPORTS = {
  weekly: [
    { day: 'Mon', present: 0, absent: 0, late: 0 },
    { day: 'Tue', present: 0, absent: 0, late: 0 },
    { day: 'Wed', present: 0, absent: 0, late: 0 },
    { day: 'Thu', present: 0, absent: 0, late: 0 },
    { day: 'Fri', present: 0, absent: 0, late: 0 },
  ],
  monthly: [
    { week: 'Week 1', rate: 0 },
    { week: 'Week 2', rate: 0 },
    { week: 'Week 3', rate: 0 },
    { week: 'Week 4', rate: 0 },
  ],
  get studentSummary() {
    return DEMO_USERS.filter(u => u.role === 'student').map(s => {
      const records = DEMO_ATTENDANCE.filter(a => a.userId === s.id);
      const present = records.filter(r => r.status === 'present').length;
      const absent  = records.filter(r => r.status === 'absent').length;
      const late    = records.filter(r => r.status === 'late').length;
      const total   = records.length || 1;
      const pct     = Math.round((present / total) * 100);
      return {
        name: s.name, rollNo: s.rollNo || s.id, class: getDept(s.deptId).code || '',
        present, absent, late, percentage: records.length ? pct : 100,
      };
    });
  }
};
