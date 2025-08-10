/* pesukim app - local and hybrid */

const LS_KEY = "pesukim:data";
const LS_FAV = "pesukim:favs";
const LS_UI  = "pesukim:ui";

// mapping for sefaria
const BOOK_MAP = {
  "Bereshit": "Genesis",
  "Shemot": "Exodus",
  "Vayikra": "Leviticus",
  "Bamidbar": "Numbers",
  "Devarim": "Deuteronomy",
  "Génesis": "Genesis",
  "Éxodo": "Exodus",
  "Levítico": "Leviticus",
  "Números": "Numbers",
  "Deuteronomio": "Deuteronomy",
  "Deuteronomy": "Deuteronomy",
  "Yehoshúa": "Joshua",
  "Shoftim": "Judges",
  "Shmuel I": "I Samuel",
  "Shmuel II": "II Samuel",
  "Melajim I": "I Kings",
  "Melajim II": "II Kings",
  "Yeshayahu": "Isaiah",
  "Yirmiyahu": "Jeremiah",
  "Yejezkel": "Ezekiel",
  "Tehilim": "Psalms",
  "Mishlei": "Proverbs",
  "Iyov": "Job",
  "Shir Hashirim": "Song of Songs",
  "Rut": "Ruth",
  "Eijá": "Lamentations",
  "Kohelet": "Ecclesiastes",
  "Ester": "Esther",
  "Daniel": "Daniel",
  "Ezra": "Ezra",
  "Nejemia": "Nehemiah",
  "Divrei Hayamim I": "I Chronicles",
  "Divrei Hayamim II": "II Chronicles"
};

// state
let state = {
  data: [],          // [{ref, book, he, es}]
  view: [],          // filtered list
  cursor: -1,        // index of active verse in view
  onlyFavs: false,
  bookFilter: "",
  query: ""
};

let favs = new Set(JSON.parse(localStorage.getItem(LS_FAV) || "[]"));
let ui = JSON.parse(localStorage.getItem(LS_UI) || '{"theme":"dark"}');

// DOM refs
const verseCard = document.getElementById("verseCard");
const verseRef  = document.getElementById("verseRef");
const verseHe   = document.getElementById("verseHe");
const verseEs   = document.getElementById("verseEs");
const btnFav    = document.getElementById("btnFav");
const btnCopy   = document.getElementById("btnCopy");
const btnShare  = document.getElementById("btnShare");
const btnPrev   = document.getElementById("btnPrev");
const btnNext   = document.getElementById("btnNext");
const btnRandom = document.getElementById("btnRandom");

const searchInput = document.getElementById("searchInput");
const filterBook  = document.getElementById("filterBook");
const showFavs    = document.getElementById("showFavs");
const clearSearch = document.getElementById("clearSearch");
const list        = document.getElementById("list");

const settingsDialog = document.getElementById("settingsDialog");
const openSettings   = document.getElementById("openSettings");
const dataEditor     = document.getElementById("dataEditor");
const btnSaveData    = document.getElementById("btnSaveData");
const fileImport     = document.getElementById("fileImport");
const btnDownload    = document.getElementById("btnDownload");
const btnSeed        = document.getElementById("btnSeed");
const toggleTheme    = document.getElementById("toggleTheme");

const bookSelect  = document.getElementById("bookSelect");
const letterInput = document.getElementById("letterInput");
const btnSearch   = document.getElementById("btnSearch");
const resultsDiv  = document.getElementById("results");
const kbd         = document.getElementById("kbd");

// Theme
applyTheme();
toggleTheme?.addEventListener("click", () => {
  ui.theme = ui.theme === "dark" ? "light" : "dark";
  localStorage.setItem(LS_UI, JSON.stringify(ui));
  applyTheme();
});
function applyTheme() {
  document.documentElement.classList.toggle("dark", ui.theme === "dark");
  document.body.className = ui.theme === "dark"
    ? "h-full bg-slate-950 text-slate-100"
    : "h-full bg-slate-50 text-slate-900";
}

// Load & save data
function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    state.data = raw ? JSON.parse(raw) : [];
  } catch {
    state.data = [];
  }
  rebuildFilters();
  recomputeView();
}
function saveData() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.data));
  rebuildFilters();
  recomputeView();
}
function rebuildFilters() {
  const books = [...new Set(state.data.map(x => x.book).filter(Boolean))].sort();
  filterBook.innerHTML = `<option value="">Todos los libros</option>` +
    books.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
}

