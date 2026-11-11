import os
import sys
from dotenv import load_dotenv
from groq import Groq
import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

load_dotenv()

my_api_key = os.getenv("GROQ_API_KEY")

if not my_api_key :
    raise ValueError("API ERROR")

client = Groq(api_key = my_api_key)
groqModel = "openai/gpt-oss-120b"

documents = [
    "Employee recieves a salary of $5000 per month, and is entitled to 24 days of paid leave per year.",
    "Employee wrok from the office on Monday and Tuesday, and work from home on Wednesday, Thursday, and Friday.",
    "Employee receives $200 per year for GYM membership, and is entitled to 10 days of sick leave per year.",
    "Employee have a 90 days notice period."
]

document_embeddings = model.encode(documents)
# print(sys.getsizeof(documents))
# print(sys.getsizeof(document_embeddings))

def cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def retrieve_relevant_documents(query_embedding):
    scores = []
    for i, doc_embedding in enumerate(document_embeddings):
        score = cosine_similarity(query_embedding, doc_embedding)
        scores.append(score)
    scored_docs = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
    return scored_docs[0]

def ask_llm(question, context):
    system_prompt = (
        "Answer the question using only the provided context. "
        "If the context does not contain the answer, say you do not know."
    )

    system_message = {
        "role": "system",
        "content": system_prompt
    }

    user_message = {
        "role": "user",
        "content": f"Question: {question}\nContext: {context}",
    }

    messages = [system_message, user_message]

    response = client.chat.completions.create(
        model=groqModel,
        messages=messages
    )

    answer = response.choices[0].message.content

    return answer

query = "How much to pay workout?"

query_embedding = model.encode(query)

context, score = retrieve_relevant_documents(query_embedding)

answer = ask_llm(query, context)
print("Answer:", answer)