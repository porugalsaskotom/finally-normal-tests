const app = document.getElementById("app");
let tests = [];
let activeTest = null;
let activeQuestions = [];
let currentQuestion = 0;
let selectedAnswers = [];
let devQuestionVisibility = {};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function assetUrl(path, test = activeTest) {
  return path ? new URL((test?._basePath || "") + path, document.baseURI).href : "";
}
function applyPageBackground(path, test = activeTest) {
  document.body.style.backgroundImage = path
    ? 'linear-gradient(rgba(243,240,231,.28), rgba(243,240,231,.28)), url("' + assetUrl(path, test) + '")'
    : "";
}
function isDevEnabled() { return activeTest?.dev_tools?.enabled === true; }
function isQuestionHidden(question) {
  return devQuestionVisibility[question.id] ?? (question.hidden === true);
}
function getVisibleQuestions() {
  return (activeTest?.questions || []).filter(question => !isQuestionHidden(question));
}
function renderCatalog() {
  activeTest = null;
  activeQuestions = [];
  applyPageBackground("");
  const published = tests.filter(test => test.published === true);
  app.innerHTML = '<section class="test-list" aria-label="доступные тесты">' +
    (published.length ? published.map(test =>
      '<article class="test-card" ' + (test.assets?.card_background ? 'style="background-image:url(\'' + escapeHtml(assetUrl(test.assets.card_background, test)) + '\')"' : "") + '>' +
      '<div class="test-card-content"><h2>' + escapeHtml(test.title) + '</h2><p>' + escapeHtml(test.description) + '</p>' +
      '<div class="meta">' + test.questions.filter(q => q.hidden !== true).length + ' вопросов · ' + escapeHtml(test.duration || "время не указано") + '</div></div>' +
      '<button class="button" data-start="' + escapeHtml(test.id) + '">начать тест</button></article>'
    ).join("") : '<div class="empty-state">пока нет опубликованных тестов</div>') + '</section>';
  app.querySelectorAll("[data-start]").forEach(button => button.addEventListener("click", () => openTest(button.dataset.start)));
}
function openTest(id) {
  activeTest = tests.find(test => test.id === id);
  if (!activeTest) return renderCatalog();
  devQuestionVisibility = {};
  activeQuestions = getVisibleQuestions();
  applyPageBackground(activeTest.assets?.background);
  renderTestStart();
}
function renderDevQuestionManager() {
  if (!isDevEnabled()) return "";
  const all = activeTest.questions || [];
  const visibleCount = all.filter(q => !isQuestionHidden(q)).length;
  return '<section class="dev-report dev-question-manager"><div class="dev-report-title"><h2>developer tools</h2><span>управление вопросами</span></div>' +
    '<p class="dev-note">пользователь увидит только включённые вопросы. Изменения здесь временные - чтобы сохранить их, обнови hidden в test.json</p>' +
    '<div class="dev-count">активно ' + visibleCount + ' из ' + all.length + '</div>' +
    all.map((q,i) => {
      const hidden = isQuestionHidden(q);
      return '<div class="dev-question-toggle"><div class="dev-question-toggle-copy"><strong>' + (i+1) + '. ' + escapeHtml(q.text) + '</strong><span>' + (hidden ? 'скрыт от пользователя' : 'показывается пользователю') + '</span></div>' +
        '<button class="button secondary dev-toggle" data-toggle-question="' + escapeHtml(q.id) + '">' + (hidden ? 'показать' : 'скрыть') + '</button></div>';
    }).join("") +
    '<button class="button secondary" id="copy-test-json">скопировать json с изменениями</button><span class="dev-copy-status" id="dev-copy-status"></span></section>';
}
function renderTestStart() {
  const count = getVisibleQuestions().length;
  app.innerHTML = '<button class="back-link" id="catalog">← все тесты</button><section class="result-panel">' +
    '<p class="eyebrow">тест</p><h1>' + escapeHtml(activeTest.title) + '</h1><p class="result-description">' + escapeHtml(activeTest.description || "") + '</p>' +
    '<p class="result-score">' + count + ' вопросов</p>' +
    (count ? '<button class="button" id="begin">начать тест</button>' : '<p class="dev-note">нет активных вопросов - включи хотя бы один вопрос</p>') +
    renderDevQuestionManager() + '</section>';
  document.getElementById("catalog").addEventListener("click", renderCatalog);
  document.getElementById("begin")?.addEventListener("click", startTest);
  bindDevQuestionManager();
}
function bindDevQuestionManager() {
  app.querySelectorAll("[data-toggle-question]").forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.toggleQuestion;
    devQuestionVisibility[id] = !isQuestionHidden(activeTest.questions.find(q => q.id === id));
    renderTestStart();
  }));
  document.getElementById("copy-test-json")?.addEventListener("click", async () => {
    const copy = JSON.parse(JSON.stringify(activeTest));
    copy.questions = copy.questions.map(q => ({...q, hidden:isQuestionHidden(q)}));
    delete copy._basePath;
    try {
      await navigator.clipboard.writeText(JSON.stringify(copy,null,2));
      document.getElementById("dev-copy-status").textContent = "json скопирован";
    } catch {
      document.getElementById("dev-copy-status").textContent = "не удалось скопировать";
    }
  });
}
function startTest() {
  activeQuestions = getVisibleQuestions();
  if (!activeQuestions.length) return renderTestStart();
  currentQuestion = 0;
  selectedAnswers = activeQuestions.map(q => q.type === "multiple_choice" ? [] : null);
  renderQuestion();
}
function renderQuestion() {
  const question = activeQuestions[currentQuestion];
  const total = activeQuestions.length;
  const selected = selectedAnswers[currentQuestion];
  const multiple = question.type === "multiple_choice";
  const valid = multiple ? selected.length >= (question.min_select ?? 1) : selected !== null;
  const progress = Math.round((currentQuestion + 1) / total * 100);
  const coverStyle = activeTest.assets?.cover
    ? 'style="background-image:linear-gradient(rgba(35,40,33,.34),rgba(35,40,33,.34)),url(\'' + escapeHtml(assetUrl(activeTest.assets.cover)) + '\')"'
    : "";
  app.innerHTML = '<button class="back-link" id="exit-test">← все тесты</button>' +
    (isDevEnabled() ? '<button class="dev-open" id="open-dev">dev tools</button>' : '') +
    '<section class="quiz-panel" ' + coverStyle + '><div class="quiz-panel-content">' +
    '<div class="progress-row"><span>вопрос ' + (currentQuestion+1) + ' из ' + total + '</span><span>' + progress + '%</span></div>' +
    '<div class="progress-track"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
    '<p class="eyebrow">' + escapeHtml(activeTest.title) + '</p><h1 class="question">' + escapeHtml(question.text) + '</h1>' +
    (multiple ? '<p class="question-hint">можно выбрать несколько вариантов</p>' : '') +
    '<div class="answers">' + question.answers.map((answer,index) =>
      '<button class="answer ' + (multiple ? 'multi ' : '') + ((multiple ? selected.includes(index) : selected === index) ? 'selected' : '') + '" data-answer="' + index + '" aria-pressed="' + (multiple ? selected.includes(index) : selected === index) + '">' +
      '<span class="answer-dot"></span><span>' + escapeHtml(answer.text) + '</span></button>'
    ).join("") + '</div><div class="quiz-actions">' +
    '<button class="button secondary" id="previous" ' + (currentQuestion===0?'disabled':'') + '>назад</button>' +
    '<button class="button" id="next" ' + (!valid?'disabled':'') + '>' + (currentQuestion===total-1?'узнать результат':'далее') + '</button></div></div></section>';
  document.getElementById("exit-test").addEventListener("click", renderCatalog);
  document.getElementById("open-dev")?.addEventListener("click", renderTestStart);
  app.querySelectorAll("[data-answer]").forEach(button => button.addEventListener("click", () => {
    const index = Number(button.dataset.answer);
    if (multiple) {
      const next = [...selected], at = next.indexOf(index);
      if (at >= 0) next.splice(at,1);
      else if (next.length < (question.max_select ?? question.answers.length)) next.push(index);
      selectedAnswers[currentQuestion] = next;
    } else selectedAnswers[currentQuestion] = index;
    renderQuestion();
  }));
  document.getElementById("previous").addEventListener("click", () => { if(currentQuestion>0){currentQuestion--;renderQuestion();} });
  document.getElementById("next").addEventListener("click", () => {
    if (!valid) return;
    if(currentQuestion<total-1){currentQuestion++;renderQuestion();} else renderResult();
  });
}
function aggregate(values, method) {
  if (!values.length) return 0;
  if (method==="sum") return values.reduce((a,b)=>a+b,0);
  if (method==="max") return Math.max(...values);
  if (method==="min") return Math.min(...values);
  return values.reduce((a,b)=>a+b,0)/values.length;
}
function calculateMultiScaleResult() {
  const scales = activeTest.scales || [];
  const details = activeQuestions.map((question,i) => {
    const selection = selectedAnswers[i], indices = Array.isArray(selection)?selection:[selection];
    const answers = indices.filter(Number.isInteger).map(index=>question.answers[index]);
    const method = question.aggregation || activeTest.scoring?.multi_select_aggregation || "average";
    const scores = {};
    scales.forEach(scale=>scores[scale.id]=aggregate(answers.map(a=>Number(a.scores?.[scale.id]??0)),method));
    return {question,answers,method,scores};
  });
  const profile = {};
  scales.forEach(scale=>{
    let earned=0,possible=0;
    details.forEach(d=>{
      earned+=d.scores[scale.id]||0;
      const values=d.question.answers.map(a=>Number(a.scores?.[scale.id]??0));
      possible+=d.question.type==="multiple_choice"&&d.method==="sum"
        ? values.reduce((sum,v)=>sum+Math.max(0,v),0) : Math.max(0,...values);
    });
    profile[scale.id]={raw:earned,possible,percent:possible?Math.round(earned/possible*100):0};
  });
  const topScale=[...scales].sort((a,b)=>profile[b.id].percent-profile[a.id].percent)[0];
  return {scales,details,profile,topScale};
}
function calculateLegacyResult() {
  const scoring=activeTest.scoring||{type:"sum",results:[]};
  if(scoring.type==="categories"){
    const totals={};
    activeQuestions.forEach((q,i)=>{
      const answer=q.answers[selectedAnswers[i]];
      (answer.scores||[]).forEach(item=>totals[item.category]=(totals[item.category]||0)+Number(item.points||0));
    });
    const winner=Object.entries(totals).sort((a,b)=>b[1]-a[1])[0];
    return {result:scoring.results.find(item=>item.category===winner?.[0]),score:winner?winner[1]:0,label:winner?.[0]||""};
  }
  const score=activeQuestions.reduce((sum,q,i)=>sum+Number(q.answers[selectedAnswers[i]]?.score||0),0);
  return {result:scoring.results.find(item=>score>=item.min&&score<=item.max),score};
}
function renderDeveloperReport(outcome) {
  if(!isDevEnabled()) return "";
  return '<section class="dev-report"><h2>developer tools - отчёт</h2><p class="dev-note">участвуют только активные вопросы</p>' +
    outcome.details.map((d,i)=>'<div class="dev-question"><strong>'+(i+1)+'. '+escapeHtml(d.question.text)+'</strong>' +
      d.answers.map(a=>'<div class="dev-answer"><span>'+escapeHtml(a.text)+'</span><span>'+Object.entries(a.scores||{}).map(([id,v])=>escapeHtml(id)+': '+Number(v).toFixed(2)).join(' · ')+'</span></div>').join('') +
      '<div class="dev-total">баллы за вопрос: '+Object.entries(d.scores).map(([id,v])=>escapeHtml(id)+': '+v.toFixed(2)).join(' · ')+'</div></div>').join('') +
    '<h3>итоговые значения</h3>'+outcome.scales.map(s=>'<div class="dev-scale-row"><span>'+escapeHtml(s.title)+'</span><strong>'+outcome.profile[s.id].raw.toFixed(2)+' / '+outcome.profile[s.id].possible.toFixed(2)+' · '+outcome.profile[s.id].percent+'%</strong></div>').join('')+
    '<p class="dev-note">исключено вопросов: '+(activeTest.questions.length-activeQuestions.length)+'</p></section>';
}
function renderResult() {
  if(activeTest.scales?.length){
    const out=calculateMultiScaleResult();
    app.innerHTML='<button class="back-link" id="home">← все тесты</button><section class="result-panel"><p class="eyebrow">тест завершён</p><h1>'+escapeHtml(out.topScale?.title||"твой профиль")+'</h1><p class="result-description">наиболее выраженное направление по ответам</p><div class="scale-results">'+
      out.scales.map(s=>'<div class="scale-result"><div class="scale-result-heading"><strong>'+escapeHtml(s.title)+'</strong><span>'+out.profile[s.id].percent+'%</span></div><div class="progress-track"><div class="progress-fill" style="width:'+out.profile[s.id].percent+'%"></div></div><p>'+escapeHtml(s.description||'')+'</p></div>').join('')+
      '</div>'+renderDeveloperReport(out)+'<div class="result-actions"><button class="button" id="retry">пройти ещё раз</button></div></section>';
  } else {
    const out=calculateLegacyResult(), result=out.result;
    app.innerHTML='<button class="back-link" id="home">← все тесты</button><section class="result-panel"><p class="eyebrow">тест завершён</p><h1>'+escapeHtml(result?.title||"результат не определён")+'</h1><p class="result-score">'+out.score+' баллов</p><p class="result-description">'+escapeHtml(result?.description||"для этого результата пока не добавлено описание")+'</p><div class="result-actions"><button class="button" id="retry">пройти ещё раз</button></div></section>';
  }
  document.getElementById("home").addEventListener("click",renderCatalog);
  document.getElementById("retry").addEventListener("click",renderTestStart);
}
async function loadTests() {
  try {
    const response=await fetch("tests/index.json?v=20261125-2",{cache:"no-store"});
    if(!response.ok) throw new Error("test index could not be loaded");
    const index=await response.json();
    tests=await Promise.all((index.tests||[]).map(async path=>{
      const file=await fetch("tests/"+path+"?v=20261125-2",{cache:"no-store"});
      if(!file.ok) throw new Error("test file could not be loaded: "+path);
      const test=await file.json();
      test._basePath="tests/"+path.slice(0,path.lastIndexOf("/")+1);
      return test;
    }));
    renderCatalog();
  } catch(error) {
    console.error(error);
    app.innerHTML='<div class="empty-state">не удалось загрузить тесты - попробуйте обновить страницу</div>';
  }
}
loadTests();
