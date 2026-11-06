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


# Structure Format
from pydantic import BaseModel
class Ticket(BaseModel):
    name : str
    email : str
    issue : str

schema = Ticket.model_json_schema()

response_format = {
    "type" : "json_object"
}

system_prompt = f"""
Extract the personal information  from the ticket strictly based on this schema. And give me a json output
{schema}
"""

message_system = {
    "role": "system",
    "content": system_prompt
}

text = " hello my name is Sohag.I have buy an iphone which is not working . My address is Dhaka . My email is sohag@gmail.com. My phone number is 0123456789 "
prompt = f"""
This is a customer ticket. Please extract the personal information from this.
{text} 
"""

message = {
    "role" : role,
    "content" : prompt
}

messages = [message_system ,message]

response = client.chat.completions.create(model = model, messages = messages, response_format = response_format)

answer = response.choices[0].message.content
print(answer)


#How to read
import json
raw_json = answer
data_file = json.loads(raw_json)
ticket = Ticket(**data_file)

print(ticket.name)
print(ticket.email)
print(ticket.issue)

