/**
 * Golden Lotto 6/45 Application Logic
 */

// Sound Synthesizer via Web Audio API
class LottoSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  playBallSound() {
    if (!this.enabled) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }
}

// Main Application
class LottoApp {
  constructor() {
    this.sound = new LottoSoundEngine();
    this.fixedNumbers = new Set();
    this.excludedNumbers = new Set();
    this.filterMode = 'fixed'; // 'fixed' | 'excluded'
    this.history = JSON.parse(localStorage.getItem('lotto_draw_history') || '[]');
    this.isDrawing = false;
    this.lastDrawnSet = null;

    this.initElements();
    this.initTheme();
    this.initEventListeners();
    this.initMachineTumblingBalls();
    this.renderFilterGrid();
    this.renderMultiSets();
    this.renderHistory();
    this.updateFilterUI();
  }

  initElements() {
    // Nav
    this.navTabs = document.querySelectorAll('.nav-tab');
    this.tabPanes = document.querySelectorAll('.tab-pane');
    this.activeFilterBadge = document.getElementById('activeFilterBadge');

    // Controls & Toggles
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.themeText = document.getElementById('themeText');

    // Live Draw
    this.lotteryMachine = document.getElementById('lotteryMachine');
    this.tumblingBalls = document.getElementById('tumblingBalls');
    this.liveBallsContainer = document.getElementById('liveBallsContainer');
    this.startLiveDrawBtn = document.getElementById('startLiveDrawBtn');
    this.instantDrawBtn = document.getElementById('instantDrawBtn');
    this.copyLiveResultBtn = document.getElementById('copyLiveResultBtn');
    this.currentDrawStats = document.getElementById('currentDrawStats');
    this.currentSum = document.getElementById('currentSum');
    this.currentOddEven = document.getElementById('currentOddEven');
    this.currentHighLow = document.getElementById('currentHighLow');

    // Multi Draw
    this.multiSetsList = document.getElementById('multiSetsList');
    this.generateMultiBtn = document.getElementById('generateMultiBtn');
    this.copyAllMultiBtn = document.getElementById('copyAllMultiBtn');

    // Filter
    this.numberPickerGrid = document.getElementById('numberPickerGrid');
    this.fixedTags = document.getElementById('fixedTags');
    this.excludedTags = document.getElementById('excludedTags');
    this.fixedCount = document.getElementById('fixedCount');
    this.excludedCount = document.getElementById('excludedCount');
    this.resetFilterBtn = document.getElementById('resetFilterBtn');

    // History
    this.historyList = document.getElementById('historyList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Contact Form (Formspree)
    this.contactForm = document.getElementById('contactForm');
    this.contactFormContainer = document.getElementById('contactFormContainer');
    this.contactSuccessCard = document.getElementById('contactSuccessCard');
    this.contactErrorCard = document.getElementById('contactErrorCard');
    this.contactErrorMessage = document.getElementById('contactErrorMessage');
    this.submitContactBtn = document.getElementById('submitContactBtn');
    this.resetContactFormBtn = document.getElementById('resetContactFormBtn');
    this.retryContactBtn = document.getElementById('retryContactBtn');

    // Toast
    this.toast = document.getElementById('toast');
  }

  // Initialize theme from localStorage or OS preference
  initTheme() {
    const savedTheme = localStorage.getItem('lotto_theme');
    if (savedTheme === 'light') {
      this.setTheme('light', false);
    } else if (savedTheme === 'dark') {
      this.setTheme('dark', false);
    } else {
      // Default to dark, check system preference if light
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      this.setTheme(prefersLight ? 'light' : 'dark', false);
    }
  }

  // Set theme mode ('dark' or 'light')
  setTheme(theme, showToastMessage = true) {
    if (theme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      if (this.themeText) this.themeText.textContent = '화이트 모드';
      localStorage.setItem('lotto_theme', 'light');
      if (showToastMessage) this.showToast('☀️ 화이트(라이트) 모드로 변경되었습니다.');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      if (this.themeText) this.themeText.textContent = '다크 모드';
      localStorage.setItem('lotto_theme', 'dark');
      if (showToastMessage) this.showToast('🌙 다크 모드로 변경되었습니다.');
    }
  }

  toggleTheme() {
    const isCurrentlyLight = document.body.classList.contains('light-theme');
    this.setTheme(isCurrentlyLight ? 'dark' : 'light', true);
  }

  initEventListeners() {
    // Navigation Tabs
    this.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-tab');
        this.navTabs.forEach(t => t.classList.remove('active'));
        this.tabPanes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPane = document.getElementById(targetId + 'Tab') || document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Sound toggle
    this.soundToggleBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      const icon = this.soundToggleBtn.querySelector('i');
      if (this.sound.enabled) {
        icon.className = 'fa-solid fa-volume-high';
        this.showToast('사운드가 켜졌습니다.');
      } else {
        icon.className = 'fa-solid fa-volume-xmark';
        this.showToast('사운드가 꺼졌습니다.');
      }
    });

