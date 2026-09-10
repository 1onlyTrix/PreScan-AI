import { createClient } from "@supabase/supabase-js";

// ==============================================================================
// 1. SUPABASE CONFIGURATION
// Paste your project URL and public anon/publishable key below:
// ==========================================
const SUPABASE_URL = "https://pfoabzazqeriydhkqizr.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_IyoKj6gJLQ7XISQOghMp-Q_gxyd7t03";

// ==============================================================================
// 2. EXPORT SUPABASE CLIENT INSTANCE
// ==============================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
