const app = document.getElementById("app");
let tests = [];
let activeTest = null;
let currentQuestion = 0;
let selectedAnswers = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function assetUrl(path, test = activeTest) {
  if (!path) return "";
  const base = test?._basePath || "";
  return new URL(base + path, document.baseURI).href;
}

function applyPageBackground(path, test = activeTest) {
  document.body.style.backgroundImage = path
    ? `linear-gradient(rgba(243,240,231,.28), rgba(243,240,231,.28)), url("${assetUrl(path, test)}")`
    : "";
}

function renderCatalog() {
  activeTest = null;
  const published = tests.filter(test => test.published === true);
  applyPageBackground("");
  app.innerHTML = `
    <section class="test-list" aria-label="доступные тесты">
      ${published.length ? published.map(test => `
        <article class="test-card" ${test.assets?.card_background ? 'style="background-image:url(\'' + escapeHtml(assetUrl(test.assets.card_background, test)) + '\')"' : ""}>
          <div class="test-card-content">
            <h2>${escapeHtml(test.title)}</h2>
            <p>${escapeHtml(test.description)}</p>
            <div class="meta">${test.questions.length} вопросов · ${escapeHtml(test.duration || "время не указано")}</div>
          </div>
          <button class="button" data-start="${escapeHtml(test.id)}">начать тест</button>
        </article>
      `).join("") : '<div class="empty-state">пока нет опубликованных тестов</div>'}
    </section>
  `;
  app.querySelectorAll("[data-start]").forEach(button => {
    button.addEventListener("click", () => startTest(button.dataset.start));
  });
}

function startTest(id) {
  activeTest = tests.find(test => test.id === id);
  if (!activeTest || !activeTest.questions?.length) return renderCatalog();
  currentQuestion = 0;
  selectedAnswers = activeTest.questions.map(q => q.type === "multiple_choice" ? [] : null);
  applyPageBackground(activeTest.assets?.background);
  renderQuestion();
}

