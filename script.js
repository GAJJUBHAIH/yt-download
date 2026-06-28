const platforms = [
  {
    name: "YouTube",
    short: "YT",
    color: "#ff6b57",
    domains: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
    note: "Owned uploads, licensed clips, and official exports."
  },
  {
    name: "Instagram",
    short: "IG",
    color: "#f4c542",
    domains: ["instagram.com"],
    note: "Creator content, saved originals, and account exports."
  },
  {
    name: "Facebook",
    short: "FB",
    color: "#00a6bf",
    domains: ["facebook.com", "fb.watch"],
    note: "Your uploads, public rights-cleared videos, and exports."
  },
  {
    name: "Snapchat",
    short: "SN",
    color: "#ffe85c",
    domains: ["snapchat.com"],
    note: "Memories, Spotlight originals, and approved shares."
  },
  {
    name: "TikTok",
    short: "TT",
    color: "#78b82a",
    domains: ["tiktok.com", "vm.tiktok.com"],
    note: "Creator downloads where the source permits saving."
  },
  {
    name: "X",
    short: "X",
    color: "#cfd8d2",
    domains: ["x.com", "twitter.com"],
    note: "Your posts, licensed clips, and direct media links."
  },
  {
    name: "Vimeo",
    short: "VI",
    color: "#88d6e7",
    domains: ["vimeo.com"],
    note: "Creator-enabled downloads and team libraries."
  },
  {
    name: "Reddit",
    short: "RD",
    color: "#ff8a4a",
    domains: ["reddit.com", "redd.it"],
    note: "Permissioned posts and direct hosted video files."
  },
  {
    name: "Twitch",
    short: "TW",
    color: "#a3e46b",
    domains: ["twitch.tv"],
    note: "Your clips, VOD exports, and channel assets."
  },
  {
    name: "LinkedIn",
    short: "IN",
    color: "#75cde0",
    domains: ["linkedin.com"],
    note: "Company assets, personal uploads, and approved media."
  },
  {
    name: "Threads",
    short: "TH",
    color: "#f2f2ef",
    domains: ["threads.net"],
    note: "Owned posts, saved originals, and approved embeds."
  },
  {
    name: "Direct file",
    short: "MP4",
    color: "#78b82a",
    domains: [],
    note: "Direct .mp4, .webm, .mov, .m4v, or .ogv URLs."
  }
];

const directVideoPattern = /\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i;
const state = {
  activeUrl: "",
  activeEntry: null,
  queue: loadQueue()
};

const els = {
  form: document.querySelector("#downloadForm"),
  input: document.querySelector("#videoUrl"),
  permission: document.querySelector("#permissionCheck"),
  paste: document.querySelector("#pasteButton"),
  statusPill: document.querySelector("#statusPill"),
  platformBadge: document.querySelector("#platformBadge"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  downloadLink: document.querySelector("#downloadLink"),
  openSource: document.querySelector("#openSource"),
  copyLink: document.querySelector("#copyLink"),
  metaSource: document.querySelector("#metaSource"),
  metaFormat: document.querySelector("#metaFormat"),
  metaSize: document.querySelector("#metaSize"),
  metaMode: document.querySelector("#metaMode"),
  quickPlatforms: document.querySelector("#quickPlatforms"),
  platformGrid: document.querySelector("#platformGrid"),
  batchInput: document.querySelector("#batchInput"),
  addBatch: document.querySelector("#addBatch"),
  clearQueue: document.querySelector("#clearQueue"),
  downloadDirect: document.querySelector("#downloadDirect"),
  queueList: document.querySelector("#queueList"),
  themeToggle: document.querySelector("#themeToggle"),
  toast: document.querySelector("#toast")
};

renderPlatformFilters();
renderPlatformCards();
renderQueue();
restoreTheme();

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  analyzeCurrentInput();
});

els.downloadLink.addEventListener("click", (event) => {
  if (els.downloadLink.classList.contains("disabled")) {
    event.preventDefault();
  }
});

els.permission.addEventListener("change", () => {
  if (state.activeUrl) {
    analyzeUrl(state.activeUrl, { addToQueue: false });
  }
});

els.paste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      showToast("Clipboard is empty.");
      return;
    }
    els.input.value = text.trim();
    analyzeCurrentInput();
  } catch {
    showToast("Paste access is blocked in this browser.");
  }
});

els.openSource.addEventListener("click", () => {
  if (state.activeUrl) {
    window.open(state.activeUrl, "_blank", "noopener,noreferrer");
  }
});