    // Theme toggle (Dark / White Mode)
    this.themeToggleBtn.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Live Draw Actions
    this.startLiveDrawBtn.addEventListener('click', () => this.executeLiveDraw(true));
    this.instantDrawBtn.addEventListener('click', () => this.executeLiveDraw(false));
    this.copyLiveResultBtn.addEventListener('click', () => {
      if (this.lastDrawnSet) {
        const text = `[황금손 로또 6/45]\n추첨번호: ${this.lastDrawnSet.main.join(', ')} + 보너스: ${this.lastDrawnSet.bonus}`;
        this.copyToClipboard(text);
      }
    });

    // Multi Draw Actions
    this.generateMultiBtn.addEventListener('click', () => {
      this.renderMultiSets();
      this.sound.playFanfare();
      this.triggerConfetti();
      this.showToast('5세트가 새로 추출되었습니다!');
    });

    this.copyAllMultiBtn.addEventListener('click', () => {
      this.copyAllMultiSets();
    });

    // Filter Radio Mode
    document.querySelectorAll('input[name="filterMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.filterMode = e.target.value;
      });
    });

    // Reset Filter
    this.resetFilterBtn.addEventListener('click', () => {
      this.fixedNumbers.clear();
      this.excludedNumbers.clear();
      this.updateFilterUI();
      this.showToast('필터 설정이 초기화되었습니다.');
    });

    // Clear History
    this.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('모든 추첨 기록을 삭제하시겠습니까?')) {
        this.history = [];
        localStorage.removeItem('lotto_draw_history');
        this.renderHistory();
        this.showToast('추첨 기록이 모두 삭제되었습니다.');
      }
    });

    // Formspree Contact Form Submit
    if (this.contactForm) {
      this.contactForm.addEventListener('submit', (e) => this.handleContactSubmit(e));
    }

    if (this.resetContactFormBtn) {
      this.resetContactFormBtn.addEventListener('click', () => {
        this.contactForm.reset();
        this.contactSuccessCard.classList.add('hidden');
        this.contactErrorCard.classList.add('hidden');
        this.contactFormContainer.classList.remove('hidden');
      });
    }

    if (this.retryContactBtn) {
      this.retryContactBtn.addEventListener('click', () => {
        this.contactErrorCard.classList.add('hidden');
        this.contactFormContainer.classList.remove('hidden');
      });
    }
  }

  // Handle Formspree AJAX submission
  async handleContactSubmit(e) {
    e.preventDefault();

    const btnText = this.submitContactBtn.querySelector('.btn-text');
    const btnSpinner = this.submitContactBtn.querySelector('.btn-spinner');

    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    this.submitContactBtn.disabled = true;

    const formData = new FormData(this.contactForm);

    try {
      const response = await fetch('https://formspree.io/f/xdeooqza', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        // Success
        this.contactFormContainer.classList.add('hidden');
        this.contactSuccessCard.classList.remove('hidden');
        this.sound.playFanfare();
        this.triggerConfetti();
        this.showToast('문의가 성공적으로 접수되었습니다!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 오류로 인해 전송에 실패했습니다.');
      }
    } catch (err) {
      console.error('Contact Form Error:', err);
      this.contactFormContainer.classList.add('hidden');
      this.contactErrorMessage.textContent = err.message || '전송 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      this.contactErrorCard.classList.remove('hidden');
      this.showToast('문의 전송에 실패했습니다.');
    } finally {
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
      this.submitContactBtn.disabled = false;
    }
  }

  // Generate 6 unique random numbers (1~45) obeying fixed and excluded constraints
  generateLottoSet() {
    const fixedArr = Array.from(this.fixedNumbers);
    const availablePool = [];

    for (let i = 1; i <= 45; i++) {
      if (!this.fixedNumbers.has(i) && !this.excludedNumbers.has(i)) {
        availablePool.push(i);
      }
    }

    if (availablePool.length < (6 - fixedArr.length)) {
      alert('제외수가 너무 많아 6개 번호를 구성할 수 없습니다. 제외수를 조정해주세요.');
      return null;
    }

    // Shuffle pool
    for (let i = availablePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePool[i], availablePool[j]] = [availablePool[j], availablePool[i]];
    }

    const neededCount = 6 - fixedArr.length;
    const pickedMain = [...fixedArr, ...availablePool.slice(0, neededCount)];
    pickedMain.sort((a, b) => a - b);

    // Pick Bonus Ball
    const remainingForBonus = availablePool.slice(neededCount);
    let bonusBall = 0;
    if (remainingForBonus.length > 0) {
      bonusBall = remainingForBonus[0];
    } else {
      // Pick any number not in pickedMain
      for (let i = 1; i <= 45; i++) {
        if (!pickedMain.includes(i) && !this.excludedNumbers.has(i)) {
          bonusBall = i;
          break;
        }
      }
    }

    return {
      main: pickedMain,
      bonus: bonusBall
    };
  }

  getBallColorClass(num) {
    if (num <= 10) return 'yellow';
    if (num <= 20) return 'blue';
    if (num <= 30) return 'red';
    if (num <= 40) return 'gray';
    return 'green';
  }

  initMachineTumblingBalls() {
    this.tumblingBalls.innerHTML = '';
    const sampleColors = ['yellow', 'blue', 'red', 'gray', 'green', 'bonus'];
    for (let i = 0; i < 15; i++) {
      const b = document.createElement('div');
      b.className = `tumble-ball lotto-ball ${sampleColors[i % sampleColors.length]}`;
      b.style.top = `${20 + Math.random() * 60}%`;
      b.style.left = `${20 + Math.random() * 60}%`;
      b.style.animationDelay = `${(i * 0.1).toFixed(2)}s`;
      this.tumblingBalls.appendChild(b);
    }
  }

  // Live sequential draw
  async executeLiveDraw(isAnimated = true) {
    if (this.isDrawing) return;

    const lottoSet = this.generateLottoSet();
    if (!lottoSet) return;

    this.isDrawing = true;
    this.startLiveDrawBtn.disabled = true;
    this.instantDrawBtn.disabled = true;
    this.copyLiveResultBtn.disabled = true;
    this.currentDrawStats.classList.add('hidden');

    // Clear previous slots
    const slots = this.liveBallsContainer.querySelectorAll('.ball-slot');
    slots.forEach(slot => {
      slot.innerHTML = '<span class="placeholder">?</span>';
      slot.classList.remove('has-ball');
    });

    if (isAnimated) {
      this.lotteryMachine.classList.add('spinning');
      const allSeven = [...lottoSet.main, lottoSet.bonus];

      for (let i = 0; i < allSeven.length; i++) {
        await new Promise(r => setTimeout(r, 650));
        const num = allSeven[i];
        const isBonus = (i === 6);
        const colorClass = isBonus ? 'bonus' : this.getBallColorClass(num);

        const slot = slots[i];
        slot.innerHTML = `<div class="lotto-ball ${colorClass}">${num}</div>`;
        slot.classList.add('has-ball');
        this.sound.playBallSound();
      }

      this.lotteryMachine.classList.remove('spinning');
    } else {
      // Instant reveal
      lottoSet.main.forEach((num, i) => {
        slots[i].innerHTML = `<div class="lotto-ball ${this.getBallColorClass(num)}">${num}</div>`;
      });
      slots[6].innerHTML = `<div class="lotto-ball bonus">${lottoSet.bonus}</div>`;
      this.sound.playBallSound();
    }

    this.lastDrawnSet = lottoSet;
    this.startLiveDrawBtn.disabled = false;
    this.instantDrawBtn.disabled = false;
    this.copyLiveResultBtn.disabled = false;
    this.isDrawing = false;

    // Show stats
    this.updateCurrentStats(lottoSet.main);
    this.sound.playFanfare();
    this.triggerConfetti();

    // Save to history
    this.saveToHistory('라이브 추첨', lottoSet);
  }

  updateCurrentStats(numbers) {
    const sum = numbers.reduce((acc, cur) => acc + cur, 0);
    const oddCount = numbers.filter(n => n % 2 !== 0).length;
    const evenCount = 6 - oddCount;
    const lowCount = numbers.filter(n => n <= 22).length;
    const highCount = 6 - lowCount;

    this.currentSum.textContent = sum;
    this.currentOddEven.textContent = `${oddCount}:${evenCount}`;
    this.currentHighLow.textContent = `${lowCount}:${highCount}`;
    this.currentDrawStats.classList.remove('hidden');
  }

  renderMultiSets() {
    this.multiSetsList.innerHTML = '';
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const generatedSets = [];

    labels.forEach((label) => {
      const set = this.generateLottoSet();
      if (!set) return;
      generatedSets.push({ label, set });

      const row = document.createElement('div');
      row.className = 'set-row';

      const ballsHtml = set.main.map(num =>
        `<div class="lotto-ball mini-ball ${this.getBallColorClass(num)}">${num}</div>`
      ).join('');

      row.innerHTML = `
        <div class="set-label">${label} 세트</div>
        <div class="set-balls">
          ${ballsHtml}
        </div>
        <div class="set-actions">
          <button class="btn btn-sm btn-outline copy-single-set-btn" title="이 세트 복사">
            <i class="fa-solid fa-copy"></i> 복사
          </button>
        </div>
      `;

      row.querySelector('.copy-single-set-btn').addEventListener('click', () => {
        const text = `[로또 6/45 ${label}세트] ${set.main.join(', ')}`;
        this.copyToClipboard(text);
      });

      this.multiSetsList.appendChild(row);
    });

    this.currentMultiSets = generatedSets;
  }

  copyAllMultiSets() {
    if (!this.currentMultiSets || this.currentMultiSets.length === 0) return;
    let text = `[황금손 로또 6/45 5세트 자동추천]\n`;
    this.currentMultiSets.forEach(item => {
      text += `${item.label} : ${item.set.main.map(n => String(n).padStart(2, '0')).join('  ')}\n`;
    });
    this.copyToClipboard(text.trim());
  }

  // Filter Grid 1 ~ 45
  renderFilterGrid() {
    this.numberPickerGrid.innerHTML = '';
    for (let i = 1; i <= 45; i++) {
      const ball = document.createElement('button');
      ball.className = 'pick-ball';
      ball.textContent = i;
      ball.dataset.number = i;

      ball.addEventListener('click', () => {
        this.toggleFilterNumber(i);
      });

      this.numberPickerGrid.appendChild(ball);
    }
  }

  toggleFilterNumber(num) {
    if (this.filterMode === 'fixed') {
      if (this.fixedNumbers.has(num)) {
        this.fixedNumbers.delete(num);
      } else {
        if (this.fixedNumbers.size >= 5) {
          alert('고정수는 최대 5개까지만 선택할 수 있습니다.');
          return;
        }
        this.excludedNumbers.delete(num); // Remove from excluded if present
        this.fixedNumbers.add(num);
      }
    } else {
      // Excluded mode
      if (this.excludedNumbers.has(num)) {
        this.excludedNumbers.delete(num);
      } else {
        if (this.excludedNumbers.size >= 39) {
          alert('제외수는 최대 39개까지만 선택할 수 있습니다.');
          return;
        }
        this.fixedNumbers.delete(num); // Remove from fixed if present
        this.excludedNumbers.add(num);
      }
    }
    this.updateFilterUI();
  }

  updateFilterUI() {
    // Update grid buttons
    const balls = this.numberPickerGrid.querySelectorAll('.pick-ball');
    balls.forEach(ball => {
      const num = parseInt(ball.dataset.number, 10);
      ball.classList.remove('is-fixed', 'is-excluded');
      if (this.fixedNumbers.has(num)) ball.classList.add('is-fixed');
      if (this.excludedNumbers.has(num)) ball.classList.add('is-excluded');
    });

    // Update Counts
    this.fixedCount.textContent = `(${this.fixedNumbers.size}/5)`;
    this.excludedCount.textContent = `(${this.excludedNumbers.size}/39)`;

    // Update Badge
    const totalFilters = this.fixedNumbers.size + this.excludedNumbers.size;
    if (totalFilters > 0) {
      this.activeFilterBadge.textContent = totalFilters;
      this.activeFilterBadge.classList.remove('hidden');
    } else {
      this.activeFilterBadge.classList.add('hidden');
    }

    // Render Tags
    this.renderFilterTags();
  }

  renderFilterTags() {
    // Fixed
    this.fixedTags.innerHTML = '';
    if (this.fixedNumbers.size === 0) {
      this.fixedTags.innerHTML = '<span class="empty-text">선택된 고정수가 없습니다.</span>';
    } else {
      Array.from(this.fixedNumbers).sort((a, b) => a - b).forEach(num => {
        const tag = document.createElement('span');
        tag.className = 'tag-ball fixed';
        tag.innerHTML = `${num} <i class="fa-solid fa-xmark"></i>`;
        tag.addEventListener('click', () => {
          this.fixedNumbers.delete(num);
          this.updateFilterUI();
        });
        this.fixedTags.appendChild(tag);
      });
    }

    // Excluded
    this.excludedTags.innerHTML = '';
    if (this.excludedNumbers.size === 0) {
      this.excludedTags.innerHTML = '<span class="empty-text">선택된 제외수가 없습니다.</span>';
    } else {
      Array.from(this.excludedNumbers).sort((a, b) => a - b).forEach(num => {
        const tag = document.createElement('span');
        tag.className = 'tag-ball excluded';
        tag.innerHTML = `${num} <i class="fa-solid fa-xmark"></i>`;
        tag.addEventListener('click', () => {
          this.excludedNumbers.delete(num);
          this.updateFilterUI();
        });
        this.excludedTags.appendChild(tag);
      });
    }
  }

  saveToHistory(type, lottoSet) {
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const record = {
      id: Date.now(),
      type,
      time: timeStr,
      main: lottoSet.main,
      bonus: lottoSet.bonus
    };
    this.history.unshift(record);
    if (this.history.length > 20) this.history.pop();
    localStorage.setItem('lotto_draw_history', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    this.historyList.innerHTML = '';
    if (this.history.length === 0) {
      this.historyList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-box-open"></i>
          <p>아직 생성된 번호 기록이 없습니다.</p>
        </div>
      `;
      return;
    }

    this.history.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';

      const ballsHtml = item.main.map(num =>
        `<div class="lotto-ball mini-ball ${this.getBallColorClass(num)}">${num}</div>`
      ).join('');

      historyItem.innerHTML = `
        <div class="history-meta">
          <span class="history-type">${item.type}</span>
          <span class="history-time">${item.time}</span>
        </div>
        <div class="set-balls">
          ${ballsHtml}
          ${item.bonus ? `<span class="bonus-plus">+</span><div class="lotto-ball mini-ball bonus">${item.bonus}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-outline copy-history-btn">
          <i class="fa-solid fa-copy"></i> 복사
        </button>
      `;

      historyItem.querySelector('.copy-history-btn').addEventListener('click', () => {
        const text = `[로또 6/45 기록] ${item.main.join(', ')}${item.bonus ? ' + 보너스 ' + item.bonus : ''}`;
        this.copyToClipboard(text);
      });

      this.historyList.appendChild(historyItem);
    });
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('번호가 클립보드에 복사되었습니다!');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast('번호가 클립보드에 복사되었습니다!');
    });
  }

  showToast(msg) {
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2500);
  }

  triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LottoApp();
});
