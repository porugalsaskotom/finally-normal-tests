const app = document.getElementById("app");
let activeTest = null;
let currentQuestion = 0;
let selectedAnswers = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderCatalog() {
  activeTest = null;
  const tests = Array.isArray(window.TESTS) ? window.TESTS : [];
  app.innerHTML = `
    <p class="eyebrow">Коллекция</p>
    <h1>Найдите свой тест.</h1>
    <p class="lead">Небольшие опросы и тесты. Выберите интересующий вас и узнайте результат в конце.</p>
    <section class="test-list" aria-label="Доступные тесты">
      ${tests.length ? tests.map(test => `
        <article class="test-card">
          <div>
            <h2>${escapeHtml(test.title)}</h2>
            <p>${escapeHtml(test.description)}</p>
            <div class="meta">${test.questions.length} вопросов · ${escapeHtml(test.duration || "Время не указано")}</div>
          </div>
          <button class="button" data-start="${escapeHtml(test.id)}">Начать тест</button>
        </article>
      `).join("") : '<div class="empty-state">Пока нет опубликованных тестов.</div>'}
    </section>
  `;
  app.querySelectorAll("[data-start]").forEach(button => {
    button.addEventListener("click", () => startTest(button.dataset.start));
  });
}

function startTest(id) {
  activeTest = window.TESTS.find(test => test.id === id);
  if (!activeTest || !activeTest.questions?.length) return renderCatalog();
  currentQuestion = 0;
  selectedAnswers = Array(activeTest.questions.length).fill(null);
  renderQuestion();
}

function renderQuestion() {
  const question = activeTest.questions[currentQuestion];
  const total = activeTest.questions.length;
  const selected = selectedAnswers[currentQuestion];
  const progress = Math.round(((currentQuestion + 1) / total) * 100);

  app.innerHTML = `
    <button class="back-link" id="exit-test">← Все тесты</button>
    <section class="quiz-panel">
      <div class="progress-row"><span>Вопрос ${currentQuestion + 1} из ${total}</span><span>${progress}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <p class="eyebrow">${escapeHtml(activeTest.title)}</p>
      <h1 class="question">${escapeHtml(question.text)}</h1>
      <div class="answers">
        ${question.answers.map((answer, index) => `
          <button class="answer ${selected === index ? "selected" : ""}" data-answer="${index}" aria-pressed="${selected === index}">
            <span class="answer-dot"></span><span>${escapeHtml(answer.text)}</span>
          </button>
        `).join("")}
      </div>
      <div class="quiz-actions">
        <button class="button secondary" id="previous" ${currentQuestion === 0 ? "disabled" : ""}>Назад</button>
        <button class="button" id="next" ${selected === null ? "disabled" : ""}>${currentQuestion === total - 1 ? "Узнать результат" : "Далее"}</button>
      </div>
    </section>
  `;

  document.getElementById("exit-test").addEventListener("click", renderCatalog);
  app.querySelectorAll("[data-answer]").forEach(button => {
    button.addEventListener("click", () => {
      selectedAnswers[currentQuestion] = Number(button.dataset.answer);
      renderQuestion();
    });
  });
  document.getElementById("previous").addEventListener("click", () => {
    if (currentQuestion > 0) { currentQuestion--; renderQuestion(); }
  });
  document.getElementById("next").addEventListener("click", () => {
    if (selectedAnswers[currentQuestion] === null) return;
    if (currentQuestion < total - 1) { currentQuestion++; renderQuestion(); }
    else renderResult();
  });
}

function calculateResult() {
  const scoring = activeTest.scoring || { type: "sum", results: [] };

  if (scoring.type === "categories") {
    const totals = {};
    activeTest.questions.forEach((question, questionIndex) => {
      const answer = question.answers[selectedAnswers[questionIndex]];
      (answer.scores || []).forEach(item => {
        totals[item.category] = (totals[item.category] || 0) + Number(item.points || 0);
      });
    });
    const winner = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    const result = scoring.results.find(item => item.category === winner?.[0]);
    return { result, score: winner ? winner[1] : 0, label: winner?.[0] || "" };
  }

  const score = activeTest.questions.reduce((sum, question, index) => {
    return sum + Number(question.answers[selectedAnswers[index]].score || 0);
  }, 0);
  const result = scoring.results.find(item => score >= item.min && score <= item.max);
  return { result, score };
}

function renderResult() {
  const outcome = calculateResult();
  const result = outcome.result;

  app.innerHTML = `
    <button class="back-link" id="home">← Все тесты</button>
    <section class="result-panel">
      <p class="eyebrow">Тест завершён</p>
      <h1>${escapeHtml(result?.title || "Результат не определён")}</h1>
      <p class="result-score">${outcome.score} баллов${outcome.label ? " · " + escapeHtml(outcome.label) : ""}</p>
      <p class="result-description">${escapeHtml(result?.description || "Для этого результата пока не добавлено описание.")}</p>
      <div class="result-actions">
        <button class="button" id="retry">Пройти ещё раз</button>
        <button class="button secondary" id="share">Поделиться результатом</button>
      </div>
    </section>
  `;

  document.getElementById("home").addEventListener("click", renderCatalog);
  document.getElementById("retry").addEventListener("click", () => startTest(activeTest.id));
  document.getElementById("share").addEventListener("click", async () => {
    const shareData = { title: activeTest.title, text: result?.title || "Мой результат", url: location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.text + " — " + shareData.url);
        document.getElementById("share").textContent = "Ссылка скопирована";
      }
    } catch (error) {
      // Пользователь мог закрыть системное окно отправки — это не ошибка теста.
    }
  });
}

renderCatalog();
