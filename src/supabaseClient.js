import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://misrijkoqbtmczaashhr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qMn9FpBbg5v6SfDhbnAljg_nAUoqSey';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);