#Step 1 : Import and Environment Setup

import os 
import sys
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer
from groq import Groq

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()

# Step 2 : Load veriable from .env file

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
QDRANT_PORT = int(
    os.getenv("QDRANT_PORT", "443" if QDRANT_URL and QDRANT_URL.startswith("https://") else "6333")
)

# Initialize Quadrant Client

qdrant_client = QdrantClient(
    url=QDRANT_URL,
    port=QDRANT_PORT,
    api_key=QDRANT_API_KEY,
)

print("Qdrant Client Initialized Successfully")

# Step 3 : Qudrant collection

collection_name = "knowledge"
embedding_size = 384

# Delete the collection if it already exists
if qdrant_client.collection_exists(collection_name):
    qdrant_client.delete_collection(collection_name)
    print(f"Deleted existing collection: {collection_name}")

# Create a new collection
qdrant_client.create_collection(
    collection_name=collection_name,
    vectors_config=VectorParams(
        size=embedding_size,
        distance=Distance.COSINE
    )
)

print(f"Collection '{collection_name}' created successfully")
print("Vector size:", embedding_size)
print("Distance metric: COSINE")


# Step 4 : Load the model Knowledge

with open("knowledge.txt", encoding = "utf-8") as f:
    documents = [
        line.strip() for line in f if line.strip()
    ]

#["line 1", "line 2", "line 3"]
print(f"Loaded {len(documents)} documents from knowledge.txt")

# Step 5 :  Create Embeddings

print("loading the model for creating embeddings")
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(documents)
print(f"Created embeddings for {len(embeddings)} documents")

# Step 6 : Create  Quadrant point
points = []
for i, embedding in enumerate(embeddings):
    points.append(
        PointStruct(
            id=i + 1,
            vector=embedding.tolist(),
            payload={"text": documents[i]},
        )
    )

# Step 7 : Upload to Quadrant

qdrant_client.upsert(
    collection_name=collection_name,
    points=points
)

print(f"Uploaded {len(points)} points to collection '{collection_name}'")
    
# Step 8 : Searching the Quadrant collection

def search_qdrant(query, top_k=3):
    # Create embedding for the query
    query_embedding = model.encode(query).tolist()

    # Perform search in Quadrant collection
    search_results = qdrant_client.query_points(
        collection_name=collection_name,
        query=query_embedding,
        limit=top_k,
        with_payload=True
    ).points

    return search_results

# Step 9 : Test the search function

query = "How many days vacations do I get?"

results = search_qdrant(query, top_k=3)

print("\nSearch Results:")

for result in results:
    print(f"Score: {result.score:.3f}")
    print(f"Text: {result.payload['text']}")
    print("-" * 50)

# Step 10 : Integrate with Groq

groq_client = Groq(api_key=GROQ_API_KEY)

# Step 11 : Ask llm

def ask_llm(question, context):
    prompt = f"Question: {question}\nContext: {context}\nAnswer:"
    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user", 
                "content": prompt
            }
        ]
    )
    return response.choices[0].message.content

# Step 12 :  Complete RAG Pipeline

question = "How many days vacations do I get?"
search_results = search_qdrant(question, top_k=3)

# Extract context from search results
context = "\n".join(
    result.payload['text'] 
    for result in search_results
)

answer = ask_llm(question, context)

print("\nFinal Answer:")
print(answer)
