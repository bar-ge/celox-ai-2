import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://dvjjxwcvxjgqpdcnnmvv.supabase.co"
const SUPABASE_KEY = "sb_publishable_k-_msILid0eSMWcuH8d6jw_yO1DW3UN"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
