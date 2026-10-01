/**
 * Gemini SmartNotes - Unified Dashboard Logic (dashboard.js)
 * Fully connected to FastAPI backend with parallel asynchronous generation,
 * interactive self-grading MCQs, accordion Q&A, and PDF downloads.
 */

// DOM Elements
const topicInput = document.getElementById("topic");
const difficultySelect = document.getElementById("difficulty");
const mcqCountSelect = document.getElementById("mcqCount");
const generateBtn = document.getElementById("generateBtn");
const downloadPdfTopBtn = document.getElementById("downloadPdfTopBtn");
const downloadPdfBottomBtn = document.getElementById("downloadPdfBottomBtn");

const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const contentCards = document.getElementById("contentCards");

const activeTopicBadge = document.getElementById("activeTopicBadge");
const activeDifficultyBadge = document.getElementById("activeDifficultyBadge");
const mcqCountBadge = document.getElementById("mcqCountBadge");

const explanationContent = document.getElementById("explanationContent");
const mcqContent = document.getElementById("mcqContent");
const qaContent = document.getElementById("qaContent");
const summaryContent = document.getElementById("summaryContent");

let currentTopic = "";
let currentDifficulty = "intermediate";
let currentMcqCount = 5;

// Markdown to HTML simple parser
function renderMarkdown(text) {
  if (!text) return "";
  let out = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  out = out.replace(/^### (.*$)/gim, "<h4>$1</h4>");
  out = out.replace(/^## (.*$)/gim, "<h3>$1</h3>");
  out = out.replace(/^# (.*$)/gim, "<h2>$1</h2>");

  // Bold & Italic
  out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Bullet items
  out = out.replace(/^\s*[-•]\s+(.*)$/gim, "<li>$1</li>");
  out = out.replace(/(<li>[\s\S]*?<\/li>)/gm, "<ul>$1</ul>");

  // Fix adjacent unordered lists
  out = out.replace(/<\/ul>\s*<ul>/g, "");

  // Newlines to breaks for non-list lines
  out = out.replace(/\n\n+/g, "<br/><br/>");

  return out;
}

// Global copy helper
window.copySectionText = function (elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    window.showToast("Copied to clipboard!", "success");
  }).catch(() => {
    window.showToast("Failed to copy", "error");
  });
};

// Generate button handler
generateBtn.addEventListener("click", generateAllSmartNotes);

// Enter key support
topicInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    generateAllSmartNotes();
  }
});

async function generateAllSmartNotes() {
  const topic = topicInput.value.trim();
  const difficulty = difficultySelect.value;
  const mcqCount = parseInt(mcqCountSelect.value, 10) || 5;

  if (!topic) {
    window.showToast("Please enter a topic to begin", "error");
    topicInput.focus();
    return;
  }

  currentTopic = topic;
  currentDifficulty = difficulty;
  currentMcqCount = mcqCount;

  // Update UI State
  emptyState.style.display = "none";
  loadingState.style.display = "flex";
  contentCards.style.display = "none";
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.7";

  activeTopicBadge.textContent = topic;
  activeDifficultyBadge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const headers = window.getApiHeaders();

  try {
    // Fire concurrent calls to backend for rapid generation
    const [explainRes, mcqRes, qaRes, summaryRes] = await Promise.allSettled([
      fetch(`${window.API_BASE}/explain`, {
        method: "POST",
        headers,
        body: JSON.stringify({ topic, difficulty }),
      }).then((r) => r.json()),

      fetch(`${window.API_BASE}/mcq`, {
        method: "POST",
        headers,
        body: JSON.stringify({ topic, count: mcqCount, difficulty }),
      }).then((r) => r.json()),

      fetch(`${window.API_BASE}/qa`, {
        method: "POST",
        headers,
        body: JSON.stringify({ topic, difficulty }),
      }).then((r) => r.json()),

      fetch(`${window.API_BASE}/summary`, {
        method: "POST",
        headers,
        body: JSON.stringify({ topic, difficulty }),
      }).then((r) => r.json()),
    ]);

    // 1. Populate Explanation
    if (explainRes.status === "fulfilled" && explainRes.value.explanation) {
      explanationContent.innerHTML = renderMarkdown(explainRes.value.explanation);
    } else {
      explanationContent.innerHTML = `<p style="color: var(--color-error);">Failed to load explanation: ${explainRes.reason || "Network issue"}</p>`;
    }

    // 2. Populate MCQs
    if (mcqRes.status === "fulfilled" && mcqRes.value) {
      renderInteractiveMCQs(mcqRes.value.parsed || [], mcqRes.value.mcqs);
    } else {
      mcqContent.innerHTML = `<p style="color: var(--color-error);">Failed to load MCQs.</p>`;
    }

    // 3. Populate Q&A
    if (qaRes.status === "fulfilled" && qaRes.value && qaRes.value.qa) {
      renderAccordionQA(qaRes.value.qa);
    } else {
      qaContent.innerHTML = `<p style="color: var(--color-error);">Failed to load Q&A doubts.</p>`;
    }

    // 4. Populate Summary
    if (summaryRes.status === "fulfilled" && summaryRes.value.summary) {
      summaryContent.innerHTML = renderMarkdown(summaryRes.value.summary);
    } else {
      summaryContent.innerHTML = `<p style="color: var(--color-error);">Failed to load summary notes.</p>`;
    }

    // Reveal Content
    loadingState.style.display = "none";
    contentCards.style.display = "flex";
    window.showToast("All SmartNotes successfully generated!", "success");
  } catch (err) {
    loadingState.style.display = "none";
    emptyState.style.display = "flex";
    window.showToast(`Generation error: ${err.message}`, "error");
  } finally {
    generateBtn.disabled = false;
    generateBtn.style.opacity = "1";
  }
}

