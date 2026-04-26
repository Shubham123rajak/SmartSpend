import os
import logging
import re
import calendar
from pathlib import Path
from datetime import date, datetime
from typing import Optional, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from dateparser.search import search_dates

# ---------------------------------------------------------------------------
# Config & logging
# ---------------------------------------------------------------------------

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_CATEGORIES = {
    "Food", "Transportation", "Housing", "Utilities", "Entertainment",
    "Shopping", "Health", "Education", "Travel", "Personal Care",
    "Bills", "Groceries", "Subscriptions", "Investments", "Gifts", "Misc",
}

CATEGORY_ALIASES: dict[str, str] = {
    "bus": "Transportation", "train": "Transportation",
    "taxi": "Transportation", "uber": "Transportation", "ola": "Transportation",
    "restaurant": "Food", "cafe": "Food", "coffee": "Food",
    "vegetables": "Groceries", "supermarket": "Groceries", "grocery": "Groceries",
    "netflix": "Subscriptions", "spotify": "Subscriptions", "prime": "Subscriptions",
    "medicine": "Health", "doctor": "Health", "hospital": "Health",
    "rent": "Housing", "electricity": "Utilities", "water": "Utilities",
}
_MONTHS: dict[str, int] = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}
 
_PAT_DAY_MONTH_LAST_YEAR = re.compile(
    r"^(\d{1,2})\s+(" + "|".join(_MONTHS) + r")\s+last\s+year$"
)
_PAT_DAY_MONTH_YEAR = re.compile(
    r"^(\d{1,2})\s+(" + "|".join(_MONTHS) + r")\s+(\d{4})$"
)

# ---------------------------------------------------------------------------
# LLM setup
# ---------------------------------------------------------------------------

_groq_api_key = os.getenv("GROQ_API_KEY")
if not _groq_api_key:
    raise RuntimeError("GROQ_API_KEY is not set")

llm = ChatGroq(
    api_key=_groq_api_key,
    model="llama-3.3-70b-versatile",
)

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ExpenseTextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Natural language expense input")


class ParsedExpense(BaseModel):
    intent: Literal["CREATE_EXPENSE", "QUERY_EXPENSE"]
    amount: Optional[float] = Field(default=None, ge=0)
    category: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = Field(default=None, description="ISO date YYYY-MM-DD")
    start_date: Optional[str] = Field(default=None, description="ISO date for query range start")
    end_date: Optional[str] = Field(default=None, description="ISO date for query range end")


# Internal LLM output — date fields are kept as raw text for resolution later
class _LLMOutput(BaseModel):
    intent: Literal["CREATE_EXPENSE", "QUERY_EXPENSE"]
    amount: Optional[float] = None
    category: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = None        # raw text, e.g. "yesterday"
    start_date: Optional[str] = None  # raw text, e.g. "start of last month"
    end_date: Optional[str] = None    # raw text, e.g. "end of last month"

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_prompt = ChatPromptTemplate.from_template("""
You are an AI financial assistant. Today's date is {today}.
 
Detect intent and extract structured data from the user input.
 
INTENTS:
- CREATE_EXPENSE : user is logging / adding an expense
- QUERY_EXPENSE  : user is asking about totals, summaries, or history
 
CATEGORIES (pick one exactly, or null):
[Food, Transportation, Housing, Utilities, Entertainment, Shopping, Health,
 Education, Travel, Personal Care, Bills, Groceries, Subscriptions,
 Investments, Gifts, Misc]
 
CATEGORY MAPPING:
- bus / train / uber / ola  -> Transportation
- restaurant / cafe         -> Food
- grocery / supermarket     -> Groceries
- netflix / spotify         -> Subscriptions
- unsure                    -> Misc
 
DATE RULES — you MUST output actual YYYY-MM-DD values, NEVER raw text like "start of September".
Use today={today} to compute all relative dates yourself before responding.
 
For CREATE_EXPENSE:
- "date" = exact expense date as YYYY-MM-DD, or null if not mentioned.
 
For QUERY_EXPENSE — compute and output the real calendar dates:
 
Assume today={today}. Work out the numbers yourself:
 
Example A — today=2026-04-18, input contains "september last year":
  -> start_date="2025-09-01", end_date="2025-09-30"
 
Example B — today=2026-04-18, input contains "last month":
  -> start_date="2026-03-01", end_date="2026-03-31"
 
Example C — today=2026-04-18, input contains "this month":
  -> start_date="2026-04-01", end_date="2026-04-18"
 
Example D — today=2026-04-18, input contains "last year":
  -> start_date="2025-01-01", end_date="2025-12-31"
 
Example E — today=2026-04-18, input contains "last 7 days":
  -> start_date="2026-04-12", end_date="2026-04-18"
 
Example F — today=2026-04-18, input contains "march 2023":
  -> start_date="2023-03-01", end_date="2023-03-31"
 
STRICT RULE: start_date and end_date must always be "YYYY-MM-DD" strings.
Never output phrases like "start of ...", "end of ...", or any human-readable text.
If no date mentioned -> start_date=null, end_date=null
 
OUTPUT — strict JSON only, no markdown, no extra text:
{{
  "intent": "CREATE_EXPENSE" | "QUERY_EXPENSE",
  "amount": number | null,
  "category": string | null,
  "title": string | null,
  "date": "YYYY-MM-DD" | null,
  "start_date": "YYYY-MM-DD" | null,
  "end_date": "YYYY-MM-DD" | null
}}
 
User input: {input}
""")

