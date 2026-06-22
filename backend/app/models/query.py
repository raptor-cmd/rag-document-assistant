from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    match_count: int = Field(default=5, ge=1, le=20)
    match_threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class DocumentMatch(BaseModel):
    id: str
    content: str
    similarity: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[DocumentMatch]
