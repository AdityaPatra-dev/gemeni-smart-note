/**
 * Gemini SmartNotes - Interactive Quiz Arena Logic (mcq.js)
 */

let currentQuestionIndex = 0;
let score = 0;
let answered = false;
let mcqData = [];
let currentTopic = "";
let currentDifficulty = "intermediate";

// DOM Elements
const topicInput = document.getElementById("topic");
const difficultySelect = document.getElementById("difficulty");
const countSelect = document.getElementById("count");
const generateBtn = document.getElementById("generateBtn");
const loadingState = document.getElementById("loadingState");
const quizSection = document.getElementById("quizSection");
const quizTitle = document.getElementById("quizTitle");
const quizDifficultyBadge = document.getElementById("quizDifficultyBadge");
const progressText = document.getElementById("progressText");
const scoreTracker = document.getElementById("scoreTracker");
const progressFill = document.getElementById("progressFill");
const currentQuestionSpan = document.getElementById("currentQuestion");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const explanationBox = document.getElementById("explanationBox");
const resultIcon = document.getElementById("resultIcon");
const resultText = document.getElementById("resultText");
const explanationText = document.getElementById("explanationText");
const nextBtn = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");
const resultsCard = document.getElementById("resultsCard");
const scoreText = document.getElementById("scoreText");
const scoreDescription = document.getElementById("scoreDescription");
const continueQaLink = document.getElementById("continueQaLink");

generateBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", nextQuestion);
finishBtn.addEventListener("click", showResults);

topicInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") startQuiz();
});

// Auto-fill from query params if navigated from explanation page
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const qTopic = params.get("topic");
  const qDiff = params.get("difficulty");
  if (qTopic) {
    topicInput.value = qTopic;
    if (qDiff) difficultySelect.value = qDiff;
    startQuiz();
  }
});