_structured_llm = _prompt | llm.with_structured_output(_LLMOutput)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize_category(raw: Optional[str]) -> Optional[str]:
    """Return a canonical category name or 'Misc' for unmapped inputs."""
    if not raw:
        return None
    clean = raw.strip().title()
    if clean in VALID_CATEGORIES:
        return clean
    lower = raw.strip().lower()
    return CATEGORY_ALIASES.get(lower, "Misc")

_ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
def validate_iso_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if not _ISO_RE.match(value):
        print(f"validate_iso_date: rejected {value!r}")
        return None
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return value
    except ValueError:
        print(f"validate_iso_date: rejected invalid date {value!r}")
        return None
def resolve_date(text: Optional[str]) -> Optional[str]:
    """
    Parse natural-language date text to ISO-8601.
    Priority:
      1. Regex: "<day> <month> last year"
      2. Regex: "<day> <month> <4-digit year>"
      3. dateparser (PREFER_DATES_FROM=past)
      4. Hard fallback: today
    """
    if not text:
        return None
 
    lower = text.strip().lower()
    today = date.today()
 
    # 1. "1 september last year"
    m = _PAT_DAY_MONTH_LAST_YEAR.match(lower)
    if m:
        day, month_num = int(m.group(1)), _MONTHS[m.group(2)]
        year = today.year - 1
        day = min(day, calendar.monthrange(year, month_num)[1])
        return date(year, month_num, day).isoformat()
 
    # 2. "31 march 2023"
    m = _PAT_DAY_MONTH_YEAR.match(lower)
    if m:
        day, month_num, year = int(m.group(1)), _MONTHS[m.group(2)], int(m.group(3))
        day = min(day, calendar.monthrange(year, month_num)[1])
        return date(year, month_num, day).isoformat()
 
    # 3. dateparser
    results = search_dates(
        text,
        settings={"PREFER_DATES_FROM": "past", "RELATIVE_BASE": datetime.now()},
    )
    logger.debug("resolve_date(%r) -> dateparser: %s", text, results)
 
    if results:
        for match_text, dt in results:
            if dt.year < 2000:
                continue
            if any(kw in match_text.lower() for kw in ("ago", "yesterday", "today", "last", "this")):
                return dt.date().isoformat()
            return dt.date().isoformat()
 
    # 4. Hard fallback
    return today.isoformat()

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="SmartSpend AI Service", version="1.0.0")


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "smartspend-ai-service",
        "port": os.getenv("AI_SERVICE_PORT", "8001"),
    }


@app.post("/parse-expense", response_model=ParsedExpense)
async def parse_expense(payload: ExpenseTextRequest) -> ParsedExpense:
    logger.info("parse_expense called: %r", payload.text)
    today_str = date.today().isoformat()
    try:
        raw: _LLMOutput = _structured_llm.invoke({
            "input": payload.text,
            "today": today_str,        # <-- LLM now knows the real date
        })
    except Exception as exc:
        logger.exception("LLM invocation failed")
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc
    
    print("LLM raw output:", raw)
    logger.debug("LLM raw output: %s", raw)
    
    # Resolve dates only for the relevant intent
    if raw.intent == "CREATE_EXPENSE":
        resolved_date = validate_iso_date(raw.date) or date.today().isoformat()
        resolved_start = None
        resolved_end = None
    else:
       resolved_date = None
       resolved_start = validate_iso_date(raw.start_date)
       resolved_end = validate_iso_date(raw.end_date)


    return ParsedExpense(
        intent=raw.intent,
        amount=raw.amount,
        category=normalize_category(raw.category),
        title=(raw.title or "General Expense").strip(),
        date=resolved_date,
        start_date=resolved_start,
        end_date=resolved_end,
    )