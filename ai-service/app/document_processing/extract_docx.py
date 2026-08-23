"""DOCX extraction — python-docx has no concept of a "page," so instead
we track the most recent heading as a section label per paragraph. This
gives citations something more useful than a paragraph index when a
document is organized with Word's built-in heading styles.
"""
import io
from dataclasses import dataclass

from docx import Document as DocxDocument


@dataclass
class SectionText:
    section: str | None  # nearest preceding heading, if any
    paragraph_index: int  # 0-indexed position in the document
    text: str


class DocxExtractionError(Exception):
    pass


def extract_sections(file_bytes: bytes) -> list[SectionText]:
    try:
        doc = DocxDocument(io.BytesIO(file_bytes))
    except Exception as exc:
        raise DocxExtractionError(f"Could not open DOCX: {exc}") from exc

    sections: list[SectionText] = []
    current_heading: str | None = None

    for index, paragraph in enumerate(doc.paragraphs):
        text = paragraph.text.strip()
        if not text:
            continue

        if paragraph.style and paragraph.style.name.lower().startswith("heading"):
            current_heading = text
            # Headings are still emitted as their own entry — a question
            # answered by a heading itself shouldn't be invisible to retrieval.

        sections.append(SectionText(section=current_heading, paragraph_index=index, text=text))

    if not sections:
        raise DocxExtractionError("DOCX has no readable text.")

    return sections
