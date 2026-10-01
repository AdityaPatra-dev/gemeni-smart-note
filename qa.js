/**
 * Gemini SmartNotes - Q&A & Summary Logic (qa.js)
 */

let currentTopic = "";
let currentDifficulty = "intermediate";

const topicInput = document.getElementById("topic");
const difficultySelect = document.getElementById("difficulty");
const generateBtn = document.getElementById("generateBtn");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const contentSection = document.getElementById("contentSection");
const summaryContent = document.getElementById("summaryContent");
const qaList = document.getElementById("qaList");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

generateBtn.addEventListener("click", generateQA);

topicInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") generateQA();
});

// Auto-fill from query params
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const qTopic = params.get("topic");
  const qDiff = params.get("difficulty");
  if (qTopic) {
    topicInput.value = qTopic;
    if (qDiff) difficultySelect.value = qDiff;
    generateQA();
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
  out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.*?)\*/g, "<em>$1</em>");
  out = out.replace(/^\s*[-•]\s+(.*)$/gim, "<li>$1</li>");
  out = out.replace(/(<li>[\s\S]*?<\/li>)/gm, "<ul>$1</ul>");
  out = out.replace(/<\/ul>\s*<ul>/g, "");
  out = out.replace(/\n\n+/g, "<br/><br/>");
  return out;
}

async function generateQA() {
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
  generateBtn.disabled = true;

  try {
    const res = await fetch(`${window.API_BASE}/qa`, {
      method: "POST",
      headers: window.getApiHeaders(),
      body: JSON.stringify({ topic, difficulty }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate Q&A");
    }

    const data = await res.json();

    // Populate summary
    summaryContent.innerHTML = formatMarkdown(data.summary || "");

    // Populate interactive Q&A items
    renderQAItems(data.qa || []);

    loadingState.style.display = "none";
    contentSection.style.display = "block";
    window.showToast("Q&A generated successfully!", "success");
  } catch (err) {
    loadingState.style.display = "none";
    emptyState.style.display = "flex";
    window.showToast(err.message, "error");
  } finally {
    generateBtn.disabled = false;
  }
}

function renderQAItems(items) {
  if (!items || !items.length) {
    qaList.innerHTML = "<p>No questions generated for this topic.</p>";
    return;
  }

  let html = "";
  items.forEach((item, index) => {
    html += `
      <div class="qa-item ${index === 0 ? "open" : ""}">
        <button class="qa-question-btn" onclick="toggleAccordion(this)">
          <span><strong>Q${index + 1}:</strong> ${item.question}</span>
          <svg class="qa-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="qa-answer-panel">
          <p>${item.answer}</p>
        </div>
      </div>
    `;
  });
  qaList.innerHTML = html;
}

window.toggleAccordion = function (btn) {
  const item = btn.closest(".qa-item");
  if (item) {
    item.classList.toggle("open");
  }
};

window.copySummaryText = function () {
  const text = summaryContent.innerText;
  navigator.clipboard.writeText(text).then(() => {
    window.showToast("Summary copied to clipboard!", "success");
  });
};

downloadPdfBtn.addEventListener("click", async () => {
  if (!currentTopic) return;
  window.showToast("Compiling PDF notes...", "info");

  try {
    const res = await fetch(`${window.API_BASE}/pdf`, {
      method: "POST",
      headers: window.getApiHeaders(),
      body: JSON.stringify({ topic: currentTopic, difficulty: currentDifficulty, mcq_count: 5 }),
    });

    if (!res.ok) throw new Error("Failed to generate PDF");

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
