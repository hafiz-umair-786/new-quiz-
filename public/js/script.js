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
  const nextBtn = quizContainer.querySelector(".next-question-btn");
  const timerDisplay = quizContainer.querySelector(".time-duration");
  const questionStatus = quizContainer.querySelector(".question-status");
  const whyBtn = quizContainer.querySelector(".WhyButton");
  const explanationBox = quizContainer.querySelector(".explanation-box");

  const resultContainer = document.querySelector(".result-container");
  const resultMessage = resultContainer.querySelector(".result-message");
  const scoreMessage = resultContainer.querySelector(".score");
  const progressBar = resultContainer.querySelector(".result-progress-fill");
  const tryAgainBtn = resultContainer.querySelector(".try-again-btn");
  const quitResultBtn = resultContainer.querySelector(".quit-in-result");

  const historyContainer = document.querySelector(".history-container");
  const openHistoryBtn = resultContainer.querySelector(".open-history-btn");

  const historyList = historyContainer.querySelector(".history-list");
  const closeHistoryBtn = historyContainer.querySelector(".close-history-btn");
  const deleteHistoryBtn = historyContainer.querySelector(".delete-history");
  const quizCategoryShowInQuizContainer = document.querySelector(
    "#option-display-in-quiz",
  );

  const QUIZ_TIME_LIMIT = 15;
  const MAX_CHEATS = 3;

  const SoundManager = {
    sounds: {
      correct: new Audio("audio/correct-answer.mp3"),
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
        if (key !== except) {
          this.pause(key);
        }
      });
    },
  };

  let timer = null;
  let currentTime = QUIZ_TIME_LIMIT;
  let ticking = false;
  let currentQuestion = null;
  let quizCategory = null;
  let numberOfQuestions = 0;
  let correctCount = 0;
  let cheatCount = 0;
  let isAnswered = false;
  const askedQuestions = [];

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

      if (currentTime <= 0) {
        clearInterval(timer);
        ticking = false;
        handleTimeUp();
      }
    }, 1000);
  }

  function resetQuizState() {
    clearInterval(timer);
    SoundManager.stopAll();

    currentQuestion = null;
    quizCategory = null;
    numberOfQuestions = 0;
    correctCount = 0;
    cheatCount = 0;
    isAnswered = false;
    askedQuestions.length = 0;
    ticking = false;

    resetTimer();
    hideExplanation();
    showScreen("CONFIG");
    requestAnimationFrame(() => startQuizBtn.focus());
  }

  function hideExplanation() {
    whyBtn.style.display = "none";
    explanationBox.style.display = "none";
    explanationBox.innerHTML = "";
  }

  const handleTimeUp = () => {
    isAnswered = true;
    clearInterval(timer);
    highlightCorrect();
    disableOptions();
    nextBtn.disabled = false;
    if (currentQuestion.whyCorrect) {
      whyBtn.style.display = "inline-flex";
    }

    if (currentQuestion.whyCorrect) {
      explanationBox.style.display = "block";
      explanationBox.innerHTML = `<b>Why correct:</b><br>${currentQuestion.whyCorrect}`;
    }
    quizHeader.classList.remove("animate-border");
    timerDisplay.classList.remove("timer-blink");
    timerDisplay.style.color = "white";
  };

  const renderQuestion = async () => {
    hideExplanation();

    try {
      const response = await fetch("/api/quiz/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: quizCategory,
          askedIds: askedQuestions,
        }),
      });

      if (!response.ok) throw new Error("Network error");

      const data = await response.json();

      if (data.finished || askedQuestions.length >= numberOfQuestions) {
        showScreen("RESULT");
        showResult();
        return;
      }

      currentQuestion = { ...data };

      if (data.originalIndex != null) {
        askedQuestions.push(data.originalIndex);
      }

      questionStatus.innerHTML = `${askedQuestions.length} / ${numberOfQuestions}`;
      questionText.textContent = currentQuestion.question;

      answerOptions.innerHTML = "";

      const shuffledOptions = shuffleArray(currentQuestion.options);
      shuffledOptions.forEach((opt) => {
        const li = document.createElement("li");
        li.textContent = opt;
        li.dataset.answer = opt;
        li.classList.add("answer-option");

        li.addEventListener("click", () => {
          answerOptions.querySelector(".active")?.classList.remove("active");
          li.classList.add("active");
          handleAnswer(li);
        });

        answerOptions.appendChild(li);
      });

      isAnswered = false;
      nextBtn.disabled = true;

      resetTimer();
      startTimer();
      SoundManager.play("timer");
    } catch (err) {
      console.error("Error fetching next question:", err);
      alert("Failed to load question. Check your server.");
    }
  };

  function playCorrectSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.6);
    });
  }
  handleAnswer = (option) => {
    if (option.classList.contains("disabled") || isAnswered) return;
    const selectedAnswer = option.dataset.answer;
    const correct =
      selectedAnswer.trim() === currentQuestion.correctAnswer.trim();
    SoundManager.stopAll();
    clearInterval(timer);
    nextBtn.disabled = false;
    nextBtn.focus();

    isAnswered = true;
    option.insertAdjacentHTML(
      "beforeend",
      `<span class="material-symbols-outlined">${correct ? "check_circle" : "cancel"}</span>`,
    );

    option.classList.add(correct ? "correct" : "incorrect");
    if (correct) {
      playCorrectSound();
      correctCount++;
      disableOptions();
    } else {
      highlightCorrect();
      SoundManager.play("wrong");
      disableOptions();
    }
    if (currentQuestion.whyCorrect) {
      whyBtn.style.display = "inline-flex";
    }
  };
  const highlightCorrect = () => {
    SoundManager.stopAll();
    answerOptions.querySelectorAll(".answer-option").forEach((opt) => {
      if (opt.dataset.answer.trim() === currentQuestion.correctAnswer.trim()) {
        opt.classList.add("correct");
        opt.insertAdjacentHTML(
          "beforeend",
          `<span class="material-symbols-outlined">check_circle</span>`,
        );
      }
    });

    timerDisplay.classList.remove("timer-blink");
    timerDisplay.style.color = "white";
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const disableOptions = () => {
    answerOptions.querySelectorAll(".answer-option").forEach((opt) => {
      opt.style.pointerEvents = "none";
      opt.classList.add("disabled");
    });
  };
  const startQuiz = () => {
    disableRefresh();
    resetQuizState();
    showScreen("QUIZ");

    const activeCategoryBtn = configContainer.querySelector(
      ".category-option.active",
    );
    quizCategory = activeCategoryBtn?.id;

    numberOfQuestions = parseInt(
      document.querySelector(".question-option.active").innerText,
    );
    quizCategoryShowInQuizContainer.innerHTML = `Chapter: ${activeCategoryBtn?.innerText || "Unknown"}`;

    askedQuestions.length = 0;
    correctCount = 0;
    renderQuestion();
    continueBtn.focus();
  };

  const showResult = () => {
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
    else if (percent >= 40)
      grade = "<b>D</b> You need much more practice! Do not feel demotivated";
    else grade = "<b>F</b> Try again!";
    scoreMessage.innerHTML = `Grade: ${grade}`;
    requestAnimationFrame(() => {
      tryAgainBtn.focus();
    });
    saveQuizHistory(correctCount, numberOfQuestions);
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

  function showScreen(screenName) {
    Object.entries(SCREENS).forEach(([key, screen]) => {
      if (key === screenName) {
        screen.style.display = DISPLAY_TYPES[key];
        screen.classList.add("activeInfo");
      } else {
        screen.style.display = "none";
        screen.classList.remove("activeInfo");
      }
    });
  }
  function loadQuizHistory() {
    const history = JSON.parse(localStorage.getItem("quizHistory")) || [];
    historyList.innerHTML = "";

    if (history.length === 0) {
      historyList.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">No history available</td>
      </tr>`;
      return;
    }

    history.forEach((item, index) => {
      const row = document.createElement("tr");

      row.innerHTML = `
      <td data-label="Attempt">${index + 1}</td>
      <td data-label="Date">${item.date}</td>
      <td data-label="Quiz Category">${item.category}</td>
      <td data-label="Score">${item.score}</td>
      <td data-label="Total Questions">${item.total}</td>
      <td data-label="Percentage">${item.percent}%</td>
    `;
      historyList.appendChild(row);
    });
  }
  function saveQuizHistory(score, totalQuestions) {
    const history = JSON.parse(localStorage.getItem("quizHistory")) || [];
    const percent = Math.round((score / totalQuestions) * 100);
    const today_date = new Date().toLocaleDateString();

    history.push({
      score,
      total: totalQuestions,
      percent,
      category: document.getElementById(quizCategory).innerText,
      date: today_date,
    });

    localStorage.setItem("quizHistory", JSON.stringify(history));
  }

  const exitQuizAndRedirect = (url = "https://www.youtube.com") => {
    clearInterval(timer);
    location.href = url;
  };

  startBtn.addEventListener("click", () => {
    showScreen("RULES");
    requestAnimationFrame(() => continueBtn.focus());
  });
  continueBtn.addEventListener("click", () => {
    showScreen("CONFIG");
    startQuizBtn.focus();
  });
  exitRulesBtn.addEventListener("click", () => {
    showScreen("START");
    startBtn.focus();
  });
  startQuizBtn.addEventListener("click", () => {
    showScreen("QUIZ");
    startQuiz();
  });

  exitConfigBtn.addEventListener("click", () => {
    showScreen("RULES");
    startBtn.focus();
  });
  nextBtn.addEventListener("click", renderQuestion);

  whyBtn.addEventListener("click", () => {
    if (
      explanationBox.style.display === "none" ||
      explanationBox.style.display === ""
    ) {
      explanationBox.style.display = "block";
      explanationBox.innerHTML = `<b>Why correct:</b><br>${currentQuestion.whyCorrect}`;
    } else {
      hideExplanation();
    }
  });

  tryAgainBtn.addEventListener("click", resetQuizState);
  quitResultBtn.addEventListener("click", () =>
    exitQuizAndRedirect("https://www.youtube.com"),
  );
  openHistoryBtn.addEventListener("click", () => {
    showScreen("HISTORY");
    loadQuizHistory();
  });

  closeHistoryBtn.addEventListener("click", () => {
    showScreen("RESULT");
  });

  const setupConfigOptions = () => {
    const categoryContainer = document.querySelector(".category-options");
    categoryContainer.querySelectorAll(".category-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        categoryContainer.querySelector(".active")?.classList.remove("active");
        btn.classList.add("active");
      });
    });
    const questionContainer = document.querySelector(".question-options");
    questionContainer.querySelectorAll(".question-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        questionContainer.querySelector(".active")?.classList.remove("active");
        btn.classList.add("active");
      });
    });
  };

  function registerCheat(reason) {
    if (quizContainer.style.display !== "block") return;
    SoundManager.play("wrong");

    cheatCount++;
    showWarning(`⚠️ Warning ${cheatCount}/${MAX_CHEATS}\n${reason}`);

    if (cheatCount >= MAX_CHEATS) {
      endQuizForCheating();
    } else if (cheatCount === 1) {
      showWarning(
        "This is your first warning. Further violations will lead to disqualification.",
      );
    } else if (cheatCount === 2) {
      showWarning(
        "This is your second warning. One more violation will lead to disqualification.",
      );
    } else if (cheatCount === 3) {
      showWarning(
        "You have been disqualified from the quiz due to multiple violations.",
      );
    }
  }

  function endQuizForCheating() {
    clearInterval(timer);
    showScreen("RESULT");

    resultMessage.innerHTML =
      "<b>Quiz Ended</b><br>You violated the quiz rules.";
    scoreMessage.innerHTML = "Result: <b>Disqualified</b>";
    progressBar.style.width = "0%";

    tryAgainBtn.focus();
    saveQuizHistory(0, numberOfQuestions);
  }

  function showWarning(message) {
    alert(message);
  }

  let touchStart = 0;

  document.addEventListener(
    "touchstart",
    (e) => {
      touchStart = e.touches[0].pageY;
    },
    { passive: false },
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (quizContainer.style.display !== "block") return;
      const touchCurrent = e.touches[0].pageY;
      const isAtTop = window.scrollY === 0;

      if (isAtTop && touchCurrent > touchStart + 50) {
        e.preventDefault();
        SoundManager.play("wrong");
        alert("Refresh is disabled on this page!");

        touchStart = 999999;
      }
    },
    { passive: false },
  );

  setupConfigOptions();
  const getFocusableElements = () => {
    const elements = document.querySelectorAll(
      "button, [tabindex]:not([tabindex='-1']), .answer-option, .category-option, .question-option",
    );
    return Array.from(elements).filter(
      (el) => !el.disabled && el.offsetParent !== null,
    );
  };
  function disableRefresh() {
    document.documentElement.style.overscrollBehaviorY = "none";
  }

  function enableRefresh() {
    document.documentElement.style.overscrollBehaviorY = "auto";
  }
  function navigateFocusable(key) {
    const elements = getFocusableElements();
    if (!elements.length) return;
    const index = elements.indexOf(document.activeElement);
    if (key === "j") elements[(index + 1) % elements.length].focus();
    if (key === "k")
      elements[(index - 1 + elements.length) % elements.length].focus();
  }

  document.addEventListener("keydown", (e) => {
    if (quizContainer.style.display !== "block") return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
      e.preventDefault();
      registerCheat("Opening new tabs is not allowed.");
    }

    if (e.ctrlKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      disableRefresh();
      alert("Referesh is not allowed.");
    }

    const active = document.activeElement;

    navigateFocusable(e.key.toLowerCase());

    if (e.key !== "Enter") return;
    e.preventDefault();

    if (
      quizContainer.style.display === "block" &&
      active.classList.contains("answer-option")
    ) {
      try {
        SoundManager.pause("timer");
      } catch (err) {
        console.log("timerSound.pause() error:", err);
      }
      handleAnswer(active);
      return;
    }

    if (startBtn.parentNode.style.display !== "none") {
      startBtn.click();
      return;
    }

    if (rulesContainer.classList.contains("activeInfo")) {
      if (active === continueBtn) {
        continueBtn.click();
        return;
      }
      if (active === exitRulesBtn) {
        exitRulesBtn.click();
        return;
      }
    }
    if (getComputedStyle(resultContainer).display === "block") {
      if (active === startQuizBtn) {
        startQuizBtn.click();
        return;
      }

      if (active.classList.contains("category-option")) {
        active.click();
        return;
      }

      if (active.classList.contains("question-option")) {
        active.click();
        return;
      }
    }

    if (
      resultContainer.style.display === "block" &&
      (active === tryAgainBtn || active === quitResultBtn)
    ) {
      active.click();
      return;
    }
    if (active.tagName === "BUTTON" && !active.disabled) {
      active.click();
    }
  });

  deleteHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem("quizHistory");
    loadQuizHistory();
    closeHistoryBtn.focus();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".close-history-btn");
    if (!btn) return;
    showScreen("RESULT");
    tryAgainBtn.focus();
  });

  document.addEventListener("contextmenu", (e) => {
    if (quizContainer.style.display === "block") {
      e.preventDefault();
      registerCheat("Right-click is disabled during the quiz.");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (
      document.hidden &&
      quizContainer.style.display === "block" &&
      !isAnswered
    ) {
      registerCheat("You switched tabs during the quiz.");
    }
  });

  document.addEventListener("click", (e) => {
    if (quizContainer.style.display !== "block") return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      showWarning("Opening links in new tabs is disabled during the quiz.");
      registerCheat("Attempted to open a link in a new tab.");
    }
  });

  const backButtons = document.querySelectorAll(".back-btn");
  backButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (SCREENS.RULES.style.display === "block") {
        showScreen("START");
        startBtn.focus();
      } else if (SCREENS.CONFIG.style.display === "block") {
        showScreen("RULES");
        continueBtn.focus();
      } else if (SCREENS.RESULT.style.display === "block") {
        showScreen("CONFIG");
        startQuizBtn.focus();
      } else if (SCREENS.HISTORY.style.display === "block") {
        showScreen("RESULT");
        tryAgainBtn.focus();
      }
    });
  });
});