// Render MCQs with instant feedback
function renderInteractiveMCQs(parsedList, rawText) {
  if (!parsedList || !parsedList.length) {
    mcqContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${rawText || "No MCQs generated."}</pre>`;
    return;
  }

  mcqCountBadge.textContent = `${parsedList.length} Questions`;
  let html = `<div class="dashboard-mcq-list" style="display: flex; flex-direction: column; gap: 1.5rem;">`;

  parsedList.forEach((q, qIndex) => {
    html += `
      <div class="mcq-item" data-qid="${qIndex}" style="background: var(--color-bg-elevated); padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
        <h4 style="margin-bottom: 0.85rem; font-size: 1.05rem;">Q${qIndex + 1}. ${q.question}</h4>
        <div class="options" id="dash_opt_${qIndex}">
    `;

    q.options.forEach((opt, optIndex) => {
      const char = String.fromCharCode(65 + optIndex);
      html += `
        <div class="option" onclick="handleDashboardMcqSelect(${qIndex}, ${optIndex}, ${q.correct})">
          <span class="option-label">${char}</span>
          <span class="option-text">${opt}</span>
        </div>
      `;
    });

    html += `
        </div>
        <div id="dash_exp_${qIndex}" class="explanation-box" style="display: none; margin-top: 0.75rem;">
          <strong>Explanation:</strong> ${q.explanation || "Correct choice verified."}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  mcqContent.innerHTML = html;
}

window.handleDashboardMcqSelect = function (qIndex, selectedOptIndex, correctIndex) {
  const container = document.getElementById(`dash_opt_${qIndex}`);
  const expBox = document.getElementById(`dash_exp_${qIndex}`);
  if (!container) return;

  const options = container.querySelectorAll(".option");
  options.forEach((opt, idx) => {
    opt.style.pointerEvents = "none";
    if (idx === correctIndex) {
      opt.classList.add("correct");
    } else if (idx === selectedOptIndex) {
      opt.classList.add("incorrect");
    }
  });

  if (expBox) expBox.style.display = "block";
};

// Render Q&A as collapsible accordions
function renderAccordionQA(qaItems) {
  if (!qaItems || !qaItems.length) {
    qaContent.innerHTML = "<p>No Q&A items available.</p>";
    return;
  }

  let html = `<div class="qa-list">`;
  qaItems.forEach((item, index) => {
    html += `
      <div class="qa-item ${index === 0 ? "open" : ""}">
        <button class="qa-question-btn" onclick="toggleAccordion(this)">
          <span><strong>Q:</strong> ${item.question}</span>
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
  html += `</div>`;
  qaContent.innerHTML = html;
}

window.toggleAccordion = function (btn) {
  const item = btn.closest(".qa-item");
  if (item) {
    item.classList.toggle("open");
  }
};

// PDF Download handler
async function handlePdfDownload() {
  if (!currentTopic) {
    window.showToast("Generate notes first to download PDF", "error");
    return;
  }

  window.showToast("Compiling PDF study guide...", "info");

  try {
    const res = await fetch(`${window.API_BASE}/pdf`, {
      method: "POST",
      headers: window.getApiHeaders(),
      body: JSON.stringify({
        topic: currentTopic,
        difficulty: currentDifficulty,
        mcq_count: currentMcqCount,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate PDF");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTopic.replace(/\s+/g, "_")}_SmartNotes.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    window.triggerConfetti();
    window.showToast("PDF downloaded successfully! 🎓", "success");
  } catch (err) {
    window.showToast(`PDF download failed: ${err.message}`, "error");
  }
}

if (downloadPdfTopBtn) downloadPdfTopBtn.addEventListener("click", handlePdfDownload);
if (downloadPdfBottomBtn) downloadPdfBottomBtn.addEventListener("click", handlePdfDownload);
