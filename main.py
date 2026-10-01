"""
Gemini SmartNotes - FastAPI Backend Server
Provides RESTful APIs for Topic Explanation, MCQs, Q&A, Summaries,
and publication-quality PDF generation, with optional static file serving.
"""

import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from ai_functions import (
    ai_topic_explanation,
    ai_generate_mcq,
    ai_generate_qa,
    ai_generate_summary,
    create_pdf,
    get_effective_api_key
)

app = FastAPI(
    title="Gemini SmartNotes API",
    description="Smarter learning powered by Google Gemini AI",
    version="2.0.0"
)

# Enable permissive CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- REQUEST & RESPONSE MODELS ----------------

class TopicRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="Topic to process")
    difficulty: Optional[str] = Field("intermediate", description="Difficulty level: beginner, intermediate, advanced")


class MCQRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="Topic for MCQ generation")
    count: Optional[int] = Field(5, ge=1, le=20, description="Number of questions")
    difficulty: Optional[str] = Field("intermediate", description="Difficulty level")


class PDFRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="Topic to compile")
    difficulty: Optional[str] = Field("intermediate", description="Difficulty level")
    mcq_count: Optional[int] = Field(5, ge=1, le=15, description="Number of MCQs to include")


# ---------------- API ROUTES ----------------

@app.get("/health")
@app.get("/api/status")
def health_status(x_gemini_api_key: Optional[str] = Header(None)):
    """Health and engine configuration status."""
    key = get_effective_api_key(x_gemini_api_key)
    has_key = bool(key and key != "your_gemini_api_key_here")
    return {
        "status": "online",
        "has_api_key": has_key,
        "engine": "Gemini 1.5/2.0 AI" if has_key else "Smart Simulation Engine",
        "version": "2.0.0"
    }


@app.post("/explain")
def explain_topic(data: TopicRequest, x_gemini_api_key: Optional[str] = Header(None)):
    """Generate in-depth topic explanation."""
    try:
        topic = data.topic.strip()
        difficulty = (data.difficulty or "intermediate").lower()
        explanation = ai_topic_explanation(topic, difficulty, x_gemini_api_key)
        return {
            "topic": topic,
            "difficulty": difficulty,
            "explanation": explanation
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to generate explanation: {str(e)}"})


@app.post("/mcq")
def generate_mcq(data: MCQRequest, x_gemini_api_key: Optional[str] = Header(None)):
    """Generate interactive multiple choice questions."""
    try:
        topic = data.topic.strip()
        count = data.count or 5
        difficulty = (data.difficulty or "intermediate").lower()
        raw_text, parsed_mcqs = ai_generate_mcq(topic, count, difficulty, x_gemini_api_key)
        return {
            "topic": topic,
            "difficulty": difficulty,
            "mcqs": raw_text,
            "parsed": parsed_mcqs
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to generate MCQs: {str(e)}"})


@app.post("/qa")
def generate_qa(data: TopicRequest, x_gemini_api_key: Optional[str] = Header(None)):
    """Generate common questions and answers for topic mastery."""
    try:
        topic = data.topic.strip()
        difficulty = (data.difficulty or "intermediate").lower()
        raw_text, qa_items = ai_generate_qa(topic, difficulty, x_gemini_api_key)
        summary = ai_generate_summary(topic, difficulty, x_gemini_api_key)
        return {
            "topic": topic,
            "difficulty": difficulty,
            "raw_qa": raw_text,
            "qa": qa_items,
            "summary": summary
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to generate Q&A: {str(e)}"})


@app.post("/summary")
def generate_summary(data: TopicRequest, x_gemini_api_key: Optional[str] = Header(None)):
    """Generate high-yield revision notes."""
    try:
        topic = data.topic.strip()
        difficulty = (data.difficulty or "intermediate").lower()
        summary = ai_generate_summary(topic, difficulty, x_gemini_api_key)
        return {
            "topic": topic,
            "difficulty": difficulty,
            "summary": summary
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to generate summary: {str(e)}"})


@app.post("/pdf")
def generate_pdf(data: PDFRequest, x_gemini_api_key: Optional[str] = Header(None)):
    """Compile and stream a beautifully formatted study guide PDF."""
    try:
        topic = data.topic.strip()
        difficulty = (data.difficulty or "intermediate").lower()
        mcq_count = data.mcq_count or 5

        explanation = ai_topic_explanation(topic, difficulty, x_gemini_api_key)
        summary = ai_generate_summary(topic, difficulty, x_gemini_api_key)
        raw_mcqs, _ = ai_generate_mcq(topic, mcq_count, difficulty, x_gemini_api_key)
        raw_qa, _ = ai_generate_qa(topic, difficulty, x_gemini_api_key)

        pdf_path = create_pdf(
            topic=topic,
            explanation=explanation,
            summary=summary,
            mcqs=raw_mcqs,
            qa_content=raw_qa,
            difficulty=difficulty
        )

        safe_filename = f"{topic.replace(' ', '_')}_SmartNotes.pdf"
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=safe_filename
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"PDF compilation failed: {str(e)}"})


# ---------------- STATIC FILES SERVING ----------------
# Allows running the full app with a single command (uvicorn main:app --reload)
static_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(static_dir, "index.html")):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"🚀 Starting Gemini SmartNotes on http://localhost:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
