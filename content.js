(() => {
  "use strict";

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3];
  const PASS = "data-igvc-pass";
  const KEEP = "data-igvc-keep";
  const INTERACTIVE =
    'a,button,input,textarea,select,[role="button"],[role="link"],[tabindex]:not([tabindex="-1"])';
  const NATIVE_STRIP = 56; // height of Chrome's native control strip
  const DECK_H = 112; // scrim + controls, px
  const IDLE_HIDE_MS = 2200;
  const THUMB_MAX = 160; // long edge of a hover preview frame
  const THUMB_BUCKETS = 60;
  const THUMB_COLS = 10;
  // Instagram's story-ring gradient; the progress fill walks through it.
  const IG = [[254, 218, 117], [250, 126, 30], [214, 41, 118], [150, 47, 191], [79, 91, 213]];

  const svg = (body, attrs = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') =>
    `<svg viewBox="0 0 24 24" ${attrs} aria-hidden="true">${body}</svg>`;
  const SPEAKER = '<path d="M11 5 6.5 8.8H3.8a.8.8 0 0 0-.8.8v4.8a.8.8 0 0 0 .8.8h2.7L11 19V5z" fill="currentColor"/>';
  const ICONS = {
    play: svg('<path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"/>', 'fill="currentColor"'),
    pause: svg('<rect x="6" y="4.5" width="4.2" height="15" rx="1.3"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3"/>', 'fill="currentColor"'),
    vhigh: svg(SPEAKER + '<path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4"/><path d="M18.4 6a8.5 8.5 0 0 1 0 12"/>'),
    vlow: svg(SPEAKER + '<path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4"/>'),
    vmute: svg(SPEAKER + '<path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
    back: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><text class="igvc-n" x="12" y="15.4" fill="currentColor" stroke="none" font-size="8" font-weight="700" text-anchor="middle" font-family="system-ui,sans-serif">5</text>'),
    fwd: svg('<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><text class="igvc-n" x="12" y="15.4" fill="currentColor" stroke="none" font-size="8" font-weight="700" text-anchor="middle" font-family="system-ui,sans-serif">5</text>'),
    pip: svg('<rect x="2.8" y="4.8" width="18.4" height="14.4" rx="2.4"/><rect x="12" y="11.5" width="6.8" height="5.2" rx="1" fill="currentColor" stroke="none"/>'),
    fs: svg('<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>', 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'),
    chevs: svg('<path d="m5 7 5 5-5 5"/><path d="m11 7 5 5-5 5"/><path d="m17 7 5 5-5 5"/>', 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"')
  };

  const settings = {
    enabled: true,
    mode: "custom", // custom | native
    seekStep: 5,
    defaultSpeed: 1,
    alwaysShowBar: false,
    barPosition: "bottom", // bottom | top | below
    rightGutter: 48
  };

  /** video -> entry (see buildBar) */
  const entries = new Map();
  /** videos we turned native controls on for */
  const nativeVideos = new Set();
  let layer = null;
  let topLayerCount = 0;
  const mouse = { x: -1, y: -1, t: 0 };

  /* ---------- settings ---------- */

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in settings) settings[key] = newValue;
    }
    applySettings();
  });

  function applySettings() {
    const custom = settings.enabled && settings.mode === "custom";
    const native = settings.enabled && settings.mode === "native";

    if (!custom) for (const v of [...entries.keys()]) detach(v);
    if (!native) restoreNative();

    if (layer) layer.classList.toggle("igvc-off", !custom);
    for (const { els } of entries.values()) setSeekLabels(els);
    scan();
  }

  /* ---------- helpers ---------- */

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
  };

  const fmtRate = (r) => `${r}×`;

  function gradientAt(p) {
    const x = clamp(p, 0, 1) * (IG.length - 1);
    const i = Math.min(IG.length - 2, Math.floor(x));
    const f = x - i;
    return IG[i].map((c, k) => Math.round(c + (IG[i + 1][k] - c) * f));
  }

  function overlap(a, b) {
    const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return (w * h) / (b.width * b.height || 1);
  }

  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    return (
      el.tagName === "INPUT" && !el.classList.contains("igvc-vol") ||
      el.tagName === "TEXTAREA" ||
      el.isContentEditable ||
      el.getAttribute("role") === "textbox"
    );
  }

  function activeVideo() {
    const fs = document.fullscreenElement;
    if (fs) return fs.tagName === "VIDEO" ? fs : fs.querySelector("video");

    let best = null;
    let bestArea = 0;
    for (const v of document.querySelectorAll("video")) {
      const r = v.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) continue;
      const visible =
        Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) *
        Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      if (visible > bestArea) {
        bestArea = visible;
        best = v;
      }
    }
    return bestArea > 0 ? best : null;
  }

  /** Corner radius of the rounded box Instagram clips the video with. */
  function clipRadius(video) {
    let el = video;
    for (let i = 0; i < 5 && el; i++, el = el.parentElement) {
      const r = parseFloat(getComputedStyle(el).borderBottomLeftRadius);
      if (r > 0) return r;
    }
    return 0;
  }

  /* ---------- top layer ---------- */

  /**
   * The overlay is a manual popover: it renders in the browser's top layer,
   * above every z-index on the page, so Instagram's overlays can never cover
   * it. It is appended to <body>, outside Instagram's React root, so React's
   * delegated handlers never see our events either.
   */
  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div");
    layer.className = "igvc-layer";
    layer.setAttribute("popover", "manual");
    layer.classList.toggle("igvc-off", !(settings.enabled && settings.mode === "custom"));

    // Keep Instagram's document/window listeners ("click outside closes the
    // post", tap-to-mute, etc.) from reacting to clicks on our controls.
    for (const t of ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "contextmenu"]) {
      layer.addEventListener(t, (e) => e.stopPropagation());
    }

    (document.body || document.documentElement).appendChild(layer);
    raise();
    return layer;
  }

  /** Move our popover to the top of the top-layer stack. */
  function raise() {
    if (!layer || typeof layer.showPopover !== "function") return;
    try {
      if (layer.matches(":popover-open")) layer.hidePopover();
      layer.showPopover();
    } catch {
      /* not connected yet */
    }
  }

  /** Re-raise when Instagram opens its own dialog/popover in the top layer. */
  function checkTopLayer() {
    let n = 0;
    try {
      for (const el of document.querySelectorAll(":modal, :popover-open")) {
        if (el !== layer) n++;
      }
    } catch {
      return;
    }
    if (n !== topLayerCount) {
      topLayerCount = n;
      raise();
    }
  }

  document.addEventListener("fullscreenchange", () => {
    const fs = document.fullscreenElement;
    // A fullscreened <video> uses Chrome's own controls; ours would duplicate them.
    if (layer) layer.classList.toggle("igvc-native-fs", !!fs && fs.tagName === "VIDEO");
    raise();
  });

  /* ---------- feedback HUD ---------- */

  function flash(video, icon, label = "") {
    const entry = entries.get(video);
    if (!entry) return;
    const disk = entry.els.disk;
    disk.innerHTML = (icon || "") + (label ? `<span class="igvc-disk-label">${label}</span>` : "");
    disk.classList.toggle("igvc-disk-text", !icon);
    disk.classList.remove("igvc-flash");
    void disk.offsetWidth;
    disk.classList.add("igvc-flash");
  }

  function flashSeek(video, delta) {
    const entry = entries.get(video);
    if (!entry) return;
    const pill = delta > 0 ? entry.els.seekR : entry.els.seekL;
    entry.seekAcc = pill === entry.lastPill && performance.now() - entry.lastSeekAt < 900
      ? entry.seekAcc + Math.abs(delta)
      : Math.abs(delta);
    entry.lastPill = pill;
    entry.lastSeekAt = performance.now();
    pill.querySelector(".igvc-seek-n").textContent = `${Math.round(entry.seekAcc)} sn`;
    pill.classList.remove("igvc-flash");
    void pill.offsetWidth;
    pill.classList.add("igvc-flash");
  }

  const volumeIcon = (v) => (v.muted || v.volume === 0 ? ICONS.vmute : v.volume < 0.5 ? ICONS.vlow : ICONS.vhigh);

  /* ---------- actions ---------- */

  function seek(video, delta) {
    const d = video.duration;
    const t = video.currentTime + delta;
    video.currentTime = isFinite(d) ? clamp(t, 0, d) : Math.max(0, t);
    flashSeek(video, delta);
  }

  function togglePlay(video, feedback) {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    if (feedback) flash(video, video.paused ? ICONS.pause : ICONS.play);
  }

  function setVolume(video, vol) {
    video.volume = clamp(vol, 0, 1);
    video.muted = video.volume === 0;
    flash(video, volumeIcon(video), `${Math.round(video.volume * 100)}%`);
  }

  function toggleMute(video, feedback) {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;
    if (feedback) flash(video, volumeIcon(video));
  }

  function setSpeed(video, rate, feedback) {
    video.playbackRate = rate;
    if (feedback) flash(video, null, fmtRate(rate));
  }

  function stepSpeed(video, dir) {
    const idx = SPEEDS.indexOf(video.playbackRate);
    const base = idx === -1 ? SPEEDS.indexOf(1) : idx;
    setSpeed(video, SPEEDS[clamp(base + dir, 0, SPEEDS.length - 1)], true);
  }

  /**
   * Fullscreen the <video> element itself with Chrome's native controls.
   * Only that element is rendered in fullscreen, so none of Instagram's
   * overlays come along.
   */
  function toggleFullscreen(video) {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    const hadControls = video.controls;
    video.controls = true;
    video
      .requestFullscreen()
      .then(() => {
        const restore = () => {
          if (document.fullscreenElement) return;
          document.removeEventListener("fullscreenchange", restore);
          if (!hadControls && !nativeVideos.has(video)) video.controls = false;
        };
        document.addEventListener("fullscreenchange", restore);
      })
      .catch(() => {
        video.controls = hadControls;
      });
  }

  function togglePip(video) {
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    else video.requestPictureInPicture?.().catch(() => {});
  }

  /* ---------- hover preview frames ---------- */

  /**
   * Frames are snapshotted into a sprite while the video plays, so hovering
   * the seek bar can show any moment the viewer has already passed through.
   * Instagram serves one stream per element, so there is no second decoder
   * to pull unseen frames from.
   */
  function captureFrame(video, entry, now) {
    if (now - entry.lastCapture < 180) return;
    if (video.readyState < 2 || video.seeking || !video.videoWidth) return;
    const d = video.duration;
    if (!isFinite(d) || d <= 0) return;

    let th = entry.thumbs;
    if (!th || Math.abs(th.duration - d) > 0.5) {
      const buckets = Math.max(1, Math.min(THUMB_BUCKETS, Math.ceil(d)));
      const aspect = video.videoWidth / video.videoHeight;
      const w = aspect >= 1 ? THUMB_MAX : Math.round(THUMB_MAX * aspect);
      const h = aspect >= 1 ? Math.round(THUMB_MAX / aspect) : THUMB_MAX;
      const sprite = document.createElement("canvas");
      sprite.width = w * THUMB_COLS;
      sprite.height = h * Math.ceil(buckets / THUMB_COLS);
      th = entry.thumbs = { duration: d, buckets, w, h, sprite, ctx: sprite.getContext("2d"), filled: new Set() };
      entry.els.thumb.width = w;
      entry.els.thumb.height = h;
    }

    const b = Math.min(th.buckets - 1, Math.floor((video.currentTime / d) * th.buckets));
    if (th.filled.has(b)) return;
    try {
      th.ctx.drawImage(video, (b % THUMB_COLS) * th.w, Math.floor(b / THUMB_COLS) * th.h, th.w, th.h);
      th.filled.add(b);
    } catch {
      /* frame not decodable yet */
    }
    entry.lastCapture = now;
  }

  function drawPreview(entry, p) {
    const th = entry.thumbs;
    const canvas = entry.els.thumb;
    if (!th) {
      canvas.hidden = true;
      return;
    }
    const want = Math.min(th.buckets - 1, Math.floor(p * th.buckets));
    let b = -1;
    for (let off = 0; off <= 2 && b < 0; off++) {
      if (th.filled.has(want - off)) b = want - off;
      else if (th.filled.has(want + off)) b = want + off;
    }
    if (b < 0) {
      canvas.hidden = true;
      return;
    }
    canvas.hidden = false;
    canvas
      .getContext("2d")
      .drawImage(th.sprite, (b % THUMB_COLS) * th.w, Math.floor(b / THUMB_COLS) * th.h, th.w, th.h, 0, 0, th.w, th.h);
  }

  /* ---------- custom bar ---------- */

  function setSeekLabels(els) {
    for (const n of [...els.back.querySelectorAll(".igvc-n"), ...els.fwd.querySelectorAll(".igvc-n")]) {
      n.textContent = settings.seekStep;
    }
    els.back.dataset.tip = `${settings.seekStep} sn geri`;
    els.fwd.dataset.tip = `${settings.seekStep} sn ileri`;
  }

  function buildBar(video) {
    const bar = document.createElement("div");
    bar.className = "igvc-bar";
    bar.innerHTML = `
      <div class="igvc-scrim"></div>
      <div class="igvc-mini"><div class="igvc-mini-fill"></div></div>
      <div class="igvc-deck">
        <div class="igvc-tip"><span class="igvc-tip-l"></span><kbd></kbd></div>
        <div class="igvc-track" role="slider" aria-label="Videoda konum" tabindex="0">
          <div class="igvc-rail">
            <div class="igvc-buf"></div>
            <div class="igvc-ghost"></div>
            <div class="igvc-fill"></div>
          </div>
          <div class="igvc-knob"></div>
          <div class="igvc-preview">
            <canvas class="igvc-thumb" hidden></canvas>
            <span class="igvc-ptime">0:00</span>
          </div>
        </div>
        <div class="igvc-row">
          <button class="igvc-btn igvc-play" data-tip="Oynat" data-key="Space">${ICONS.play}${ICONS.pause}</button>
          <button class="igvc-btn igvc-back" data-key="←">${ICONS.back}</button>
          <button class="igvc-btn igvc-fwd" data-key="→">${ICONS.fwd}</button>
          <div class="igvc-volgroup">
            <button class="igvc-btn igvc-mute" data-tip="Sessiz" data-key="M">${ICONS.vhigh}${ICONS.vlow}${ICONS.vmute}</button>
            <input class="igvc-vol" type="range" min="0" max="1" step="0.01" aria-label="Ses seviyesi">
          </div>
          <span class="igvc-time"><span class="igvc-cur">0:00</span><span class="igvc-sep">/</span><span class="igvc-dur">0:00</span></span>
          <span class="igvc-spacer"></span>
          <div class="igvc-speedwrap">
            <button class="igvc-btn igvc-speed" data-tip="Oynatma hızı" data-key="&lt; &gt;" aria-haspopup="menu">1×</button>
            <div class="igvc-menu" role="menu">
              ${[...SPEEDS].reverse().map((s) => `<button class="igvc-opt" role="menuitemradio" data-speed="${s}">${s === 1 ? "Normal" : fmtRate(s)}</button>`).join("")}
            </div>
          </div>
          <button class="igvc-btn igvc-pip" data-tip="Pencerede oynat" data-key="P">${ICONS.pip}</button>
          <button class="igvc-btn igvc-fs" data-tip="Tam ekran" data-key="F">${ICONS.fs}</button>
        </div>
      </div>
    `;

    const hud = document.createElement("div");
    hud.className = "igvc-hud";
    hud.innerHTML = `
      <div class="igvc-disk"></div>
      <div class="igvc-seek igvc-seek-l">${ICONS.chevs}<span class="igvc-seek-n"></span></div>
      <div class="igvc-seek igvc-seek-r"><span class="igvc-seek-n"></span>${ICONS.chevs}</div>
    `;

    const $ = (s) => bar.querySelector(s);
    const els = {
      deck: $(".igvc-deck"),
      tip: $(".igvc-tip"),
      tipLabel: $(".igvc-tip-l"),
      tipKey: $(".igvc-tip kbd"),
      track: $(".igvc-track"),
      buf: $(".igvc-buf"),
      ghost: $(".igvc-ghost"),
      preview: $(".igvc-preview"),
      thumb: $(".igvc-thumb"),
      ptime: $(".igvc-ptime"),
      play: $(".igvc-play"),
      back: $(".igvc-back"),
      fwd: $(".igvc-fwd"),
      mute: $(".igvc-mute"),
      vol: $(".igvc-vol"),
      volgroup: $(".igvc-volgroup"),
      cur: $(".igvc-cur"),
      dur: $(".igvc-dur"),
      speedwrap: $(".igvc-speedwrap"),
      speed: $(".igvc-speed"),
      opts: [...bar.querySelectorAll(".igvc-opt")],
      disk: hud.querySelector(".igvc-disk"),
      seekL: hud.querySelector(".igvc-seek-l"),
      seekR: hud.querySelector(".igvc-seek-r")
    };

    const entry = {
      bar, hud, els,
      radius: clipRadius(video),
      scrubbing: false,
      menuOpen: false,
      inDeck: false,
      hoverP: -1,
      thumbs: null,
      lastCapture: 0,
      seekAcc: 0,
      lastPill: null,
      lastSeekAt: 0,
      last: {}
    };
    bar.style.setProperty("--r", entry.radius + "px");
    setSeekLabels(els);

    /* buttons */
    els.play.addEventListener("click", () => togglePlay(video, false));
    els.back.addEventListener("click", () => seek(video, -settings.seekStep));
    els.fwd.addEventListener("click", () => seek(video, settings.seekStep));
    els.mute.addEventListener("click", () => toggleMute(video, false));
    bar.querySelector(".igvc-pip").addEventListener("click", () => togglePip(video));
    bar.querySelector(".igvc-fs").addEventListener("click", () => toggleFullscreen(video));

    /* volume: slider + mouse wheel over the whole group */
    els.vol.addEventListener("input", () => {
      video.volume = Number(els.vol.value);
      video.muted = video.volume === 0;
    });
    els.volgroup.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        setVolume(video, (video.muted ? 0 : video.volume) + (e.deltaY < 0 ? 0.05 : -0.05));
      },
      { passive: false }
    );

    /* speed menu */
    const setMenu = (open) => {
      entry.menuOpen = open;
      els.speedwrap.classList.toggle("igvc-menu-open", open);
      if (open) hideTip();
    };
    els.speed.addEventListener("click", () => setMenu(!entry.menuOpen));
    els.speed.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        stepSpeed(video, e.deltaY < 0 ? 1 : -1);
      },
      { passive: false }
    );
    for (const opt of els.opts) {
      opt.addEventListener("click", () => {
        setSpeed(video, Number(opt.dataset.speed), false);
        setMenu(false);
      });
    }
    entry.closeMenu = () => setMenu(false);

    /* tooltips */
    const hideTip = () => els.tip.classList.remove("igvc-on");
    for (const btn of bar.querySelectorAll(".igvc-btn")) {
      btn.addEventListener("pointerenter", () => {
        if (entry.menuOpen) return;
        els.tipLabel.textContent = btn.dataset.tip || "";
        els.tipKey.textContent = btn.dataset.key || "";
        els.tipKey.hidden = !btn.dataset.key;
        const deck = els.deck.getBoundingClientRect();
        const b = btn.getBoundingClientRect();
        const half = els.tip.offsetWidth / 2;
        const x = clamp(b.left + b.width / 2 - deck.left, half + 4, deck.width - half - 4);
        els.tip.style.setProperty("--tx", x + "px");
        els.tip.classList.add("igvc-on");
      });
      btn.addEventListener("pointerleave", hideTip);
      btn.addEventListener("pointerdown", hideTip);
    }

    /* deck hover keeps the controls up while the pointer is on them */
    els.deck.addEventListener("pointerenter", () => { entry.inDeck = true; });
    els.deck.addEventListener("pointerleave", () => { entry.inDeck = false; });

    /* scrubbing + hover preview */
    const pAt = (clientX) => {
      const r = els.track.getBoundingClientRect();
      return clamp((clientX - r.left) / r.width, 0, 1);
    };
    const showPreview = (p) => {
      entry.hoverP = p;
      const d = video.duration;
      if (!isFinite(d) || d <= 0) return;
      const w = els.track.clientWidth;
      const half = Math.max(els.preview.offsetWidth / 2, 24);
      els.preview.style.setProperty("--hx", clamp(p * w, half, w - half) + "px");
      els.ptime.textContent = fmt(p * d);
      drawPreview(entry, p);
      bar.classList.add("igvc-previewing");
    };
    let resumeAfterScrub = false;
    els.track.addEventListener("pointerdown", (e) => {
      const d = video.duration;
      if (!isFinite(d) || d <= 0) return;
      entry.scrubbing = true;
      bar.classList.add("igvc-scrubbing");
      resumeAfterScrub = !video.paused;
      video.pause();
      els.track.setPointerCapture(e.pointerId);
      const p = pAt(e.clientX);
      video.currentTime = p * d;
      showPreview(p);
      e.preventDefault();
    });
    els.track.addEventListener("pointermove", (e) => {
      const p = pAt(e.clientX);
      showPreview(p);
      if (entry.scrubbing) video.currentTime = p * video.duration;
    });
    const endScrub = () => {
      if (!entry.scrubbing) return;
      entry.scrubbing = false;
      bar.classList.remove("igvc-scrubbing");
      if (resumeAfterScrub) video.play().catch(() => {});
    };
    els.track.addEventListener("pointerup", endScrub);
    els.track.addEventListener("pointercancel", endScrub);
    els.track.addEventListener("pointerleave", () => {
      if (entry.scrubbing) return;
      entry.hoverP = -1;
      bar.classList.remove("igvc-previewing");
    });
    els.track.addEventListener("lostpointercapture", () => {
      endScrub();
      if (!els.track.matches(":hover")) {
        entry.hoverP = -1;
        bar.classList.remove("igvc-previewing");
      }
    });

    ensureLayer().append(hud, bar);
    entries.set(video, entry);
  }

  function detach(video) {
    const entry = entries.get(video);
    if (!entry) return;
    entry.bar.remove();
    entry.hud.remove();
    entries.delete(video);
  }

  function place(video, entry, now) {
    const { bar, hud } = entry;
    const r = video.getBoundingClientRect();

    if (r.width < 200 || r.height < 140 || r.bottom < 40 || r.top > innerHeight - 40) {
      bar.style.display = hud.style.display = "none";
      return;
    }
    bar.style.display = hud.style.display = "";

    hud.style.transform = `translate(${r.left}px, ${r.top}px)`;
    hud.style.width = r.width + "px";
    hud.style.height = r.height + "px";

    const pos = settings.barPosition;
    const top = pos === "top" ? r.top : pos === "below" ? r.bottom + 6 : r.bottom - DECK_H;
    bar.style.transform = `translate(${r.left}px, ${top}px)`;
    bar.style.width = r.width + "px";
    const gutter = pos === "below" ? 0 : settings.rightGutter;
    bar.style.setProperty("--igvc-gutter", gutter + "px");
    bar.classList.toggle("igvc-pos-top", pos === "top");
    bar.classList.toggle("igvc-pos-below", pos === "below");

    // Shed secondary controls as the player narrows (feed/reels are ~400px).
    const room = r.width - 20 - gutter;
    bar.classList.toggle("igvc-compact", room < 392);
    bar.classList.toggle("igvc-narrow", room < 316);

    const reach = pos === "below" ? 90 : 0;
    const near =
      mouse.x >= r.left && mouse.x <= r.right &&
      mouse.y >= r.top && mouse.y <= r.bottom + reach;
    const idle = now - mouse.t > IDLE_HIDE_MS;

    const show =
      settings.alwaysShowBar ||
      pos === "below" ||
      video.paused ||
      entry.scrubbing ||
      entry.menuOpen ||
      entry.inDeck ||
      (near && !idle);
    bar.classList.toggle("igvc-show", show);
    if (!show && entry.menuOpen) entry.closeMenu();
  }

  function paint(video, entry) {
    const { bar, els, last } = entry;
    const d = video.duration;
    const p = isFinite(d) && d > 0 ? video.currentTime / d : 0;

    bar.style.setProperty("--p", (p * 100).toFixed(3) + "%");
    const [cr, cg, cb] = gradientAt(p);
    bar.style.setProperty("--kc", `rgba(${cr}, ${cg}, ${cb}, 0.45)`);
    els.ghost.style.width = entry.hoverP >= 0 ? entry.hoverP * 100 + "%" : "0";

    const cur = fmt(video.currentTime);
    if (last.cur !== cur) els.cur.textContent = last.cur = cur;
    const dur = isFinite(d) ? fmt(d) : "–:––";
    if (last.dur !== dur) els.dur.textContent = last.dur = dur;
    els.track.setAttribute("aria-valuetext", `${cur} / ${dur}`);

    const playing = !video.paused;
    if (last.playing !== playing) {
      last.playing = playing;
      bar.classList.toggle("igvc-playing", playing);
      els.play.dataset.tip = playing ? "Duraklat" : "Oynat";
    }

    const vstate = video.muted || video.volume === 0 ? "mute" : video.volume < 0.5 ? "low" : "high";
    if (last.vstate !== vstate) {
      bar.classList.remove("igvc-v-" + last.vstate);
      bar.classList.add("igvc-v-" + vstate);
      els.mute.dataset.tip = vstate === "mute" ? "Sesi aç" : "Sessiz";
      last.vstate = vstate;
    }
    const vol = video.muted ? 0 : video.volume;
    if (document.activeElement !== els.vol) els.vol.value = vol;
    els.vol.style.setProperty("--v", vol * 100 + "%");

    const rate = video.playbackRate;
    if (last.rate !== rate) {
      last.rate = rate;
      els.speed.textContent = fmtRate(rate);
      els.speed.classList.toggle("igvc-speed-on", rate !== 1);
      for (const o of els.opts) o.setAttribute("aria-checked", String(Number(o.dataset.speed) === rate));
    }

    let buffered = 0;
    if (isFinite(d) && d > 0) {
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= video.currentTime && video.currentTime <= video.buffered.end(i)) {
          buffered = video.buffered.end(i) / d;
          break;
        }
      }
    }
    els.buf.style.width = buffered * 100 + "%";
  }

  function frame(now) {
    for (const [video, entry] of entries) {
      if (!video.isConnected) {
        detach(video);
        continue;
      }
      place(video, entry, now);
      if (entry.bar.style.display === "none") continue;
      paint(video, entry);
      captureFrame(video, entry, now);
    }
    requestAnimationFrame(frame);
  }

  // Close an open speed menu on any press outside it.
  document.addEventListener(
    "pointerdown",
    (e) => {
      for (const entry of entries.values()) {
        if (entry.menuOpen && !entry.els.speedwrap.contains(e.target)) entry.closeMenu();
      }
    },
    true
  );

  document.addEventListener(
    "pointermove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.t = performance.now();
    },
    { passive: true, capture: true }
  );

  /* ---------- native mode ---------- */

  /**
   * Instagram stacks transparent click-catcher divs over every video. In
   * native mode those become click-through so Chrome's own controls work,
   * while small real buttons sitting above the control strip (carousel
   * arrows, tags) stay clickable.
   */
  function unblock(video) {
    const r = video.getBoundingClientRect();
    if (r.width < 200 || r.height < 120) return;

    const stripY = r.bottom - 20;
    const points = [
      [r.left + r.width * 0.5, r.top + r.height * 0.5],
      [r.left + r.width * 0.5, r.top + r.height * 0.25],
      [r.left + r.width * 0.5, r.top + r.height * 0.75]
    ];
    for (let fx = 0.04; fx < 1; fx += 0.12) points.push([r.left + r.width * fx, stripY]);

    for (const [x, y] of points) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;

      // Peel layers until the video itself is the hit target.
      for (let pass = 0; pass < 8; pass++) {
        const stack = document.elementsFromPoint(x, y);
        const vi = stack.indexOf(video);
        if (vi <= 0) break;

        let changed = false;
        for (let i = 0; i < vi; i++) {
          const el = stack[i];
          if (el.contains(video) || el.hasAttribute(KEEP) || (layer && layer.contains(el))) continue;

          const er = el.getBoundingClientRect();
          const inStrip = er.bottom > r.bottom - NATIVE_STRIP;

          if (overlap(er, r) >= 0.4) {
            el.setAttribute(PASS, "");
            keepButtonsInside(el, r);
            changed = true;
            continue;
          }

          const owner = el.closest(INTERACTIVE);
          const ownerRect = owner && owner.getBoundingClientRect();
          const smallButtonAboveStrip =
            owner && overlap(ownerRect, r) < 0.4 && ownerRect.bottom <= r.bottom - NATIVE_STRIP;
          if (smallButtonAboveStrip && !inStrip) continue;

          el.setAttribute(PASS, "");
          changed = true;
        }
        if (!changed) break;
      }
    }
  }

  function keepButtonsInside(overlay, r) {
    for (const el of overlay.querySelectorAll(INTERACTIVE)) {
      if (el.hasAttribute(PASS)) continue;
      const er = el.getBoundingClientRect();
      if (!er.width || !er.height) continue;
      if (overlap(er, r) < 0.4 && er.bottom <= r.bottom - NATIVE_STRIP) el.setAttribute(KEEP, "");
    }
  }

  function enableNative(video) {
    if (!video.controls) video.controls = true;
    nativeVideos.add(video);
  }

  function restoreNative() {
    for (const v of nativeVideos) if (v.isConnected && document.fullscreenElement !== v) v.controls = false;
    nativeVideos.clear();
    for (const el of document.querySelectorAll(`[${PASS}],[${KEEP}]`)) {
      el.removeAttribute(PASS);
      el.removeAttribute(KEEP);
    }
  }

  setInterval(() => {
    if (!settings.enabled || settings.mode !== "native") return;
    for (const v of document.querySelectorAll("video")) {
      const r = v.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.width < 200) continue;
      enableNative(v); // React re-renders can drop the attribute
      unblock(v);
    }
  }, 600);

  /* ---------- keyboard ---------- */

  const KEYS = {
    " ": (v) => togglePlay(v, true),
    k: (v) => togglePlay(v, true),
    ArrowRight: (v) => seek(v, settings.seekStep),
    ArrowLeft: (v) => seek(v, -settings.seekStep),
    l: (v) => seek(v, 10),
    j: (v) => seek(v, -10),
    m: (v) => toggleMute(v, true),
    f: (v) => toggleFullscreen(v),
    p: (v) => togglePip(v),
    ">": (v) => stepSpeed(v, 1),
    "<": (v) => stepSpeed(v, -1),
    ".": (v) => { v.pause(); v.currentTime += 1 / 30; },
    ",": (v) => { v.pause(); v.currentTime -= 1 / 30; },
    Home: (v) => { v.currentTime = 0; },
    End: (v) => { if (isFinite(v.duration)) v.currentTime = v.duration; },
    Escape: (v) => entries.get(v)?.closeMenu()
  };

  document.addEventListener(
    "keydown",
    (e) => {
      if (!settings.enabled) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping()) return;

      if (/^[0-9]$/.test(e.key)) {
        const v = activeVideo();
        if (!v || !isFinite(v.duration)) return;
        v.currentTime = (Number(e.key) / 10) * v.duration;
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      const handler = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key] || KEYS[e.key];
      if (!handler) return;

      const video = activeVideo();
      if (!video) return;

      handler(video);
      e.preventDefault();
      // Instagram binds arrows and space to carousel / feed navigation.
      e.stopImmediatePropagation();
    },
    true
  );

  /* ---------- discovery ---------- */

  let queued = false;
  function scan() {
    queued = false;
    if (!settings.enabled) return;
    checkTopLayer();

    const seen = new Set();
    for (const v of document.querySelectorAll("video")) {
      seen.add(v);
      if (v.dataset.igvcInit !== "1") {
        v.dataset.igvcInit = "1";
        if (settings.defaultSpeed !== 1) v.playbackRate = settings.defaultSpeed;
        v.removeAttribute("disablepictureinpicture");
        v.disablePictureInPicture = false;
      }
      if (settings.mode === "custom" && !entries.has(v)) buildBar(v);
    }
    for (const v of entries.keys()) if (!seen.has(v)) detach(v);
    for (const v of nativeVideos) if (!v.isConnected) nativeVideos.delete(v);
  }

  function queueScan() {
    if (queued) return;
    queued = true;
    setTimeout(scan, 150);
  }

  new MutationObserver(queueScan).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  ensureLayer();
  requestAnimationFrame(frame);

  chrome.storage.sync.get(settings, (stored) => {
    Object.assign(settings, stored);
    applySettings();
  });
})();
