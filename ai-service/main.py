from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.process import router as process_router
from app.api.index import router as index_router
from app.api.query import router as query_router
from app.api.ai_features import router as ai_features_router

app = FastAPI(
    title="ANORA AI Service",
    description="Document processing and (in later phases) RAG for ANORA.",
    version="0.7.0",  # tracks the phase this service is currently at
)

# Only the Node backend calls this service — not the browser directly —
# but CORS is still configured narrowly rather than left wide open.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],  # the Node backend's origin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(process_router)
app.include_router(index_router)
app.include_router(query_router)
app.include_router(ai_features_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "anora-ai-service"}
