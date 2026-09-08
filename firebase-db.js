/* ====================================================================
   SMART ATTENDANCE SYSTEM — Firestore Database Helper
   Mirrors all Supabase table operations in Firebase Firestore.

   USAGE: import these functions in any page script:
   -------------------------------------------------------
   import {
     createUserProfile, getUserProfile,
     addAttendanceLog, getAttendanceLogs,
     addMark, getMarksByStudent,
     // ... etc
   } from './firebase-db.js';
   ====================================================================
*/

import { getFirestore, doc, collection,
  getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { seedDepartments, seedMasterPeriods } from './firebase-db.js';
await seedDepartments();    // creates CSE, ECE, IT departments
await seedMasterPeriods();  // creates 9 bell periods

// ── Re-use the existing Firebase app ─────────────────────────────────
// (initializeApp is safe to call again; getApps() prevents double-init)
const firebaseConfig = {
  apiKey:            "AIzaSyDd_iEvnz2kpzx9rnFRdTu95fNkb7Bc73s",
  authDomain:        "smart-attendance-ad81d.firebaseapp.com",
  projectId:         "smart-attendance-ad81d",
  storageBucket:     "smart-attendance-ad81d.firebasestorage.app",
  messagingSenderId: "899705558435",
  appId:             "1:899705558435:web:c1ae6a5c82f0988c98b616",
  measurementId:     "G-46PJNG2PJT"
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Collection name constants ─────────────────────────────────────────
const COL = {
  USERS:          'users',
  PENDING:        'pending',
  DEPARTMENTS:    'departments',
  SUBJECTS:       'subjects',
  ATTENDANCE:     'attendance_logs',
  ATT_SUMMARY:    'att_summary',
  MARKS:          'marks',
  TIMETABLE:      'timetable',
  MASTER_PERIODS: 'master_periods'
};


// ====================================================================
//  USERS  (mirrors: user_directory / users tables)
// ====================================================================

/**
 * Create or overwrite a user profile document.
 * The document ID is always the Firebase Auth UID.
 *
 * Schema:
 *   name, email, role, program, deptId, year, section,
 *   rollNo, phone, avatar, status, college, createdAt, lastActive
 */
async function createUserProfile(uid, data) {
  await setDoc(doc(db, COL.USERS, uid), {
    name:       data.name       || '',
    email:      data.email      || '',
    role:       data.role       || 'student',   // 'admin' | 'teacher' | 'staff' | 'student'
    program:    data.program    || 'UG',         // 'UG' | 'PG'
    deptId:     data.deptId     || 'CSE',
    year:       data.year       || 1,
    section:    data.section    || 'A',
    rollNo:     data.rollNo     || '',
    phone:      data.phone      || '',
    avatar:     data.avatar     || '',
    status:     data.status     || 'active',    // 'active' | 'pending' | 'inactive'
    college:    data.college    || '',
    createdAt:  data.createdAt  || serverTimestamp(),
    lastActive: serverTimestamp()
  }, { merge: true });                          // merge:true keeps existing fields
}

/**
 * Get a single user profile by UID.
 * @returns {object|null}
 */
async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, COL.USERS, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Get a user profile by email address.
 * @returns {object|null}
 */
async function getUserByEmail(email) {
  const q    = query(collection(db, COL.USERS), where('email', '==', email), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Get all users, optionally filtered by role and/or deptId.
 * @param {{ role?: string, deptId?: string }} filters
 */
async function getAllUsers(filters = {}) {
  let q = collection(db, COL.USERS);
  const constraints = [];
  if (filters.role)   constraints.push(where('role',   '==', filters.role));
  if (filters.deptId) constraints.push(where('deptId', '==', filters.deptId));
  if (constraints.length) q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Update lastActive timestamp for the currently signed-in user.
 */
async function updateLastActive() {
  const user = auth.currentUser;
  if (!user) return;
  await updateDoc(doc(db, COL.USERS, user.uid), { lastActive: serverTimestamp() });
}


// ====================================================================
//  PENDING REGISTRATIONS  (mirrors: pending table)
// ====================================================================

/**
 * Submit a new registration request (before admin approval).
 *
 * Schema:
 *   name, email, phone, role, deptId, year, section, rollNo,
 *   collegeCode, status ('pending'|'approved'|'rejected'),
 *   appliedDate, emailVerified, uid (set after Firebase Auth signup)
 */
async function submitPendingRegistration(data) {
  const docRef = await addDoc(collection(db, COL.PENDING), {
    name:          data.name          || '',
    email:         data.email         || '',
    phone:         data.phone         || '',
    role:          data.role          || 'student',
    deptId:        data.deptId        || 'CSE',
    year:          data.year          || 1,
    section:       data.section       || 'A',
    rollNo:        data.rollNo        || '',
    collegeCode:   data.collegeCode   || '',
    status:        'pending',
    emailVerified: data.emailVerified || false,
    uid:           data.uid           || '',
    appliedDate:   serverTimestamp()
  });
  return docRef.id;
}

/**
 * Get all pending registrations (admin view).
 * @param {string} [statusFilter] 'pending' | 'approved' | 'rejected'
 */
async function getPendingRegistrations(statusFilter = 'pending') {
  const q    = query(
    collection(db, COL.PENDING),
    where('status', '==', statusFilter),
    orderBy('appliedDate', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Approve a pending registration — moves user to /users and deletes pending doc.
 * @param {string} pendingId  Firestore document ID in /pending
 * @param {string} uid        Firebase Auth UID for the newly created user
 */
async function approvePendingRegistration(pendingId, uid) {
  const pendingRef = doc(db, COL.PENDING, pendingId);
  const pendingSnap = await getDoc(pendingRef);
  if (!pendingSnap.exists()) throw new Error('Pending document not found');

  const data = pendingSnap.data();
  const batch = writeBatch(db);

  // Write approved user profile
  batch.set(doc(db, COL.USERS, uid), {
    name:      data.name,
    email:     data.email,
    phone:     data.phone     || '',
    role:      data.role,
    deptId:    data.deptId,
    year:      data.year,
    section:   data.section,
    rollNo:    data.rollNo    || '',
    college:   data.collegeCode || '',
    status:    'active',
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp()
  });

  // Mark pending as approved
  batch.update(pendingRef, { status: 'approved' });

  await batch.commit();
}

/**
 * Reject a pending registration.
 */
async function rejectPendingRegistration(pendingId) {
  await updateDoc(doc(db, COL.PENDING, pendingId), { status: 'rejected' });
}


// ====================================================================
//  DEPARTMENTS  (mirrors: departments table)
// ====================================================================

/**
 * Seed or create a department document.
 * The document ID is the dept code (e.g. 'CSE').
 *
 * Schema: code, name, program, years, hodId, createdAt
 */
async function upsertDepartment(code, data) {
  await setDoc(doc(db, COL.DEPARTMENTS, code), {
    code:    code,
    name:    data.name    || '',
    program: data.program || 'UG',
    years:   data.years   || 4,
    hodId:   data.hodId   || '',
    createdAt: serverTimestamp()
  }, { merge: true });
}

async function getAllDepartments() {
  const snap = await getDocs(collection(db, COL.DEPARTMENTS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ====================================================================
//  SUBJECTS  (mirrors: subjects table)
// ====================================================================

/**
 * Schema: code, name, deptId, year, credits, maxIAT, createdAt
 */
async function upsertSubject(subjectId, data) {
  await setDoc(doc(db, COL.SUBJECTS, subjectId), {
    code:      data.code    || '',
    name:      data.name    || '',
    deptId:    data.deptId  || 'CSE',
    year:      data.year    || 1,
    credits:   data.credits || 4,
    maxIAT:    data.maxIAT  || 50,
    createdAt: serverTimestamp()
  }, { merge: true });
}

async function getSubjectsByDept(deptId, year = null) {
  const constraints = [where('deptId', '==', deptId)];
  if (year) constraints.push(where('year', '==', year));
  const snap = await getDocs(query(collection(db, COL.SUBJECTS), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ====================================================================
//  ATTENDANCE LOGS  (mirrors: attendance_logs / attendance tables)
// ====================================================================

/**
 * Add a single attendance record.
 *
 * Schema:
 *   studentId, studentName, program, dept, year, section,
 *   classLabel, subject, attendanceDate (YYYY-MM-DD),
 *   checkIn, checkOut, status ('present'|'absent'|'late'),
 *   method ('Manual'|'QR'|'Face'), markedBy, createdAt
 */
async function addAttendanceLog(data) {
  const docRef = await addDoc(collection(db, COL.ATTENDANCE), {
    studentId:      data.studentId      || '',
    studentName:    data.studentName    || '',
    program:        data.program        || 'UG',
    dept:           data.dept           || '',
    year:           data.year           || 1,
    section:        data.section        || 'A',
    classLabel:     data.classLabel     || '',
    subject:        data.subject        || 'General',
    attendanceDate: data.attendanceDate || new Date().toISOString().slice(0, 10),
    checkIn:        data.checkIn        || '--',
    checkOut:       data.checkOut       || '--',
    status:         data.status         || 'present',
    method:         data.method         || 'Manual',
    markedBy:       data.markedBy       || '',
    createdAt:      serverTimestamp()
  });
  return docRef.id;
}

/**
 * Batch-insert multiple attendance logs at once (e.g., entire class session).
 * @param {Array<object>} records  Array of attendance objects (same schema as addAttendanceLog)
 */
async function batchAddAttendanceLogs(records) {
  const batch = writeBatch(db);
  records.forEach(data => {
    const ref = doc(collection(db, COL.ATTENDANCE));
    batch.set(ref, {
      studentId:      data.studentId      || '',
      studentName:    data.studentName    || '',
      program:        data.program        || 'UG',
      dept:           data.dept           || '',
      year:           data.year           || 1,
      section:        data.section        || 'A',
      classLabel:     data.classLabel     || '',
      subject:        data.subject        || 'General',
      attendanceDate: data.attendanceDate || new Date().toISOString().slice(0, 10),
      checkIn:        data.checkIn        || '--',
      checkOut:       data.checkOut       || '--',
      status:         data.status         || 'present',
      method:         data.method         || 'Manual',
      markedBy:       data.markedBy       || '',
      createdAt:      serverTimestamp()
    });
  });
  await batch.commit();
}

/**
 * Get attendance logs for a student.
 * @param {string} studentId
 * @param {number} [limitCount]
 */
async function getAttendanceLogs(studentId, limitCount = 100) {
  const q = query(
    collection(db, COL.ATTENDANCE),
    where('studentId', '==', studentId),
    orderBy('attendanceDate', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get attendance for a whole class on a date.
 */
async function getClassAttendance(dept, year, section, date) {
  const q = query(
    collection(db, COL.ATTENDANCE),
    where('dept',           '==', dept),
    where('year',           '==', year),
    where('section',        '==', section),
    where('attendanceDate', '==', date)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Update an existing attendance log (e.g. fix status, add check-out).
 */
async function updateAttendanceLog(logId, updates) {
  await updateDoc(doc(db, COL.ATTENDANCE, logId), updates);
}


// ====================================================================
//  ATTENDANCE SUMMARY  (mirrors: att_summary table)
// ====================================================================

/**
 * Upsert the aggregated attendance summary for a student.
 * The document ID is the studentId.
 *
 * Schema: studentId, present, absent, late, total, percentage, updatedAt
 */
async function upsertAttSummary(studentId, data) {
  await setDoc(doc(db, COL.ATT_SUMMARY, studentId), {
    studentId:  studentId,
    present:    data.present    || 0,
    absent:     data.absent     || 0,
    late:       data.late       || 0,
    total:      data.total      || 0,
    percentage: data.percentage || 0,
    updatedAt:  serverTimestamp()
  }, { merge: true });
}

async function getAttSummary(studentId) {
  const snap = await getDoc(doc(db, COL.ATT_SUMMARY, studentId));
  return snap.exists() ? snap.data() : null;
}


// ====================================================================
//  MARKS  (mirrors: marks table)
// ====================================================================

/**
 * Add a mark entry.
 *
 * Schema:
 *   studentId, studentName, dept, year, section,
 *   subjectCode, subjectName,
 *   examType ('IAT 1'|'IAT 2'|'Model Exam'|'Semester'),
 *   marksObtained, maxMarks, enteredBy, createdAt
 */
async function addMark(data) {
  const docRef = await addDoc(collection(db, COL.MARKS), {
    studentId:      data.studentId      || '',
    studentName:    data.studentName    || '',
    dept:           data.dept           || '',
    year:           data.year           || 1,
    section:        data.section        || 'A',
    subjectCode:    data.subjectCode    || '',
    subjectName:    data.subjectName    || '',
    examType:       data.examType       || 'IAT 1',
    marksObtained:  data.marksObtained  || 0,
    maxMarks:       data.maxMarks       || 50,
    enteredBy:      data.enteredBy      || '',
    createdAt:      serverTimestamp()
  });
  return docRef.id;
}

/**
 * Get all marks for a student.
 */
async function getMarksByStudent(studentId) {
  const q = query(
    collection(db, COL.MARKS),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get marks for a whole class filtered by exam type.
 */
async function getMarksByClass(dept, year, section, examType = null) {
  const constraints = [
    where('dept',    '==', dept),
    where('year',    '==', year),
    where('section', '==', section)
  ];
  if (examType) constraints.push(where('examType', '==', examType));
  const snap = await getDocs(query(collection(db, COL.MARKS), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Update a mark document.
 */
async function updateMark(markId, updates) {
  await updateDoc(doc(db, COL.MARKS, markId), updates);
}

/**
 * Delete a mark document.
 */
async function deleteMark(markId) {
  await deleteDoc(doc(db, COL.MARKS, markId));
}


// ====================================================================
//  TIMETABLE  (mirrors: timetable table)
// ====================================================================

/**
 * Add / overwrite a timetable slot.
 *
 * Schema:
 *   deptId, year, section, dayOfWeek ('MONDAY'…),
 *   periodId, subjectCode, subjectName, teacherId, teacherName, createdAt
 */
async function upsertTimetableSlot(data) {
  // Deterministic ID: prevents duplicate entries for same class/day/period
  const slotId = `${data.deptId}_Y${data.year}_${data.section}_${data.dayOfWeek}_${data.periodId}`;
  await setDoc(doc(db, COL.TIMETABLE, slotId), {
    deptId:      data.deptId      || '',
    year:        data.year        || 1,
    section:     data.section     || 'A',
    dayOfWeek:   data.dayOfWeek   || 'MONDAY',
    periodId:    data.periodId    || '',
    subjectCode: data.subjectCode || '',
    subjectName: data.subjectName || '',
    teacherId:   data.teacherId   || '',
    teacherName: data.teacherName || '',
    createdAt:   serverTimestamp()
  }, { merge: true });
}

/**
 * Get full timetable for a class.
 */
async function getTimetable(deptId, year, section) {
  const q = query(
    collection(db, COL.TIMETABLE),
    where('deptId',  '==', deptId),
    where('year',    '==', year),
    where('section', '==', section)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ====================================================================
//  MASTER PERIODS  (bell timings — mirrors: master_periods table)
// ====================================================================

/**
 * Seed initial college bell periods.
 * Schema: periodName, startTime, endTime, isBreak, orderIndex
 */
async function seedMasterPeriods() {
  const periods = [
    { periodName: 'Period 1',  startTime: '09:20', endTime: '10:05', isBreak: false, orderIndex: 1 },
    { periodName: 'Period 2',  startTime: '10:05', endTime: '10:50', isBreak: false, orderIndex: 2 },
    { periodName: 'TEA BREAK', startTime: '10:50', endTime: '11:05', isBreak: true,  orderIndex: 3 },
    { periodName: 'Period 3',  startTime: '11:05', endTime: '11:50', isBreak: false, orderIndex: 4 },
    { periodName: 'Period 4',  startTime: '11:50', endTime: '12:35', isBreak: false, orderIndex: 5 },
    { periodName: 'LUNCH',     startTime: '12:35', endTime: '13:15', isBreak: true,  orderIndex: 6 },
    { periodName: 'Period 5',  startTime: '13:15', endTime: '14:00', isBreak: false, orderIndex: 7 },
    { periodName: 'Period 6',  startTime: '14:00', endTime: '14:45', isBreak: false, orderIndex: 8 },
    { periodName: 'Period 7',  startTime: '14:45', endTime: '15:30', isBreak: false, orderIndex: 9 }
  ];

  const batch = writeBatch(db);
  periods.forEach(p => {
    const ref = doc(collection(db, COL.MASTER_PERIODS));
    batch.set(ref, { ...p, createdAt: serverTimestamp() });
  });
  await batch.commit();
  console.log('✅ Master periods seeded.');
}

async function getMasterPeriods() {
  const q    = query(collection(db, COL.MASTER_PERIODS), orderBy('orderIndex', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ====================================================================
//  SEED INITIAL DATA  (run once on first deploy)
// ====================================================================

/**
 * Seeds the three initial departments.
 * Safe to call multiple times — uses merge:true.
 */
async function seedDepartments() {
  const depts = [
    { code: 'CSE', name: 'Computer Science & Engineering', program: 'UG', years: 4 },
    { code: 'ECE', name: 'Electronics & Communication',    program: 'UG', years: 4 },
    { code: 'IT',  name: 'Information Technology',         program: 'UG', years: 4 }
  ];
  for (const d of depts) await upsertDepartment(d.code, d);
  console.log('✅ Departments seeded.');
}


// ── Export all helpers ────────────────────────────────────────────────
export {
  db,

  // Users
  createUserProfile, getUserProfile, getUserByEmail, getAllUsers, updateLastActive,

  // Pending
  submitPendingRegistration, getPendingRegistrations,
  approvePendingRegistration, rejectPendingRegistration,

  // Departments
  upsertDepartment, getAllDepartments, seedDepartments,

  // Subjects
  upsertSubject, getSubjectsByDept,

  // Attendance
  addAttendanceLog, batchAddAttendanceLogs,
  getAttendanceLogs, getClassAttendance, updateAttendanceLog,

  // Attendance Summary
  upsertAttSummary, getAttSummary,

  // Marks
  addMark, getMarksByStudent, getMarksByClass, updateMark, deleteMark,

  // Timetable
  upsertTimetableSlot, getTimetable,

  // Master Periods
  seedMasterPeriods, getMasterPeriods
};

