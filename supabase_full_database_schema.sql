-- ====================================================================
-- SMART ATTENDANCE SYSTEM — COMPLETE SUPABASE DATABASE ARCHITECTURE
-- Run this full script in Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. Safely drop previous table/view conflicts regardless of relation type
DO $$ 
BEGIN
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

    -- Drop user_directory cleanly based on pg catalog relation type
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_directory') THEN
        EXECUTE 'DROP TABLE public.user_directory CASCADE';
    ELSIF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_directory') THEN
        EXECUTE 'DROP VIEW public.user_directory CASCADE';
    END IF;

    -- Drop profiles cleanly based on pg catalog relation type
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        EXECUTE 'DROP TABLE public.profiles CASCADE';
    ELSIF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'profiles') THEN
        EXECUTE 'DROP VIEW public.profiles CASCADE';
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 2. USER DIRECTORY TABLE
-- --------------------------------------------------------------------
CREATE TABLE public.user_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',         -- 'admin', 'teacher', 'staff', 'student'
    program TEXT DEFAULT 'UG',                   -- 'UG' or 'PG'
    dept_id TEXT DEFAULT 'CSE',                  -- Dept Code e.g. 'CSE', 'ECE'
    year INT DEFAULT 1,                          -- 1, 2, 3, 4
    section TEXT DEFAULT 'A',                    -- 'A', 'B', 'C'
    roll_no TEXT,                                -- Student Register/Roll No
    phone TEXT,
    avatar TEXT,
    status TEXT NOT NULL DEFAULT 'active',        -- 'active', 'pending', 'inactive'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Backward compatibility view for profiles
CREATE VIEW public.profiles AS 
SELECT 
    id, 
    name AS full_name, 
    email, 
    role, 
    program, 
    dept_id AS department, 
    year, 
    section, 
    roll_no AS register_number, 
    phone, 
    avatar AS avatar_url, 
    status, 
    created_at 
FROM public.user_directory;

