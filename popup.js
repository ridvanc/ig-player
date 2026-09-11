const DEFAULTS = {
  enabled: true,
  mode: "custom",
  seekStep: 5,
  defaultSpeed: 1,
  alwaysShowBar: false,
  barPosition: "bottom",
  rightGutter: 48
};

const fields = {
  enabled: document.getElementById("enabled"),
  mode: document.getElementById("mode"),
  alwaysShowBar: document.getElementById("alwaysShowBar"),
  seekStep: document.getElementById("seekStep"),
  defaultSpeed: document.getElementById("defaultSpeed"),
  barPosition: document.getElementById("barPosition"),
  rightGutter: document.getElementById("rightGutter")
};

chrome.storage.sync.get(DEFAULTS, (s) => {
  fields.enabled.checked = s.enabled;
  fields.mode.value = s.mode;
  fields.alwaysShowBar.checked = s.alwaysShowBar;
  fields.seekStep.value = s.seekStep;
  fields.defaultSpeed.value = String(s.defaultSpeed);
  fields.barPosition.value = s.barPosition;
  fields.rightGutter.value = s.rightGutter;
});

const save = () =>
  chrome.storage.sync.set({
    enabled: fields.enabled.checked,
    mode: fields.mode.value,
    alwaysShowBar: fields.alwaysShowBar.checked,
    seekStep: Number(fields.seekStep.value) || DEFAULTS.seekStep,
    defaultSpeed: Number(fields.defaultSpeed.value),
    barPosition: fields.barPosition.value,
    rightGutter: Number(fields.rightGutter.value) || 0
  });

for (const el of Object.values(fields)) {
  el.addEventListener("change", save);
}
