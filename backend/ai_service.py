import re
import requests

def analyze_cv_simple(cv_text):
    """
    Simple rule-based CV analysis - NO API KEY NEEDED
    """
    cv_lower = cv_text.lower()
    
    common_skills = [
        'python', 'java', 'javascript', 'react', 'node', 'sql', 'mysql', 'postgresql',
        'flask', 'django', 'fastapi', 'html', 'css', 'aws', 'docker', 'kubernetes',
        'git', 'github', 'linux', 'windows', 'mongodb', 'redis', 'rest', 'api',
        'machine learning', 'ai', 'data analysis', 'pandas', 'numpy', 'tensorflow',
        'pytorch', 'excel', 'power bi', 'tableau'
    ]
    
    found_skills = []
    for skill in common_skills:
        if skill in cv_lower:
            found_skills.append(skill)
    
    experience_pattern = r'(\d+)\s*(?:year|yr|years)'
    experience_match = re.search(experience_pattern, cv_lower)
    experience_years = experience_match.group(1) if experience_match else "0"
    
    education_keywords = {
        "bachelor": "Bachelor's",
        "bsc": "Bachelor's", 
        "ba": "Bachelor's",
        "master": "Master's",
        "msc": "Master's",
        "ma": "Master's",
        "phd": "PhD",
        "doctorate": "PhD"
    }
    
    education_level = "Other"
    for keyword, level in education_keywords.items():
        if keyword in cv_lower:
            education_level = level
            break
    
    return {
        "success": True,
        "analysis": f"Skills: {', '.join(found_skills)}\nExperience: {experience_years} years\nEducation: {education_level}",
        "skills": found_skills,
        "experience_years": experience_years,
        "education_level": education_level
    }

def analyze_cv_with_huggingface(cv_text):
    """
    Alternative: Use FREE Hugging Face API (no payment required)
    You need to sign up at huggingface.co for a free API token
    """
    try:
        
        
        API_TOKEN = ""
        API_URL = "https://api-inference.huggingface.co/models/gpt2"
        
        headers = {"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {}
        
        prompt = f"Extract skills, years of experience and education from this CV: {cv_text[:1000]}"
        
        response = requests.post(API_URL, headers=headers, json={"inputs": prompt})
        
        if response.status_code == 200:
            result = response.json()
            return {"success": True, "analysis": str(result)}
        else:
            return analyze_cv_simple(cv_text)
            
    except Exception as e:
        return analyze_cv_simple(cv_text)

def calculate_match_score(cv_text, job_skills):
    """
    Simple matching: count how many job skills appear in CV
    This is our main matching engine - works great without AI!
    """
    cv_lower = cv_text.lower()
    
    if isinstance(job_skills, str):
        skills_list = [skill.strip().lower() for skill in job_skills.split(',')]
    else:
        skills_list = [skill.strip().lower() for skill in job_skills]
    
    matches = 0
    for skill in skills_list:
        if skill and skill in cv_lower:
            matches += 1

    if len(skills_list) > 0:
        score = int((matches / len(skills_list)) * 100)
    else:
        score = 0

    return score