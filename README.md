# Fake News Detector

A client-side web application that analyzes news articles and headlines for common misinformation patterns and produces a credibility score.

**[Try it live](https://w-jiaqi.github.io/detection-app/)**

## What It Does

Paste any news article or headline into the text box and click **Analyze**. The app examines the text for patterns commonly found in fake news and produces:

- **Credibility Score (0–100)** — higher is more credible
- **Detailed Breakdown** — severity ratings for each analysis category
- **Recommendations** — actionable tips based on what was detected

## Analysis Categories

| Category | What It Detects |
|---|---|
| Clickbait Language | Sensationalist phrases like "you won't believe", "shocking", "exposed" |
| Emotional Manipulation | Words designed to trigger fear, outrage, or disgust |
| Absolutist Language | Oversimplifications like "always", "never", "everyone" |
| Vague Sourcing | Unverifiable attributions like "sources say", "people are saying" |
| Urgency / Pressure | Pressure tactics like "share before they delete this" |
| Excessive Caps | Overuse of ALL-CAPS words |
| Punctuation Abuse | Excessive exclamation marks and question marks |
| Suspiciously Short | Very short texts that lack context |

## Technology

Pure HTML, CSS, and JavaScript — no frameworks, no build step, no server required. Runs entirely in the browser.

## Hosting

This app is hosted on GitHub Pages. To deploy your own copy:

1. Fork this repository
2. Go to **Settings → Pages**
3. Set the source to **Deploy from a branch** → `main` → `/ (root)`
4. Your site will be live at `https://<your-username>.github.io/detection-app/`

## Disclaimer

This tool uses text-analysis heuristics to flag common patterns found in misinformation. It is **not** a substitute for professional fact-checking. Always verify news with trusted sources like [Snopes](https://www.snopes.com/), [PolitiFact](https://www.politifact.com/), or [FactCheck.org](https://www.factcheck.org/).
