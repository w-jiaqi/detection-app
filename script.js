(() => {
  "use strict";

  const textarea = document.getElementById("news-input");
  const analyzeBtn = document.getElementById("analyze-btn");
  const clearBtn = document.getElementById("clear-btn");
  const charCount = document.getElementById("char-count");
  const resultsSection = document.getElementById("results");
  const menuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  // ── Mobile menu ────────────────────────────────────────────

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("open");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  }

  // ── Nav highlight ──────────────────────────────────────────

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  });

  // ── UI wiring ──────────────────────────────────────────────

  textarea.addEventListener("input", () => {
    const len = textarea.value.trim().length;
    charCount.textContent = `${len} character${len !== 1 ? "s" : ""}`;
    analyzeBtn.disabled = len < 10;
    clearBtn.disabled = len === 0;
  });

  clearBtn.addEventListener("click", () => {
    textarea.value = "";
    textarea.dispatchEvent(new Event("input"));
    resultsSection.classList.add("hidden");
  });

  analyzeBtn.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (text.length < 10) return;
    const result = analyze(text);
    renderResults(result);

    // Activate "Results" nav
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    const resultsNav = document.querySelector('[data-section="results"]');
    if (resultsNav) resultsNav.classList.add("active");
  });

  // ── Analysis engine ────────────────────────────────────────

  const CLICKBAIT_WORDS = [
    "shocking", "unbelievable", "you won't believe", "mind-blowing",
    "jaw-dropping", "insane", "secret", "they don't want you to know",
    "exposed", "bombshell", "conspiracy", "cover-up", "coverup",
    "gone wrong", "gone viral", "what happened next", "this is why",
    "the truth about", "what they're hiding", "doctors hate",
    "one weird trick", "miracle", "banned", "censored",
  ];

  const EMOTIONAL_WORDS = [
    "outrage", "fury", "terrifying", "horrifying", "devastating",
    "heartbreaking", "disgusting", "appalling", "nightmare",
    "catastrophe", "catastrophic", "crisis", "panic", "hysteria",
    "destroy", "destroyed", "annihilate", "obliterate", "slammed",
    "blasted", "ripped", "savaged", "eviscerated", "torched",
    "brutal", "vicious", "evil", "sinister", "demonic",
  ];

  const ABSOLUTIST_WORDS = [
    "always", "never", "everyone", "nobody", "no one", "every single",
    "all of them", "none of them", "impossible", "guaranteed",
    "proven", "undeniable", "without a doubt", "100%", "totally",
    "completely", "absolutely", "definitely", "certainly",
  ];

  const VAGUE_SOURCING = [
    "sources say", "people are saying", "many people believe",
    "some say", "it is believed", "reportedly", "allegedly",
    "according to sources", "insiders say", "experts claim",
    "studies show", "research shows", "scientists say",
    "a source close to", "anonymous sources",
  ];

  const URGENCY_PHRASES = [
    "breaking", "alert", "urgent", "just in", "developing",
    "share before", "share this before", "they're deleting this",
    "act now", "spread the word", "wake up", "open your eyes",
    "do your own research", "mainstream media won't tell you",
    "msm", "what msm won't report",
  ];

  function countMatches(text, patterns) {
    const lower = text.toLowerCase();
    return patterns.filter((p) => lower.includes(p)).length;
  }

  function analyze(text) {
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const checks = {};

    checks.clickbait = {
      label: "Clickbait Language",
      raw: countMatches(text, CLICKBAIT_WORDS),
      max: 6,
      weight: 20,
    };

    checks.emotion = {
      label: "Emotional Manipulation",
      raw: countMatches(text, EMOTIONAL_WORDS),
      max: 6,
      weight: 18,
    };

    checks.absolutist = {
      label: "Absolutist Language",
      raw: countMatches(text, ABSOLUTIST_WORDS),
      max: 5,
      weight: 12,
    };

    checks.vague = {
      label: "Vague Sourcing",
      raw: countMatches(text, VAGUE_SOURCING),
      max: 4,
      weight: 15,
    };

    checks.urgency = {
      label: "Urgency / Pressure",
      raw: countMatches(text, URGENCY_PHRASES),
      max: 4,
      weight: 12,
    };

    const capsWords = words.filter(
      (w) => w.length >= 2 && w === w.toUpperCase() && /[A-Z]/.test(w)
    );
    const capsRatio = wordCount > 0 ? capsWords.length / wordCount : 0;
    checks.caps = {
      label: "Excessive Caps",
      raw: Math.min(capsRatio / 0.25, 1),
      max: 1,
      weight: 8,
      isRatio: true,
    };

    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;
    const punctRatio =
      sentences.length > 0
        ? (exclamations + questions * 0.5) / sentences.length
        : 0;
    checks.punctuation = {
      label: "Punctuation Abuse",
      raw: Math.min(punctRatio / 2, 1),
      max: 1,
      weight: 8,
    };

    const lengthScore = wordCount < 20 ? 1 : wordCount < 60 ? 0.5 : 0;
    checks.length = {
      label: "Suspiciously Short",
      raw: lengthScore,
      max: 1,
      weight: 7,
    };

    let totalPenalty = 0;
    const breakdownItems = [];

    for (const key of Object.keys(checks)) {
      const c = checks[key];
      const normalized = c.isRatio ? c.raw : Math.min(c.raw / c.max, 1);
      const penalty = normalized * c.weight;
      totalPenalty += penalty;

      breakdownItems.push({
        label: c.label,
        severity: Math.round(normalized * 100),
        penalty: Math.round(penalty),
      });
    }

    const credibility = Math.max(0, Math.round(100 - totalPenalty));

    let verdict, description;
    if (credibility >= 80) {
      verdict = "Likely Credible";
      description =
        "This text shows few signs of misinformation. It uses measured language without obvious manipulation tactics. Still, always cross-check with the reliable sources on the right.";
    } else if (credibility >= 60) {
      verdict = "Somewhat Suspicious";
      description =
        "Some patterns commonly associated with unreliable reporting were detected. Review the breakdown below and verify key claims with trusted outlets.";
    } else if (credibility >= 40) {
      verdict = "Suspicious";
      description =
        "Multiple misinformation patterns detected. This text uses techniques commonly found in fake news. Verify all claims with trusted, established news sources.";
    } else {
      verdict = "Highly Suspicious";
      description =
        "This text exhibits many hallmarks of fake news, including sensationalist language, emotional manipulation, and pressure tactics. Treat with extreme caution.";
    }

    const tips = generateTips(checks, credibility);

    return { credibility, verdict, description, breakdownItems, tips };
  }

  function generateTips(checks) {
    const tips = [];

    if (checks.clickbait.raw > 0)
      tips.push(
        "Clickbait language detected — sensational words are often used to attract clicks rather than inform."
      );
    if (checks.emotion.raw > 0)
      tips.push(
        "Emotionally charged language can bypass critical thinking. Look for the facts behind the emotional framing."
      );
    if (checks.vague.raw > 0)
      tips.push(
        'Vague sourcing like "sources say" is a red flag. Credible news names specific, verifiable sources.'
      );
    if (checks.urgency.raw > 0)
      tips.push(
        "Urgency and pressure tactics are manipulation techniques. Legitimate news doesn't pressure you to share."
      );
    if (checks.absolutist.raw > 0)
      tips.push(
        'Absolutist words like "always" or "never" oversimplify complex issues. Real-world events rarely have absolute outcomes.'
      );
    if (checks.caps.raw > 0.3)
      tips.push(
        "Excessive use of ALL CAPS is a common tactic to convey false urgency."
      );
    if (checks.punctuation.raw > 0.3)
      tips.push(
        "Overuse of exclamation marks and question marks is a stylistic red flag found in low-quality or fabricated content."
      );
    if (checks.length.raw > 0)
      tips.push(
        "Very short articles or isolated headlines lack context. Look for the full story from a reputable outlet."
      );

    if (tips.length === 0)
      tips.push(
        "No major red flags detected, but always verify important news by checking multiple reputable sources."
      );

    tips.push(
      "Cross-reference claims with fact-checking sites like Snopes, PolitiFact, or FactCheck.org."
    );
    tips.push(
      "Check the reliable live sources panel for verified coverage of the Middle East conflict."
    );

    return tips;
  }

  // ── Rendering ──────────────────────────────────────────────

  function getColor(score) {
    if (score >= 80) return "var(--green)";
    if (score >= 60) return "var(--yellow)";
    if (score >= 40) return "var(--orange)";
    return "var(--red)";
  }

  function severityColor(severity) {
    if (severity <= 20) return "var(--green)";
    if (severity <= 50) return "var(--yellow)";
    if (severity <= 75) return "var(--orange)";
    return "var(--red)";
  }

  function renderResults({ credibility, verdict, description, breakdownItems, tips }) {
    resultsSection.classList.remove("hidden");

    const ringFill = document.getElementById("score-ring-fill");
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (credibility / 100) * circumference;
    ringFill.style.strokeDasharray = `${circumference}`;
    ringFill.style.strokeDashoffset = `${circumference}`;
    const color = getColor(credibility);
    ringFill.style.stroke = color;

    requestAnimationFrame(() => {
      ringFill.style.strokeDashoffset = `${offset}`;
    });

    const scoreNum = document.getElementById("score-number");
    animateNumber(scoreNum, credibility, 800);
    scoreNum.style.color = color;

    document.getElementById("verdict-text").textContent = verdict;
    document.getElementById("verdict-text").style.color = color;
    document.getElementById("verdict-description").textContent = description;

    const container = document.getElementById("breakdown-items");
    container.innerHTML = "";
    breakdownItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "breakdown-item";
      row.innerHTML = `
        <span class="bi-label">${item.label}</span>
        <div class="bi-bar-track">
          <div class="bi-bar" style="width:0%;background:${severityColor(item.severity)}"></div>
        </div>
        <span class="bi-value" style="color:${severityColor(item.severity)}">${item.severity}%</span>
      `;
      container.appendChild(row);
      requestAnimationFrame(() => {
        row.querySelector(".bi-bar").style.width = `${item.severity}%`;
      });
    });

    const tipsList = document.getElementById("tips-list");
    tipsList.innerHTML = "";
    tips.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      tipsList.appendChild(li);
    });

    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function animateNumber(el, target, duration) {
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();
