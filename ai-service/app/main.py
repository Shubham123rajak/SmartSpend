import os
import re

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from typing import  Optional, TypedDict
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph,START,END
from datetime import date

from pathlib import Path

# correct path to .env
env_path = Path(__file__).resolve().parent.parent / ".env"

load_dotenv(dotenv_path=env_path)

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile"
)



class ExpenseTextRequest(BaseModel):
    text: str


class ParsedExpense(BaseModel):
    amount: float
    category: str
    title: str
    date: date

system_prompt = """
Extract expense details.

Rules:
- If no date is mentioned, use today's date.
- If relative date like "yesterday", "2 days ago" is mentioned, convert to actual date.
- Always return date in YYYY-MM-DD format.
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}")
])

structured_llm = prompt | llm.with_structured_output(ParsedExpense)






# def infer_category(text: str) -> str:
#     lowered = text.lower()

#     if any(keyword in lowered for keyword in ["pizza", "food", "lunch", "dinner", "coffee"]):
#         return "Food"
#     if any(keyword in lowered for keyword in ["uber", "taxi", "metro", "bus", "fuel"]):
#         return "Transport"
#     if any(keyword in lowered for keyword in ["electricity", "internet", "rent", "bill"]):
#         return "Bills"
#     if any(keyword in lowered for keyword in ["shirt", "shoes", "shopping", "dress"]):
#         return "Shopping"
#     return "Misc"


# def infer_title(text: str) -> str:
#     cleaned = re.sub(r"spent\s+\d+(\.\d+)?\s+on\s+", "", text, flags=re.IGNORECASE).strip()
#     return cleaned.title() if cleaned else "General Expense"


# def parse_text_to_expense(text: str) -> ParsedExpense:
#     amount_match = re.search(r"(\d+(\.\d+)?)", text)
#     amount = float(amount_match.group(1)) if amount_match else 0.0
#     category = infer_category(text)
#     title = infer_title(text)
#     return ParsedExpense(amount=amount, category=category, title=title)


app = FastAPI(title="SmartSpend AI Service")


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "smartspend-ai-service",
        "port": os.getenv("AI_SERVICE_PORT", "8001"),
    }


@app.post("/parse-expense", response_model=ParsedExpense)
async def parse_expense(payload: ExpenseTextRequest) -> ParsedExpense:
    # This lightweight parser can be replaced with an LLM-backed workflow later.
    
    
    return structured_llm.invoke({"input": payload.text})
