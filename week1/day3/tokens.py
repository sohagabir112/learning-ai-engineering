import os 
import sys
from dotenv import load_dotenv
from groq import Groq

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

my_api_key = os.getenv("GROQ_API_KEY")

if not my_api_key :
    raise ValueError("API ERROR")

client = Groq(api_key = my_api_key) 
model = "openai/gpt-oss-20b"
role = "user"

prompt1 = "Hi"
prompt2 = "Explain time travel under 100 words"
prompt3 = "write a 1000 words essay on machine learning"

prompts = [prompt1, prompt2, prompt3]
for prompt in prompts:
    message = {
        "role" : role,
        "content" : prompt
    }
    messages = [message]
    response = client.chat.completions.create(model = model, messages = messages, max_tokens = 5000)
    usage = response.usage
    print(f"Prompt: {prompt} --> Yours Tokens: {usage.prompt_tokens} completion_tokens: {usage.completion_tokens} Total Tokens: {usage.total_tokens} Finish Reason: {response.choices[0].finish_reason}")


# prompt = "Suggest a name for my clothing campany only one name"

# #System
# message_system ={
#     "role" : role,
#     "content" : "You are a brand manager who suggests a name for my clothing company. Name should be in one word"
# }

# message = {
#     "role" : role,
#     "content" : prompt
# }

# messages = [message_system , message]

# #Temperature 
# response = client.chat.completions.create(model = model, messages = messages, temperature = 2)
# print("######################################################################")

# print(response.choices[0].message.content)

# print("######################################################################")
