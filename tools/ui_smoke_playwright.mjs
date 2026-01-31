import { chromium } from "playwright";

const URL = process.env.URL || "http://127.0.0.1:5173/";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function run() {
  const issues = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", (err) => {
    issues.push({ type: "pageerror", message: err?.message || String(err), stack: err?.stack });
  });
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error") issues.push({ type: "console_error", message: msg.text() });
  });

  await page.goto(URL, { waitUntil: "domcontentloaded" });

  // Core structure renders
  await page.waitForSelector("#layoutRoot", { timeout: 10_000 });
  await page.waitForSelector(".topbar", { timeout: 10_000 });
  await page.waitForSelector(".tabs", { timeout: 10_000 });

  // Basic labels exist
  const title = await page.title();
  assert(title && title.length > 0, "document.title 为空");

  // Toggle time button should be clickable
  await page.click('[data-ui="toggleTime"]');
  await page.waitForTimeout(500);

  // Open/close log panel
  await page.click('[data-menu="news"]');
  await page.waitForTimeout(200);
  const logVisible = await page.evaluate(() => {
    const overlay = document.getElementById("menuOverlay");
    const panel = document.getElementById("menu-news");
    const overlayHidden = overlay?.classList.contains("is-hidden");
    const panelHidden = panel?.classList.contains("is-hidden");
    return Boolean(overlay && panel && !overlayHidden && !panelHidden);
  });
  assert(logVisible, "日志面板未打开（menuOverlay/menu-news 仍是隐藏状态）");

  await page.click('[data-ui="closeMenus"]');
  await page.waitForTimeout(200);

  // Inbox panel should open (may be empty)
  await page.click('[data-menu="inbox"]');
  await page.waitForTimeout(200);
  const inboxPanelOpen = await page.evaluate(() => {
    const overlay = document.getElementById("menuOverlay");
    const panel = document.getElementById("menu-inbox");
    const overlayHidden = overlay?.classList.contains("is-hidden");
    const panelHidden = panel?.classList.contains("is-hidden");
    return Boolean(overlay && panel && !overlayHidden && !panelHidden);
  });
  assert(inboxPanelOpen, "事件面板未打开（menuOverlay/menu-inbox 仍是隐藏状态）");
  await page.click('[data-ui="closeMenus"]');
  await page.waitForTimeout(200);

  // Create project modal should open
  await page.click('[data-ui="createProject"]');
  await page.waitForTimeout(200);
  const modalOpen = await page.evaluate(() => {
    const modalEl = document.getElementById("modal");
    return Boolean(modalEl && !modalEl.classList.contains("is-hidden"));
  });
  assert(modalOpen, "立项弹窗未打开（modal 仍是隐藏状态）");
  // close modal (do NOT click backdrop; it's under the panel)
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.getElementById("modal")?.classList.contains("is-hidden"), null, { timeout: 5_000 });

  // Drag left splitter a bit (layout should change)
  const split = page.locator('.vsplit[data-split="left"]');
  const box = await split.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(200);
  }

  // Switch tabs
  await page.click('.tab[data-tab="team"]');
  await page.waitForTimeout(200);
  const teamVisible = await page.evaluate(() => !document.getElementById("tab-team")?.classList.contains("is-hidden"));
  assert(teamVisible, "切换到“团队”失败（tab-team 仍是隐藏状态）");

  await page.click('.tab[data-tab="help"]');
  await page.waitForTimeout(200);
  const helpVisible = await page.evaluate(() => !document.getElementById("tab-help")?.classList.contains("is-hidden"));
  assert(helpVisible, "切换到“说明”失败（tab-help 仍是隐藏状态）");

  // Ensure some dynamic text is filled (time label is set by render)
  const timeLabel = await page.textContent("#timeLabel");
  assert(timeLabel && timeLabel.trim().length > 0, "#timeLabel 未渲染文本");

  await browser.close();

  const ok = issues.length === 0;
  const result = { ok, url: URL, title, timeLabel, issues };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
  if (!ok) process.exit(2);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ok: false, url: URL, fatal: String(err?.message || err), stack: err?.stack }, null, 2));
  process.exit(1);
});

