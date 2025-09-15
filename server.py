from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
import openai
import os
import re
from faster_whisper import WhisperModel
import difflib
from dotenv import load_dotenv
import re
import difflib
import random
from datetime import date
import csv

sentences = [
    "My name is Alex.",
    "I like pizza.",
    "Today is sunny.",
    "He went to the store.",
    "I have a dog.",
    "She drinks water.",
    "We are happy.",
    "You look nice.",
    "I want coffee.",
    "This is my friend."
]
# Global user stats (temporary in-memory storage)
user_stats = {
    "attempts": 0,
    "total_score": 0,
    "average_score": 0,
    "last_practice_date": None,
    "today_attempts": 0,
    "daily_challenge": None,
    "daily_challenge_date": None,
    "user_completed_challenge": False
}
practice_log = []

def clean_text(text):
    return re.sub(r'[^\w\s]', '', text).strip().lower()

def compare_texts(transcription, target_sentence):
    clean_trans = clean_text(transcription)
    clean_target = clean_text(target_sentence)

    # Use difflib to calculate similarity ratio (0.0 - 1.0)
    similarity = difflib.SequenceMatcher(None, clean_trans, clean_target).ratio()

    if similarity == 1.0:
        feedback = "Perfect match!"
    elif similarity > 0.8:
        feedback = f"Very close ({round(similarity*100)}% match)."
    elif similarity > 0.5:
        feedback = f"Somewhat close ({round(similarity*100)}% match). Keep practicing."
    else:
        feedback = f"Needs improvement ({round(similarity*100)}% match)."

    return feedback, similarity


load_dotenv()
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)
CORS(app)
model = WhisperModel("small", device="cpu", compute_type="int8")
@app.route("/")
def index():
    return send_from_directory("static", "app.html")

@app.route("/evaluate", methods=["POST"])
def evaluate():
    # Get the sentence the user typed in the frontend
    target_sentence = request.form.get("targetSentence", "")

    # Get the audio file from the frontend and save it
    audio_file = request.files["audio"]
    file_path = "temp_audio.wav"
    audio_file.save(file_path)

    # Use Whisper to transcribe audio
    segments, info = model.transcribe(file_path)
    transcription = " ".join([segment.text for segment in segments])

    # Compare the spoken sentence with the target sentence
    feedback, similarity = compare_texts(transcription, target_sentence)

    # Turn similarity into a percentage score
    score = round(similarity * 100)

    print("------ DEBUG INFO ------")
    print(f"Target sentence: {target_sentence}")
    print(f"Transcription: {transcription}")
    print(f"Feedback: {feedback}")
    print(f"Score: {score}")
    print("------------------------")

    # Send transcription + feedback + score back to the frontend
    return jsonify({
        "target": target_sentence,
        "transcription": transcription,
        "feedback": feedback,
        "score": score
    })

@app.route("/update-stats", methods=["POST"])
def update_stats():
    data = request.json
    score = data.get("score", 0)
    target_sentence = data.get("targetSentence", "")

    # Update stats
    user_stats["attempts"] += 1
    user_stats["total_score"] += score
    user_stats["average_score"] = (
        user_stats["total_score"] / user_stats["attempts"]
        if user_stats["attempts"] > 0 else 0
    )

    # Daily attempts logic
    today = str(date.today())
    if user_stats["last_practice_date"] != today:
        user_stats["today_attempts"] = 0
    user_stats["today_attempts"] += 1
    user_stats["last_practice_date"] = today

    # ✅ Check if today’s challenge was completed
    if target_sentence == user_stats.get("daily_challenge"):
        user_stats["user_completed_challenge"] = True
        # ✅ Log this attempt
    practice_log.append({
        "sentence": target_sentence,
        "score": score,
        "date": today
    })
    return jsonify(user_stats)
@app.route("/practice-log", methods=["GET"])
def get_log():
    filter_type = request.args.get("filter", "recent")
    today = str(date.today())

    if filter_type == "today":
        filtered = [entry for entry in practice_log if entry["date"] == today]
    elif filter_type == "best":
        filtered = sorted(practice_log, key=lambda x: x["score"], reverse=True)[:5]
    elif filter_type == "all":
        filtered = practice_log[-50:]
    else:  # default "recent"
        filtered = practice_log[-20:]

    return jsonify(filtered)

@app.route("/stats", methods=["GET"])
def get_stats():
    today = str(date.today())
    if user_stats["daily_challenge_date"] != today:
        # pick a new daily challenge sentence
        user_stats["daily_challenge"] = random.choice([
            "I like pizza.",
            "She drinks water.",
            "They are learning fast.",
            "Where is the train station?",
            "I will call you tomorrow."
        ])
        user_stats["daily_challenge_date"] = today
        user_stats["user_completed_challenge"] = False
    return jsonify(user_stats)

@app.route("/daily-challenge", methods=["GET"])
def daily_challenge():
    today = str(date.today())
    if user_stats["daily_challenge_date"] != today:
        # Pick a random sentence from our bank for today
        challenge = random.choice(sentences)
        user_stats["daily_challenge"] = challenge
        user_stats["daily_challenge_date"] = today
    
    return jsonify({
        "daily_challenge": user_stats["daily_challenge"],
        "date": user_stats["daily_challenge_date"]
    })
@app.route("/export-log/json", methods=["GET"])
def export_log_json():
    return jsonify(practice_log)

@app.route("/export-log/csv", methods=["GET"])
def export_log_csv():
    def generate():
        output = []
        writer = csv.writer(output)
        writer.writerow(["Date", "Sentence", "Score"])
        for entry in practice_log:
            writer.writerow([entry["date"], entry["sentence"], entry["score"]])
        return "\n".join(output)

    # Build CSV response
    csv_content = "Date,Sentence,Score\n" + "\n".join(
        f'{e["date"]},"{e["sentence"]}",{e["score"]}' for e in practice_log
    )
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=practice_log.csv"}
    )
@app.route("/reset-progress", methods=["POST"])
def reset_progress():
    global practice_log, user_stats
    practice_log = []

    user_stats = {
        "attempts": 0,
        "total_score": 0,
        "average_score": 0,
        "last_practice_date": None,
        "today_attempts": 0,
        "daily_challenge": None,
        "daily_challenge_date": None,
        "user_completed_challenge": False
    }

    return jsonify({"message": "Progress reset successfully."})


#Above is the fake response for now. Once AI is active, this will be replaced with real transcription and feedback below.
#        transcription = client.audio.transcriptions.create(
#            model="whisper-1",
#            file=f
#        )


    spoken = transcription['text']
    target = "This is a pronunciation test."  # 🔁 You can make this dynamic later

    # Step 2: Ask GPT-4 for evaluation
    prompt = f"""You're a pronunciation coach. The user was supposed to say:
    "{target}"
    But they actually said:
    "{spoken}"
    Give clear feedback on what was pronounced well or badly, and a score out of 100.
    """

    completion = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You're a helpful and strict pronunciation coach."},
            {"role": "user", "content": prompt}
        ]
    )

    feedback = completion['choices'][0]['message']['content']

    return jsonify({
        "transcript": spoken,
        "feedback": feedback
    })

if __name__ == "__main__":
    app.run(debug=True)
