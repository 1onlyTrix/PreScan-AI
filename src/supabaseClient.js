import { createClient } from "@supabase/supabase-js";

// Replace these variables with your actual Supabase project URL and anon public key
const SUPABASE_URL = "https://wyxtqeblokvsgaegsyrs.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_Hf5kGvpCQlpwwgE6neGv3A_A1qSmNaM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

export const signInWithGoogle = async () => {
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
};
