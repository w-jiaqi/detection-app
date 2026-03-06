(() => {
  "use strict";

  const textarea = document.getElementById("news-input");
  const analyzeBtn = document.getElementById("analyze-btn");
  const clearBtn = document.getElementById("clear-btn");
  const charCount = document.getElementById("char-count");
  const resultsSection = document.getElementById("results");
  const loadingSection = document.getElementById("loading");
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

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  });

  // ── UI wiring ──────────────────────────────────────────────

  function updateCharCount() {
    const len = textarea.value.trim().length;
    charCount.textContent = `${len} character${len !== 1 ? "s" : ""}`;
    analyzeBtn.disabled = len < 10;
    clearBtn.disabled = len === 0;
  }

  textarea.addEventListener("input", updateCharCount);
  textarea.addEventListener("keyup", updateCharCount);
  textarea.addEventListener("paste", function () {
    setTimeout(updateCharCount, 0);
  });
  textarea.addEventListener("change", updateCharCount);

  clearBtn.addEventListener("click", () => {
    textarea.value = "";
    textarea.dispatchEvent(new Event("input"));
    resultsSection.classList.add("hidden");
  });

  analyzeBtn.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (text.length < 10) return;

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing...';
    resultsSection.classList.add("hidden");
    loadingSection.classList.remove("hidden");
    loadingSection.scrollIntoView({ behavior: "smooth", block: "start" });

    const steps = loadingSection.querySelectorAll(".loading-step");
    steps.forEach((s) => s.classList.remove("active", "done"));

    const result = analyze(text);
    await animateStepsSequential(steps, 650);

    loadingSection.classList.add("hidden");
    renderResults(result);

    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = `Analyze <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    const resultsNav = document.querySelector('[data-section="results"]');
    if (resultsNav) resultsNav.classList.add("active");
  });

  function animateStepsSequential(steps, interval) {
    return new Promise((resolve) => {
      let i = 0;
      function next() {
        if (i > 0) {
          steps[i - 1].classList.remove("active");
          steps[i - 1].classList.add("done");
        }
        if (i < steps.length) {
          steps[i].classList.add("active");
          i++;
          setTimeout(next, interval);
        } else {
          setTimeout(resolve, 300);
        }
      }
      next();
    });
  }

  // ══════════════════════════════════════════════════════════
  //  ANALYSIS ENGINE
  // ══════════════════════════════════════════════════════════

  const CLICKBAIT_WORDS = [
    "shocking", "unbelievable", "you won't believe", "mind-blowing",
    "jaw-dropping", "insane", "secret", "they don't want you to know",
    "exposed", "bombshell", "conspiracy", "cover-up", "coverup",
    "gone wrong", "gone viral", "what happened next", "this is why",
    "the truth about", "what they're hiding", "doctors hate",
    "one weird trick", "miracle", "banned", "censored", "must see",
    "must watch", "look what", "you need to see this",
  ];

  const EMOTIONAL_WORDS = [
    "outrage", "fury", "terrifying", "horrifying", "devastating",
    "heartbreaking", "disgusting", "appalling", "nightmare",
    "catastrophe", "catastrophic", "crisis", "panic", "hysteria",
    "destroy", "destroyed", "annihilate", "obliterate", "slammed",
    "blasted", "ripped", "savaged", "eviscerated", "torched",
    "brutal", "vicious", "evil", "sinister", "demonic",
    "bloodbath", "carnage", "massacre", "genocide", "exterminate",
    "collapse", "collapsed", "meltdown", "plunge", "plunged",
    "plummets", "plummeted", "skyrocket", "soar", "surge",
    "crash", "crashed", "wipe out", "wiped out", "tank", "tanked",
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
    "a source close to", "anonymous sources", "rumor has it",
  ];

  const URGENCY_PHRASES = [
    "breaking", "alert", "urgent", "just in", "developing",
    "share before", "share this before", "they're deleting this",
    "act now", "spread the word", "wake up", "open your eyes",
    "do your own research", "mainstream media won't tell you",
    "msm", "what msm won't report", "happening now",
  ];

  const CREDIBLE_ATTRIBUTIONS = [
    "according to", "said in a statement", "told reporters",
    "press release", "official statement", "spokesperson said",
    "press conference", "the report said", "confirmed by",
    "reuters reported", "ap reported", "according to the",
    "the pentagon said", "the white house said", "ministry said",
    "government said", "officials said", "official said",
    "in a statement", "cited by", "reported by",
    "new york times", "washington post", "bbc", "cnn reported",
  ];

  const MILITARY_CLAIM_PATTERNS = [
    /\b(shot down|strike[sd]?|bomb(?:ed|ing)?|attack(?:ed|ing)?|launch(?:ed|ing)?|intercept(?:ed|ing)?|destroy(?:ed|ing)?)\b/i,
    /\b(drone|missile|rocket|warplane|fighter jet|airstrike|air strike|artillery|warship)\b/i,
    /\b(killed|dead|casualt(?:y|ies)|wounded|injured|troops|soldiers|forces)\b/i,
    /\b(invasion|offensive|retreat|surrender|ceasefire|cease-fire|blockade)\b/i,
    /\b(nuclear|chemical|biological|weapon)\b/i,
    /\b(army|navy|air force|military|defense|defence|pentagon|idf|irgc)\b/i,
  ];

  function normalize(text) {
    return text.replace(/#/g, " ").replace(/@/g, " ").replace(/['']/g, "'").toLowerCase();
  }

  function countMatches(text, patterns) {
    const lower = normalize(text);
    return patterns.filter((p) => lower.includes(p)).length;
  }

  function analyze(text) {
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const checks = {};

    checks.clickbait = { label: "Clickbait Language", raw: countMatches(text, CLICKBAIT_WORDS), max: 5, weight: 16 };
    checks.emotion = { label: "Emotional Manipulation", raw: countMatches(text, EMOTIONAL_WORDS), max: 5, weight: 14 };
    checks.absolutist = { label: "Absolutist Language", raw: countMatches(text, ABSOLUTIST_WORDS), max: 4, weight: 10 };
    checks.vague = { label: "Vague Sourcing", raw: countMatches(text, VAGUE_SOURCING), max: 3, weight: 12 };
    checks.urgency = { label: "Urgency / Pressure", raw: countMatches(text, URGENCY_PHRASES), max: 3, weight: 14 };

    const capsWords = words.filter((w) => {
      const clean = w.replace(/[^A-Za-z]/g, "");
      return clean.length >= 2 && clean === clean.toUpperCase() && /[A-Z]/.test(clean);
    });
    const capsRatio = wordCount > 0 ? capsWords.length / wordCount : 0;
    checks.caps = { label: "Excessive Caps", raw: Math.min(capsRatio / 0.15, 1), max: 1, weight: 10, isRatio: true };

    const excl = (text.match(/!/g) || []).length;
    const ques = (text.match(/\?/g) || []).length;
    const punctRatio = sentences.length > 0 ? (excl + ques * 0.5) / sentences.length : 0;
    checks.punctuation = { label: "Punctuation Abuse", raw: Math.min(punctRatio / 1.5, 1), max: 1, weight: 8 };

    const hasNumbers = /\d{2,}/.test(text) || /\$[\d,.]+/.test(text) || /\d+\s*(%|percent|billion|million)/i.test(text);
    const hasMilitaryClaim = MILITARY_CLAIM_PATTERNS.some((p) => p.test(text));
    const hasSpecificClaims = hasNumbers || hasMilitaryClaim;
    const hasAttribution = countMatches(text, CREDIBLE_ATTRIBUTIONS) > 0;
    const missingAttr = hasSpecificClaims && !hasAttribution ? 1 : 0;
    checks.attribution = { label: "Missing Attribution", raw: missingAttr, max: 1, weight: 18, isRatio: true };

    const bigNums = text.match(/\$\s*[\d,.]+\s*(billion|trillion|million)/gi) || [];
    const pcts = text.match(/\d+(\.\d+)?\s*%/g) || [];
    const deathTolls = text.match(/\d{3,}\s*(killed|dead|casualties|injured|wounded)/gi) || [];
    const specHits = bigNums.length + pcts.length + deathTolls.length;
    const specScore = wordCount < 40 ? Math.min(specHits / 2, 1) : Math.min(specHits / 4, 1);
    checks.specificity = { label: "Unverified Statistics", raw: specScore, max: 1, weight: 12, isRatio: true };

    const hashtags = (text.match(/#\w+/g) || []).length;
    const mentions = (text.match(/@\w+/g) || []).length;
    const rt = /^RT\s|[\s]RT\s/i.test(text) ? 1 : 0;
    const socialScore = Math.min((hashtags + mentions + rt) / 3, 1);
    checks.social = { label: "Social Media Signals", raw: socialScore, max: 1, weight: 8, isRatio: true };

    let lengthScore;
    if (wordCount < 15) lengthScore = 1;
    else if (wordCount < 30) lengthScore = 0.7;
    else if (wordCount < 60) lengthScore = 0.35;
    else lengthScore = 0;
    checks.length = { label: "Suspiciously Short", raw: lengthScore, max: 1, weight: 12, isRatio: true };

    let totalPenalty = 0;
    const breakdownItems = [];

    for (const key of Object.keys(checks)) {
      const c = checks[key];
      const norm = c.isRatio ? c.raw : Math.min(c.raw / c.max, 1);
      const penalty = norm * c.weight;
      totalPenalty += penalty;
      breakdownItems.push({ label: c.label, severity: Math.round(norm * 100) });
    }

    const flagged = breakdownItems.filter((b) => b.severity > 25).length;
    if (flagged >= 3) totalPenalty += 5;
    if (flagged >= 5) totalPenalty += 8;

    const credibility = Math.max(0, Math.round(100 - totalPenalty));

    let verdict, description;
    if (credibility >= 80) {
      verdict = "Likely Credible";
      description = "This text shows few signs of misinformation. It uses measured language without obvious manipulation tactics. Still, always cross-check with reliable sources.";
    } else if (credibility >= 60) {
      verdict = "Somewhat Suspicious";
      description = "Some patterns commonly associated with unreliable reporting were detected. Review the breakdown below and verify key claims with trusted outlets.";
    } else if (credibility >= 40) {
      verdict = "Suspicious";
      description = "Multiple misinformation patterns detected. This text uses techniques commonly found in fake news. Verify all claims with trusted, established news sources.";
    } else {
      verdict = "Highly Suspicious";
      description = "This text exhibits many hallmarks of fake news, including sensationalist language, emotional manipulation, and pressure tactics. Treat with extreme caution.";
    }

    const tips = [];
    if (checks.clickbait.raw > 0) tips.push("Clickbait language detected — sensational words attract clicks rather than inform.");
    if (checks.emotion.raw > 0) tips.push("Emotionally charged language can bypass critical thinking. Look for facts behind the framing.");
    if (checks.vague.raw > 0) tips.push('Vague sourcing like "sources say" is a red flag. Credible news names specific sources.');
    if (checks.urgency.raw > 0) tips.push("Urgency and pressure tactics are manipulation techniques. Legitimate news doesn't pressure you.");
    if (checks.absolutist.raw > 0) tips.push('Absolutist words like "always" or "never" oversimplify complex issues.');
    if (checks.caps.raw > 0.2) tips.push("Excessive use of ALL CAPS is a common tactic to convey false urgency.");
    if (checks.punctuation.raw > 0.2) tips.push("Overuse of exclamation marks is a stylistic red flag found in fabricated content.");
    if (checks.attribution.raw > 0) tips.push("Specific claims made without citing a named, verifiable source. Who reported this?");
    if (checks.specificity.raw > 0) tips.push("Precise statistics can be fabricated to appear credible. Verify numbers independently.");
    if (checks.social.raw > 0) tips.push("Social media formatting suggests this originated on platforms where misinformation spreads fastest.");
    if (checks.length.raw > 0.3) tips.push("Very short posts lack context. Look for the full story from a reputable outlet.");
    if (tips.length === 0) tips.push("No major red flags detected, but always verify important news via multiple reputable sources.");
    tips.push("Cross-reference claims with Snopes, PolitiFact, or FactCheck.org.");
    tips.push("Check the reliable live sources panel for verified Middle East conflict coverage.");

    return { credibility, verdict, description, breakdownItems, tips };
  }

  // ══════════════════════════════════════════════════════════
  //  RENDERING
  // ══════════════════════════════════════════════════════════

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
    requestAnimationFrame(() => { ringFill.style.strokeDashoffset = `${offset}`; });

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
