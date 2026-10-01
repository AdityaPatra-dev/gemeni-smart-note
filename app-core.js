/**
 * Gemini SmartNotes - Core Application Engine (app-core.js)
 * Manages: Theme toggle (Dark/Light), 3D Canvas, Card Tilt Physics,
 * API Key settings modal, Toast notifications, Confetti, and HTTP headers.
 */

(function () {
  "use strict";

  // Determine API base url dynamically (supports port 8000, 5500, or proxy)
  const isLocal8000 = window.location.port === "8000";
  window.API_BASE = isLocal8000 ? "" : "http://localhost:8000";

  // ---------------- THEME MANAGER ----------------
  const THEME_KEY = "smartnotes_theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeToggleIcons(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    showToast(`Switched to ${next === "dark" ? "Dark" : "Light"} Mode`, "info");
  }

  function updateThemeToggleIcons(theme) {
    const buttons = document.querySelectorAll(".theme-toggle-btn");
    buttons.forEach((btn) => {
      if (theme === "light") {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
        btn.setAttribute("title", "Switch to Dark Mode");
      } else {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        `;
        btn.setAttribute("title", "Switch to Light Mode");
      }
    });
  }

  // ---------------- API KEY & CLIENT HEADERS ----------------
  const API_KEY_STORAGE = "gemini_user_api_key";

  window.getApiHeaders = function () {
    const headers = { "Content-Type": "application/json" };
    const customKey = localStorage.getItem(API_KEY_STORAGE);
    if (customKey && customKey.trim()) {
      headers["x-gemini-api-key"] = customKey.trim();
    }
    return headers;
  };

  // ---------------- TOAST NOTIFICATION ENGINE ----------------
  let toastContainer = null;

  window.showToast = function (message, type = "info") {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "✨";
    if (type === "success") icon = "✓";
    if (type === "error") icon = "✕";

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  };

  // ---------------- CONFETTI ANIMATION ENGINE ----------------
  window.triggerConfetti = function () {
    let canvas = document.getElementById("confettiCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "confettiCanvas";
      document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles = [];
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6", "#f59e0b"];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: width * 0.5,
        y: height * 0.4,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        alpha: 1,
      });
    }

    let animationFrame;
    function render() {
      ctx.clearRect(0, 0, width, height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        cancelAnimationFrame(animationFrame);
      }
    }

    render();
  };

  // ---------------- 3D PARTICLE NEURAL CANVAS ----------------
  function init3DHeroCanvas() {
    const canvas = document.getElementById("heroCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = canvas.parentElement.offsetWidth);
    let height = (canvas.height = canvas.parentElement.offsetHeight);

    window.addEventListener("resize", () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    });

    const numPoints = Math.min(65, Math.floor(width / 22));
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2.2 + 1,
      });
    }

    let mouse = { x: -1000, y: -1000 };
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener("mouseleave", () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const isDark = document.documentElement.getAttribute("data-theme") !== "light";
      const pointColor = isDark ? "rgba(167, 139, 250, 0.7)" : "rgba(99, 102, 241, 0.7)";
      const lineColor = isDark ? "rgba(99, 102, 241, " : "rgba(124, 58, 237, ";

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Interaction with mouse
        const dxM = mouse.x - p.x;
        const dyM = mouse.y - p.y;
        const distM = Math.sqrt(dxM * dxM + dyM * dyM);
        if (distM < 120) {
          p.x -= (dxM / distM) * 1.5;
          p.y -= (dyM / distM) * 1.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = pointColor;
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.35;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = lineColor + alpha + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }

    draw();
  }

  // ---------------- 3D CARD TILT EFFECT ----------------
  function init3DCardTilt() {
    const cards = document.querySelectorAll(".feature-card, .step-card, .output-card");
    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -7;
        const rotateY = ((x - centerX) / centerX) * 7;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  // ---------------- API SETTINGS MODAL ----------------
  function injectApiSettingsModal() {
    if (document.getElementById("apiSettingsModal")) return;

    const modal = document.createElement("div");
    modal.id = "apiSettingsModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-box">
        <button class="modal-close-btn" id="closeApiModal">&times;</button>
        <h2 style="margin-bottom: 0.5rem; font-size: 1.4rem;">🔑 Gemini API Settings</h2>
        <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 1.25rem;">
          Configure your Google Gemini API key. Keys are safely stored only in your local browser and sent directly to your local backend.
        </p>

        <div class="form-group">
          <label class="label" for="customApiKeyInput">Google Gemini API Key</label>
          <input 
            type="password" 
            id="customApiKeyInput" 
            class="input" 
            placeholder="AIzaSy..." 
            autocomplete="off"
          />
          <p style="font-size: 0.78rem; color: var(--color-text-tertiary); margin-top: 0.4rem;">
            Don't have a key? Get one for free at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: var(--color-primary);">Google AI Studio</a>.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
          <button id="saveApiKeyBtn" class="btn-primary" style="flex: 2;">Save Key</button>
          <button id="clearApiKeyBtn" class="btn-secondary" style="flex: 1;">Clear</button>
        </div>

        <div id="apiEngineStatus" style="margin-top: 1.2rem; padding: 0.75rem; border-radius: var(--radius-md); background: var(--color-bg-card); font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
          <span class="status-dot"></span>
          <span id="apiStatusText">Checking engine status...</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById("closeApiModal");
    const saveBtn = document.getElementById("saveApiKeyBtn");
    const clearBtn = document.getElementById("clearApiKeyBtn");
    const keyInput = document.getElementById("customApiKeyInput");

    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });

    saveBtn.addEventListener("click", () => {
      const val = keyInput.value.trim();
      if (val) {
        localStorage.setItem(API_KEY_STORAGE, val);
        showToast("Gemini API Key saved locally!", "success");
      } else {
        localStorage.removeItem(API_KEY_STORAGE);
        showToast("Custom API key cleared.", "info");
      }
      modal.classList.remove("active");
      checkBackendEngineStatus();
    });

    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(API_KEY_STORAGE);
      keyInput.value = "";
      showToast("Custom API key removed.", "info");
      checkBackendEngineStatus();
    });
  }

  window.openApiSettingsModal = function () {
    const modal = document.getElementById("apiSettingsModal");
    if (!modal) return;
    const input = document.getElementById("customApiKeyInput");
    input.value = localStorage.getItem(API_KEY_STORAGE) || "";
    modal.classList.add("active");
    checkBackendEngineStatus();
  };

  async function checkBackendEngineStatus() {
    const statusText = document.getElementById("apiStatusText");
    const dots = document.querySelectorAll(".status-dot");
    const btnLabel = document.getElementById("apiSettingsLabel");

    try {
      const res = await fetch(`${window.API_BASE}/api/status`, {
        headers: window.getApiHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const hasKey = data.has_api_key;
        dots.forEach((d) => {
          if (hasKey) d.classList.add("active");
          else d.classList.remove("active");
        });
        if (statusText) {
          statusText.textContent = hasKey
            ? "Gemini 1.5/2.0 AI Live Connection Active"
            : "Simulation Engine Active (Add API key for live Gemini AI)";
        }
        if (btnLabel) {
          btnLabel.textContent = hasKey ? "Gemini Live" : "AI Mode";
        }
      }
    } catch {
      dots.forEach((d) => d.classList.remove("active"));
      if (statusText) statusText.textContent = "Backend offline or unreachable";
      if (btnLabel) btnLabel.textContent = "Offline";
    }
  }

  // ---------------- QUICK TOPIC CHIPS ----------------
  function initTopicChips() {
    const input = document.getElementById("topic");
    if (!input) return;

    document.querySelectorAll(".topic-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const text = chip.getAttribute("data-topic") || chip.textContent.replace(/^[^\w]+/, "").trim();
        input.value = text;
        input.focus();
        showToast(`Selected topic: "${text}"`, "info");
      });
    });
  }

  // ---------------- INITIALIZATION ----------------
  document.addEventListener("DOMContentLoaded", () => {
    // 1. Theme initialization
    applyTheme(getPreferredTheme());

    // 2. Bind theme toggles
    document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", toggleTheme);
    });

    // 3. Inject settings modal & bind trigger buttons
    injectApiSettingsModal();
    document.querySelectorAll(".btn-api-settings").forEach((btn) => {
      btn.addEventListener("click", window.openApiSettingsModal);
    });

    // 4. Check backend engine
    checkBackendEngineStatus();

    // 5. Initialize 3D canvas and cards tilt
    init3DHeroCanvas();
    init3DCardTilt();
    initTopicChips();
  });
})();
