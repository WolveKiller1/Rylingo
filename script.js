console.log("✅ script.js loaded");
// --- Day 20 helpers ---
let practiceCount = Number(localStorage.getItem("practiceCount") || 0);
let currentTarget = ""; // keep the current sentence here

function getLocalPracticeCount() {
  const saved = localStorage.getItem("practiceCount");
  return saved ? parseInt(saved, 10) : 0;
}

function updateProgress() {
  localStorage.setItem("practiceCount", practiceCount);
  const el = document.getElementById("progress");
  if (el) el.innerText = `Sentences practiced: ${practiceCount}`;

  // Update progress bar locally
  const progressBar = document.getElementById("progressBar");
  if (progressBar) {
    const percent = Math.min((practiceCount / 50) * 100, 100);
    progressBar.style.width = percent + "%";
    progressBar.classList.remove("pulse");
    void progressBar.offsetWidth; // restart animation
    progressBar.classList.add("pulse");
  }
}
// ✅ Mark today as practiced
const practicedDays = JSON.parse(localStorage.getItem("practicedDays")) || [];
const todayKey = new Date().toISOString().split("T")[0];
if (!practicedDays.includes(todayKey)) {
  practicedDays.push(todayKey);
  localStorage.setItem("practicedDays", JSON.stringify(practicedDays));
  // ✅ Sync with backend
  fetch("http://127.0.0.1:5000/update-tracker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ practicedDays })
  });
}
updateConsistencyTracker();


function colorFor(score) {
  const n = Number(score || 0);
  if (n >= 95) return "green";
  if (n >= 75) return "orange";
  return "red";
}

function renderResults(target, transcription, score, feedback) {
  const box = document.getElementById("results");
  if (!box) return;

  if (!transcription || transcription.trim() === "") {
    box.innerHTML = `<p>🔇 I couldn't hear you. Try again.</p>`;
    return;
  }

  const color = colorFor(score);
  box.innerHTML = `
    <div class="result-card" style="padding:12px;border-radius:10px;background:#f9f9f9;box-shadow:0 2px 8px rgba(0,0,0,.08)">
      <p>✅ <strong>Target</strong>: ${target || "(none)"}</p>
      <p>🗣️ <strong>You said</strong>: ${transcription}</p>
      <p><strong>Score</strong>: <span style="color:${color}">${score ?? 0}%</span></p>
      <p>💡 ${feedback || ""}</p>
    </div>
  `;

  const retry = document.getElementById("retryBtn");
  if (retry) {
    retry.style.display = "inline-block";
    console.log("✅ Retry button now visible");
  }
} // <-- properly close renderResults here

function tryAgain() {
  document.getElementById("results").innerHTML = ""; // clear old results
  document.getElementById("sentenceInput").value = ""; // clear input box if you have one
}

function pickNextSentence() {
  // Use your existing getRandomSentence() or sentences[] array
  const s = (typeof getRandomSentence === "function")
    ? getRandomSentence()
    : sentences[Math.floor(Math.random() * sentences.length)];

  currentTarget = s;
  const display = document.getElementById("targetSentenceDisplay");
  if (display) display.innerText = s;

  const hidden = document.getElementById("targetSentence");
  if (hidden) hidden.value = s;

  const results = document.getElementById("results");
  if (results) results.innerHTML = "";

  const retry = document.getElementById("retryBtn");
  if (retry) retry.style.display = "none";
}
// Sentence bank for practice
const sentences = [
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
];

