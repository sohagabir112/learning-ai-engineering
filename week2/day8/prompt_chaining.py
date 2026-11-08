import os
import sys
from time import sleep
from dotenv import load_dotenv
from groq import Groq

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

my_api_key = os.getenv("GROQ_API_KEY")

if not my_api_key :
    raise ValueError("API ERROR")

client = Groq(api_key = my_api_key)
model = "openai/gpt-oss-120b"

JD = """
We are looking for a Backend Developer to join our team.

Requirements:
- 3+ years of experience in backend development.
- Proficiency in Python and Django framework.
- Experience with RESTful API development and integration.
- Familiarity with database systems such as PostgreSQL or MySQL.
- Knowledge of version control systems (e.g., Git).
- Strong problem-solving skills and ability to work in a collaborative environment.
- Docker and containerization experience is a plus.
- AWS or cloud deployment experience is a plus.

"""

Resume = """
Name : Sohag Abir

Experience:
- 3 years of experience in backend development.

Skills:
- Proficient in Python and Django framework.
- Experience with RESTful API development and integration.
- React and JavaScript for frontend development.
- MongoDB and Supabase for database management.
- Experience with database systems such as PostgreSQL and MySQL.
- Strong problem-solving skills and ability to work in a collaborative environment.
- Experience with Docker and containerization.
- Experience with AWS and cloud deployment.

Projects:
- Developed and maintained several web applications using Django and Python.

Deployment:
- Deployed applications on AWS using Docker and containerization.
"""

def ask_llm(system_prompt, user_prompt):
    sys_messages = {
            "role": "system",
            "content": system_prompt
        }
    user_messages = {
            "role": "user",
            "content": user_prompt
        }
    messages = [sys_messages, user_messages]
    response = client.chat.completions.create(model = model, messages = messages)
    ans = response.choices[0].message.content
    return ans

def step1_resume_extract():
    #Skills Extraction
    system_prompt = """
    You are a professional HR assistant that extracts skills from resumes.
    You will be given a resume and you need to extract the skills mentioned in it.
    Only extract the skills and return them in a comma-separated format without any additional text or explanation.

    """

    user_prompt = f"""
    Extract the skills from the following resume:
    This is a resume:
    {Resume}
    """
    return ask_llm(system_prompt, user_prompt)



def step2_job_description_extract():
    #Skills Extraction
    system_prompt = """
    You are a professional HR assistant that extracts skills from job descriptions.
    You will be given a job description and you need to extract the skills mentioned in it.
    Only extract the skills and return them in a comma-separated format without any additional text or explanation.

    """

    user_prompt = f"""
    Extract the skills from the following job description:
    This is a job description:
    {JD}
    """
    return ask_llm(system_prompt, user_prompt)

def step3_match_skills(candidate_skills, job_skills):
    system_prompt = """
    You are a professional HR assistant that matches skills from resumes and job descriptions.
    You will be given a list of skills from a resume and a list of skills from a job description.
    Your task is to identify the skills that are present in both lists and return
    final score between 0 to 100 based on the number of matching skills and missing skills and additional skills.
    Also produce a short verdice whether the candidate is good fit for the role.


    """
    user_prompt = f"""
    Match the skills from the following resume and job description:
    Candidate skills: {candidate_skills}
    Job skills: {job_skills}
    """
    return ask_llm(system_prompt, user_prompt)

candidate_skills = step1_resume_extract()
sleep(2)
job_skills = step2_job_description_extract()
sleep(2)
final_score = step3_match_skills(candidate_skills, job_skills)

print(f"Score: {final_score}")
