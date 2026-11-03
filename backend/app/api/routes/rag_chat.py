"""Authenticated RAG endpoints for SIRA regulatory questions."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.dependencies.auth import get_current_active_user
from app.services.sira_rag_service import answer, index_status

router = APIRouter(prefix='/rag-chat', tags=['SIRA Regulatory RAG Chatbot'], dependencies=[Depends(get_current_active_user)])

class ChatRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1500)

@router.post('/ask')
def ask(payload: ChatRequest):
    return answer(payload.question)

@router.get('/status')
def status():
    return index_status()