function getRandomSentence() {
  const randomIndex = Math.floor(Math.random() * sentences.length);
  return sentences[randomIndex];
}
async function lookupWord() {
    const word = document.getElementById("wordInput").value.trim();
    const output = document.getElementById("output");
    output.innerHTML = "";
  
    if (!word) {
      output.innerText = "Please enter a word.";
      return;
    }

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await response.json();
  
      const match = data[0].phonetics.find(p => p.text && p.audio);

      if (!match) {
        output.innerHTML = "No pronunciation with audio available.";
      } else {
        const line = document.createElement("p");
        line.innerText = `Phonetic: ${match.text}`;
        output.appendChild(line);
      
        const button = document.createElement("button");
        button.innerText = "🔊 Play Audio";
        button.onclick = () => new Audio(match.audio).play();
        output.appendChild(button);
      }      
  
    } catch (err) {
      output.innerText = "Error: Could not fetch pronunciation.";
      console.error(err);
    }
  }
  let mediaRecorder;
  let audioChunks = [];
  
  const recordBtn = document.getElementById("recordBtn");
  const stopBtn = document.getElementById("stopBtn");
  
  recordBtn.onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
  
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      const playback = document.getElementById("audioPlayback");
      playback.innerHTML = '';
      playback.appendChild(audio);
      audio.controls = true;
      audio.play();
    };
  
    mediaRecorder.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
  };
  
  stopBtn.onclick = () => {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  };
  document.getElementById("evaluateBtn").onclick = async () => {
    if (audioChunks.length === 0) {
      alert("Please record your speech first.");
      return;
    }
  
    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("audio", audioBlob);  
    formData.append("targetSentence", document.getElementById("targetSentence").value);
    fetch("http://127.0.0.1:5000/evaluate", {
      method: "POST",
      body: formData,
      })
      .then(response => response.json())
      .then(async data => {
        console.log("✅ Entered results block");
        console.log("Data from backend:", data); // 🔍 debug
        
        renderResults(data.target, data.transcription, data.score, data.feedback);

        // ✅ Show results box
        document.getElementById("results").style.display = "block";

        practiceCount++;
        updateProgress();

        // ✅ Send score to backend stats
        await fetch("http://127.0.0.1:5000/update-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attempts: practiceCount,
            score: data.score,
            targetSentence: data.target
          })
        });

        // ✅ Refresh stats UI
        loadStats();

        // ✅ Show retry button
        const retry = document.getElementById("retryBtn");
        if (retry) {
          retry.style.display = "inline-block";
          console.log("✅ Retry button should now be visible");
        } else {
          console.log("❌ Retry button not found in DOM");
        }
      })

  .catch(error => console.error("Error:", error));

  
    const data = await res.json();
    document.getElementById("aiFeedback").innerText =
  `🗣 You said: "${data.transcription}"\n\n🧠 Feedback:\n${data.feedback}`;
  };  
function markConfidence(success) {
  const sentence = document.getElementById("targetText").value || "(no sentence)";
  const log = JSON.parse(localStorage.getItem("speechLogs") || "[]");

  log.push({
    sentence,
    success,
    date: new Date().toISOString()
  });

  localStorage.setItem("speechLogs", JSON.stringify(log));
  alert("Saved your self-evaluation.");
}
function viewLog() {
  const log = JSON.parse(localStorage.getItem("speechLogs") || "[]");
  const logOutput = document.getElementById("logOutput");

  if (log.length === 0) {
    logOutput.innerText = "No practice history yet.";
    return;
  }

  logOutput.innerHTML = "<h3>Practice History</h3><ul>" + 
    log.map(entry => `<li>${entry.date}: "${entry.sentence}" - ${entry.success ? "✅" : "❌"}</li>`).join('') + 
    "</ul>";
} 
document.getElementById("nextSentenceBtn").addEventListener("click", () => {
  const sentence = getRandomSentence();
  document.getElementById("targetSentenceDisplay").innerText = sentence;

  // Keep it in a hidden input for backend
  document.getElementById("targetSentence").value = sentence;
});
async function loadTrackerFromServer() {
  try {
    const res = await fetch("http://127.0.0.1:5000/user-data");
    const data = await res.json();

    // Save backend tracker data locally
    if (data.practicedDays) {
      localStorage.setItem("practicedDays", JSON.stringify(data.practicedDays));
    }

    // Update the visual dots
    updateConsistencyTracker();
  } catch (err) {
    console.error("Failed to load tracker data:", err);
  }
}

window.onload = async () => {
  try {
    // ✅ Load tracker data from backend first
    await loadTrackerFromServer();

    // ✅ Load stats from backend (so numbers show correctly)
    await loadStats();

    // ✅ Then start the daily sentence
    document.getElementById("nextSentenceBtn").click();
  } catch (err) {
    console.error("Startup error:", err);
  }
};

