from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, Field, ValidationError, field_validator
from pypdf import PdfReader
from groq import APIError, Groq
from dotenv import load_dotenv


load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None

MODEL = "openai/gpt-oss-120b"
BASE_DIR = Path(__file__).resolve().parent
logger = logging.getLogger(__name__)


def read_pdf(file_path: Path) -> str:
    if not file_path.is_file():
        raise FileNotFoundError(f"Resume file not found: {file_path.name}")

    reader = PdfReader(file_path)
    pages = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            pages.append(page_text)

    text = "\n".join(pages).strip()
    if not text:
        raise ValueError("The resume PDF does not contain extractable text.")
    return text


def find_resume_path() -> Path:
    """Return the bundled PDF, including files with unusual Unicode names."""
    preferred_path = BASE_DIR / "Jacob.pdf"
    if preferred_path.is_file():
        return preferred_path

    pdf_paths = sorted(BASE_DIR.glob("*.pdf"))
    if len(pdf_paths) == 1:
        return pdf_paths[0]
    if not pdf_paths:
        raise FileNotFoundError("No resume PDF was found in the backend directory.")
    raise FileNotFoundError("Multiple resume PDFs were found; configure one resume explicitly.")


def parse_resume(resume_text: str) -> Resume:
    if client is None:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    system_prompt = f"""
    You are an expert resume parser.

    Extract information from the resume based on its meaning,
    not only based on exact section headings.

    Different resumes may use different headings.

    For example:
    - Experience
    - Professional Experience
    - Work History
    - Employment
    - Internships

    These may all contain relevant experience.

    Skills may also appear in the skills section, work experience,
    internships or projects.

    Return ONLY valid JSON matching this schema:

    {resume_schema}

    Important rules:

    1. Do not invent information.
    2. If a value is not available, return null.
    3. If a list has no information, return an empty list.
    4. Include internships inside experiences.
    5. Extract skills mentioned across the entire resume.
    """
    user_prompt = f"""
    Parse the following resume:

    {resume_text}
    """

    message_system = {
        "role": "system",
        "content": system_prompt,
    }
    message_user = {
        "role": "user",
        "content": user_prompt
    }

    messages = [message_system, message_user]

    response_format ={
        "type": "json_object"
    }

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        response_format=response_format,
    )
    raw_output = response.choices[0].message.content
    if not raw_output:
        raise ValueError("The resume parser returned an empty response.")

    try:
        data = json.loads(raw_output)
    except json.JSONDecodeError as exc:
        raise ValueError("The resume parser returned invalid JSON.") from exc
    resume = Resume(**data)

    return resume

class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = Field(default_factory=list)

class Resume(BaseModel):
    name: str | None = None
    email : str | None = None
    phone : str | None = None

    total_experience_years: float | None = None

    skills: list[str] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)

    def summary(self) -> str:
        """Return a concise, human-readable summary of the parsed resume."""
        name = self.name or "Unknown candidate"
        experience = (
            f"{self.total_experience_years:g} years of experience"
            if self.total_experience_years is not None
            else "experience not specified"
        )
        return f"{name}: {experience}; {len(self.skills)} skills, " \
            f"{len(self.experiences)} experiences."

    def model_dump_json(self, **kwargs) -> str:
        """Serialize the resume as JSON using Pydantic's model serializer."""
        return super().model_dump_json(**kwargs)


resume_schema = Resume.model_json_schema()


def ask_candidate_question(resume: Resume, question: str) -> str:
    if client is None:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    system_prompt = f"""
    You are an expert recruiter.

    You have the following resume information:

    {resume.model_dump_json(indent=2)}

    Answer the candidate's question based only on the resume information.
    If the answer is not available in the resume, use "I don't know."
    Return only valid JSON in the form {{"answer": "..."}}.
    """

    user_prompt = f"""
    Candidate's question: {question}
    """

    message_system = {
        "role": "system",
        "content": system_prompt,
    }
    message_user = {
        "role": "user",
        "content": user_prompt
    }

    messages = [message_system, message_user]

    response_format ={
        "type": "json_object"
    }

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        response_format=response_format,
    )

    raw_output = response.choices[0].message.content
    if not raw_output:
        raise ValueError("The candidate question answerer returned an empty response.")

    try:
        data = json.loads(raw_output)
    except json.JSONDecodeError as exc:
        raise ValueError("The candidate question answerer returned invalid JSON.") from exc

    answer = data.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        raise ValueError("The candidate question answerer returned no answer.")
    return answer.strip()


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Question must not be blank.")
        return value


@lru_cache(maxsize=1)
def load_resume() -> Resume:
    return parse_resume(read_pdf(find_resume_path()))


def llm_error(exc: Exception) -> HTTPException:
    logger.error("Resume processing failed: %s", exc, exc_info=exc)
    return HTTPException(status_code=502, detail=str(exc))


app = FastAPI(
    title="HireMeAI",
    description="Resume parsing and candidate Q&A powered by Groq.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)




@app.get("/")
def home() -> dict:
    try:
        resume = load_resume()
    except (APIError, FileNotFoundError, ValidationError, ValueError, RuntimeError) as exc:
        raise llm_error(exc) from exc

    return {
        "message": "Resume processed successfully!",
        "resume": resume.model_dump()
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/resume")
def get_resume() -> dict:
    try:
        return load_resume().model_dump()
    except (APIError, FileNotFoundError, ValidationError, ValueError, RuntimeError) as exc:
        raise llm_error(exc) from exc


@app.post("/chat")
def chat_with_candidate(request: ChatRequest) -> dict[str, str]:
    try:
        answer = ask_candidate_question(load_resume(), request.question.strip())
    except (APIError, FileNotFoundError, ValidationError, ValueError, RuntimeError) as exc:
        raise llm_error(exc) from exc
    return {
        "answer": answer
    }