// General search & filters
searchInput?.addEventListener("input", e => {
  state.query = e.target.value.trim();
  recomputeView();
});
filterBook?.addEventListener("change", e => {
  state.bookFilter = e.target.value;
  recomputeView();
});
showFavs?.addEventListener("click", () => {
  state.onlyFavs = !state.onlyFavs;
  showFavs.classList.toggle("bg-amber-600", state.onlyFavs);
  recomputeView();
});
clearSearch?.addEventListener("click", () => {
  state.query = "";
  state.bookFilter = "";
  state.onlyFavs = false;
  if (searchInput) searchInput.value = "";
  if (filterBook) filterBook.value = "";
  showFavs.classList.remove("bg-amber-600");
  recomputeView();
});

function recomputeView() {
  const q = state.query.toLowerCase();
  state.view = state.data.filter(v => {
    if (state.bookFilter && v.book !== state.bookFilter) return false;
    if (state.onlyFavs && !favs.has(v.ref)) return false;
    if (!q) return true;
    return (v.ref?.toLowerCase().includes(q)
         || v.he?.toLowerCase().includes(q)
         || v.es?.toLowerCase().includes(q));
  });
  renderList();
  if (state.view.length && (state.cursor < 0 || state.cursor >= state.view.length)) {
    state.cursor = 0;
    showCurrent();
  }
  if (!state.view.length) {
    verseCard.classList.add("hidden");
  }
}

function renderList() {
  list.innerHTML = state.view.map((v, i) => {
    const isFav = favs.has(v.ref);
    return `
      <li class="p-4 hover:bg-slate-800/60 cursor-pointer" data-index="${i}">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs text-slate-400">${escapeHtml(v.ref || "")}</div>
            <div class="hebrew">${escapeHtml(v.he || "")}</div>
            <div class="text-slate-300 text-sm">${escapeHtml(v.es || "")}</div>
          </div>
          <button data-fav="${escapeHtml(v.ref)}"
            class="shrink-0 px-2 py-1 rounded-lg ${isFav ? "bg-amber-600" : "bg-slate-700"}">
            ★
          </button>
        </div>
      </li>`;
  }).join("");
}

// List click handler (select or fav)
list?.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-index]");
  const favBtn = e.target.closest("button[data-fav]");
  if (favBtn) {
    const ref = favBtn.getAttribute("data-fav");
    toggleFav(ref);
    favBtn.classList.toggle("bg-amber-600");
    return;
  }
  if (li) {
    state.cursor = Number(li.getAttribute("data-index"));
    showCurrent();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Navigation & show current
btnPrev?.addEventListener("click", () => { if (state.cursor > 0) { state.cursor--; showCurrent(); }});
btnNext?.addEventListener("click", () => { if (state.cursor < state.view.length - 1) { state.cursor++; showCurrent(); }});
btnRandom?.addEventListener("click", randomVerse);
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") randomVerse();
  if (e.key === "ArrowLeft") btnPrev.click();
  if (e.key === "ArrowRight") btnNext.click();
});
function randomVerse() {
  if (!state.view.length) return;
  state.cursor = Math.floor(Math.random() * state.view.length);
  showCurrent();
}
function showCurrent() {
  const v = state.view[state.cursor];
  if (!v) return;
  verseRef.textContent = v.ref || "";
  verseHe.textContent = v.he || "";
  verseEs.textContent = v.es || "";
  verseCard.classList.remove("hidden");
  btnFav.textContent = favs.has(v.ref) ? "Quitar de favoritos" : "Añadir a favoritos";
}

// Fav / copy / share
btnFav?.addEventListener("click", () => {
  const v = state.view[state.cursor]; if (!v) return;
  toggleFav(v.ref);
  btnFav.textContent = favs.has(v.ref) ? "Quitar de favoritos" : "Añadir a favoritos";
});
function toggleFav(ref) {
  if (favs.has(ref)) favs.delete(ref); else favs.add(ref);
  localStorage.setItem(LS_FAV, JSON.stringify([...favs]));
}
btnCopy?.addEventListener("click", async () => {
  const v = state.view[state.cursor]; if (!v) return;
  const txt = `${v.ref}\n${v.he}\n${v.es}`;
  await navigator.clipboard.writeText(txt);
});
btnShare?.addEventListener("click", async () => {
  const v = state.view[state.cursor]; if (!v) return;
  const text = `${v.ref}\n${v.he}\n${v.es}`;
  if (navigator.share) {
    await navigator.share({ title: v.ref, text });
  } else {
    await navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles.");
  }
});

