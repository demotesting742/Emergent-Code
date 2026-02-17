from supabase import create_client, Client
from .config import get_settings

settings = get_settings()

# Use service_role key for server-side operations (e.g., get_user token validation)
# The anon key lacks admin privileges and causes session validation failures
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
