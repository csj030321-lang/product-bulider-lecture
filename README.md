# 🔮 MYSTIC TAROT | Today's Fortune & Summoning

A single-file (`index.html`) Tarot Oracle web application featuring a **3-second 3D spinning ritual**, **22 Major Arcana Guardian Character Summoning**, **Dark & White Mode**, **Cinzel Decorative typography**, and a **deterministic seed-based random engine (Mulberry32)**.

---

## 🌐 Live Website
👉 **[https://csj030321-lang.github.io/today-fortune/](https://csj030321-lang.github.io/today-fortune/)**

---

## ✨ Features

1. **3-Second 3D Spinning & Summoning Ritual**
   - When the user submits their name and birthdate, a dramatic 3-second cosmic magic circle sequence plays.
   - The tarot deck levitates and spins in 3D with escalating audio chimes (Web Audio API).

2. **22 Major Arcana Guardian Character Summoning**
   - When the oracle is revealed, a unique Tarot Guardian is summoned (`THE SUN`, `THE STAR`, `THE EMPRESS`, `THE MAGICIAN`, `THE WORLD`, etc.) with personalized dialogue, title, and aura.

3. **Dark & White Mode Switcher**
   - Instant header toggle (🌙 Dark Mode / ☀️ White Mode) with `localStorage` persistence and OS preference detection.

4. **Cinzel Decorative & Bilingual Design**
   - Headers and Tarot titles in **English** using `Cinzel Decorative`.
   - Comprehensive fortune explanations and advice in warm, polished **Korean (한글)**.

5. **Deterministic Seed-based PRNG (Mulberry32)**
   - The same person on the same date always gets 100% consistent fortune results.
   - The seed changes automatically when the date advances past midnight.
