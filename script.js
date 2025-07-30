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
  
    const res = await fetch("http://localhost:5000/evaluate", {
      method: "POST",
      body: formData
    });
  
    const data = await res.json();
    document.getElementById("aiFeedback").innerText =
  `🗣 You said: "${data.transcript}"\n\n🧠 Feedback:\n${data.feedback}`;
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