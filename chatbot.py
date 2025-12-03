from flask import Flask, render_template, request, jsonify
from langdetect import detect
from googletrans import Translator
import openai
import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime

# Initialize Flask
app = Flask(__name__)

# OpenAI API Key
openai.api_key = "YOUR_OPENAI_API_KEY"  # Replace with your key

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

translator = Translator()

# Load FAQs from Firebase or local fallback
def load_faqs():
    try:
        docs = db.collection("faqs").stream()
        faq_dict = {}
        for doc in docs:
            data = doc.to_dict()
            faq_dict[data["question"].lower()] = data["answer"]
        return faq_dict
    except Exception as e:
        print("⚠️ Error loading FAQs:", e)
        return {}

faq_db = load_faqs()

# Check FAQ match
def check_faq(user_query):
    for question, answer in faq_db.items():
        if question.lower() in user_query.lower():
            return answer
    return None

# Translation
def translate_text(text, target_lang):
    try:
        return translator.translate(text, dest=target_lang).text
    except Exception:
        return text

# LLM Response
def generate_llm_response(prompt):
    try:
        completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        return completion.choices[0].message["content"]
    except Exception:
        return "Sorry, I couldn’t generate a response."

# Store chat logs in Firestore
def save_chat(user_msg, bot_reply, lang):
    data = {
        "user_message": user_msg,
        "bot_reply": bot_reply,
        "language": lang,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    db.collection("chats").add(data)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_query = request.json.get("message", "")
    if not user_query:
        return jsonify({"reply": "Please enter a message."})

    # ✅ Load latest FAQs on every request
    faq_db = load_faqs()

    # ✅ Check FAQ match dynamically
    faq_answer = None
    for question, answer in faq_db.items():
        if question.lower() in user_query.lower():
            faq_answer = answer
            break

    if faq_answer:
        save_chat(user_query, faq_answer, "faq")
        return jsonify({"reply": faq_answer})

    # ✅ Detect language
    src_lang = detect(user_query)

    # ✅ Translate to English for the model
    english_text = translate_text(user_query, "en")

    # ✅ LLM response
    english_reply = generate_llm_response(english_text)

    # ✅ Translate back to user language
    final_reply = translate_text(english_reply, src_lang)

    # ✅ Save chat
    save_chat(user_query, final_reply, src_lang)

    return jsonify({"reply": final_reply})


if __name__ == "__main__":
    app.run(debug=True)
