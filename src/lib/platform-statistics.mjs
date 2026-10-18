// Keep the deployment copy in olymp/js and olymp/laravel/public/js identical.
export const MEASUREMENT_ID = "G-R1NG3BPTB3";
export const CONSENT_KEY = "maths4u-platform-statistics-v1";
const lifetime = 180 * 24 * 60 * 60 * 1000;

// Only catalogue pages. Exercise URLs, account details, queries and fragments
// never enter the measurement configuration or events.
export function publicPage(host, path) {
  const pages = host === "arena.maths4u.sbs" ? ["/", "/courses", "/library"]
    : host === "olymp.maths4u.sbs" ? ["/", "/courses", "/ladders"] : [];
  const clean = path.replace(/\/$/, "") || "/";
  return pages.includes(clean) ? clean : null;
}

export function createStatistics({ container, win = window, doc = document }) {
  let path = "/", eligible = false, language = "en", lastPage = null, expanded = false;
  let loaded = false, configured = false;
  const disable = `ga-disable-${MEASUREMENT_ID}`;
  win[disable] = true;
  let consent = readConsent();

  function readConsent() {
    try {
      const saved = JSON.parse(win.localStorage.getItem(CONSENT_KEY));
      return saved && ["granted", "denied"].includes(saved.value)
        && saved.time <= Date.now() && Date.now() - saved.time < lifetime ? saved.value : null;
    } catch { return null; }
  }
  function gtag() { win.dataLayer.push(arguments); }
  function pageFields() {
    let referrer = "";
    try { referrer = new URL(doc.referrer).origin; } catch { /* No referrer. */ }
    return {
      page_location: `https://${win.location.hostname}${path}`,
      page_title: win.location.hostname === "arena.maths4u.sbs" ? "Maths4U Arena" : "Olympiad Mathematics",
      page_referrer: referrer,
    };
  }
  function measure() {
    const allowed = eligible && path !== null && consent === "granted";
    win[disable] = !allowed;
    if (!allowed) { lastPage = null; return; }
    win.dataLayer = win.dataLayer || [];
    if (!configured) {
      gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      gtag("js", new Date());
      gtag("config", MEASUREMENT_ID, {
        ...pageFields(), send_page_view: false, allow_google_signals: false,
        allow_ad_personalization_signals: false, cookie_domain: "none",
        cookie_expires: lifetime / 1000, cookie_update: false,
      });
      configured = true;
    }
    if (lastPage !== path) {
      gtag("set", pageFields());
      gtag("event", "page_view", { ...pageFields(), send_to: MEASUREMENT_ID });
      lastPage = path;
    }
    if (!loaded) {
      const script = doc.createElement("script");
      script.async = true;
      script.referrerPolicy = "origin";
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      doc.head.append(script);
      loaded = true;
    }
  }
  function choose(value) {
    const wasLoaded = loaded;
    consent = value;
    try { win.localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, time: Date.now() })); } catch { /* In-memory consent only. */ }
    expanded = false;
    measure(); render();
    // Stop an already loaded SDK completely after withdrawal.
    if (value === "denied" && wasLoaded) win.location.reload();
  }
  function element(tag, text) {
    const node = doc.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }
  function render() {
    container.replaceChildren();
    container.hidden = !eligible || path === null;
    if (container.hidden) return;
    const ru = language === "ru";
    const settings = element("button", ru ? "Настройки статистики" : "Statistics settings");
    settings.type = "button";
    settings.setAttribute("aria-expanded", String(!consent || expanded));
    settings.onclick = () => { expanded = !expanded; render(); };
    container.append(settings);
    if (consent && !expanded) return;
    const panel = element("section");
    panel.setAttribute("aria-label", ru ? "Статистика посещений" : "Visitor statistics");
    panel.append(element("h2", ru ? "Разрешить статистику посещений?" : "Allow visitor statistics?"));
    panel.append(element("p", ru
      ? "С вашего согласия Google Analytics измеряет посещения открытых каталогов. Вход, личные кабинеты и ответы на задания не отслеживаются. Выбор можно изменить здесь в любое время."
      : "With your permission, Google Analytics measures visits to public catalogues. Sign-in, accounts and exercise answers are excluded. You can change your choice here at any time."));
    const decline = element("button", ru ? "Не разрешать" : "Do not allow");
    const accept = element("button", ru ? "Разрешить" : "Allow");
    decline.type = accept.type = "button";
    decline.onclick = () => choose("denied");
    accept.onclick = () => choose("granted");
    const details = element("a", ru ? "Подробнее" : "Learn more");
    details.href = "/statistics.html";
    panel.append(decline, accept, details);
    container.append(panel);
  }
  function storageChanged(event) {
    if (event.key !== CONSENT_KEY) return;
    consent = readConsent(); measure(); render();
    if (loaded && consent !== "granted") win.location.reload();
  }
  container.className = "m4u-statistics";
  win.addEventListener("storage", storageChanged);
  return {
    update(next) {
      path = publicPage(win.location.hostname, next.path);
      eligible = next.eligible === true;
      language = next.language;
      measure(); render();
    },
    destroy() {
      win[disable] = true;
      win.removeEventListener("storage", storageChanged);
      container.replaceChildren();
    },
  };
}
