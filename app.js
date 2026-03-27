"use strict";

/* Config */
const REPO = "budoucha/my-bookmarklets";
const BRANCH = "main";
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const GITHUB_BASE = `https://github.com/${REPO}/tree/${BRANCH}`;

function contentsApiUrl(path = "") {
  const trimmed = String(path ?? "").replace(/^\/+/, "");
  const url = new URL(trimmed ? `${API_BASE}/${trimmed}` : `${API_BASE}/`);
  url.searchParams.set("ref", BRANCH);
  return url.toString();
}

/* Named directories to skip (hidden dirs starting with "." are also excluded) */
const EXCLUDE_DIRS = new Set(["node_modules", ".github"]);

/* State */
let bookmarklets = [];
let selectedIdx = -1;
const fetchCache = new Map();

/* Fetch helpers */
async function fetchText(url) {
  if (fetchCache.has(url)) return fetchCache.get(url);
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`fetchText failed: ${r.status} ${r.statusText}`, url);
      return null;
    }
    const t = await r.text();
    fetchCache.set(url, t);
    return t;
  } catch (err) {
    console.error("fetchText error:", url, err);
    return null;
  }
}

async function fetchJSON(url) {
  if (fetchCache.has(url)) return fetchCache.get(url);
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`fetchJSON failed: ${r.status} ${r.statusText}`, url);
      return null;
    }
    const j = await r.json();
    fetchCache.set(url, j);
    return j;
  } catch (err) {
    console.error("fetchJSON error:", url, err);
    return null;
  }
}

/* Helpers */
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function h1FromReadme(readme) {
  if (!readme) return null;
  const m = readme.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/* Load bookmarklet list */
async function loadBookmarklets() {
  const items = await fetchJSON(contentsApiUrl());
  if (!items || !Array.isArray(items)) {
    renderError("Could not load bookmarklets from GitHub API. Please try again later.");
    return;
  }

  const dirs = items.filter(
    item => item.type === "dir" && !item.name.startsWith(".") && !EXCLUDE_DIRS.has(item.name)
  );

  if (dirs.length === 0) {
    document.getElementById("list-container").innerHTML =
      `<div class="state-box">No bookmarklets found yet.</div>`;
    return;
  }

  /* Fetch READMEs in parallel to get display names */
  bookmarklets = await Promise.all(dirs.map(async dir => {
    const readme = await fetchText(`${RAW_BASE}/${dir.name}/README.md`);
    return {
      dirName: dir.name,
      displayName: h1FromReadme(readme) ?? dir.name,
      readme
    };
  }));

  renderList();
}

/* Render list */
function renderList() {
  const ul = document.createElement("ul");
  ul.className = "bookmarklet-list";

  bookmarklets.forEach((bm, i) => {
    const li = document.createElement("li");
    li.className = "bookmarklet-item" + (i === selectedIdx ? " selected" : "");
    li.dataset.index = i;

    const nameBtn = document.createElement("button");
    nameBtn.className = "item-name";
    nameBtn.textContent = bm.displayName;
    nameBtn.setAttribute("aria-label", `Select ${bm.displayName}`);
    nameBtn.setAttribute("aria-pressed", String(i === selectedIdx));
    nameBtn.addEventListener("click", () => selectBookmarklet(i));

    const copyBtn = document.createElement("button");
    copyBtn.className = "icon-btn";
    copyBtn.title = "Copy bookmarklet code";
    copyBtn.setAttribute("aria-label", `Copy ${bm.displayName}`);
    copyBtn.innerHTML = iconClipboard();
    copyBtn.addEventListener("click", e => {
      e.stopPropagation();
      handleListCopy(i, copyBtn);
    });

    li.appendChild(nameBtn);
    li.appendChild(copyBtn);
    ul.appendChild(li);
  });

  const container = document.getElementById("list-container");
  container.innerHTML = "";
  container.appendChild(ul);
}

/* Select bookmarklet */
async function selectBookmarklet(idx) {
  selectedIdx = idx;
  renderList();

  const bm = bookmarklets[idx];
  const panel = document.getElementById("detail-panel");
  panel.innerHTML = `<div class="state-box"><div class="spinner"></div><div>Loading&hellip;</div></div>`;
  panel.classList.add("visible");

  const [minCode, formattedCode] = await Promise.all([
    fetchText(`${RAW_BASE}/${bm.dirName}/bookmarklet.min.js`),
    fetchText(`${RAW_BASE}/${bm.dirName}/bookmarklet.js`)
  ]);

  const githubUrl = `${GITHUB_BASE}/${bm.dirName}`;
  const readmeHtml = bm.readme
    ? marked.parse(bm.readme)
    : "<p>No description available.</p>";
  const codeDisplay = (formattedCode ?? "// No formatted code found.").trim();

  panel.innerHTML = `
    <div class="detail-head">
      <div class="detail-title-row">
        <h2 class="detail-title">${esc(bm.displayName)}</h2>
        <div class="detail-actions">
          <a href="${esc(githubUrl)}" target="_blank" rel="noopener noreferrer" class="btn" title="View on GitHub">
            ${iconGitHub()}
            GitHub
          </a>
          <button class="btn btn-primary" id="detail-copy-btn" title="Copy working code to clipboard">
            ${iconClipboard()}
            Copy
          </button>
        </div>
      </div>
    </div>
    <div class="detail-info">${readmeHtml}</div>
    <div class="detail-code">
      <label class="code-label" for="code-textarea">Formatted Code</label>
      <textarea id="code-textarea" class="code-textarea" readonly spellcheck="false">${esc(codeDisplay)}</textarea>
    </div>
  `;

  document.getElementById("detail-copy-btn").addEventListener("click", () => {
    copyCode(minCode, document.getElementById("detail-copy-btn"));
  });
}

/* Copy helpers */
async function copyCode(code, btn) {
  if (!code) {
    showToast("No code available");
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
  } catch {
    const ta = Object.assign(document.createElement("textarea"), {
      value: code,
      style: "position:fixed;opacity:0;"
    });
    ta.setAttribute("aria-hidden", "true");
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  showToast("Copied to clipboard!");
  if (btn) {
    btn.classList.add("copied");
    const prev = btn.innerHTML;
    btn.innerHTML = `${iconCheck()} Copied!`;
    setTimeout(() => {
      btn.innerHTML = prev;
      btn.classList.remove("copied");
    }, 2000);
  }
}

async function handleListCopy(idx, btn) {
  const bm = bookmarklets[idx];
  const code = await fetchText(`${RAW_BASE}/${bm.dirName}/bookmarklet.min.js`);
  copyCode(code, btn);
}

/* Toast */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* Error state */
function renderError(msg) {
  document.getElementById("list-container").innerHTML =
    `<div class="state-box">${esc(msg)}</div>`;
}

/* SVG icons */
function iconClipboard() {
  return `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
    <rect x="5" y="2" width="9" height="12" rx="1.5"/>
    <path d="M5 4H3.5A1.5 1.5 0 0 0 2 5.5v8A1.5 1.5 0 0 0 3.5 15H10a1.5 1.5 0 0 0 1.5-1.5V13"/>
  </svg>`;
}

function iconCheck() {
  return `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M2 8l4 4 8-8"/>
  </svg>`;
}

function iconGitHub() {
  return `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
      0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
      -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
      .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
      -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
      1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
      1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
      1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
  </svg>`;
}

loadBookmarklets().catch(() => renderError("Failed to load bookmarklets."));
