import os
from dotenv import load_dotenv
from pathlib import Path
from groq import Groq
import numpy as np
from sentence_transformers import SentenceTransformer

def cosine_similarity(vec1, vec2):
    dot_product = np.dot(vec1, vec2)
    norm_vec1 = np.linalg.norm(vec1)
    norm_vec2 = np.linalg.norm(vec2)
    return dot_product / (norm_vec1 * norm_vec2)


model = SentenceTransformer('all-MiniLM-L6-v2') #384


text = "Machine Learing is fun"

# embedding = model.encode(text)

# print("Embedding shape:", embedding.shape)
# print("Embedding values:", embedding[:10])  # Print first 10 values of the embedding


t1 = "There are 24 paid leaves"
t2 = "What is the number of paid leaves in a year?"

e1 = model.encode(t1)
e2 = model.encode(t2)

similarity = cosine_similarity(e1, e2)
print(f"Similarity between '{t1}' and '{t2}': {similarity}")