els.copyLink.addEventListener("click", async () => {
  if (!state.activeUrl) return;
  try {
    await navigator.clipboard.writeText(state.activeUrl);
    showToast("Link copied.");
  } catch {
    showToast("Copy is blocked in this browser.");
  }
});

els.addBatch.addEventListener("click", () => {
  if (!els.permission.checked) {
    showPermissionNeeded();
    return;
  }

  const urls = els.batchInput.value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!urls.length) {
    showToast("Add at least one URL.");
    return;
  }

  urls.forEach((url) => analyzeUrl(url, { addToQueue: true, silent: true }));
  els.batchInput.value = "";
  renderQueue();
  showToast(`${urls.length} link${urls.length === 1 ? "" : "s"} added.`);
});

els.clearQueue.addEventListener("click", () => {
  state.queue = [];
  saveQueue();
  renderQueue();
  showToast("Queue cleared.");
});

els.downloadDirect.addEventListener("click", () => {
  const directItems = state.queue.filter((item) => item.direct);

  if (!directItems.length) {
    showToast("No direct video files in the queue.");
    return;
  }

  directItems.slice(0, 6).forEach((item, index) => {
    window.setTimeout(() => triggerDownload(item.url), index * 350);
  });

  showToast(`Starting ${Math.min(directItems.length, 6)} direct download${directItems.length === 1 ? "" : "s"}.`);
});

els.themeToggle.addEventListener("click", () => {
  const root = document.documentElement;
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  localStorage.setItem("vsc-theme", nextTheme);
});

function analyzeCurrentInput() {
  const value = els.input.value.trim();

  if (!value) {
    showToast("Paste a video URL first.");
    return;
  }

  analyzeUrl(value, { addToQueue: true });
}

function analyzeUrl(value, options = {}) {
  const { addToQueue = false, silent = false } = options;
  const parsed = parseUrl(value);

  if (!els.permission.checked) {
    showPermissionNeeded();
    return null;
  }

  if (!parsed.ok) {
    updateResult({
      status: "blocked",
      statusText: "Invalid",
      badge: "URL",
      title: "That link is not valid",
      text: "Check the address and try again.",
      source: "Invalid URL",
      format: "Unknown",
      size: "Not checked",
      mode: "Needs a valid link",
      downloadable: false,
      url: ""
    });
    if (!silent) showToast("The URL could not be read.");
    return null;
  }

  const url = parsed.url.href;
  const platform = detectPlatform(parsed.url);
  const direct = isDirectVideo(parsed.url);
  const entry = buildEntry(url, parsed.url, platform, direct);

  state.activeUrl = url;
  state.activeEntry = entry;

  if (direct) {
    updateResult({
      status: "ready",
      statusText: "Ready",
      badge: platform.short,
      title: "Direct video file detected",
      text: "This browser can open the media URL as an original-file download.",
      source: platform.name,
      format: getExtension(parsed.url) || "Video",
      size: "Checking...",
      mode: "Browser download",
      downloadable: true,
      url
    });
    inspectResource(url);
  } else {
    updateResult({
      status: "review",
      statusText: "Review",
      badge: platform.short,
      title: `${platform.name} link detected`,
      text: "Use an official creator export, account archive, or a direct media file from this source.",
      source: platform.name,
      format: "Provider controlled",
      size: "Not checked",
      mode: "Export workflow",
      downloadable: false,
      url
    });
  }

  enableLinkActions(url);

  if (addToQueue) {
    addToQueueList(entry);
  }

  return entry;
}

function parseUrl(value) {
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return { ok: true, url: new URL(withProtocol) };
  } catch {
    return { ok: false, url: null };
  }
}

function detectPlatform(url) {
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  const found = platforms.find((platform) =>
    platform.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  );

  if (found) return found;
  if (isDirectVideo(url)) return platforms.find((platform) => platform.name === "Direct file");

  return {
    name: "Web link",
    short: "WEB",
    color: "#00a6bf",
    domains: [],
    note: "General web URL."
  };
}

function isDirectVideo(url) {
  return directVideoPattern.test(url.pathname + url.search);
}

function getExtension(url) {
  const match = url.pathname.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toUpperCase() : "";
}

function buildEntry(url, parsedUrl, platform, direct) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    url,
    host: parsedUrl.hostname.replace(/^www\./, ""),
    platform: platform.name,
    short: platform.short,
    color: platform.color,
    direct,
    status: direct ? "Ready" : "Review"
  };
}

