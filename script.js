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

    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    const resultsNav = document.querySelector('[data-section="results"]');
    if (resultsNav) resultsNav.classList.add("active");
  });

  // ══════════════════════════════════════════════════════════
  //  ANALYSIS ENGINE (v2 — improved detection)
  // ══════════════════════════════════════════════════════════

  const CLICKBAIT_WORDS = [
    "shocking", "unbelievable", "you won't believe", "mind-blowing",
    "jaw-dropping", "insane", "secret", "they don't want you to know",
    "exposed", "bombshell", "conspiracy", "cover-up", "coverup",
    "gone wrong", "gone viral", "what happened next", "this is why",
    "the truth about", "what they're hiding", "doctors hate",
    "one weird trick", "miracle", "banned", "censored", "must see",
    "must watch", "look what", "exposed", "you need to see this",
    "won't believe what", "the real reason",
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
    "entire", "entire country", "whole world", "the whole",
  ];

  const VAGUE_SOURCING = [
    "sources say", "people are saying", "many people believe",
    "some say", "it is believed", "reportedly", "allegedly",
    "according to sources", "insiders say", "experts claim",
    "studies show", "research shows", "scientists say",
    "a source close to", "anonymous sources", "rumor has it",
    "word is", "i'm hearing", "i've been told",
  ];

  const URGENCY_PHRASES = [
    "breaking", "alert", "urgent", "just in", "developing",
    "share before", "share this before", "they're deleting this",
    "act now", "spread the word", "wake up", "open your eyes",
    "do your own research", "mainstream media won't tell you",
    "msm", "what msm won't report", "happening now",
    "right now", "live update", "flash",
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
    "guardian reported", "al jazeera reported",
  ];

  function normalize(text) {
    return text
      .replace(/#/g, " ")
      .replace(/@/g, " ")
      .replace(/['']/g, "'")
      .toLowerCase();
  }

  function countMatches(text, patterns) {
    const lower = normalize(text);
    return patterns.filter((p) => lower.includes(p)).length;
  }

  function analyze(text) {
    const normalized = normalize(text);
    const words = text.split(/\s+/).filter(Boolean);
    const cleanWords = normalized.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const checks = {};

    // 1. Clickbait / sensationalism
    checks.clickbait = {
      label: "Clickbait Language",
      raw: countMatches(text, CLICKBAIT_WORDS),
      max: 5,
      weight: 18,
    };

    // 2. Emotional manipulation (expanded with financial fear words)
    checks.emotion = {
      label: "Emotional Manipulation",
      raw: countMatches(text, EMOTIONAL_WORDS),
      max: 5,
      weight: 16,
    };

    // 3. Absolutist language
    checks.absolutist = {
      label: "Absolutist Language",
      raw: countMatches(text, ABSOLUTIST_WORDS),
      max: 4,
      weight: 10,
    };

    // 4. Vague sourcing
    checks.vague = {
      label: "Vague Sourcing",
      raw: countMatches(text, VAGUE_SOURCING),
      max: 3,
      weight: 12,
    };

    // 5. Urgency / pressure
    checks.urgency = {
      label: "Urgency / Pressure",
      raw: countMatches(text, URGENCY_PHRASES),
      max: 3,
      weight: 14,
    };

    // 6. ALL-CAPS abuse (strip # and @ before checking)
    const capsWords = words.filter((w) => {
      const clean = w.replace(/[^A-Za-z]/g, "");
      return clean.length >= 2 && clean === clean.toUpperCase() && /[A-Z]/.test(clean);
    });
    const capsRatio = wordCount > 0 ? capsWords.length / wordCount : 0;
    checks.caps = {
      label: "Excessive Caps",
      raw: Math.min(capsRatio / 0.15, 1),
      max: 1,
      weight: 10,
      isRatio: true,
    };

    // 7. Punctuation abuse
    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;
    const punctRatio =
      sentences.length > 0
        ? (exclamations + questions * 0.5) / sentences.length
        : 0;
    checks.punctuation = {
      label: "Punctuation Abuse",
      raw: Math.min(punctRatio / 1.5, 1),
      max: 1,
      weight: 8,
    };

    // 8. Missing attribution — specific claims with no named source
    const hasSpecificClaims = /\d{2,}/.test(text) ||
      /\$[\d,.]+/.test(text) ||
      /\d+\s*(%|percent|billion|million|trillion|thousand|killed|dead|casualties)/i.test(text);
    const hasAttribution = countMatches(text, CREDIBLE_ATTRIBUTIONS) > 0;
    const missingAttr = hasSpecificClaims && !hasAttribution ? 1 : 0;
    checks.attribution = {
      label: "Missing Attribution",
      raw: missingAttr,
      max: 1,
      weight: 15,
      isRatio: true,
    };

    // 9. Suspicious specificity — large round numbers or precise $ in short text
    const bigNumbers = text.match(/\$\s*[\d,.]+\s*(billion|trillion|million)/gi) || [];
    const precisePercent = text.match(/\d+(\.\d+)?\s*%/g) || [];
    const largeDeathTolls = text.match(/\d{3,}\s*(killed|dead|die|casualties|injured|wounded)/gi) || [];
    const specificityHits = bigNumbers.length + precisePercent.length + largeDeathTolls.length;
    const specificityScore = wordCount < 40
      ? Math.min(specificityHits / 2, 1)
      : Math.min(specificityHits / 4, 1);
    checks.specificity = {
      label: "Unverified Statistics",
      raw: specificityScore,
      max: 1,
      weight: 12,
      isRatio: true,
    };

    // 10. Social media patterns — hashtags, @mentions, "RT", emojis as emphasis
    const hashtags = (text.match(/#\w+/g) || []).length;
    const mentions = (text.match(/@\w+/g) || []).length;
    const rtPattern = /^RT\s|[\s]RT\s/i.test(text) ? 1 : 0;
    const socialSignals = hashtags + mentions + rtPattern;
    const socialScore = Math.min(socialSignals / 3, 1);
    checks.social = {
      label: "Social Media Signals",
      raw: socialScore,
      max: 1,
      weight: 8,
      isRatio: true,
    };

    // 11. Suspiciously short
    let lengthScore;
    if (wordCount < 15) lengthScore = 1;
    else if (wordCount < 30) lengthScore = 0.7;
    else if (wordCount < 60) lengthScore = 0.35;
    else lengthScore = 0;
    checks.length = {
      label: "Suspiciously Short",
      raw: lengthScore,
      max: 1,
      weight: 10,
      isRatio: true,
    };

    // ── Compute credibility ──
    let totalPenalty = 0;
    const breakdownItems = [];

    for (const key of Object.keys(checks)) {
      const c = checks[key];
      const norm = c.isRatio ? c.raw : Math.min(c.raw / c.max, 1);
      const penalty = norm * c.weight;
      totalPenalty += penalty;

      breakdownItems.push({
        label: c.label,
        severity: Math.round(norm * 100),
        penalty: Math.round(penalty),
      });
    }

    // Interaction bonus: multiple weak signals compound
    const flaggedCategories = breakdownItems.filter((b) => b.severity > 25).length;
    if (flaggedCategories >= 3) totalPenalty += 5;
    if (flaggedCategories >= 5) totalPenalty += 8;

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
        'Absolutist words like "always" or "never" oversimplify complex issues.'
      );
    if (checks.caps.raw > 0.2)
      tips.push(
        "Excessive use of ALL CAPS is a common tactic to convey false urgency and importance."
      );
    if (checks.punctuation.raw > 0.2)
      tips.push(
        "Overuse of exclamation marks is a stylistic red flag found in low-quality or fabricated content."
      );
    if (checks.attribution.raw > 0)
      tips.push(
        "This text makes specific claims (numbers, statistics, dollar amounts) without citing a named source. Credible reporting always attributes data to verifiable sources."
      );
    if (checks.specificity.raw > 0)
      tips.push(
        "Precise-sounding statistics (dollar amounts, percentages, casualty figures) can be fabricated to make fake news appear credible. Verify these numbers independently."
      );
    if (checks.social.raw > 0)
      tips.push(
        "Social media formatting (hashtags, @mentions) suggests this originated on social platforms where misinformation spreads fastest."
      );
    if (checks.length.raw > 0.3)
      tips.push(
        "Very short posts or isolated headlines lack context. Look for the full story from a reputable outlet."
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
