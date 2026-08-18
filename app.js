/* Народний календар — Ukrainian spelling calendar
   Data first, then rendering, then storage, then wiring. */

/* ── 1. Language data ─────────────────────────────────── */

const MONTHS = [
  { nom:"січень",   gen:"січня",     etym:"від «сікти» — рубати, розчищати ліс", en:"to hack / cut — clearing wood" },
  { nom:"лютий",    gen:"лютого",    etym:"лютий = жорстокий; найлютіші морози", en:"fierce — the bitterest frosts" },
  { nom:"березень", gen:"березня",   etym:"береза — тече березовий сік",         en:"birch — the sap runs" },
  { nom:"квітень",  gen:"квітня",    etym:"квіти — усе квітне",                  en:"flowers — everything blooms" },
  { nom:"травень",  gen:"травня",    etym:"трава — трава росте",                 en:"grass" },
  { nom:"червень",  gen:"червня",    etym:"червець — комаха на червону фарбу",   en:"cochineal — the red-dye insect" },
  { nom:"липень",   gen:"липня",     etym:"липа — цвіте липа",                   en:"linden — the lindens blossom" },
  { nom:"серпень",  gen:"серпня",    etym:"серп — жнива",                        en:"sickle — harvest" },
  { nom:"вересень", gen:"вересня",   etym:"верес — цвіте верес",                 en:"heather — the heather blooms" },
  { nom:"жовтень",  gen:"жовтня",    etym:"жовтий — жовте листя",                en:"yellow — the leaves turn" },
  { nom:"листопад", gen:"листопада", etym:"лист + падати — листя падає",         en:"leaf-fall" },
  { nom:"грудень",  gen:"грудня",    etym:"груда — мерзлі груди землі",          en:"clod — frozen clods of earth" }
];

/* Monday first, as in Ukraine */
const DAYS = [
  { nom:"понеділок", when:"у понеділок", short:"пн", etym:"по + неділя — день після неділі", en:"after Sunday" },
  { nom:"вівторок",  when:"у вівторок",  short:"вт", etym:"вторий = другий — другий день",   en:"second" },
  { nom:"середа",    when:"у середу",    short:"ср", etym:"середина тижня",                  en:"middle of the week" },
  { nom:"четвер",    when:"у четвер",    short:"чт", etym:"четвертий день",                  en:"fourth" },
  { nom:"п'ятниця",  when:"у п'ятницю",  short:"пт", etym:"п'ятий день",                     en:"fifth" },
  { nom:"субота",    when:"у суботу",    short:"сб", etym:"від «шабат»",                     en:"sabbath" },
  { nom:"неділя",    when:"у неділю",    short:"нд", etym:"«не діяти» — день без роботи",    en:"not-doing — the rest day" }
];

/* Ordinals. Neuter nominative ("вісімнадцяте серпня")
   and genitive ("вісімнадцятого серпня"). */
const ORD_NOM = ["", "перше","друге","третє","четверте","п'яте","шосте","сьоме","восьме","дев'яте",
  "десяте","одинадцяте","дванадцяте","тринадцяте","чотирнадцяте","п'ятнадцяте","шістнадцяте",
  "сімнадцяте","вісімнадцяте","дев'ятнадцяте","двадцяте"];

const ORD_GEN = ["", "першого","другого","третього","четвертого","п'ятого","шостого","сьомого","восьмого",
  "дев'ятого","десятого","одинадцятого","дванадцятого","тринадцятого","чотирнадцятого","п'ятнадцятого",
  "шістнадцятого","сімнадцятого","вісімнадцятого","дев'ятнадцятого","двадцятого"];

function ordinal(n, table, thirty){
  if (n <= 20) return table[n];
  if (n === 30) return thirty;
  if (n < 30) return "двадцять " + table[n - 20];
  return "тридцять " + table[n - 30];
}

const ordNom = n => ordinal(n, ORD_NOM, "тридцяте");
const ordGen = n => ordinal(n, ORD_GEN, "тридцятого");

