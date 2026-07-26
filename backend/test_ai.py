from transformers import pipeline

nlp = pipeline("ner", model="dslim/bert-base-NER")

cv_text = "I am a Python developer with 3 years of experience in Flask and SQL"

results = nlp(cv_text)

skills = []
current_word = ""
for item in results:
    token = item['word']
    if token.startswith("##"):
        current_word += token[2:]
    else:
        if current_word:
            skills.append(current_word)
        current_word = token
if current_word:
    skills.append(current_word)

print("Extracted skills/entities:", skills)
