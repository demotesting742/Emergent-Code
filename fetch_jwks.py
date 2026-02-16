import requests
import json

url = "https://mrshdnfxhcqjcrxcnjzs.supabase.co/auth/v1/jwks.json"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc2hkbmZ4aGNxamNyeGNuanpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTgyMzYsImV4cCI6MjA4NjU5NDIzNn0.0HqDrZIPJTTFZtMEYyAp-tE0Z5Q4nuBDVnhW5eiapj4"
}

response = requests.get(url, headers=headers)
print(json.dumps(response.json(), indent=2))