/* "дві тисячі двадцять шостого року" */
function yearGen(y){
  const tail = y % 100;
  const thousands = Math.floor(y / 1000);
  const head = thousands === 2 ? "дві тисячі " : thousands + " тисяч ";
  return head + ordGen(tail) + " року";
}

/* ── 2. State ─────────────────────────────────────────── */

const today = stripTime(new Date());
let view = new Date(today.getFullYear(), today.getMonth(), 1);
let selected = new Date(today);
let notes = loadNotes();
console.log("[INIT] notes loaded:", Object.keys(notes).length, "dates");
console.log("[INIT] notes object:", notes);

function stripTime(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function key(d){
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
         "-" + String(d.getDate()).padStart(2, "0");
}
/* JS week starts Sunday; shift so Monday = 0 */
function weekIndex(d){ return (d.getDay() + 6) % 7; }

const $ = id => document.getElementById(id);

/* ── 3. Rendering ─────────────────────────────────────── */

function renderWeekdays(){
  $("weekdays").innerHTML = DAYS.map((d, i) =>
    `<div class="wd${i > 4 ? " wd--rest" : ""}" title="${d.etym}">
       <span class="wd__name">${d.nom}</span>
       <span class="wd__hint">${d.short}</span>
     </div>`
  ).join("");
}

function renderBanner(){
  const m = MONTHS[view.getMonth()];
  $("monthNom").textContent = m.nom;
  $("yearNum").textContent = view.getFullYear();
  $("glossNom").textContent = m.nom;
  $("glossGen").textContent = m.gen;
  $("glossGenEcho").textContent = m.gen;
  $("monthEtym").textContent = m.etym;
  $("monthEtymEn").textContent = m.en;
}

function renderGrid(){
  const y = view.getFullYear(), mo = view.getMonth();
  const first = new Date(y, mo, 1);
  const total = new Date(y, mo + 1, 0).getDate();
  const lead = weekIndex(first);
  let html = "";

  for (let i = 0; i < lead; i++) html += `<div class="cell cell--blank"></div>`;

  for (let d = 1; d <= total; d++){
    const date = new Date(y, mo, d);
    const k = key(date);
    const items = notes[k] || [];
    const cls = ["cell"];
    if (weekIndex(date) > 4) cls.push("cell--rest");
    if (k === key(today)) cls.push("cell--today");
    if (k === key(selected)) cls.push("cell--sel");

    const dots = items.length
      ? `<span class="cell__dots">${"<span class='dot'></span>".repeat(Math.min(items.length, 3))}</span>`
      : "";
    const peek = items.length ? `<span class="cell__peek">${escape_(items[0])}</span>` : "";

    html += `<button type="button" class="${cls.join(" ")}" data-date="${k}"
               aria-label="${ordNom(d)} ${MONTHS[mo].gen}, ${DAYS[weekIndex(date)].nom}">
               <span class="cell__num">${d}</span>${dots}${peek}
             </button>`;
  }

  const tail = (7 - ((lead + total) % 7)) % 7;
  for (let i = 0; i < tail; i++) html += `<div class="cell cell--blank"></div>`;

  $("grid").innerHTML = html;
}

function renderDay(){
  const d = selected.getDate();
  const m = MONTHS[selected.getMonth()];
  const wd = DAYS[weekIndex(selected)];

  $("dayFull").textContent = `${wd.nom}, ${ordNom(d)} ${m.gen}`;
  $("dayWhen").textContent = wd.when;
  $("dayLong").textContent =
    `${d} ${m.gen} ${selected.getFullYear()} — «${ordGen(d)} ${m.gen} ${yearGen(selected.getFullYear())}»`;
  $("dayEtymEn").textContent = `${wd.nom}: ${wd.etym} · ${wd.en}`;

  renderNotes();
}

function renderNotes(){
  const items = notes[key(selected)] || [];
  $("notes").innerHTML = items.map((t, i) =>
    `<li class="note">
       <span class="note__text">${escape_(t)}</span>
       <button type="button" class="note__del" data-i="${i}" aria-label="Видалити запис">×</button>
     </li>`
  ).join("");
  $("notesEmpty").hidden = items.length > 0;
}

function renderRef(){
  $("refDays").innerHTML = DAYS.map(d =>
    `<li class="ref__item">
       <span class="ref__pair"><b>${d.nom}</b> <span>${d.when}</span>
         <span class="ref__note">${d.etym} <i>· ${d.en}</i></span>
       </span>
     </li>`
  ).join("");

  $("refMonths").innerHTML = MONTHS.map(m =>
    `<li class="ref__item">
       <span class="ref__pair"><b>${m.nom}</b> <span>${m.gen}</span>
         <span class="ref__note">${m.etym} <i>· ${m.en}</i></span>
       </span>
     </li>`
  ).join("");
}

function render(){
  console.log("[RENDER] notes at render time:", Object.keys(notes).length, "dates");
  renderBanner();
  renderGrid();
  renderDay();
}

function escape_(s){
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

/* ── 4. Storage ───────────────────────────────────────── */

const STORE = "narodnyi-kalendar";

function loadNotes(){
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
  catch { return {}; }
}

function saveNotes(){
  try {
    localStorage.setItem(STORE, JSON.stringify(notes));
    setState("");
  } catch {
    setState("Браузер не зберігає записи — зробіть копію файлом.", true);
  }
}

function setState(msg, warn){
  const el = $("storeState");
  el.textContent = msg;
  el.classList.toggle("foot__state--warn", !!warn);
}

/* ── 5. Actions ───────────────────────────────────────── */

function goMonth(delta){
  view = new Date(view.getFullYear(), view.getMonth() + delta, 1);
  render();
}

function select(date){
  selected = stripTime(date);
  if (selected.getMonth() !== view.getMonth() || selected.getFullYear() !== view.getFullYear()){
    view = new Date(selected.getFullYear(), selected.getMonth(), 1);
  }
  render();
}

function moveSelection(days){
  const next = new Date(selected);
  next.setDate(next.getDate() + days);
  select(next);
  $("grid").focus();
}

/* ── 6. Wiring ────────────────────────────────────────── */

$("prevBtn").addEventListener("click", () => goMonth(-1));
$("nextBtn").addEventListener("click", () => goMonth(1));
$("todayBtn").addEventListener("click", () => select(new Date()));

$("grid").addEventListener("click", e => {
  const cell = e.target.closest(".cell[data-date]");
  if (!cell) return;
  const [y, m, d] = cell.dataset.date.split("-").map(Number);
  select(new Date(y, m - 1, d));
});

$("grid").addEventListener("keydown", e => {
  const moves = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7 };
  if (e.key in moves){ e.preventDefault(); moveSelection(moves[e.key]); }
});

document.addEventListener("keydown", e => {
  if (e.target.matches("input, textarea")) return;
  if (e.key === "PageUp"){ e.preventDefault(); goMonth(-1); }
  if (e.key === "PageDown"){ e.preventDefault(); goMonth(1); }
});

$("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = $("noteInput");
  const text = input.value.trim();
  if (!text) return;
  const k = key(selected);
  (notes[k] = notes[k] || []).push(text);
  input.value = "";
  saveNotes();
  renderGrid();
  renderNotes();
});

$("notes").addEventListener("click", e => {
  const btn = e.target.closest(".note__del");
  if (!btn) return;
  const k = key(selected);
  notes[k].splice(Number(btn.dataset.i), 1);
  if (!notes[k].length) delete notes[k];
  saveNotes();
  renderGrid();
  renderNotes();
});

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "kalendar-" + key(today) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("importBtn").addEventListener("click", () => $("importFile").click());

$("importFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      Object.entries(data).forEach(([k, v]) => {
        notes[k] = Array.from(new Set([...(notes[k] || []), ...v]));
      });
      saveNotes();
      render();
    } catch {
      setState("Файл не читається — потрібен JSON із копії.", true);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

/* ── Start ────────────────────────────────────────────── */

renderWeekdays();
renderRef();
render();
