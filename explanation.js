/**
 * Gemini SmartNotes - Topic Explanation Page Logic (explanation.js)
 */

let currentTopic = "";
let currentDifficulty = "intermediate";

const topicInput = document.getElementById("topic");
const difficultySelect = document.getElementById("difficulty");
const explainBtn = document.getElementById("explainBtn");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const contentSection = document.getElementById("contentSection");
const topicTitle = document.getElementById("topicTitle");
const explanationContent = document.getElementById("explanationContent");
const readingTimeBadge = document.getElementById("readingTimeBadge");
const continueMcqLink = document.getElementById("continueMcqLink");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

explainBtn.addEventListener("click", generateExplanation);

topicInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") generateExplanation();
});

// Check query param for auto-fill
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const qTopic = params.get("topic");
  if (qTopic) {
    topicInput.value = qTopic;
    generateExplanation();
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

async function generateExplanation() {
  const topic = topicInput.value.trim();
  const difficulty = difficultySelect.value;

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
  explainBtn.disabled = true;

  try {
    const res = await fetch(`${window.API_BASE}/explain`, {
      method: "POST",
      headers: window.getApiHeaders(),
      body: JSON.stringify({ topic, difficulty }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate explanation");
    }

    const data = await res.json();
    const text = data.explanation || "";

    topicTitle.textContent = data.topic || topic;
    explanationContent.innerHTML = formatMarkdown(text);

    // Reading time calculation
    const words = text.split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 180));
    readingTimeBadge.textContent = `~${minutes} min read (${words} words)`;

    // Update continue link to pre-fill mcq
    continueMcqLink.href = `mcq.html?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`;

    loadingState.style.display = "none";
    contentSection.style.display = "block";
    window.showToast("Explanation loaded!", "success");
  } catch (err) {
    loadingState.style.display = "none";
    emptyState.style.display = "flex";
    window.showToast(err.message, "error");
  } finally {
    explainBtn.disabled = false;
  }
}

window.copyExplanation = function () {
  const text = explanationContent.innerText;
  navigator.clipboard.writeText(text).then(() => {
    window.showToast("Explanation copied to clipboard!", "success");
  });
};

downloadPdfBtn.addEventListener("click", async () => {
  if (!currentTopic) return;
  window.showToast("Generating PDF...", "info");

  try {
    const res = await fetch(`${window.API_BASE}/pdf`, {
      method: "POST",
      headers: window.getApiHeaders(),
      body: JSON.stringify({ topic: currentTopic, difficulty: currentDifficulty, mcq_count: 3 }),
    });
    if (!res.ok) throw new Error("PDF generation failed");
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
    window.showToast("PDF downloaded! 🎓", "success");
  } catch (err) {
    window.showToast(err.message, "error");
  }
});