async function startQuiz() {
  const topic = topicInput.value.trim();
  const difficulty = difficultySelect.value;
  const count = parseInt(countSelect.value, 10) || 5;

  if (!topic) {
    window.showToast("Please enter a topic", "error");
    topicInput.focus();
    return;
  }

  currentTopic = topic;
  currentDifficulty = difficulty;
  currentQuestionIndex = 0;
  score = 0;

  quizSection.style.display = "none";
  loadingState.style.display = "flex";
  generateBtn.disabled = true;

  try {
    const res = await fetch(`${window.API_BASE}/mcq`, {
      method: "POST",
      headers: window.getApiHeaders(),
      body: JSON.stringify({ topic, count, difficulty }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate MCQs");
    }

    const data = await res.json();
    mcqData = data.parsed && data.parsed.length ? data.parsed : parseMcqText(data.mcqs || "");

    if (!mcqData.length) {
      throw new Error("Could not parse generated questions. Please try another topic.");
    }

    quizTitle.textContent = topic;
    quizDifficultyBadge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    continueQaLink.href = `qa.html?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`;

    loadingState.style.display = "none";
    quizSection.style.display = "block";
    resultsCard.style.display = "none";
    document.getElementById("mcqCard").style.display = "block";

    loadQuestion();
    window.showToast("Quiz loaded! Good luck!", "success");
  } catch (err) {
    loadingState.style.display = "none";
    window.showToast(err.message, "error");
  } finally {
    generateBtn.disabled = false;
  }
}

function loadQuestion() {
  answered = false;
  const total = mcqData.length;
  const q = mcqData[currentQuestionIndex];

  currentQuestionSpan.textContent = currentQuestionIndex + 1;
  progressText.textContent = `Question ${currentQuestionIndex + 1} of ${total}`;
  scoreTracker.textContent = `Score: ${score}`;
  progressFill.style.width = `${((currentQuestionIndex + 1) / total) * 100}%`;

  questionText.textContent = q.question;
  optionsContainer.innerHTML = "";

  q.options.forEach((optText, index) => {
    const optEl = document.createElement("div");
    optEl.className = "option";
    optEl.innerHTML = `
      <span class="option-label">${String.fromCharCode(65 + index)}</span>
      <span class="option-text">${optText}</span>
    `;
    optEl.addEventListener("click", () => selectOption(index, optEl));
    optionsContainer.appendChild(optEl);
  });

  explanationBox.style.display = "none";
  nextBtn.style.display = "none";
  finishBtn.style.display = "none";
}

function selectOption(index, optionEl) {
  if (answered) return;
  answered = true;

  const q = mcqData[currentQuestionIndex];
  const isCorrect = index === q.correct;

  // Disable pointer on all options
  const allOpts = optionsContainer.children;
  for (let i = 0; i < allOpts.length; i++) {
    allOpts[i].style.pointerEvents = "none";
  }

  if (isCorrect) {
    score++;
    scoreTracker.textContent = `Score: ${score}`;
    optionEl.classList.add("correct");
    resultIcon.textContent = "✓";
    resultText.textContent = "Correct!";
    resultText.style.color = "var(--color-success)";
  } else {
    optionEl.classList.add("incorrect");
    if (allOpts[q.correct]) {
      allOpts[q.correct].classList.add("correct");
    }
    resultIcon.textContent = "✕";
    resultText.textContent = "Incorrect";
    resultText.style.color = "var(--color-error)";
  }

  explanationText.textContent = q.explanation || "Correct option identified.";
  explanationBox.style.display = "block";

  if (currentQuestionIndex < mcqData.length - 1) {
    nextBtn.style.display = "inline-flex";
  } else {
    finishBtn.style.display = "inline-flex";
  }
}

function nextQuestion() {
  currentQuestionIndex++;
  loadQuestion();
}

function showResults() {
  const total = mcqData.length;
  const percentage = Math.round((score / total) * 100);

  document.getElementById("mcqCard").style.display = "none";
  document.querySelector(".quiz-actions").style.display = "none";

  scoreText.textContent = `${percentage}%`;
  scoreDescription.textContent = `You scored ${score} out of ${total} correctly on ${currentTopic}.`;

  resultsCard.style.display = "block";

  if (percentage >= 70) {
    window.triggerConfetti();
    window.showToast("Outstanding performance! 🏆", "success");
  }
}

window.restartQuiz = function () {
  currentQuestionIndex = 0;
  score = 0;
  resultsCard.style.display = "none";
  document.getElementById("mcqCard").style.display = "block";
  document.querySelector(".quiz-actions").style.display = "flex";
  loadQuestion();
};

// Fallback MCQ parser
function parseMcqText(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let currentQ = null;
  let opts = [];
  let correct = null;
  let exp = "";

  function pushItem() {
    if (currentQ && opts.length >= 2 && correct !== null) {
      while (opts.length < 4) opts.push("None of the above");
      items.push({ question: currentQ, options: opts.slice(0, 4), correct, explanation: exp });
    }
    currentQ = null;
    opts = [];
    correct = null;
    exp = "";
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const qMatch = line.match(/^(?:Q\d+|Question\s*\d+|\d+)[\.\:\)]\s*(.*)$/i);
    if (qMatch) {
      pushItem();
      currentQ = qMatch[1].trim();
      continue;
    }
    const optMatch = line.match(/^([A-D])[\.\:\)]\s*(.*)$/i);
    if (optMatch && currentQ) {
      opts.push(optMatch[2].trim());
      continue;
    }
    const ansMatch = line.match(/(?:Answer|Ans|Correct)\s*[\:\=]\s*([A-D])/i);
    if (ansMatch) {
      correct = "ABCD".indexOf(ansMatch[1].toUpperCase());
      continue;
    }
    const expMatch = line.match(/^(?:Explanation|Reason)\s*[\:\=]\s*(.*)$/i);
    if (expMatch) {
      exp = expMatch[1].trim();
      continue;
    }
  }
  pushItem();
  return items;
}
