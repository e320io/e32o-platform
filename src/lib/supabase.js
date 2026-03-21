import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fyiukqelspqdvdulczrs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aXVrcWVsc3BxZHZkdWxjenJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzUwMDAsImV4cCI6MjA4OTQ1MTAwMH0.HsZdGoLGCIbKcv3ytWTyjYrWeQ5yRJsp7O1Cj9lWO3g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
