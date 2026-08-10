/* =====================================================
   SMART ATTENDANCE — Supabase Configuration
   Replace with your own Supabase project credentials.
   Get them from: https://supabase.com
   Project Settings → API → Project URL & anon/public Key
   ===================================================== Naveen@2006.g */

// ⚠️ REPLACE THESE VALUES WITH YOUR SUPABASE PROJECT CREDENTIALS
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// Initialize Supabase Client globally if CDN script is loaded
let supabaseClient = null;

if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("Supabase Client initialized ✅");
}
