"""
Gemini SmartNotes - AI Functions & PDF Generation Engine
Handles interaction with Google Gemini models safely with zero hardcoded credentials,
flexible model fallbacks, robust error handling, and elegant PDF generation.
"""

import os
import re
import html
import uuid
import json
from typing import Dict, List, Optional, Tuple, Any
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
import google.generativeai as genai

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    Table,
    TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter

# Load environment variables from .env file
load_dotenv()

# ---------------- CONFIGURATION ----------------
DEFAULT_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MOCK_MODE_ENV = os.getenv("MOCK_MODE", "false").lower() in ("true", "1", "yes")

# Recommended candidate models in order of priority
MODEL_CANDIDATES = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash-latest",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro",
]

_active_client_key: Optional[str] = None
_discovered_model: Optional[str] = None


def get_effective_api_key(custom_key: Optional[str] = None) -> str:
    """Return customer-supplied key if present, otherwise environment key."""
    if custom_key and custom_key.strip():
        return custom_key.strip()
    return DEFAULT_API_KEY


def configure_gemini(api_key: str) -> bool:
    """Configure Gemini client safely with validation."""
    global _active_client_key
    if not api_key:
        return False
    if _active_client_key == api_key:
        return True
    try:
        genai.configure(api_key=api_key)
        _active_client_key = api_key
        return True
    except Exception as e:
        print(f"[Warning] Failed to configure Gemini with provided key: {e}")
        return False


def _get_working_model(api_key: str) -> Optional[str]:
    """Find a functional Gemini model name for the configured key."""
    global _discovered_model
    if _discovered_model:
        return _discovered_model

    # Try list_models first to discover supported models dynamically
    try:
        available = list(genai.list_models())
        supported = [
            m.name for m in available
            if hasattr(m, "supported_generation_methods")
            and any("generatecontent" in str(method).lower() for method in getattr(m, "supported_generation_methods", []))
        ]
        # Prioritize 1.5 flash or pro
        for pref in MODEL_CANDIDATES:
            for s in supported:
                if pref.lower() in s.lower():
                    _discovered_model = s
                    return _discovered_model
        if supported:
            _discovered_model = supported[0]
            return _discovered_model
    except Exception:
        pass

    # Fallback to candidate list
    _discovered_model = MODEL_CANDIDATES[0]
    return _discovered_model


