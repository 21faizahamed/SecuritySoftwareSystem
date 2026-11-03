# SIRA Rules & Regulations RAG Chatbot

## What's implemented

The protected **Regulations Chatbot** page at `/rag-chat` calls `POST /api/v1/rag-chat/ask`. The FastAPI backend extracts text from the bundled 140-page SIRA-translated *Preventive Systems Manual* (Administrative Resolution No. 13 of 2025), splits it into overlapping page-tagged passages, indexes passage terms, and ranks the most relevant passages with BM25. The top passages are supplied to an OpenAI chat model with instructions to answer **only** from the extracts and cite `[Source N]`. The frontend shows citations with document names, page numbers, and evidence excerpts. `GET /api/v1/rag-chat/status` reports passage-count readiness.

**Limitations:** This is a first-stage lexical RAG implementation, not embedding-based semantic search. BM25 can miss synonyms and multi-hop cross-references. The 2025 manual is the bundled reference, not proof that it is the latest or only applicable law. Do not treat the output as approval or legal advice. The answer and retrieved passages are sent to the API provider; use an approved privacy configuration before processing confidential documents. Scanned PDFs without selectable text require OCR before indexing. The current implementation does not yet retrieve inspection-specific records or provide document-upload administration.

## Setup (Mac, Python backend + React frontend)

1. Install dependencies from `backend/requirements.txt` and `frontend/package.json` as in the existing project README.
2. Set environment variables in the **backend process** (not the React Vite app). Copy `.env.example` to `.env`, add your `OPENAI_API_KEY`, and optionally `SIRA_RAG_MODEL=gpt-4.1-mini`. Keep the key secret. Your existing backend startup must load the `.env` file, or export them from the shell before starting the backend.
3. Run the existing application, sign in, and choose **Regulations Chatbot** in Phase 2 of the sidebar.
4. Ask, for example, "What does the manual say about CCTV recording retention?" The answer should cite specific numbered sources. Expand **Retrieved evidence** to inspect the exact excerpts and PDF pages.
5. To add more verified manuals, place PDF files in `sira_knowledge/` at the project root (create that folder if it does not exist). The index rebuilds automatically when PDF files change. Validate document provenance, versions, and effective dates independently.

### API example (requires authentication)

`POST /api/v1/rag-chat/ask`

```json
{"question":"What are the security requirements for warehouses?"}
```

Response keys: `answer`, `sources` (each with `id`, `document`, `page`, `excerpt`), and `status` (`answered`, `no_evidence`, or `configuration_required`). If no API key is configured, the system still returns the retrieved evidence but **does not fabricate a generated answer**.

## Suggested next iteration

Add embedding-based reranking, better heading-aware chunking, supporting passages from multiple pages, per-claim citation validation, follow-up questions with conversation context, admin document upload with approval/version metadata, RAG evaluations using verified SIRA Q&A, and inspection-specific retrieval with role-based access controls.