// Data modal (import/export)
openSettings?.addEventListener("click", () => {
  dataEditor.value = JSON.stringify(state.data, null, 2);
  settingsDialog.showModal();
});
btnSaveData?.addEventListener("click", (e) => {
  e.preventDefault();
  try {
    const parsed = JSON.parse(dataEditor.value);
    if (!Array.isArray(parsed)) throw new Error("El JSON debe ser un arreglo");
    state.data = parsed.map(x => ({
      ref: String(x.ref || "").trim(),
      book: String(x.book || "").trim(),
      he: String(x.he || "").trim(),
      es: String(x.es || "").trim()
    })).filter(x => x.ref && (x.he || x.es));
    saveData();
    settingsDialog.close();
  } catch (err) {
    alert("Error al parsear JSON: " + err.message);
  }
});
btnDownload?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pesukim.json"; a.click();
  URL.revokeObjectURL(url);
});
fileImport?.addEventListener("change", (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    dataEditor.value = reader.result;
  };
  reader.readAsText(file, "utf-8");
});
btnSeed?.addEventListener("click", () => {
  const demo = [
    { ref: "Tehilim 23:1", book: "Tehilim", he: "מִצְמֹר לְדָוִד ... יְהוָה רֹעִי לֹא אֶחְסָרׇ", es: "Salmo de David... Hashem es mi pastor, nada me faltará." },
    { ref: "Bamidbar 6:24", book: "Bamidbar", he: "יְבָרֶכְךָ ה׳ וְיִשְמְרֶךָׇ", es: "Que Hashem te bendiga y te proteja." },
    { ref: "Yehoshúa 1:9", book: "Yehoshúa", he: "הֲלֹא צִוִיתִיךָ ... חֲזַק וֶאֵמָץ", es: "¿No te he ordenado? ¡Sé fuerte y valiente!..." }
  ];
  dataEditor.value = JSON.stringify(demo, null, 2);
});

// Helpers
function escapeHtml(s) {
  return (s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  })[c]);
}

// Remove Hebrew niqqud/taamim for letter comparisons
function stripNiqqud(s = "") {
  return s.normalize("NFC").replace(/[\u0591-\u05C7]/g, "");
}

// Local data helpers
function getLocalData(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); }catch{ return []; } }
function setLocalData(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }

// Merge new verses into local
function mergeVerses(newOnes) {
  const byRef = new Map(getLocalData().map(v => [v.ref, v]));
  newOnes.forEach(v => {
    if (!v.ref) return;
    if (!byRef.has(v.ref)) byRef.set(v.ref, v);
  });
  const merged = [...byRef.values()];
  setLocalData(merged);
  state.data = merged;
  rebuildFilters();
  recomputeView();
}

// Sefaria helpers
async function getChaptersCount(sefariaTitle) {
  const res = await fetch(`https://www.sefaria.org/api/index/${encodeURIComponent(sefariaTitle)}`);
  if (!res.ok) return 150;
  const json = await res.json();
  const count = (json?.schema?.lengths && json.schema.lengths[0]) || json?.book?.lengths?.[0];
  return count || 150;
}
async function fetchChapter(sefariaTitle, chap, localBookLabel) {
  const urlHe = `https://www.sefaria.org/api/texts/${encodeURIComponent(sefariaTitle)}.${chap}?lang=he&commentary=0&context=0&pad=0`;
  const urlEs = `https://www.sefaria.org/api/texts/${encodeURIComponent(sefariaTitle)}.${chap}?lang=es&commentary=0&context=0&pad=0`;
  const [rHe, rEs] = await Promise.all([fetch(urlHe), fetch(urlEs)]);
  if (!rHe.ok) return [];
  const jHe = await rHe.json();
  const jEs = rEs.ok ? await rEs.json() : { text: [] };
  const heArr = Array.isArray(jHe.text) ? jHe.text : [];
  const esArr = Array.isArray(jEs.text) ? jEs.text : [];
  return heArr.map((he, i) => ({
    ref: `${sefariaTitle} ${chap}:${i+1}`,
    book: localBookLabel,
    he: (he || "").trim(),
    es: (esArr[i] || "").trim()
  })).filter(v => v.he);
}
async function ensureBookCachedAndFind(bookLabel, firstLetter, maxChaptersScan = 20, progressEl = null) {
  const sefariaTitle = BOOK_MAP[bookLabel] || bookLabel;
  const target = stripNiqqud(firstLetter)[0];
  let hits = getLocalData().filter(v => v.book === bookLabel)
    .filter(v => stripNiqqud((v.he||"").trim()).startsWith(target));
  if (hits.length) return hits;
  const totalChaps = await getChaptersCount(sefariaTitle);
  const toScan = Math.min(totalChaps, maxChaptersScan);
  for (let chap = 1; chap <= toScan; chap++) {
    if (progressEl) progressEl.innerHTML = `Descargando <b>${escapeHtml(sefariaTitle)} ${chap}/${toScan}</b>…`;
    const arr = await fetchChapter(sefariaTitle, chap, bookLabel);
    if (arr.length) {
      mergeVerses(arr);
      hits = getLocalData().filter(v => v.book === bookLabel)
        .filter(v => stripNiqqud((v.he||"").trim()).startsWith(target));
      if (hits.length) break;
      await new Promise(r => setTimeout(r, 150));
    }
  }
  return hits;
}