function renderQuestion() {
  const question = activeTest.questions[currentQuestion];
  const total = activeTest.questions.length;
  const selected = selectedAnswers[currentQuestion];
  const multiple = question.type === "multiple_choice";
  const valid = multiple ? selected.length >= (question.min_select ?? 1) : selected !== null;
  const progress = Math.round(((currentQuestion + 1) / total) * 100);
  const coverStyle = activeTest.assets?.cover
    ? `style="background-image:linear-gradient(rgba(35,40,33,.34),rgba(35,40,33,.34)),url('${escapeHtml(assetUrl(activeTest.assets.cover))}')"`
    : "";

  app.innerHTML = `
    <button class="back-link" id="exit-test">← все тесты</button>
    <section class="quiz-panel" ${coverStyle}>
      <div class="quiz-panel-content">
        <div class="progress-row"><span>вопрос ${currentQuestion + 1} из ${total}</span><span>${progress}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        <p class="eyebrow">${escapeHtml(activeTest.title)}</p>
        <h1 class="question">${escapeHtml(question.text)}</h1>
        ${multiple ? '<p class="question-hint">можно выбрать несколько вариантов</p>' : ""}
        <div class="answers">
          ${question.answers.map((answer, index) => `
            <button class="answer ${(multiple ? selected.includes(index) : selected === index) ? "selected" : ""}" data-answer="${index}" aria-pressed="${multiple ? selected.includes(index) : selected === index}">
              <span class="answer-dot"></span><span>${escapeHtml(answer.text)}</span>
            </button>
          `).join("")}
        </div>
        <div class="quiz-actions">
          <button class="button secondary" id="previous" ${currentQuestion === 0 ? "disabled" : ""}>назад</button>
          <button class="button" id="next" ${!valid ? "disabled" : ""}>${currentQuestion === total - 1 ? "узнать результат" : "далее"}</button>
        </div>
      </div>
    </section>
  `;

  document.getElementById("exit-test").addEventListener("click", renderCatalog);
  app.querySelectorAll("[data-answer]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.answer);
      if (multiple) {
        const next = [...selected]; const at = next.indexOf(index);
        if (at >= 0) next.splice(at, 1);
        else if (next.length < (question.max_select ?? question.answers.length)) next.push(index);
        selectedAnswers[currentQuestion] = next;
      } else selectedAnswers[currentQuestion] = index;
      renderQuestion();
    });
  });
  document.getElementById("previous").addEventListener("click", () => {
    if (currentQuestion > 0) { currentQuestion--; renderQuestion(); }
  });
  document.getElementById("next").addEventListener("click", () => {
    if (multiple ? selectedAnswers[currentQuestion].length < (question.min_select ?? 1) : selectedAnswers[currentQuestion] === null) return;
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

function calculateMultiScaleResult() {
  const scales = activeTest.scales || [];
  const details = activeTest.questions.map((question, i) => {
    const choice = selectedAnswers[i];
    const indices = Array.isArray(choice) ? choice : [choice];
    const answers = indices.filter(Number.isInteger).map(index => question.answers[index]);
    const method = question.aggregation || activeTest.scoring?.multi_select_aggregation || "average";
    const scores = {};
    scales.forEach(scale => {
      const values = answers.map(answer => Number(answer.scores?.[scale.id] ?? 0));
      scores[scale.id] = !values.length ? 0 : method === "sum" ? values.reduce((a,b) => a+b,0) : method === "max" ? Math.max(...values) : method === "min" ? Math.min(...values) : values.reduce((a,b) => a+b,0) / values.length;
    });
    return {question, answers, method, scores};
  });
  const profile = {};
  scales.forEach(scale => {
    let earned = 0, possible = 0;
    details.forEach(d => {
      earned += d.scores[scale.id] || 0;
      const values = d.question.answers.map(a => Number(a.scores?.[scale.id] ?? 0));
      possible += d.question.type === "multiple_choice" && d.method === "sum" ? values.reduce((sum,v) => sum + Math.max(0,v),0) : Math.max(0,...values);
    });
    profile[scale.id] = {raw:earned, possible, percent:possible ? Math.round(earned / possible * 100) : 0};
  });
  const topScale = [...scales].sort((a,b) => profile[b.id].percent - profile[a.id].percent)[0];
  return {scales, details, profile, topScale};
}
function renderDeveloperReport(outcome) {
  if (!activeTest.dev_tools?.enabled) return "";
  return '<section class="dev-report"><h2>developer tools</h2><p class="dev-note">отладочный отчёт - выбранные ответы и баллы по шкалам</p>' +
    outcome.details.map((d,i) => '<div class="dev-question"><strong>' + (i+1) + '. ' + escapeHtml(d.question.text) + '</strong><span class="dev-method">' + escapeHtml(d.method) + '</span>' +
      d.answers.map(a => '<div class="dev-answer"><span>' + escapeHtml(a.text) + '</span><span>' + Object.entries(a.scores || {}).map(([id,v]) => escapeHtml(id) + ': ' + Number(v).toFixed(2)).join(" · ") + '</span></div>').join("") +
      '<div class="dev-total">баллы за вопрос: ' + Object.entries(d.scores).map(([id,v]) => escapeHtml(id) + ': ' + v.toFixed(2)).join(" · ") + '</div></div>').join("") +
    '<h3>итоговые значения</h3>' + outcome.scales.map(scale => '<div class="dev-scale-row"><span>' + escapeHtml(scale.title) + '</span><strong>' + outcome.profile[scale.id].raw.toFixed(2) + ' / ' + outcome.profile[scale.id].possible.toFixed(2) + ' · ' + outcome.profile[scale.id].percent + '%</strong></div>').join("") + '</section>';
}

function renderResult() {
  if (activeTest.scales?.length) {
    const out = calculateMultiScaleResult();
    app.innerHTML = '<button class="back-link" id="home">← все тесты</button><section class="result-panel"><p class="eyebrow">тест завершён</p><h1>' + escapeHtml(out.topScale?.title || "твой профиль") + '</h1><p class="result-description">наиболее выраженное направление по ответам</p><div class="scale-results">' + out.scales.map(scale => '<div class="scale-result"><div class="scale-result-heading"><strong>' + escapeHtml(scale.title) + '</strong><span>' + out.profile[scale.id].percent + '%</span></div><div class="progress-track"><div class="progress-fill" style="width:' + out.profile[scale.id].percent + '%"></div></div><p>' + escapeHtml(scale.description || "") + '</p></div>').join("") + '</div>' + renderDeveloperReport(out) + '<div class="result-actions"><button class="button" id="retry">пройти ещё раз</button></div></section>';
    document.getElementById("home").addEventListener("click", renderCatalog);
    document.getElementById("retry").addEventListener("click", () => startTest(activeTest.id));
    return;
  }
  const outcome = calculateResult();
  const result = outcome.result;
  app.innerHTML = `
    <button class="back-link" id="home">← все тесты</button>
    <section class="result-panel">
      <p class="eyebrow">тест завершён</p>
      <h1>${escapeHtml(result?.title || "результат не определён")}</h1>
      <p class="result-score">${outcome.score} баллов${outcome.label ? " · " + escapeHtml(outcome.label) : ""}</p>
      <p class="result-description">${escapeHtml(result?.description || "для этого результата пока не добавлено описание")}</p>
      <div class="result-actions">
        <button class="button" id="retry">пройти ещё раз</button>
        <button class="button secondary" id="share">поделиться результатом</button>
      </div>
    </section>
  `;
  document.getElementById("home").addEventListener("click", renderCatalog);
  document.getElementById("retry").addEventListener("click", () => startTest(activeTest.id));
  document.getElementById("share").addEventListener("click", async () => {
    const shareData = { title: activeTest.title, text: result?.title || "мой результат", url: location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.text + " - " + shareData.url);
        document.getElementById("share").textContent = "ссылка скопирована";
      }
    } catch (error) {
      // share sheet can be dismissed without affecting the test
    }
  });
}

async function loadTests() {
  try {
    const response = await fetch("tests/index.json?v=20261125-1", { cache: "no-store" });
    if (!response.ok) throw new Error("test index could not be loaded");
    const index = await response.json();
    const loaded = await Promise.all((index.tests || []).map(async path => {
      const file = await fetch("tests/" + path + "?v=20261124-5", { cache: "no-store" });
      if (!file.ok) throw new Error("test file could not be loaded: " + path);
      const test = await file.json();
      test._basePath = "tests/" + path.slice(0, path.lastIndexOf("/") + 1);
      return test;
    }));
    tests = loaded;
    renderCatalog();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<div class="empty-state">не удалось загрузить тесты - попробуйте обновить страницу</div>';
  }
}

loadTests();
