# CyberSafe - Empowering Digital Resilience

**CyberSafe** is a professional, high-fidelity security ecosystem designed to protect users from the growing crisis of digital scams and phishing attacks. Built for a hackathon demo, it combines sophisticated heuristic detection with a gamified learning experience to harden the "human firewall."

## 🚀 Key Features

-   **Scam Scanner**: Real-time multi-vector analysis of Text, URLs, and Emails using a weighted heuristic engine.
-   **Extension**: Proactive local scanner injected into the user's browser for real-time protection.
-   **Phishing Gauntlet**: A high-stakes, time-pressured game mode to train users in identifying malicious patterns.
-   **Cyber Guard Ranks**: A gamified progression system (Cadet to Cyber Guard) with live safety points and localized threat visualization.
-   **Homoglyph Detection**: Advanced engine to spot visually deceptive URLs (e.g., `pаypal.com` using Cyrillic characters).

## 🛠️ Tech Stack

-   **Frontend**: Next.js 16, React 19, Server Components.
-   **Styling**: Tailwind CSS (v4+) with a "Cyber-Premium" dark-mode aesthetic and cinematic animations.
-   **Extension**: Manifest V3, Service Worker Proxying, DOM Injection.
-   **Security**: Weighted Heuristic Engine, Punycode/regex-based URL verification.

## 📦 Installation & Setup

### Web Application
1. Clone the repository.
2. Install dependencies:
    ```bash
    npm install
    ```
3. Run the development server:
    ```bash
    npm run dev
    ```

### Browser Extension (Side-car)
1. Navigate to `chrome://extensions/` in your browser.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked**.
4. Select the `extension/` folder from this directory.

## 🛡️ Problem Statement
95% of data breaches are caused by human error. CyberSafe addresses the "Human Firewall" failure by providing immediate, non-technical feedback and proactive protection where users spend most of their time: their browser.

## 📜 References
- Aligned with **NIST Cybersecurity Framework** and **CISA's Zero Trust Maturity Model**.
- Built following **OWASP Top 10** guidelines and **WCAG 2.1** accessibility standards.

---
*Developed for Hackathon NSUT 2026*