// Build Hebrew keyboard
const HEBREW_ROWS = [
  ["א","ב","ג","ד","ה","ו","ז","ח","ט"],
  ["י","כ","ך","ל","מ","ם","נ","ן","ס"],
  ["ע","פ","ף","צ","ץ","ק","ר","ש","ת"]
];
function buildKeyboard() {
  if (!kbd) return;
  kbd.innerHTML = "";
  HEBREW_ROWS.forEach(row => {
    const frag = document.createDocumentFragment();
    row.forEach(ch => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = ch;
      btn.dataset.letter = ch;
      frag.appendChild(btn);
    });
    const rowWrap = document.createElement("div");
    rowWrap.style.display = "flex";
    rowWrap.style.gap = "8px";
    rowWrap.style.margin = "4px 0";
    rowWrap.appendChild(frag);
    kbd.appendChild(rowWrap);
  });
  kbd.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-letter]");
    if (!b) return;
    const ch = b.dataset.letter;
    if (letterInput) {
      letterInput.value = ch;
      letterInput.dispatchEvent(new Event("input"));
    }
  });
}

// Fill book select
function fillBookSelect() {
  if (!bookSelect) return;
  const books = [...new Set(state.data.map(v => v.book).filter(Boolean))].sort();
  bookSelect.innerHTML = books.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
}

// Wire search by initial
function wireLetterSearch() {
  if (!btnSearch || !letterInput || !bookSelect || !resultsDiv) return;
  btnSearch.addEventListener("click", async () => {
    const book = bookSelect.value;
    const letter = (letterInput.value || "").trim();
    if (!book || !letter) {
      resultsDiv.innerHTML = `<div class="subtle">Selecciona libro y una letra.</div>`;
      return;
    }
    const target = stripNiqqud(letter)[0];
    let hits = state.data.filter(v => v.book === book)
      .filter(v => stripNiqqud((v.he||"").trim()).startsWith(target));
    if (!hits.length) {
      resultsDiv.innerHTML = `Buscando en <b>${escapeHtml(book)}</b>… Esto puede tardar un momento.`;
      try {
        hits = await ensureBookCachedAndFind(book, letter, 30, resultsDiv);
      } catch (e) {
        console.error(e);
        resultsDiv.innerHTML = `<div class="subtle">No pude descargar de Sefaria. Reintenta más tarde.</div>`;
        return;
      }
    }
    if (!hits.length) {
      resultsDiv.innerHTML = `<div class="subtle">No encontré pesukim en <b>${escapeHtml(book)}</b> que inicien con “${escapeHtml(letter)}”.</div>`;
      return;
    }
    resultsDiv.innerHTML = hits.map((v, i) => `
      <div class="card" style="margin:8px 0;padding:10px;cursor:pointer" data-i="${i}">
        <div class="subtle">${escapeHtml(v.ref||"")}</div>
        <div class="hebrew" style="font-size:20px;line-height:1.6">${escapeHtml(v.he||"")}</div>
        <div style="opacity:.95">${escapeHtml(v.es||"")}</div>
      </div>
    `).join("");
    resultsDiv.querySelectorAll("[data-i]").forEach((div, idx) => {
      div.addEventListener("click", () => {
        state.view = hits;
        state.cursor = idx;
        showCurrent();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  });
}

// Initialize
loadData();
buildKeyboard();
fillBookSelect();
wireLetterSearch();
