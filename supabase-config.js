/* =====================================================
   SMART ATTENDANCE — Supabase Configuration
   Replace with your own Supabase project credentials.
   Get them from: https://supabase.com
   Project Settings → API → Project URL & anon/public Key
   ===================================================== Naveen@2006.g */

// ⚠️ SUPABASE PROJECT CREDENTIALS
const SUPABASE_URL = "https://ohtklbxlnqztztyqrply.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9odGtsYnhsbnF6dHp0eXFycGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MzYwMTcsImV4cCI6MjEwMjExMjAxN30.0Z2bfa2zmq1OncuXbp9Qmh827uZu98FnsrrhbzyN0_E";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9odGtsYnhsbnF6dHp0eXFycGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUzNjAxNywiZXhwIjoyMTAyMTEyMDE3fQ.s_Lqake8r9Yi2xYijdsRSXmJ-3tAkjrseP-vWzQircs";

// Initialize Supabase Client globally if CDN script is loaded
let supabaseClient = null;

if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("Supabase Client initialized ✅");
}
