"""Orchestrates the document processing pipeline described in the Phase 0
plan: extraction -> cleaning -> chunking -> metadata generation. Embedding
generation and vector storage are added on top of this in Phase 5 — this
module deliberately stops at producing metadata-tagged chunks, since that
is the actual scope of Phase 4.
"""
from uuid import uuid4

from app.document_processing.chunker import chunk_text
from app.document_processing.cleaner import clean_text, is_meaningful
from app.document_processing.extract_docx import DocxExtractionError, extract_sections
from app.document_processing.extract_pdf import PdfExtractionError, extract_pages
from app.document_processing.extract_txt import TxtExtractionError, extract_text
from app.models.schemas import ChunkMetadata, ChunkOut


class DocumentProcessingError(Exception):
    """Raised for any extraction failure, with a message safe to show a user."""


def process_document(
    *,
    file_bytes: bytes,
    file_type: str,
    document_id: str,
    document_name: str,
    knowledge_base_id: str,
) -> tuple[list[ChunkOut], int | None]:
    """Returns (chunks, page_count). page_count is None for DOCX/TXT,
    which have no native concept of a page."""

    if file_type == "pdf":
        return _process_pdf(file_bytes, document_id, document_name, knowledge_base_id)
    if file_type == "docx":
        return _process_docx(file_bytes, document_id, document_name, knowledge_base_id)
    if file_type == "txt":
        return _process_txt(file_bytes, document_id, document_name, knowledge_base_id)

    raise DocumentProcessingError(f"Unsupported file type: {file_type}")


def _process_pdf(file_bytes, document_id, document_name, kb_id):
    try:
        pages = extract_pages(file_bytes)
    except PdfExtractionError as exc:
        raise DocumentProcessingError(str(exc)) from exc

    chunks: list[ChunkOut] = []
    chunk_index = 0
    for page in pages:
        cleaned = clean_text(page.text)
        if not is_meaningful(cleaned):
            continue
        for piece in chunk_text(cleaned):
            if not is_meaningful(piece.text):
                continue
            chunks.append(
                ChunkOut(
                    text=piece.text,
                    metadata=ChunkMetadata(
                        document_id=document_id,
                        document_name=document_name,
                        knowledge_base_id=kb_id,
                        chunk_id=str(uuid4()),
                        chunk_index=chunk_index,
                        page=page.page_number,
                    ),
                )
            )
            chunk_index += 1

    if not chunks:
        raise DocumentProcessingError("No extractable text was found in this PDF (it may be a scanned image).")

    return chunks, len(pages)


def _process_docx(file_bytes, document_id, document_name, kb_id):
    try:
        sections = extract_sections(file_bytes)
    except DocxExtractionError as exc:
        raise DocumentProcessingError(str(exc)) from exc

    # Group consecutive paragraphs under the same section before chunking,
    # so a chunk doesn't arbitrarily straddle unrelated headings when it
    # doesn't have to.
    grouped: list[tuple[str | None, str]] = []
    for entry in sections:
        cleaned = clean_text(entry.text)
        if not is_meaningful(cleaned, min_length=3):  # headings can be short
            continue
        if grouped and grouped[-1][0] == entry.section:
            grouped[-1] = (entry.section, grouped[-1][1] + "\n" + cleaned)
        else:
            grouped.append((entry.section, cleaned))

    chunks: list[ChunkOut] = []
    chunk_index = 0
    for section, text in grouped:
        for piece in chunk_text(text):
            if not is_meaningful(piece.text):
                continue
            chunks.append(
                ChunkOut(
                    text=piece.text,
                    metadata=ChunkMetadata(
                        document_id=document_id,
                        document_name=document_name,
                        knowledge_base_id=kb_id,
                        chunk_id=str(uuid4()),
                        chunk_index=chunk_index,
                        section=section,
                    ),
                )
            )
            chunk_index += 1

    if not chunks:
        raise DocumentProcessingError("No extractable text was found in this DOCX file.")

    return chunks, None


def _process_txt(file_bytes, document_id, document_name, kb_id):
    try:
        raw_text = extract_text(file_bytes)
    except TxtExtractionError as exc:
        raise DocumentProcessingError(str(exc)) from exc

    cleaned = clean_text(raw_text)
    if not is_meaningful(cleaned):
        raise DocumentProcessingError("This text file has no meaningful content.")

    chunks: list[ChunkOut] = []
    for chunk_index, piece in enumerate(chunk_text(cleaned)):
        if not is_meaningful(piece.text):
            continue
        chunks.append(
            ChunkOut(
                text=piece.text,
                metadata=ChunkMetadata(
                    document_id=document_id,
                    document_name=document_name,
                    knowledge_base_id=kb_id,
                    chunk_id=str(uuid4()),
                    chunk_index=chunk_index,
                ),
            )
        )

    if not chunks:
        raise DocumentProcessingError("This text file produced no usable chunks.")

    return chunks, None
