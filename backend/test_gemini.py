import os

from dotenv import load_dotenv
from google import genai


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("GEMINI_API_KEY not found in .env")
    exit()

print("Gemini API key found.")

client = genai.Client(
    api_key=api_key
)

try:
    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents="Reply with exactly: Travelto AI works"
    )

    print("\nGemini response:")
    print(response.text)

except Exception as e:
    print("\nGemini error:")
    print(e)