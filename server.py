from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

load_dotenv()
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)
CORS(app)

@app.route("/evaluate", methods=["POST"])
def evaluate():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400

    audio = request.files['audio']
    path = "temp.wav"
    audio.save(path)

    # Step 1: Transcribe
    with open(path, "rb") as f:
        spoken = "This is a fake transcription for now"
        feedback = "Simulated feedback. Once AI is active, you'll get real pronunciation tips here."

        return jsonify({
            "transcript": spoken,
            "feedback": feedback
        })

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