-- --------------------------------------------------------------------
-- 3. AUTOMATIC TRIGGER: auth.users -> public.user_directory
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_directory (id, name, email, role, dept_id, roll_no)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'department', 'CSE'),
        COALESCE(NEW.raw_user_meta_data->>'register_number', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- 4. DEPARTMENTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,                         -- e.g. 'd1'
    code TEXT UNIQUE NOT NULL,                   -- e.g. 'CSE'
    name TEXT NOT NULL,                          -- e.g. 'Computer Science & Engineering'
    program TEXT NOT NULL DEFAULT 'UG',          -- 'UG' or 'PG'
    years INT NOT NULL DEFAULT 4,
    hod_id UUID REFERENCES public.user_directory(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --------------------------------------------------------------------
-- 5. SUBJECTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,                         -- e.g. 's1'
    dept_id TEXT REFERENCES public.departments(id) ON DELETE CASCADE,
    code TEXT NOT NULL,                          -- e.g. 'CS3591'
    name TEXT NOT NULL,                          -- e.g. 'COMPUTER NETWORKS'
    year INT NOT NULL DEFAULT 1,
    credits INT DEFAULT 4,
    max_iat INT DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --------------------------------------------------------------------
-- 6. ATTENDANCE LOGS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.user_directory(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    program TEXT NOT NULL DEFAULT 'UG',
    dept TEXT NOT NULL,                          -- e.g. 'CSE'
    year INT NOT NULL,
    section TEXT NOT NULL,
    class_label TEXT NOT NULL,                   -- e.g. 'UG - CSE - Year 2 (Sec A)'
    subject TEXT DEFAULT 'General',
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TEXT DEFAULT '--',
    check_out TEXT DEFAULT '--',
    status TEXT NOT NULL DEFAULT 'present',      -- 'present', 'absent', 'late'
    method TEXT NOT NULL DEFAULT 'Manual',
    marked_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --------------------------------------------------------------------
-- 7. MARKS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.user_directory(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    dept TEXT NOT NULL,
    year INT NOT NULL,
    section TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    exam_type TEXT NOT NULL DEFAULT 'IAT 1',      -- 'IAT 1', 'IAT 2', 'Model Exam', 'Semester'
    marks_obtained NUMERIC(5,2) NOT NULL DEFAULT 0,
    max_marks NUMERIC(5,2) NOT NULL DEFAULT 50,
    entered_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.user_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to prevent duplicate policy errors
DROP POLICY IF EXISTS "Public read user_directory" ON public.user_directory;
DROP POLICY IF EXISTS "Users update own profile or Admin update all" ON public.user_directory;

DROP POLICY IF EXISTS "Public read attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Staff, Teacher & Admin insert attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Staff, Teacher & Admin update attendance" ON public.attendance_logs;

DROP POLICY IF EXISTS "Students read own marks / Teachers & Admin read all" ON public.marks;
DROP POLICY IF EXISTS "Teachers & Admin insert marks" ON public.marks;
DROP POLICY IF EXISTS "Teachers & Admin update marks" ON public.marks;

DROP POLICY IF EXISTS "Public read departments" ON public.departments;
DROP POLICY IF EXISTS "Admin write departments" ON public.departments;

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admin & Teachers write subjects" ON public.subjects;

-- Create Policies
CREATE POLICY "Public read user_directory" ON public.user_directory FOR SELECT USING (true);
CREATE POLICY "Users update own profile or Admin update all" ON public.user_directory FOR ALL USING (true);

CREATE POLICY "Public read attendance" ON public.attendance_logs FOR SELECT USING (true);
CREATE POLICY "Staff, Teacher & Admin insert attendance" ON public.attendance_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff, Teacher & Admin update attendance" ON public.attendance_logs FOR UPDATE USING (true);

CREATE POLICY "Students read own marks / Teachers & Admin read all" ON public.marks FOR SELECT USING (true);
CREATE POLICY "Teachers & Admin insert marks" ON public.marks FOR INSERT WITH CHECK (true);
CREATE POLICY "Teachers & Admin update marks" ON public.marks FOR UPDATE USING (true);

CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admin write departments" ON public.departments FOR ALL USING (true);

CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admin & Teachers write subjects" ON public.subjects FOR ALL USING (true);

-- ====================================================================
-- 9. INITIAL SEED DATA
-- ====================================================================
INSERT INTO public.departments (id, code, name, program, years)
VALUES 
    ('d1', 'CSE', 'Computer Science & Engineering', 'UG', 4),
    ('d2', 'ECE', 'Electronics & Communication', 'UG', 4),
    ('d3', 'IT', 'Information Technology', 'UG', 4)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 10. TIMETABLE & MASTER PERIODS
-- ====================================================================

-- Master periods define the college bell times (Period 1, Tea Break, etc.)
CREATE TABLE IF NOT EXISTS public.master_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_name TEXT NOT NULL,                   -- e.g. 'Period 1', 'TEA BREAK'
    start_time TIME NOT NULL,                    -- e.g. '09:20'
    end_time TIME NOT NULL,                      -- e.g. '10:05'
    is_break BOOLEAN DEFAULT false,              -- true if it's a break
    order_index INT NOT NULL DEFAULT 1,          -- for sorting (1, 2, 3...)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Timetable stores the actual weekly schedule mapping periods to subjects/teachers
CREATE TABLE IF NOT EXISTS public.timetable (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dept_id TEXT REFERENCES public.departments(id) ON DELETE CASCADE,
    year INT NOT NULL,
    section TEXT NOT NULL,
    day_of_week TEXT NOT NULL,                   -- 'MONDAY', 'TUESDAY', etc.
    period_id UUID REFERENCES public.master_periods(id) ON DELETE CASCADE,
    subject_code TEXT,                           -- Can be mapped to subjects table
    subject_name TEXT,
    teacher_id UUID REFERENCES public.user_directory(id) ON DELETE SET NULL,
    teacher_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicate assignments for the same class/period/day
    UNIQUE (dept_id, year, section, day_of_week, period_id)
);

-- RLS Policies for Timetable
ALTER TABLE public.master_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read master_periods" ON public.master_periods;
DROP POLICY IF EXISTS "Admin write master_periods" ON public.master_periods;
DROP POLICY IF EXISTS "Public read timetable" ON public.timetable;
DROP POLICY IF EXISTS "Admin & Teachers write timetable" ON public.timetable;

CREATE POLICY "Public read master_periods" ON public.master_periods FOR SELECT USING (true);
CREATE POLICY "Admin write master_periods" ON public.master_periods FOR ALL USING (true);

CREATE POLICY "Public read timetable" ON public.timetable FOR SELECT USING (true);
CREATE POLICY "Admin & Teachers write timetable" ON public.timetable FOR ALL USING (true);
