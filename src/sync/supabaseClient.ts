// Подключение к Supabase. Адрес и публичный ключ — из .env (локально) или GitHub Secrets (сборка).
// Публичный (publishable) ключ можно показывать: он попадает в код сайта. Чужие данные защищает
// не он, а Row Level Security в базе (supabase/migrations): строку видит только её владелец.
// Ключей нет — supabase = null: синхронизация выключена, сайт работает только локально.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase = url && key ? createClient(url, key) : null

export const TABLE = 'planner_data'
