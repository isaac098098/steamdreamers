from fastapi import FastAPI, Request
# from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
import torch
import json

app = FastAPI()
# app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")

# allow react connection

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load articles db

with open("public/json/sb.json", "r", encoding="utf-8") as f:
    data = json.load(f)
articles_dict = {a["pmc_id"]: a for a in data}

# load models

# biobert
qa_model = pipeline(
    "question-answering",
    model="dmis-lab/biobert-base-cased-v1.1-squad",
    device=0 if torch.cuda.is_available() else -1
)

# en -> es opus translator
translator_en_es = pipeline(
    "translation",
    model="Helsinki-NLP/opus-mt-en-es",
    device=0 if torch.cuda.is_available() else -1
)

# es -> en opus translator
translator_es_en = pipeline(
    "translation",
    model="Helsinki-NLP/opus-mt-es-en",
    device=0 if torch.cuda.is_available() else -1
)

@app.get("/")
def home():
    return {"status": "BioBERT backend is active"}

@app.post("/ask")
async def ask(request: Request):
    # translates question es -> en
    # consults biobert
    # translates answer en -> es

    body = await request.json()
    pmc_id = body.get("pmc_id")
    question = body.get("question")
    is_translated = body.get("is_translated", False)

    if not pmc_id or not question:
        return {"error": "missing parameters"}

    article = articles_dict.get(pmc_id)
    if not article:
        return {"error": f"no such pmc_id {pmc_id}"}

    context = article.get("text", "")[:2000]
    if not context:
        return {"error": "no full text available for article"}

    try:
        # translate spanish question
        question_en = translator_es_en(question)[0]["translation_text"] if is_translated else question

        # biobert answer
        result = qa_model(question=question_en, context=context)
        answer_en = result["answer"]

        # translate back to spanish
        answer = translator_en_es(answer_en)[0]["translation_text"] if is_translated else answer_en

        return {"answer": answer}

    except Exception as e:
        return {"error": str(e)}

@app.post("/translate")
async def translate(request: Request):
    # translates article fields en -> es

    body = await request.json()
    title = body.get("title", "")
    summary = body.get("summary", "")

    if not any([title, summary]):
        return {"error": "missing text"}

    try:
        translation = {
            "title": translator_en_es(title)[0]["translation_text"] if title else "",
            "summary": translator_en_es(summary)[0]["translation_text"] if summary else ""
        }
        return {"translation": translation}
    except Exception as e:
        return {"error": str(e)}

