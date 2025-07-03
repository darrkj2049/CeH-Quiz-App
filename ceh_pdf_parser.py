import re
import json
from PyPDF2 import PdfReader

def extract_questions_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text() + "\n"

    # Split the text into questions using the pattern "NO." followed by digits
    question_blocks = re.split(r'\bNO\.\d+\b', full_text)
    questions = []
    qid = 1
    for block in question_blocks:
        if not block.strip() or len(block.strip()) < 20:
            continue

        # Extract question text (up to the first answer choice)
        match = re.search(r"(.+?)\s*A\.\s*", block, re.DOTALL)
        if not match:
            continue
        question_text = match.group(1).strip()

        # Extract answer choices
        options = {}
        for letter in ['A', 'B', 'C', 'D']:
            pattern = rf"{letter}\.\s*(.+?)(?=\s*[A-D]\.\s*|Answer|$)"
            choice_match = re.search(pattern, block, re.DOTALL)
            if choice_match:
                options[letter] = choice_match.group(1).strip().replace('\n', ' ')

        # Extract the correct answer
        answer_match = re.search(r"Answer\s*[:\-]?\s*([A-D])", block)
        correct = answer_match.group(1) if answer_match else None

        # Extract explanation if present
        explanation_match = re.search(
            r"Explanation\s*[:\-]?\s*(.+?)(?=(?:NO\.\d+|$))", 
            block, 
            re.DOTALL | re.IGNORECASE
        )
        explanation = explanation_match.group(1).strip() if explanation_match else None

        if question_text and len(options) == 4 and correct:
            questions.append({
                "id": qid,
                "question": question_text,
                "options": options,
                "correct": correct,
                "explanation": explanation
            })
            qid += 1

        
    return questions

if __name__ == "__main__":
    pdf_path = "312-50v11.pdf"  # Path to your PDF file
    questions = extract_questions_from_pdf(pdf_path)

    # Output to JSON file
    with open("quiz_questions.json", "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

    print(f"Extracted {len(questions)} questions to quiz_questions.json")