function updateResult(details) {
  els.statusPill.classList.remove("ready", "blocked");
  if (details.status === "ready") els.statusPill.classList.add("ready");
  if (details.status === "blocked") els.statusPill.classList.add("blocked");
  els.statusPill.lastChild.textContent = ` ${details.statusText}`;

  els.platformBadge.textContent = details.badge;
  els.resultTitle.textContent = details.title;
  els.resultText.textContent = details.text;
  els.metaSource.textContent = details.source;
  els.metaFormat.textContent = details.format;
  els.metaSize.textContent = details.size;
  els.metaMode.textContent = details.mode;

  if (details.downloadable) {
    els.downloadLink.href = details.url;
    els.downloadLink.setAttribute("download", filenameFromUrl(details.url));
    els.downloadLink.classList.remove("disabled");
    els.downloadLink.setAttribute("aria-disabled", "false");
  } else {
    els.downloadLink.href = "#";
    els.downloadLink.removeAttribute("download");
    els.downloadLink.classList.add("disabled");
    els.downloadLink.setAttribute("aria-disabled", "true");
  }
}

function enableLinkActions(url) {
  const enabled = Boolean(url);
  els.openSource.disabled = !enabled;
  els.copyLink.disabled = !enabled;
}

async function inspectResource(url) {
  try {
    const response = await fetch(url, { method: "HEAD", mode: "cors" });
    const length = response.headers.get("content-length");
    const type = response.headers.get("content-type");
    els.metaSize.textContent = length ? formatBytes(Number(length)) : "Unavailable";
    if (type) els.metaFormat.textContent = type.split(";")[0];
  } catch {
    els.metaSize.textContent = "Browser blocked";
  }
}

function addToQueueList(entry) {
  state.queue = [entry, ...state.queue.filter((item) => item.url !== entry.url)].slice(0, 16);
  saveQueue();
  renderQueue();
}

function renderQueue() {
  if (!state.queue.length) {
    els.queueList.innerHTML = `<div class="queue-empty">No links added yet.</div>`;
    return;
  }

  els.queueList.innerHTML = state.queue
    .map(
      (item) => `
        <article class="queue-item">
          <span class="platform-token" style="background:${item.color}">${escapeHtml(item.short)}</span>
          <div>
            <p class="queue-title">${escapeHtml(item.platform)} <span class="muted-host">${escapeHtml(item.host)}</span></p>
            <p class="queue-url">${escapeHtml(item.url)}</p>
          </div>
          <span class="queue-status ${item.direct ? "ready" : "review"}">${escapeHtml(item.status)}</span>
        </article>
      `
    )
    .join("");
}

function renderPlatformFilters() {
  els.quickPlatforms.innerHTML = platforms
    .slice(0, 9)
    .map((platform) => `<span class="quick-chip">${escapeHtml(platform.name)}</span>`)
    .join("");
}

function renderPlatformCards() {
  els.platformGrid.innerHTML = platforms
    .map(
      (platform) => `
        <article class="platform-card">
          <header>
            <span class="platform-token" style="background:${platform.color}">${escapeHtml(platform.short)}</span>
            <h3>${escapeHtml(platform.name)}</h3>
          </header>
          <p>${escapeHtml(platform.note)}</p>
        </article>
      `
    )
    .join("");
}

function showPermissionNeeded() {
  updateResult({
    status: "blocked",
    statusText: "Permission",
    badge: "OK",
    title: "Confirm permission first",
    text: "Downloads should be limited to videos you own, created, licensed, or are otherwise allowed to save.",
    source: "Not checked",
    format: "Unknown",
    size: "Not checked",
    mode: "Permission required",
    downloadable: false,
    url: ""
  });
  enableLinkActions("");
  showToast("Confirm permission to continue.");
}

function triggerDownload(url) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filenameFromUrl(url);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function filenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").filter(Boolean).pop();
    return name || "video-download";
  } catch {
    return "video-download";
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unavailable";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("visible");
  }, 2600);
}

function saveQueue() {
  localStorage.setItem("vsc-queue", JSON.stringify(state.queue));
}

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem("vsc-queue")) || [];
  } catch {
    return [];
  }
}

function restoreTheme() {
  const saved = localStorage.getItem("vsc-theme");
  if (saved === "dark") {
    document.documentElement.dataset.theme = "dark";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
