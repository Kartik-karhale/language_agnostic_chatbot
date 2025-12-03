import json
from langdetect import detect
from deep_translator import MyMemoryTranslator
from transformers import pipeline

# -------------------------------
# 1️⃣ Load local FAQ database
# -------------------------------
try:
    with open("faq_db.json", "r", encoding="utf-8") as f:
        faq_db = json.load(f)
except FileNotFoundError:
    faq_db = {
        "hello": "Hi there! How can I assist you?",
        "what is your name": "I’m your Language Agnostic Chatbot 🤖",
        "how are you": "I’m great! How about you?"
    }

# -------------------------------
# 2️⃣ Initialize model and settings
# -------------------------------
chatbot_model = pipeline("text2text-generation", model="google/flan-t5-small")

# -------------------------------
# 3️⃣ Helper: Translation with auto-detection
# -------------------------------
def translate_text(text, target_lang, source_lang=None):
    lang_map = {
        "en": "en-GB",
        "hi": "hi-IN",
        "mr": "mr-IN",
        "fr": "fr-FR",
        "es": "es-ES",
        "de": "de-DE",
        "ta": "ta-IN",
        "te": "te-IN",
        "gu": "gu-IN"
    }

    # Detect source language if not provided
    if not source_lang:
        try:
            source_lang = detect(text)
        except:
            source_lang = "en"

    source_code = lang_map.get(source_lang, "en-GB")
    target_code = lang_map.get(target_lang, "en-GB")

    # Skip translation if same language
    if source_lang == target_lang:
        return text

    try:
        translated = MyMemoryTranslator(source=source_code, target=target_code).translate(text)
        return translated
    except Exception as e:
        print("Translation error:", e)
        return text

# -------------------------------
# 4️⃣ Helper: Check if input matches FAQ
# -------------------------------
def check_faq(user_query):
    for q, a in faq_db.items():
        if q.lower() in user_query.lower():
            return a
    return None

# -------------------------------
# 5️⃣ Helper: Generate AI response
# -------------------------------
def generate_response(prompt):
    try:
        result = chatbot_model(prompt, max_new_tokens=60)
        return result[0]["generated_text"]
    except Exception as e:
        print("Model error:", e)
        return "Sorry, I couldn’t generate a proper response."

# -------------------------------
# 6️⃣ MAIN Chat Loop
# -------------------------------
def main():
    print("🤖 Language-Agnostic Chatbot — Offline Version (No API Keys Needed)")
    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "exit":
            print("Bot: Goodbye! 👋")
            break

        # 1. Check FAQ
        faq_ans = check_faq(user_input)
        if faq_ans:
            print("Bot:", faq_ans)
            continue

        # 2. Detect user language
        try:
            lang = detect(user_input)
        except:
            lang = "en"

        # 3. Translate to English for model
        english_text = translate_text(user_input, target_lang="en", source_lang=lang)

        # 4. Generate response in English
        english_reply = generate_response(english_text)

        # 5. Translate back to user's language
        final_reply = translate_text(english_reply, target_lang=lang, source_lang="en")

        # 6. Show final result
        print("Bot:", final_reply)


# -------------------------------
# Run the chatbot
# -------------------------------
if __name__ == "__main__":
    main()
