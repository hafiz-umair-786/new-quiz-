document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.querySelector(".start-btn button");
  const infoBox = document.querySelector(".info-box");
  const exitRulesBtn = infoBox.querySelector(".quit-in-rules");
  const continueBtn = infoBox.querySelector(".restart");

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
  const correctSound = new Audio("audio/correct-answer.mp3");
  const alertSound = new Audio("audio/alert.mp3");
  const timerSound = new Audio("audio/timer.mp3");
  const wrongSound = new Audio(
    "https://cdn.pixabay.com/download/audio/2022/02/11/audio_7f0bf4cdc0.mp3?filename=eritnhut1992-buzzer-or-wrong-answer-20582.mp3",
  );
  alertSound.loop = true;
  timerSound.loop = true;
  correctSound.loop = true;

  
  alertSound.volume = 0.5;
  timerSound.volume = 0.5;
  wrongSound.volume = 0.5;

  let timer = null;
  let currentTime = QUIZ_TIME_LIMIT;
  let currentQuestion = null;
  let quizCategory = null;
  let isAnswered = false;
  let numberOfQuestions = 0;
  let correctCount = 0;
  const askedQuestions = [];
  let cheatCount = 0;
  tickingStarted = false;

  const resetTimer = () => {
    clearInterval(timer);
    currentTime = QUIZ_TIME_LIMIT;
    timerDisplay.textContent = `${currentTime}s`;
    timerDisplay.classList.remove("timer-blink");
    timerDisplay.style.color = "white";
  };
  const startTimer = () => {
    resetTimer();
    timer = setInterval(() => {
      currentTime--;
      timerDisplay.textContent = `${currentTime}s`;
      checkTime(currentTime);
      if (currentTime <= 5) {
        timerDisplay.classList.add("timer-blink");
        timerDisplay.style.color = "red";
      }
      if (currentTime <= 0) {
        clearInterval(timer);
        if (!isAnswered) handleTimeUp();
      }
    }, 1000);
  };
  const handleTimeUp = () => {
    isAnswered = true;
    clearInterval(timer);
    highlightCorrect();
    disableOptions();
    nextBtn.disabled = false;
    whyBtn.disabled = !currentQuestion.whyCorrect;
    if (currentQuestion.whyCorrect) {
      explanationBox.style.display = "block";
      explanationBox.innerHTML = `<b>Why correct:</b><br>${currentQuestion.whyCorrect}`;
    }
    quizHeader.classList.remove("animate-border");
    timerDisplay.classList.remove("timer-blink");
    timerDisplay.style.color = "white";
  };
  function checkTime(t) {
    tickingStarted = false;

    if (t <= 15 && t > 5 && !tickingStarted) {
      tickingStarted = true;
      timerSound.currentTime = 0;
      timerSound.play().catch(() => {});
    }

    if (t <= 5 && t > 0) {
      timerSound.pause();
      alertSound.play().catch(() => {});
    }

    if (t === 0) {
      tickingStarted = false;
      alertSound.pause();
    }
  }
  const renderQuestion = async () => {
    

    try {
      const response = await fetch("/api/quiz/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: quizCategory,
          askedIds: askedQuestions,
        }),
      });

      const data = await response.json();

      // Check if quiz finished
      if (data.finished || askedQuestions.length >= numberOfQuestions) {
        showScreen("RESULT");
        showResult();
        return;
      }

      currentQuestion = { ...data };

      // Track asked questions to avoid repetition
      if (data.originalIndex != null) {
        askedQuestions.push(data.originalIndex);
      }
      questionStatus.innerHTML = `${askedQuestions.length} / ${numberOfQuestions}`;

      // ---- UI RENDERING ----
      questionText.textContent = currentQuestion.question;

      // Clear previous options
      answerOptions.innerHTML = "";

      // Shuffle options and render
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

      // Hide explanation box for new question
      explanationBox.style.display = "none";

      // Reset flags
      isAnswered = false;
      nextBtn.disabled = true;

      // Enable Why button only if explanation exists

      whyBtn.disabled = true;

      // Reset and start timer
      resetTimer();
      startTimer();
    } catch (err) {
      console.error("Error fetching next question:", err);
    }
  };

  const handleAnswer = (option) => {
    if (option.classList.contains("disabled") || isAnswered) return;

    const selectedAnswer = option.dataset.answer;
    const correct = selectedAnswer === currentQuestion.correctAnswer;

    try {
      timerSound.pause();
      alertSound.pause();
    } catch (err) {
      console.log("timerSound.pause() error:", err);
    }
    clearInterval(timer);
    nextBtn.focus();
    nextBtn.disabled = false;
    whyBtn.disabled = false;
    isAnswered = true;
    quizHeader.classList.remove("animate-border");
    option.insertAdjacentHTML(
      "beforeend",
      `<span class="material-symbols-outlined">${
        correct ? "check_circle" : "cancel"
      }</span>`,
    );

    option.classList.add(correct ? "correct" : "incorrect");

    if (correct) {
      // play correct sound
      correctSound.play().catch((error) => {
        console.log("Correct sound autoplay blocked.");
      });
      correctCount++;
      disableOptions();
    } else if (!correct) {
      // play wrong sound
      wrongSound.play().catch((error) => {
        console.log("Wrong sound autoplay blocked.");
      });
      highlightCorrect();
      disableOptions();
      return;
    }
  };
  const highlightCorrect = () => {
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
    askedQuestions.length = 0;
    cheatCount = 0;
    showScreen("QUIZ");

    const activeCategoryBtn = configContainer.querySelector(
      ".category-option.active",
    );
    quizCategory = activeCategoryBtn?.id; // <-- set quizCategor

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
    const percent = Math.round((correctCount / numberOfQuestions) * 100);
    openHistoryBtn.style.display = "inline-block";

    resultMessage.innerHTML = `You answered <b>${correctCount}</b> out of <b>${numberOfQuestions}</b>`;
    progressBar.style.width = `${percent}%`;

    let grade = "";
    if (percent >= 90) grade = "<b>A</b> Outstanding!";
    else if (percent >= 80) grade = "<b>B</b> Good!";
    else if (percent >= 70) grade = "<b>C</b> Fair!";
    else if (percent >= 60) grade = "<b>D</b> Needs practice!";
    else grade = "<b>F</b> Try again!";
    scoreMessage.innerHTML = `Grade: ${grade}`;
    requestAnimationFrame(() => {
      tryAgainBtn.focus();
    });
    saveQuizHistory(correctCount, numberOfQuestions);
  };
  const resetQuiz = () => {
    showScreen("CONFIG");
    correctCount = 0;
    askedQuestions.length = 0;
    requestAnimationFrame(() => {
      startQuizBtn.focus();
    });
  };
  const SCREENS = {
    START: startBtn.parentNode,
    RULES: infoBox,
    CONFIG: configContainer,
    QUIZ: quizContainer,
    RESULT: resultContainer,
    HISTORY: historyContainer,
  };

  function showScreen(screenName) {
    Object.values(SCREENS).forEach((screen) => {
      if (screen === SCREENS[screenName]) {
        screen.style.display = "block";
        if (screen.classList.contains("activeInfo")) {
          screen.classList.add("activeInfo"); // keep rules active
        }
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
      </tr>
`;
      return;
    }

    history.forEach((item, index) => {
      const row = document.createElement("tr");

      row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.date}</td>
      <td>${item.category}</td>
      <td>${item.score}</td>
      <td>${item.total}</td>
      <td>${item.percent}%</td>
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
  const exitQuizAndRedirect = (url = "https://www.youtube.com/") => {
    clearInterval(timer);

    location.href = url;
  };
  // ==== Event listeners ====
  startBtn.addEventListener("click", () => {
    showScreen("RULES"); // show the rules screen only
    requestAnimationFrame(() => continueBtn.focus()); // focus the "Continue" button
  });
  continueBtn.addEventListener("click", () => {
    showScreen("CONFIG"); // hide rules, show config
    startQuizBtn.focus(); // focus the "Start Quiz" button
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
    if (!currentQuestion?.whyCorrect) return;

    if (explanationBox.style.display === "block") {
      explanationBox.style.display = "none";
    } else {
      explanationBox.innerHTML = `<b>Why correct:</b><br>${currentQuestion.whyCorrect}`;
      explanationBox.style.display = "block";
    }
  });

  tryAgainBtn.addEventListener("click", resetQuiz);
  quitResultBtn.addEventListener("click", () =>
    exitQuizAndRedirect("https://www.youtube.com/"),
  );
  openHistoryBtn.addEventListener("click", () => {
    showScreen("HISTORY");
    loadQuizHistory();
  });

  closeHistoryBtn.addEventListener("click", () => {
    showScreen("RESULT");
  });

  // ==== Config options setup ====
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

  // code for cheat detection and handling
  function registerCheat(reason) {
    if (quizContainer.style.display !== "block") return;

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
  }
  function showWarning(message) {
    alert(message); // later you can replace with toast
  }

  setupConfigOptions();
  // Get all focusable elements on the page dynamically
  const getFocusableElements = () => {
    const elements = document.querySelectorAll(
      "button, [tabindex]:not([tabindex='-1']), .answer-option, .category-option, .question-option",
    );
    return Array.from(elements).filter(
      (el) => !el.disabled && el.offsetParent !== null,
    );
  };

  document.addEventListener("keydown", (e) => {
    if (quizContainer.style.display !== "block") return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
      e.preventDefault();
      registerCheat("Opening new tabs is not allowed.");
    }
    const active = document.activeElement;

    // ---- K/J navigation ----
    if (e.key.toLowerCase() === "k" || e.key.toLowerCase() === "j") {
      e.preventDefault();
      const focusable = getFocusableElements();
      if (!focusable.length) return;
      const index = focusable.indexOf(active);
      focusable[(index + 1) % focusable.length].focus();
      return;
    }

    // ---- Enter key ----
    if (e.key !== "Enter") return;
    e.preventDefault();

    // Quiz answers
    if (
      quizContainer.style.display === "block" &&
      active.classList.contains("answer-option")
    ) {
      try {
        timerSound.pause();
      } catch (err) {
        console.log("timerSound.pause() error:", err);
      }
      handleAnswer(active);
      return;
    }

    // Start screen
    if (startBtn.parentNode.style.display !== "none") {
      startBtn.click();
      return;
    }

    // Info box
    if (infoBox.classList.contains("activeInfo")) {
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
      // If Start Quiz button is focused → start quiz
      if (active === startQuizBtn) {
        startQuizBtn.click();
        return;
      }

      // If category option is focused → activate it
      if (active.classList.contains("category-option")) {
        active.click();
        return;
      }

      // If question option is focused → activate it
      if (active.classList.contains("question-option")) {
        active.click();
        return;
      }
    }

    // Result screen
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
    if (document.hidden && quizContainer.style.display === "block") {
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


