document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.querySelector(".start-btn button");
  const rulesContainer = document.querySelector(".rules-container");
  const exitRulesBtn = rulesContainer.querySelector(".quit-in-rules");
  const continueBtn = rulesContainer.querySelector(".restart");

  const configContainer = document.querySelector(".config-container");
  const exitConfigBtn = configContainer.querySelector(".quit-in-config");
  const startQuizBtn = configContainer.querySelector(".start-quiz-btn");

  const quizContainer = document.querySelector(".quiz-container");
  const quizHeader = quizContainer.querySelector(".quiz-header");
  const questionText = quizContainer.querySelector(".question-text");
  const answerOptions = quizContainer.querySelector(".answer-options");
  const confirmBtn = quizContainer.querySelector(".confirm-btn");
  const timerDisplay = quizContainer.querySelector(".time-duration");
  const questionStatus = quizContainer.querySelector(".question-status");
  const explanationBox = quizContainer.querySelector(".explanation-box");

  const resultContainer = document.querySelector(".result-container");
  const resultMessage = resultContainer.querySelector(".result-message");
  const scoreMessage = resultContainer.querySelector(".score");
  const progressBar = resultContainer.querySelector(".result-progress-fill");
  const tryAgainBtn = resultContainer.querySelector(".try-again-btn");
  const quitResultBtn = resultContainer.querySelector(".quit-in-result");
  const openHistoryBtn = resultContainer.querySelector(".open-history-btn");

  const historyContainer = document.querySelector(".history-container");
  const historyList = historyContainer.querySelector(".history-list");
  const closeHistoryBtn = historyContainer.querySelector(".close-history-btn");
  const deleteHistoryBtn = historyContainer.querySelector(".delete-history");
  const quizCategoryShowInQuizContainer = document.querySelector(
    "#option-display-in-quiz",
  );

  const QUIZ_TIME_LIMIT = 15;
  const MAX_CHEATS = 3;

  let currentQuestion = null;
  let quizCategory = null;
  let numberOfQuestions = 0;
  let correctCount = 0;
  let cheatCount = 0;
  let askedQuestions = [];
  let selectedOption = null;
  let isChecked = false;
  let isAnswered = false;
  let timer = null;
  let currentTime = QUIZ_TIME_LIMIT;
  let ticking = false;
  let isquestionrendered = false;

  answerOptions.addEventListener("click", (e) => {
    const li = e.target.closest(".answer-option");
    if (!li || li.classList.contains("disabled")) return;

    answerOptions.querySelector(".active")?.classList.remove("active");

    li.classList.add("active");

    selectedOption = li;
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Check";
    isChecked = false;
  });
  const SoundManager = {
    sounds: {
      wrong: new Audio("audio/wrong-answer.mp3"),
      alert: new Audio("audio/alert.mp3"),
      timer: new Audio("audio/timer.mp3"),
    },
    play(name, autoPauseOthers = true) {
      const sound = this.sounds[name];
      if (!sound) return;
      if (autoPauseOthers) this.stopAll(name);
      sound.currentTime = 0;
      sound.play().catch(() => {});
    },
    pause(name) {
      const sound = this.sounds[name];
      if (!sound) return;
      sound.pause();
    },
    stopAll(except = null) {
      Object.keys(this.sounds).forEach((key) => {
        if (key !== except) this.pause(key);
      });
    },
  };

  const SCREENS = {
    START: startBtn.parentNode,
    RULES: rulesContainer,
    CONFIG: configContainer,
    QUIZ: quizContainer,
    RESULT: resultContainer,
    HISTORY: historyContainer,
  };
  const DISPLAY_TYPES = {
    START: "flex",
    RULES: "block",
    CONFIG: "block",
    QUIZ: "block",
    RESULT: "block",
    HISTORY: "block",
  };
  function showScreen(name) {
    Object.entries(SCREENS).forEach(([key, screen]) => {
      screen.style.display = key === name ? DISPLAY_TYPES[key] : "none";
      screen.classList.toggle("activeInfo", key === name);
    });
  }

  function resetTimer() {
    clearInterval(timer);
    currentTime = QUIZ_TIME_LIMIT;
    ticking = false;
    timerDisplay.textContent = `${currentTime}s`;
    timerDisplay.classList.remove("timer-blink");
    timerDisplay.style.color = "white";
  }

  function startTimer() {
    resetTimer();
    timer = setInterval(() => {
      currentTime--;
      timerDisplay.textContent = `${currentTime}s`;

      if (currentTime <= 5 && !ticking) {
        ticking = true;
        SoundManager.play("alert");
        timerDisplay.classList.add("timer-blink");
        timerDisplay.style.color = "red";
      }

      if (currentTime <= 0) handleTimeUp();
    }, 1000);
  }

  const handleTimeUp = () => {
    clearInterval(timer);
    ticking = false;
    isAnswered = true;
    highlightCorrect();
    disableOptions();
    if (currentQuestion.whyCorrect) {
      explanationBox.style.display = "block";
      explanationBox.innerHTML = `<b>Why correct:</b><br>${currentQuestion.whyCorrect}`;
    }
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Next";
    isChecked = true;
    SoundManager.stopAll();
  };
  function resetQuizState() {
    currentQuestion = null;
    quizCategory = null;
    numberOfQuestions = 0;
    correctCount = 0;
    cheatCount = 0;
    isAnswered = false;
    askedQuestions = [];
    selectedOption = null;
    isChecked = false;
    ticking = false;
    SoundManager.stopAll();
    startQuizBtn.focus();
    clearInterval(timer);
    resetTimer();
    hideExplanation();

    showScreen("CONFIG");
  }

  function hideExplanation() {
    explanationBox.style.display = "none";
    explanationBox.innerHTML = "";
  }

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function disableOptions() {
    answerOptions.querySelectorAll(".answer-option").forEach((opt) => {
      opt.style.pointerEvents = "none";
      opt.classList.add("disabled");
    });
  }

  function highlightCorrect() {
    answerOptions.querySelectorAll(".answer-option").forEach((opt) => {
      if (opt.dataset.answer.trim() === currentQuestion.correctAnswer.trim()) {
        opt.classList.add("correct");
        if (!opt.querySelector("span"))
          opt.insertAdjacentHTML(
            "beforeend",
            `<span class="material-symbols-outlined">check_circle</span>`,
          );
      }
    });
    timerDisplay.classList.remove("timer-blink");
    timerDisplay.style.color = "white";
    confirmBtn.textContent = "Next";
  }

  function playCorrectSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.6);
    });
  }
  function playWrongSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    [330, 247, 196].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + 0.6);
    });
  }

  async function renderQuestion() {
    hideExplanation();
    selectedOption = null;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Check";
    isChecked = false;

    try {
      const res = await fetch("/api/quiz/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: quizCategory,
          askedIds: askedQuestions,
        }),
      });
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();

      if (data.finished || askedQuestions.length >= numberOfQuestions) {
        showScreen("RESULT");
        showResult();
        return;
      }

      currentQuestion = { ...data };
      if (data.originalIndex != null) askedQuestions.push(data.originalIndex);

      questionStatus.textContent = `${askedQuestions.length} / ${numberOfQuestions}`;
      questionText.textContent = currentQuestion.question;

      answerOptions.innerHTML = "";
      shuffleArray(currentQuestion.options).forEach((opt) => {
        const li = document.createElement("li");
        li.textContent = opt;
        li.dataset.answer = opt;
        li.classList.add("answer-option");
        answerOptions.appendChild(li);
      });

      isAnswered = false;
      resetTimer();
      startTimer();
      SoundManager.play("timer");
      isquestionrendered = true;
      enableOptions();
    } catch (err) {
      console.error("Error fetching question:", err);
      alert("Failed to load question. Check server.");
      isquestionrendered = false;
    }
  }

  answerOptions.addEventListener("click", (e) => {
    const li = e.target.closest(".answer-option");
    if (!li || li.classList.contains("disabled")) return;

    answerOptions.querySelector(".active")?.classList.remove("active");
    li.classList.add("active");
    selectedOption = li;
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Check";
    isChecked = false;
  });

  function disableRefresh() {
    document.documentElement.style.overscrollBehaviorY = "none";
  }

  function enableRefresh() {
    document.documentElement.style.overscrollBehaviorY = "auto";
  }

  const startQuiz = () => {
    disableRefresh();
    resetQuizState();
    showScreen("QUIZ");

    quizCategory = configContainer.querySelector(".category-option.active")?.id;
    numberOfQuestions = parseInt(
      document.querySelector(".question-option.active").innerText,
    );
    quizCategoryShowInQuizContainer.innerHTML = `Chapter: ${configContainer.querySelector(".category-option.active")?.innerText || "Unknown"}`;

    askedQuestions = [];
    correctCount = 0;
    renderQuestion();
  };

  function showResult() {
    enableRefresh();
    const percent = Math.round((correctCount / numberOfQuestions) * 100);
    openHistoryBtn.style.display = "inline-block";

    resultMessage.innerHTML = `You answered <b>${correctCount}</b> out of <b>${numberOfQuestions}</b>`;
    progressBar.style.width = `${percent}%`;

    let grade = "";
    if (percent >= 90) grade = "<b>A</b> Outstanding!";
    else if (percent >= 80) grade = "<b>B</b> Good!";
    else if (percent >= 70) grade = "<b>C</b> Fair!";
    else if (percent >= 60) grade = "<b>D</b> Needs practice!";
    else if (percent >= 40) grade = "<b>D</b> More practice needed!";
    else grade = "<b>F</b> Try again!";
    scoreMessage.innerHTML = `Grade: ${grade}`;
    tryAgainBtn.focus();

    saveQuizHistory(correctCount, numberOfQuestions);
  }

  function saveQuizHistory(score, total) {
    const history = JSON.parse(localStorage.getItem("quizHistory")) || [];
    const percent = Math.round((score / total) * 100);
    const today = new Date().toLocaleDateString();
    history.push({
      score,
      total,
      percent,
      category: document.getElementById(quizCategory)?.innerText,
      date: today,
    });
    localStorage.setItem("quizHistory", JSON.stringify(history));
  }

  function loadQuizHistory() {
    const history = JSON.parse(localStorage.getItem("quizHistory")) || [];
    historyList.innerHTML = "";

    if (!history.length) {
      historyList.innerHTML = `<tr><td colspan="6" style="text-align:center;">No history available</td></tr>`;
      return;
    }

    history.forEach((item, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td data-label="Attempt">${i + 1}</td>
        <td data-label="Date">${item.date}</td>
        <td data-label="Quiz Category">${item.category}</td>
        <td data-label="Score">${item.score}</td>
        <td data-label="Total Questions">${item.total}</td>
        <td data-label="Percentage">${item.percent}%</td>`;
      historyList.appendChild(row);
    });
  }

  function setupConfigOptions() {
    configContainer.querySelectorAll(".category-option").forEach((btn) =>
      btn.addEventListener("click", () => {
        configContainer
          .querySelector(".category-option.active")
          ?.classList.remove("active");
        btn.classList.add("active");
      }),
    );
    configContainer.querySelectorAll(".question-option").forEach((btn) =>
      btn.addEventListener("click", () => {
        configContainer
          .querySelector(".question-option.active")
          ?.classList.remove("active");
        btn.classList.add("active");
      }),
    );
  }

  setupConfigOptions();

  startBtn.addEventListener("click", () => showScreen("RULES"));
  continueBtn.addEventListener("click", () => showScreen("CONFIG"));
  exitRulesBtn.addEventListener("click", () => showScreen("START"));
  startQuizBtn.addEventListener("click", startQuiz);
  exitConfigBtn.addEventListener("click", () => showScreen("RULES"));
  tryAgainBtn.addEventListener("click", resetQuizState);
  quitResultBtn.addEventListener(
    "click",
    () => (location.href = "https://www.youtube.com"),
  );
  openHistoryBtn.addEventListener("click", () => {
    showScreen("HISTORY");
    loadQuizHistory();
  });
  closeHistoryBtn.addEventListener("click", () => showScreen("RESULT"));
  deleteHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem("quizHistory");
    loadQuizHistory();
  });

  confirmBtn.addEventListener("click", () => {
    if (!isChecked && !selectedOption) return;

    if (!isChecked) {
      const correct =
        selectedOption.dataset.answer.trim() ===
        currentQuestion.correctAnswer.trim();

      SoundManager.stopAll();
      clearInterval(timer);
      isAnswered = true;

      selectedOption.classList.add(correct ? "correct" : "incorrect");
      selectedOption.insertAdjacentHTML(
        "beforeend",
        `<span class="material-symbols-outlined">${
          correct ? "check_circle" : "cancel"
        }</span>`,
      );

      if (correct) {
        playCorrectSound();
        correctCount++;
        if (currentQuestion.whyCorrect) {
          explanationBox.style.display = "block";
          explanationBox.innerHTML = `<b>Why correct:</b><br>${currentQuestion.whyCorrect}`;
        }
      } else {
        highlightCorrect();
        playWrongSound();
        if (currentQuestion.whyCorrect) {
          explanationBox.style.display = "block";
          explanationBox.innerHTML = `<b>Why correct:</b><br>${currentQuestion.whyCorrect}`;
        }
      }

      disableOptions();
      confirmBtn.textContent = "Next";
      isChecked = true;
    } else {
      renderQuestion();
    }
  });

  function enableOptions() {
    answerOptions.querySelectorAll(".answer-option").forEach((opt) => {
      opt.style.pointerEvents = "auto";
      opt.classList.remove("disabled", "correct", "incorrect", "active");
    });
  }

  document.querySelectorAll(".back-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (SCREENS.RULES.style.display === "block") showScreen("START");
      else if (SCREENS.CONFIG.style.display === "block") showScreen("RULES");
      else if (SCREENS.RESULT.style.display === "block") showScreen("CONFIG");
      else if (SCREENS.HISTORY.style.display === "block") showScreen("RESULT");
    }),
  );
  function registerCheat(reason) {
    cheatCount++;
    SoundManager.play("wrong")
    alert(`⚠️ Warning ${cheatCount}/${MAX_CHEATS}\n${reason}`);
    if (cheatCount >= MAX_CHEATS) {
      clearInterval(timer);
      showScreen("RESULT");
      resultMessage.innerHTML =
        "<b>Quiz Ended</b><br>You violated the quiz rules.";
      scoreMessage.innerHTML = "Result: <b>Disqualified</b>";
      progressBar.style.width = "0%";
      saveQuizHistory(0, numberOfQuestions);
    }
  }

  document.addEventListener("contextmenu", (e) => {
    if (SCREENS.QUIZ.style.display === "block") {
      e.preventDefault();
      registerCheat("Right-click disabled");
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (
      document.hidden &&
      SCREENS.QUIZ.style.display === "block" &&
      isquestionrendered
    )
      registerCheat("Switched tab");
  });
  document.addEventListener("keydown", (e) => {
    if (SCREENS.QUIZ.style.display !== "block") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
      e.preventDefault();
      registerCheat("New tab not allowed");
    }
    if (e.ctrlKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      alert("Refresh not allowed");
    }
  });
});
