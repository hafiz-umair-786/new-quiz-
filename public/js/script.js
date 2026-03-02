document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.querySelector(".start-first");
  const rulesContainer = document.querySelector(".rules-container");
  const exitRulesBtn = rulesContainer.querySelector(".quit-in-rules");
  const continueBtn = rulesContainer.querySelector(".restart");
  const configContainer = document.querySelector(".config-container");
  const exitConfigBtn = configContainer.querySelector(".quit-in-config");
  const startQuizBtn = configContainer.querySelector(".start-quiz-btn");
  const quizContainer = document.querySelector(".quiz-container");
  // const quizHeader = quizContainer.querySelector(".quiz-header");
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
  const resultPageContainer = document.querySelector(".result-container");
  const QUIZ_TIME_LIMIT = 15;
  const MAX_CHEATS = 3;
  let currentQuestion = null;
  let quizCategory = null;
  let numberOfQuestions = 0;
  let correctCount = 0;
  let cheatCount = 0;
  let askedQuestionIndex = [];
  let timer = null;
  let currentTime = QUIZ_TIME_LIMIT;
  let ticking = false;
  let isquestionrendered = false;
  let selectedAnswersByUser = [];
  let questions = [];
  const SCREENS = {
    START: startBtn.parentNode,
    RULES: rulesContainer,
    CONFIG: configContainer,
    QUIZ: quizContainer,
    RESULT_PAGE: resultPageContainer,
    RESULT: resultContainer,
    HISTORY: historyContainer,
  };
  const DISPLAY_TYPES = {
    START: "flex",
    RULES: "block",
    CONFIG: "block",
    QUIZ: "block",
    RESULT: "block",
    RESULT_PAGE: "block",
    HISTORY: "block",
  };
  const SoundManager = {
    sounds: {
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
    if (!isquestionrendered) return;
    clearInterval(timer);
    ticking = false;
    disableOptions();
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Submit";
    SoundManager.stopAll();
    selectedAnswersByUser.push(null);
    renderQuestion();
  };
  function resetQuizState() {
    currentQuestion = null;
    quizCategory = null;
    numberOfQuestions = 0;
    correctCount = 0;
    cheatCount = 0;
    selectedAnswersByUser = [];
    askedQuestionIndex = [];
    ticking = false;
    SoundManager.stopAll();
    startQuizBtn.focus();
    clearInterval(timer);
    resetTimer();
    hideExplanation();
    showScreen("CONFIG");
    SoundManager.stopAll();
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
  function enableOptions() {
    answerOptions.querySelectorAll(".answer-option").forEach((opt) => {
      opt.style.pointerEvents = "auto";
      opt.classList.remove("disabled", "correct", "incorrect", "active");
    });
  }
  function disableOptions() {
    answerOptions.querySelectorAll(".answer-option").forEach((opt) => {
      opt.style.pointerEvents = "none";
      opt.classList.add("disabled");
    });
  }
  async function renderQuestion() {
    hideExplanation();
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Submit";
    try {
      const res = await fetch("/api/quiz/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: quizCategory,
          askedIds: askedQuestionIndex,
        }),
      });
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      if (data.finished || askedQuestionIndex.length >= numberOfQuestions) {
        showScreen("RESULT");
        showResult();
        return;
      }
      questions.push(data);
      currentQuestion = { ...data };
      if (data.originalIndex != null)
        askedQuestionIndex.push(data.originalIndex);
      questionStatus.textContent = `${askedQuestionIndex.length} / ${numberOfQuestions}`;
      questionText.textContent = currentQuestion.question;
      answerOptions.innerHTML = "";
      shuffleArray(currentQuestion.options).forEach((opt) => {
        const li = document.createElement("li");
        li.textContent = opt;
        li.dataset.answer = opt;
        li.classList.add("answer-option");
        answerOptions.appendChild(li);
      });
      resetTimer();
      startTimer();
      SoundManager.play("timer");
      isquestionrendered = true;
      enableOptions();
    } catch (err) {
      alert("Failed to load question. Check server.");
      isquestionrendered = false;
    }
  }
  function resetOptions() {
    const options = answerOptions.querySelectorAll(".answer-option");
    options.forEach((option) => {
      option.classList.remove("active", "disabled", "correct", "wrong");
    });
    confirmBtn.disabled = true;
  }
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
    askedQuestionIndex = [];
    correctCount = 0;
    renderQuestion();
  };
  function showResult() {
    SoundManager.stopAll();
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
    else if (percent >= 40) grade = "<b>E</b> More practice needed!";
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
  function registerCheat(reason) {
    cheatCount++;
    alert(`⚠️ Warning ${cheatCount}/${MAX_CHEATS}\n${reason}`);
    if (cheatCount >= MAX_CHEATS) {
      clearInterval(timer);
      showScreen("RESULT");
      resultMessage.innerHTML =
        "<b>Quiz Ended</b><br>You violated the quiz rules.";
      scoreMessage.innerHTML = "Result: <b>Disqualified</b>";
      progressBar.style.width = "0%";
      saveQuizHistory(0, numberOfQuestions);
      SoundManager.stopAll();
      return;
    }
    handleTimeUp();
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
  startQuizBtn.addEventListener("click", startQuiz);
  startBtn.addEventListener("click", () => showScreen("RULES"));
  continueBtn.addEventListener("click", () => showScreen("CONFIG"));
  exitRulesBtn.addEventListener("click", () => showScreen("START"));
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
  answerOptions.addEventListener("click", (e) => {
    const li = e.target.closest(".answer-option");
    if (!li || li.classList.contains("disabled")) return;
    answerOptions
      .querySelectorAll(".answer-option")
      .forEach((opt) => opt.classList.remove("active"));
    li.classList.add("active");
    confirmBtn.disabled = false;
  });
  confirmBtn.addEventListener("click", () => {
    const activeOption = answerOptions.querySelector(".answer-option.active");
    if (!activeOption) return;
    const selectedOptionText = activeOption.textContent.trim();
    selectedAnswersByUser.push(selectedOptionText);
    if (selectedOptionText === currentQuestion.correctAnswer) {
      correctCount++;
    }
    clearInterval(timer);
    renderQuestion();
  });
  document.querySelectorAll(".back-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (SCREENS.RULES.style.display === "block") showScreen("START");
      else if (SCREENS.CONFIG.style.display === "block") showScreen("RULES");
      else if (SCREENS.RESULT_PAGE.style.display === "block")
        showScreen("CONFIG");
      else if (SCREENS.RESULT.style.display === "block") showScreen("CONFIG");
      else if (SCREENS.HISTORY.style.display === "block") showScreen("RESULT");
    }),
  );
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
