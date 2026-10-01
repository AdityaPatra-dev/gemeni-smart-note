/**
 * Gemini SmartNotes - Summary & PDF Logic (summary.js)
 */

let currentTopic = "";
let currentDifficulty = "intermediate";

const topicInput = document.getElementById("topic");
const difficultySelect = document.getElementById("difficulty");
const generateBtn = document.getElementById("generateBtn");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const contentSection = document.getElementById("contentSection");
const notesTitle = document.getElementById("notesTitle");
const notesContent = document.getElementById("notesContent");
const downloadBtn = document.getElementById("downloadBtn");

generateBtn?.addEventListener("click", generateSummary);

topicInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") generateSummary();
});

// Auto-fill from query params
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const qTopic = params.get("topic");
  const qDiff = params.get("difficulty");
  if (qTopic) {
    topicInput.value = qTopic;
    if (qDiff) difficultySelect.value = qDiff;
    generateSummary();
  }
});

function formatMarkdown(text) {
  if (!text) return "";
  let out = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  out = out.replace(/^### (.*$)/gim, "<h4>$1</h4>");
  out = out.replace(/^## (.*$)/gim, "<h3>$1</h3>");
  out = out.replace(/^# (.*$)/gim, "<h2>$1</h2>");
  out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.*?)\*/g, "<em>$1</em>");
  out = out.replace(/^\s*[-•]\s+(.*)$/gim, "<li>$1</li>");
  out = out.replace(/(<li>[\s\S]*?<\/li>)/gm, "<ul>$1</ul>");
  out = out.replace(/<\/ul>\s*<ul>/g, "");
  out = out.replace(/\n\n+/g, "<br/><br/>");
  return out;
}

async function generateSummary() {
  const topic = (topicInput?.value || "").trim();
  const difficulty = difficultySelect?.value || "intermediate";

  if (!topic) {
    window.showToast("Please enter a topic", "error");
    topicInput.focus();
    return;
  }

  currentTopic = topic;
  currentDifficulty = difficulty;

  emptyState.style.display = "none";
  contentSection.style.display = "none";
  loadingState.style.display = "flex";
  generateBtn.disabled = true;

  try {
    const res = await fetch(`${window.API_BASE}/summary`, {
      method: "POST",
      headers: window.getApiHeaders(),
      body: JSON.stringify({ topic, difficulty }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate summary");
    }

    const data = await res.json();
    notesTitle.textContent = data.topic || topic;
    notesContent.innerHTML = formatMarkdown(data.summary || "");

    loadingState.style.display = "none";
    contentSection.style.display = "block";
    window.showToast("Revision notes prepared!", "success");
  } catch (err) {
    loadingState.style.display = "none";
    emptyState.style.display = "flex";
    window.showToast(err.message, "error");
  } finally {
    generateBtn.disabled = false;
  }
}

window.copyNotes = function () {
  const text = notesContent.innerText;
  navigator.clipboard.writeText(text).then(() => {
    window.showToast("Notes copied to clipboard!", "success");
  });
};

downloadBtn?.addEventListener("click", async () => {
  if (!currentTopic) {
    window.showToast("Please generate summary notes first", "error");
    return;
  }

  window.showToast("Compiling formatted PDF...", "info");

  try {
    const res = await fetch(`${window.API_BASE}/pdf`, {
      method: "POST",
      headers: window.getApiHeaders(),
      body: JSON.stringify({ topic: currentTopic, difficulty: currentDifficulty, mcq_count: 5 }),
    });

    if (!res.ok) throw new Error("Failed to compile PDF");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTopic.replace(/\s+/g, "_")}_Notes.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    window.triggerConfetti();
    window.showToast("PDF downloaded successfully! 🎓", "success");
  } catch (err) {
    window.showToast(err.message, "error");
  }
});
