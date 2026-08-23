"""TXT extraction — trivial, but still centralized here so the pipeline
treats all three formats uniformly and encoding issues are handled once.
"""


class TxtExtractionError(Exception):
    pass


def extract_text(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            text = file_bytes.decode(encoding)
            if text.strip():
                return text
        except UnicodeDecodeError:
            continue

    raise TxtExtractionError("Could not decode the text file with any supported encoding.")
