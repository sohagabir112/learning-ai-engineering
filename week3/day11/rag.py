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

#Step 1:
knowledge_base = {
    "Sohag Abir": "A software engineer and AI enthusiast with experience in machine learning and natural language processing, and has contributed to several open-source projects.",
    "Sohag Abir's Age": "25 years old.",
    "Study": "Currently pursuing a degree in Computer Science at Northern University Bangladesh.",
}

#Step 2: Retrieve relevant information from the knowledge base
def get_relevant_info(question):
    question_lower = question.lower()
    if "sohag abir" in question_lower:
        return knowledge_base["Sohag Abir"]
    elif "Sohag Abir's age" in question_lower or "age" in question_lower:
        return knowledge_base["Sohag Abir's Age"]
    elif "study" in question_lower:
        return knowledge_base["Study"]
    else:   
        return "I don't have information on that topic."


def ask_llm(question):
    context = get_relevant_info(question)
    system_prompt = "Answer in 1 line. Answer the question based on the context provided. If the context does not contain the answer, say 'I don't know'."
    system_message = {
        "role" : "system",
        "content" : system_prompt
    }

    message = {
        "role" : "user",
        "content" : f"{question} (Context: {context})"
    }
    messages = [system_message, message]

    response = client.chat.completions.create(model = model, messages = messages)
    answer = response.choices[0].message.content
    return answer

question = "Where is he Study?"

print(ask_llm(question))