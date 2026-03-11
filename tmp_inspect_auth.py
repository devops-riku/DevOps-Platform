from app.core.supabase import get_supabase
supabase = get_supabase()
print(dir(supabase.auth))