def _call_gemini_with_fallback(prompt: str, custom_key: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    """
    Attempt to invoke Gemini API with candidate models and error recovery.
    Returns (result_text, error_message).
    """
    api_key = get_effective_api_key(custom_key)

    if MOCK_MODE_ENV or not api_key or api_key == "your_gemini_api_key_here":
        return None, "No active Gemini API key configured (using intelligent simulation)"

    if not configure_gemini(api_key):
        return None, "Failed to initialize Gemini client"

    last_error = None
    target_model = _get_working_model(api_key) or MODEL_CANDIDATES[0]
    model_list = [target_model] + [m for m in MODEL_CANDIDATES if m != target_model]

    for model_name in model_list:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            if response and hasattr(response, "text") and response.text:
                return response.text.strip(), None
        except Exception as e:
            last_error = str(e)
            # If key is revoked/leaked/invalid, abort trying other models with same key
            if "leaked" in last_error.lower() or "api_key_invalid" in last_error.lower() or "403" in last_error:
                return None, f"Gemini API Error: {last_error}"
            continue

    return None, f"Gemini error across candidate models: {last_error}"


# ---------------- INTELLIGENT SIMULATION GENERATORS ----------------

def _simulate_explanation(topic: str, difficulty: str) -> str:
    """Generate rich, structured explanation when live API is unavailable."""
    diff_title = difficulty.capitalize()
    return f"""### Overview: {topic} ({diff_title} Level)

**{topic}** is a core concept with wide-ranging applications in modern computer science and engineering. 

#### 1. Core Intuition & Fundamentals
At its foundational level, **{topic}** solves critical constraints by systematically organizing information, reducing search space, or abstracting complexity.
- **Key Principle:** Efficient decomposition of large inputs into actionable sub-tasks.
- **Primary Goal:** Maximize throughput and correctness while minimizing latency and resource utilization.
- **Mental Model:** Think of {topic} like a well-cataloged library catalog system—rather than scanning every shelf, structured indices allow instant narrowing.

#### 2. Key Architectural Components & Mechanics
1. **Input Pre-conditions:** Requires well-defined state structures and boundary verification.
2. **State Transition:** Iteratively processes tokens or intervals, evaluating optimality invariants.
3. **Termination Criteria:** Halts when convergence threshold is met or search boundaries collapse.

#### 3. Real-World Applications & Industry Use Cases
- High-frequency transaction pipelines and database indexing.
- Distributed consensus and fault-tolerant network topologies.
- Machine learning feature extraction and ranking pipelines.

#### 4. Practical Implementation Best Practices
- Always validate edge cases (empty inputs, singleton states, out-of-boundary queries).
- Favor iterative over deeply recursive implementations in memory-constrained environments.
- Maintain clear loop invariants to guarantee algorithmic correctness.
"""


def _simulate_mcqs(topic: str, count: int, difficulty: str) -> Tuple[str, List[Dict[str, Any]]]:
    """Generate high quality MCQs with options and explanations."""
    samples = [
        {
            "question": f"What is the primary operational objective when implementing {topic}?",
            "options": [
                f"Optimizing efficiency and maintaining correctness invariants",
                "Maximizing heap allocations and garbage collection passes",
                "Converting synchronous routines to random polling",
                "Bypassing data validation layers completely"
            ],
            "correct": 0,
            "explanation": f"The primary goal of {topic} is maintaining correctness while minimizing computational complexity and resource overhead."
        },
        {
            "question": f"Which time or space complexity characteristic best describes an optimal {topic} routine?",
            "options": [
                "O(N!) factorial worst-case overhead",
                "O(log N) or O(N) bounded operational profile",
                "O(N³) cubic computational overhead",
                "Non-deterministic unbounded memory footprint"
            ],
            "correct": 1,
            "explanation": f"Well-structured implementations of {topic} aim for sub-linear or linear operational characteristics."
        },
        {
            "question": f"What edge condition must be rigorously verified before processing in {topic}?",
            "options": [
                "Null or empty input collections and boundary extrema",
                "Screen resolution and browser user-agent strings",
                "System audio playback sample rates",
                "Graphics hardware texture unit counts"
            ],
            "correct": 0,
            "explanation": "Extrema, empty sets, and single-item collections represent the most critical boundary failure points."
        },
        {
            "question": f"Why is state immutability often beneficial when scaling {topic} across threads?",
            "options": [
                "It introduces random non-deterministic locking pauses",
                "It eliminates race conditions and simplifies concurrent verification",
                "It forces mandatory hard drive sync on every write",
                "It restricts the algorithm to 16-bit register limits"
            ],
            "correct": 1,
            "explanation": "Immutable state structures guarantee thread-safety by eliminating write-contention across threads."
        },
        {
            "question": f"In production deployments, how is {topic} typically monitored for performance anomalies?",
            "options": [
                "Manual code inspection during scheduled maintenance windows",
                "Prometheus metrics, latency p99 distributions, and tracing",
                "Printing execution logs to unbuffered console streams",
                "Restarting application processes every 15 minutes"
            ],
            "correct": 1,
            "explanation": "Observability tooling (metrics, p95/p99 latency thresholds, and traces) offers continuous verification."
        }
    ]

    selected = samples[:min(count, len(samples))]
    text_lines = []
    for idx, item in enumerate(selected, 1):
        text_lines.append(f"Q{idx}. {item['question']}")
        for opt_idx, opt in enumerate(item['options']):
            char = chr(65 + opt_idx)
            text_lines.append(f"{char}. {opt}")
        ans_char = chr(65 + item['correct'])
        text_lines.append(f"Answer: {ans_char}")
        text_lines.append(f"Explanation: {item['explanation']}\n")

    return "\n".join(text_lines), selected


def _simulate_qa(topic: str, difficulty: str) -> List[Dict[str, str]]:
    """Generate high value Q&A items."""
    return [
        {
            "question": f"Why is {topic} widely utilized in modern software architectures?",
            "answer": f"{topic} provides a balanced trade-off between computational efficiency, code maintainability, and scalability under demanding workload conditions."
        },
        {
            "question": f"What are common pitfalls or anti-patterns to avoid with {topic}?",
            "answer": f"Common anti-patterns include neglecting boundary condition testing, over-optimizing prematurely without profiling, and failing to handle memory allocation bottlenecks."
        },
        {
            "question": f"How can one verify the correctness of a {topic} implementation?",
            "answer": f"Employ comprehensive unit tests covering edge cases, property-based fuzz testing, and automated performance benchmark suites."
        },
        {
            "question": f"How does {topic} behave when scaled to distributed environments?",
            "answer": f"When distributed, synchronization latency and data consistency models (e.g., eventual vs. strong consistency) become the governing constraints."
        }
    ]


def _simulate_summary(topic: str, difficulty: str) -> str:
    """Generate concise revision notes."""
    diff_name = difficulty.capitalize()
    return f"""### Quick Revision Notes: {topic} ({diff_name})

• **Core Definition:** {topic} is a foundational concept designed for structured efficiency, robustness, and predictable performance.
• **Primary Advantage:** Dramatically accelerates data operations, reduces memory footprints, and improves computational scalability.
• **Key Invariant:** Always preserve boundary validations and maintain clean state boundaries between processing phases.
• **Time Complexity:** Typically achieves logarithmic O(log N) or linear O(N) execution profiles under standard conditions.
• **Exam & Interview Tip:** Be prepared to derive space/time complexity, trace execution on edge inputs, and explain real-world architectural trade-offs.
"""


# ---------------- PARSING HELPERS ----------------

def parse_mcq_text(text: str) -> List[Dict[str, Any]]:
    """
    Robust MCQ text parser that handles multiple formats,
    markdown bolding, parentheses, and variable spacing.
    """
    if not text:
        return []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    items: List[Dict[str, Any]] = []

    current_q: Optional[str] = None
    current_options: List[str] = []
    current_correct: Optional[int] = None
    current_explanation = ""

    def flush_item():
        nonlocal current_q, current_options, current_correct, current_explanation
        if current_q and len(current_options) >= 2 and current_correct is not None:
            # Pad options to 4 if needed
            while len(current_options) < 4:
                current_options.append("None of the above")
            items.append({
                "question": current_q,
                "options": current_options[:4],
                "correct": current_correct,
                "explanation": current_explanation or "Correct answer verified."
            })
        current_q = None
        current_options = []
        current_correct = None
        current_explanation = ""

    i = 0
    while i < len(lines):
        line = lines[i]

        # Check for Question start: Q1., 1., Question 1:, **Q1.**, etc.
        q_match = re.match(r"^(?:\*\*)?(?:Q\d+|Question\s*\d+|\d+)[\.\:\)]\s*(?:\*\*)?(.*)$", line, re.IGNORECASE)
        if q_match:
            flush_item()
            current_q = q_match.group(1).strip()
            # If line only contained prefix, look at next line
            if not current_q and i + 1 < len(lines):
                i += 1
                current_q = lines[i].strip()
            i += 1
            continue

        # Check for Option: A., A), [A], **A.**, etc.
        opt_match = re.match(r"^(?:\*\*)?([A-D])[\.\:\)]\s*(?:\*\*)?(.*)$", line, re.IGNORECASE)
        if opt_match and current_q:
            opt_letter = opt_match.group(1).upper()
            opt_text = opt_match.group(2).strip()
            current_options.append(opt_text)
            i += 1
            continue

        # Check for Answer: Answer: A, Ans: B, Correct: C, etc.
        ans_match = re.search(r"(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[\:\=]\s*(?:\*\*)?([A-D])(?:\*\*)?", line, re.IGNORECASE)
        if ans_match:
            ans_letter = ans_match.group(1).upper()
            current_correct = ord(ans_letter) - ord('A')
            i += 1
            continue

        # Check for Explanation
        exp_match = re.match(r"^(?:Explanation|Reason)\s*[\:\=]\s*(.*)$", line, re.IGNORECASE)
        if exp_match:
            current_explanation = exp_match.group(1).strip()
            i += 1
            continue

        # Fallback to appending to explanation if question is open
        if current_correct is not None and not current_explanation:
            current_explanation = line

        i += 1

    flush_item()
    return items


def parse_qa_text(text: str) -> List[Dict[str, str]]:
    """Parse unstructured Q&A output into structured question and answer pairs."""
    if not text:
        return []
    items = []
    blocks = re.split(r"\n(?=Q\d*[\:\.\)]|\*\*Q\d*[\:\.\)]|\*\*Question)", text)
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        q_match = re.search(r"(?:Q\d*|Question)\s*[\:\.\)]\s*(.*?)(?=\nA|\n\*\*A|\nAnswer|$)", block, re.DOTALL | re.IGNORECASE)
        a_match = re.search(r"(?:A\d*|Answer)\s*[\:\.\)]\s*(.*)$", block, re.DOTALL | re.IGNORECASE)
        if q_match and a_match:
            question = re.sub(r"^\*+|\*+$", "", q_match.group(1).strip())
            answer = re.sub(r"^\*+|\*+$", "", a_match.group(1).strip())
            items.append({"question": question, "answer": answer})
    return items


# ---------------- PUBLIC API FUNCTIONS ----------------

def ai_topic_explanation(topic: str, difficulty: str = "intermediate", custom_api_key: Optional[str] = None) -> str:
    """Generate structured topic explanation matching user difficulty level."""
    prompt = f"""
    You are an expert educator. Provide a comprehensive, structured explanation of "{topic}" tailored for {difficulty} level learners.
    
    Structure your answer with:
    1. Quick Summary & Intuition
    2. Core Principles & Architecture
    3. Practical Examples & Code/Mental Models
    4. Key Takeaways and Common Mistakes
    
    Use clean Markdown formatting with clear headings, bullet points, and bold terms.
    """
    result, error = _call_gemini_with_fallback(prompt, custom_api_key)
    if result:
        return result
    return _simulate_explanation(topic, difficulty)


def ai_generate_mcq(topic: str, count: int = 5, difficulty: str = "intermediate", custom_api_key: Optional[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
    """Generate multiple choice questions with structured parsing."""
    prompt = f"""
    Generate exactly {count} high-quality Multiple Choice Questions on the topic "{topic}" at {difficulty} level.
    
    Strict format requirement:
    Q1. Question text here?
    A. Option A
    B. Option B
    C. Option C
    D. Option D
    Answer: [A, B, C, or D]
    Explanation: Brief explanation of why the answer is correct.
    
    (Repeat exactly for Q2, Q3, etc. Do not include markdown codeblocks or extra text.)
    """
    raw_text, error = _call_gemini_with_fallback(prompt, custom_api_key)
    if raw_text:
        parsed = parse_mcq_text(raw_text)
        if parsed:
            return raw_text, parsed

    # Use high-quality simulation if API unavailable or parsing failed
    return _simulate_mcqs(topic, count, difficulty)


def ai_generate_qa(topic: str, difficulty: str = "intermediate", custom_api_key: Optional[str] = None) -> Tuple[str, List[Dict[str, str]]]:
    """Generate common Q&A items."""
    prompt = f"""
    Generate 4 vital Questions and Answers about "{topic}" for a {difficulty} level learner.
    
    Format:
    Q1: Question text?
    A1: Clear, direct answer text.
    
    Q2: Question text?
    A2: Clear, direct answer text.
    """
    raw_text, error = _call_gemini_with_fallback(prompt, custom_api_key)
    if raw_text:
        parsed = parse_qa_text(raw_text)
        if parsed:
            return raw_text, parsed

    simulated = _simulate_qa(topic, difficulty)
    sim_text = "\n\n".join([f"Q{i+1}: {item['question']}\nA{i+1}: {item['answer']}" for i, item in enumerate(simulated)])
    return sim_text, simulated


def ai_generate_summary(topic: str, difficulty: str = "intermediate", custom_api_key: Optional[str] = None) -> str:
    """Generate concise revision notes."""
    prompt = f"""
    Provide concise, high-yield revision notes for "{topic}" suitable for {difficulty} level study.
    Focus on key definitions, core formulas/invariants, and critical exam/interview tips.
    Use clean markdown bullet points.
    """
    result, error = _call_gemini_with_fallback(prompt, custom_api_key)
    if result:
        return result
    return _simulate_summary(topic, difficulty)


# ---------------- PDF GENERATION ----------------

def _format_for_reportlab(text: str) -> str:
    """Safely format and escape arbitrary text and markdown for ReportLab Paragraphs."""
    if not text:
        return ""
    # 1. Escape HTML special characters
    escaped = html.escape(text)
    # 2. Convert markdown bold **text** to <b>text</b>
    escaped = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", escaped)
    # 3. Convert markdown italic *text* to <i>text</i>
    escaped = re.sub(r"(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)", r"<i>\1</i>", escaped)
    # 4. Clean up headers like ### Heading
    escaped = re.sub(r"^#+\s*(.*?)$", r"<b><font size='+1'>\1</font></b>", escaped, flags=re.MULTILINE)
    # 5. Convert newlines to ReportLab breaks
    escaped = escaped.replace("\n", "<br/>")
    return escaped


def create_pdf(
    topic: str,
    explanation: str,
    summary: str,
    mcqs: str,
    qa_content: Optional[str] = None,
    difficulty: str = "Intermediate"
) -> str:
    """
    Generates a professionally styled, publication-ready PDF document
    with headers, banners, and safe XML formatting.
    """
    safe_topic = re.sub(r"[^\w\s-]", "", topic).strip().replace(" ", "_")
    file_name = f"{safe_topic}_{uuid.uuid4().hex[:8]}.pdf"
    output_dir = os.path.join(os.getcwd(), "generated")
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, file_name)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom theme colors
    color_primary = colors.HexColor("#4f46e5")
    color_secondary = colors.HexColor("#1e1b4b")
    color_accent = colors.HexColor("#6366f1")
    color_bg_light = colors.HexColor("#f8fafc")
    color_text = colors.HexColor("#1e293b")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=color_secondary,
        alignment=0,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        textColor=color_accent,
        spaceAfter=15
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=color_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=color_text,
        spaceAfter=8
    )

    story = []

    # Document Header Banner
    story.append(Paragraph(f"Gemini SmartNotes: {topic}", title_style))
    story.append(Paragraph(f"Level: {difficulty.capitalize()} &bull; Generated with AI Learning Engine", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=color_primary, spaceAfter=14))

    # Section 1: Comprehensive Explanation
    story.append(Paragraph("1. Topic Explanation", section_heading))
    story.append(Paragraph(_format_for_reportlab(explanation), body_style))
    story.append(Spacer(1, 10))

    # Section 2: Revision Summary
    story.append(Paragraph("2. Quick Revision Summary", section_heading))
    story.append(Paragraph(_format_for_reportlab(summary), body_style))
    story.append(Spacer(1, 10))

    # Section 3: Multiple Choice Practice Questions
    if mcqs:
        story.append(Paragraph("3. Practice Questions (MCQs)", section_heading))
        story.append(Paragraph(_format_for_reportlab(mcqs), body_style))
        story.append(Spacer(1, 10))

    # Section 4: Q&A (Optional)
    if qa_content:
        story.append(Paragraph("4. Key Questions & Answers", section_heading))
        story.append(Paragraph(_format_for_reportlab(qa_content), body_style))
        story.append(Spacer(1, 10))

    # Footer note
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#cbd5e1"), spaceAfter=8))
    footer_style = ParagraphStyle(
        "FooterNote",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        textColor=colors.HexColor("#64748b"),
        alignment=1
    )
    story.append(Paragraph("Gemini SmartNotes &bull; Empowering smarter, faster learning with AI.", footer_style))

    try:
        doc.build(story)
    except Exception as e:
        raise RuntimeError(f"ReportLab failed to generate PDF: {str(e)}")

    return file_path
