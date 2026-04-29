import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://plzmteasoyqctvrenglr.supabase.co"
const supabaseKey = "sb_publishable_gXKW30yDFD2nTv9ty6ChnQ_oerAi3SB"

export const supabase = createClient(supabaseUrl, supabaseKey)