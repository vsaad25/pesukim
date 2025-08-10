// --- Estado y utilidades ---
const LS_KEY = "pesukim:data";
const LS_FAV = "pesukim:favs";
const LS_UI  = "pesukim:ui";

let state = {
  data: [],          // [{ref, book, he, es}]
  view: [],          // lista filtrada/buscada
  cursor: -1,        // índice del verso “activo” en view
  onlyFavs: false,
  bookFilter: "",
  query: ""
};

let favs = new Set(JSON.parse(localStorage.getItem(LS_FAV) || "[]"));
let ui = JSON.parse(localStorage.getItem(LS_UI) || '{"theme":"dark"}');

// --- DOM ---
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

// --- Tema ---
applyTheme();
toggleTheme.addEventListener("click", () => {
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

// --- Carga de datos ---
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

// --- Búsqueda / filtros ---
searchInput.addEventListener("input", e => {
  state.query = e.target.value.trim();
  recomputeView();
});
filterBook.addEventListener("change", e => {
  state.bookFilter = e.target.value;
  recomputeView();
});
showFavs.addEventListener("click", () => {
  state.onlyFavs = !state.onlyFavs;
  showFavs.classList.toggle("bg-amber-600", state.onlyFavs);
  recomputeView();
});
clearSearch.addEventListener("click", () => {
  state.query = "";
  state.bookFilter = "";
  state.onlyFavs = false;
  searchInput.value = "";
  filterBook.value = "";
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

// Click en lista (selección / fav)
list.addEventListener("click", (e) => {
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

// --- Navegación y verso actual ---
btnPrev.addEventListener("click", () => { if (state.cursor > 0) { state.cursor--; showCurrent(); }});
btnNext.addEventListener("click", () => { if (state.cursor < state.view.length - 1) { state.cursor++; showCurrent(); }});
btnRandom.addEventListener("click", randomVerse);
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

// --- Fav / copiar / compartir ---
btnFav.addEventListener("click", () => {
  const v = state.view[state.cursor]; if (!v) return;
  toggleFav(v.ref);
  btnFav.textContent = favs.has(v.ref) ? "Quitar de favoritos" : "Añadir a favoritos";
});
function toggleFav(ref) {
  if (favs.has(ref)) favs.delete(ref); else favs.add(ref);
  localStorage.setItem(LS_FAV, JSON.stringify([...favs]));
}

btnCopy.addEventListener("click", async () => {
  const v = state.view[state.cursor]; if (!v) return;
  const txt = `${v.ref}\n${v.he}\n${v.es}`;
  await navigator.clipboard.writeText(txt);
});
btnShare.addEventListener("click", async () => {
  const v = state.view[state.cursor]; if (!v) return;
  const text = `${v.ref}\n${v.he}\n${v.es}`;
  if (navigator.share) {
    await navigator.share({ title: v.ref, text });
  } else {
    await navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles.");
  }
});

// --- Modal de datos ---
openSettings.addEventListener("click", () => {
  dataEditor.value = JSON.stringify(state.data, null, 2);
  settingsDialog.showModal();
});
btnSaveData.addEventListener("click", (e) => {
  e.preventDefault();
  try {
    const parsed = JSON.parse(dataEditor.value);
    if (!Array.isArray(parsed)) throw new Error("El JSON debe ser un arreglo");
    // Normaliza campos
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
btnDownload.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pesukim.json"; a.click();
  URL.revokeObjectURL(url);
});
fileImport.addEventListener("change", (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    dataEditor.value = reader.result;
  };
  reader.readAsText(file, "utf-8");
});
btnSeed.addEventListener("click", () => {
  const demo = [
    { ref: "Tehilim 23:1", book: "Tehilim", he: "מִזְמוֹר לְדָוִד ... יְהוָה רֹעִי לֹא אֶחְסָר׃", es: "Salmo de David... Hashem es mi pastor, nada me faltará." },
    { ref: "Bamidbar 6:24", book: "Bamidbar", he: "יְבָרֶכְךָ ה׳ וְיִשְׁמְרֶךָ׃", es: "Que Hashem te bendiga y te proteja." },
    { ref: "Yehoshúa 1:9", book: "Yehoshúa", he: "הֲלוֹא צִוִּיתִיךָ ... חֲזַק וֶאֱמָץ", es: "¿No te he ordenado? ¡Sé fuerte y valiente!..." }
  ];
  dataEditor.value = JSON.stringify(demo, null, 2);
});

// --- Helpers ---
function escapeHtml(s) {
  return (s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

// --- Inicio ---
loadData();  
      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const hebrewTexts = data.he; // Versículos en hebreo
  
          if (hebrewTexts) {
            const filteredPesukim = hebrewTexts
              .map((pasuk, index) => ({
                text: pasuk,
                verse: index + 1,
              }))
              .filter(pasuk => pasuk.text.startsWith(letter));
  
            filteredPesukim.forEach(pasuk => {
              results.push(`${book} ${chapter}:${pasuk.verse} - ${pasuk.text}`);
            });
          }
        }
      } catch (error) {
        console.error(`Error al obtener ${book} ${chapter}:`, error);
      }
    }
  
    if (results.length > 0) {
      resultsDiv.innerHTML = `
        <h3>Pesukim que comienzan con '${letter}' en ${book}:</h3>
        <p>${results.join("<br><br>")}</p>
      `;
    } else {
      resultsDiv.textContent = `No se encontraron pesukim que comiencen con '${letter}' en ${book}.`;
    }
  }