document.getElementById("retryBtn").style.display = "inline-block";
document.getElementById("retryBtn").onclick = () => {
  document.getElementById("results").innerHTML = ""; // clear old results
  startRecording(); // call your record function again
};
window.addEventListener("load", () => {
  updateProgress();
  pickNextSentence();
  loadStats(); // new
  loadDailyChallenge(); // new
});
const retryBtn = document.getElementById("retryBtn");
if (retryBtn) {
  retryBtn.onclick = () => {
    document.getElementById("results").innerHTML = ""; 
    retryBtn.style.display = "none";
  };
}
document.getElementById("retryBtn").addEventListener("click", () => {
  console.log("🔄 Retrying same sentence...");

  // Clear results box
  const resultsBox = document.getElementById("results");
  resultsBox.style.display = "none";
  resultsBox.innerHTML = "";

  // Reset buttons for a new attempt
  document.getElementById("recordBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
  document.getElementById("evaluateBtn").disabled = false;

  // ⚠️ Don't randomize a new sentence — keep the same one
});
async function loadStats() {
  try {
    const res = await fetch("http://127.0.0.1:5000/stats");
    const stats = await res.json();
    // Merge backend and local data
    const localCount = getLocalPracticeCount();
    if (localCount > stats.attempts) {
      stats.attempts = localCount;
    }
    // Update text stats
    document.getElementById("attempts").textContent =
      `Attempts: ${stats.attempts}`;
    document.getElementById("averageScore").textContent =
      `Average Score: ${stats.average_score.toFixed(2)}`;
    document.getElementById("todayAttempts").textContent =
      `Today’s Attempts: ${stats.today_attempts}`;

    // Encouragement messages
    let encouragement = "";
    if (stats.today_attempts === 0) {
      encouragement = "👋 Ready for a quick practice?";
    } else if (stats.today_attempts < 3) {
      encouragement = "💪 Great start — keep going!";
    } else if (stats.today_attempts < 10) {
      encouragement = "🔥 You're building strong confidence today!";
    } else {
      encouragement = "🌟 Amazing work — your voice is getting stronger!";
    }
    const encouragementEl = document.getElementById("encouragement");
    encouragementEl.textContent = encouragement;
    encouragementEl.classList.remove("fade-in");
    void encouragementEl.offsetWidth; // restart animation
    encouragementEl.classList.add("fade-in");


    // ✅ Challenge status (now styled)
    const challengeStatus = document.getElementById("challengeStatus");
    if (stats.user_completed_challenge) {
      challengeStatus.innerHTML = "<span class='challenge-complete pop'>✅ Challenge Complete!</span>";
      launchConfetti();
    } else {
      challengeStatus.innerHTML = "";
    }

  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}


async function loadDailyChallenge() {
  try {
    const res = await fetch("http://127.0.0.1:5000/daily-challenge");
    const data = await res.json();
    document.getElementById("dailyChallengeText").textContent =
      data.daily_challenge;
    
    // Preload it into the target sentence field (optional)
    document.getElementById("targetSentence").value = data.daily_challenge;
  } catch (err) {
    console.error("Failed to load daily challenge:", err);
  }
}
document.getElementById("dailyChallengeText").addEventListener("click", () => {
  const challenge = document.getElementById("dailyChallengeText").textContent;
  
  // Put it into the practice area
  document.getElementById("targetSentenceDisplay").textContent = challenge;
  document.getElementById("targetSentence").value = challenge;
  
  // Clear old results
  document.getElementById("results").innerHTML = "";
  
  console.log("🌟 Daily Challenge loaded into practice:", challenge);
});
function launchConfetti() {
  const duration = 2 * 1000; // 2 seconds
  const end = Date.now() + duration;

  (function frame() {
    // Confetti effect: colored circles falling
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 100; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
      ctx.fill();
    }

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  })();
}
async function viewLog() {
  try {
    const res = await fetch("http://127.0.0.1:5000/practice-log");
    const log = await res.json();
    const logOutput = document.getElementById("logOutput");

    if (!log || log.length === 0) {
      logOutput.innerHTML = "<li>No practice history yet.</li>";
      return;
    }
  const maxScore = Math.max(...log.map(e => e.score));

  logOutput.innerHTML = log.map(entry => {
    let color = "red";
    if (entry.score >= 95) color = "green";
    else if (entry.score >= 75) color = "orange";

    const star = entry.score === maxScore ? "⭐ " : "";

    return `<li>
      ${star}<span style="color:gray">${entry.date}</span> —
      "${entry.sentence}" —
      <strong style="color:${color}">${entry.score}%</strong>
    </li>`;
  }).join("");
  } catch (err) {
    console.error("Failed to load practice log:", err);
  }
}
async function viewLog(filter = "recent") {
  try {
    const res = await fetch(`http://127.0.0.1:5000/practice-log?filter=${filter}`);
    const log = await res.json();
    const logOutput = document.getElementById("logOutput");

    if (!log || log.length === 0) {
      logOutput.innerHTML = "<li>No practice history yet.</li>";
      return;
    }

    logOutput.innerHTML = log.map(entry =>
      `<li>${entry.date}: "${entry.sentence}" — Score: ${entry.score}%</li>`
    ).join("");
  } catch (err) {
    console.error("Failed to load practice log:", err);
  }
}
function exportLog(type) {
  const url = type === "csv"
    ? "http://127.0.0.1:5000/export-log/csv"
    : "http://127.0.0.1:5000/export-log/json";

  window.open(url, "_blank"); // open in new tab / download
}

async function resetProgress() {
  if (!confirm("Are you sure you want to reset all progress?")) return;

  try {
    await fetch("http://127.0.0.1:5000/reset-progress", { method: "POST" });
    alert("Progress reset!");
    loadStats();   // refresh stats
    viewLog();     // refresh log
  } catch (err) {
    console.error("Failed to reset progress:", err);
  }
}
async function startRecording() {
  console.log("startRecording clicked");
  const recordBtn = document.getElementById("recordBtn");
  recordBtn.textContent = "🎤 Recording...";
  recordBtn.disabled = true;
  recordBtn.classList.add("loading");

  await new Promise(r => setTimeout(r, 3000));

  recordBtn.textContent = "🎤 Start Recording";
  recordBtn.disabled = false;
  recordBtn.classList.remove("loading");
  recordBtn.classList.add("success");

  setTimeout(() => recordBtn.classList.remove("success"), 1000);

  document.getElementById("results").innerHTML =
    "<p style='color: white;'>✅ Recording captured (simulated)</p>";
}

async function evaluateSpeech() {
  console.log("evaluateSpeech clicked");
  const evaluateBtn = document.getElementById("evaluateBtn");
  evaluateBtn.textContent = "⏳ Evaluating...";
  evaluateBtn.disabled = true;
  evaluateBtn.classList.add("loading");

  await new Promise(r => setTimeout(r, 2000));

  evaluateBtn.textContent = "💬 Evaluate My Speech";
  evaluateBtn.disabled = false;
  evaluateBtn.classList.remove("loading");
  evaluateBtn.classList.add("success");

  setTimeout(() => evaluateBtn.classList.remove("success"), 1000);

  document.getElementById("results").innerHTML +=
    "<p style='color: green;'>✅ Evaluation complete (simulated)</p>";
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("recordBtn").addEventListener("click", startRecording);
  document.getElementById("evaluateBtn").addEventListener("click", evaluateSpeech);
});
function updateConsistencyTracker() {
  const dots = document.querySelectorAll(".dot");
  const today = new Date();
  const practicedDays = JSON.parse(localStorage.getItem("practicedDays")) || [];

  dots.forEach((dot, index) => {
    const dayOffset = 6 - index;
    const date = new Date();
    date.setDate(today.getDate() - dayOffset);

    const dateKey = date.toISOString().split("T")[0];
    if (practicedDays.includes(dateKey)) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
}
