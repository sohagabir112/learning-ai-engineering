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
model = "openai/gpt-oss-120b"

def llm_ans(prompt):
    message = {
        "role" : "user",
        "content" : prompt
    }
    messages = [message]
    response = client.chat.completions.create(model = model, messages = messages)
    ans = response.choices[0].message.content
    return ans

# bad_prompt = """
#  This is a user complaint: my laptop is not working properly .
#  classify this"""

# print(llm_ans(bad_prompt))

good_prompt = """
#Role: 
you are a support assistant for a mobile/laptop company.
#Task: 
classify the user's complaint.
#Constraints:
You have to classify the complaint into one of the following categories:
1. Billing Issue
2. Technical Issue
3. Return
#Output Format:
You should only output the category name without any additional text or explanation.
#Example:
For instance, if the user says "i want to refund", you should output "Return".
#Fallback:
If the complaint does not fit into any of the above categories, you should output "Other".
This is a user complaint: 
My laptop is not working.

"""

print(llm_ans(good_prompt))