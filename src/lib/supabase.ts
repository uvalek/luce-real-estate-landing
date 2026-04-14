import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lrxwvyilfobwyndikqpq.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeHd2eWlsZm9id3luZGlrcXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDg5MjAsImV4cCI6MjA4OTAyNDkyMH0.AGZBy5As6dVrHDiPVNZxwjK13i91eIOSKBZyfq5LP5s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
