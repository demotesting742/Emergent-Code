import urllib.request
import json

url = "https://mrshdnfxhcqjcrxcnjzs.supabase.co/auth/v1/jwks.json"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc2hkbmZ4aGNxamNyeGNuanpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTgyMzYsImV4cCI6MjA4NjU5NDIzNn0.0HqDrZIPJTTFZtMEYyAp-tE0Z5Q4nuBDVnhW5eiapj4"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
