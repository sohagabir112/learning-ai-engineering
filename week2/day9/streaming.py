import os
import sys
from urllib import response
from dotenv import load_dotenv
from groq import Groq

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

my_api_key = os.getenv("GROQ_API_KEY")

if not my_api_key :
    raise ValueError("API ERROR")

client = Groq(api_key = my_api_key)
model = "openai/gpt-oss-120b"

prompt = """
Explain how internet work?

"""
message = {
    "role": "user",
    "content": prompt
}

messages = [message]

# response1 = client.chat.completions.create(
#     model=model,
#     messages=messages
# )

# ans = response1.choices[0].message.content
# print(ans)

stream = client.chat.completions.create(
    model=model,
    messages=messages,
    stream=True
)

for chunk in stream:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
