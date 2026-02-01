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
  await page.waitForSelector("#layoutRoot", { timeout: 10_000 });

  const closeAnyModal = async () => {
    // close possible stacked modals (e.g., rating) that intercept clicks
    for (let i = 0; i < 6; i += 1) {
      const open = await page.evaluate(() => {
        const el = document.getElementById("modal");
        return Boolean(el && !el.classList.contains("is-hidden"));
      });
      if (!open) return;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
    // final wait (best effort)
    await page.waitForFunction(() => document.getElementById("modal")?.classList.contains("is-hidden"), null, { timeout: 5_000 });
  };

  // Create project via modal
  await page.click('[data-ui="createProject"]');
  await page.waitForFunction(() => !document.getElementById("modal")?.classList.contains("is-hidden"), null, { timeout: 5_000 });
  await page.click('text=立项并开始');
  // 立项后可能会立即弹出“阶段配置”门控弹窗；这里不强依赖 modal 必须隐藏
  await page.waitForTimeout(150);
  await closeAnyModal();

  // While time is running (frequent rerenders), buttons should still be clickable.
  // This guards against lost clicks between pointerdown and click due to rerender.
  await page.evaluate(() => {
    const s = globalThis.__w3dt?.getState?.();
    if (!s?.time) return false;
    s.time.speed = 8;
    s.time.paused = false;
    return true;
  });
  await page.waitForTimeout(600);

  // Stage config button in dashboard should open modal even when time is running
  await page.click("[data-stage]");
  await page.waitForFunction(() => !document.getElementById("modal")?.classList.contains("is-hidden"), null, { timeout: 5_000 });
  await closeAnyModal();

  // Create project button should open modal even when time is running
  await page.click('[data-ui="createProject"]');
  await page.waitForFunction(() => !document.getElementById("modal")?.classList.contains("is-hidden"), null, { timeout: 5_000 });
  await closeAnyModal();

  // Ensure we have a project selected
  const prjId = await page.evaluate(() => {
    const s = globalThis.__w3dt?.getState?.();
    const p = s?.active?.projects?.[0];
    if (!p) return "";
    s.selectedTarget = { kind: "project", id: p.id };
    return String(p.id || "");
  });
  assert(prjId, "未创建进行中项目");

  // Force complete the project quickly (simulate finishing all stages)
  await page.evaluate(() => {
    const s = globalThis.__w3dt?.getState?.();
    if (!s) return false;
    const p = s.active?.projects?.[0];
    if (!p) return false;
    p.stagePaused = false;
    p.stageIndex = 2;
    p.stageProgress = 99;
    return true;
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => globalThis.__w3dt?.advanceHours?.(10));

  // Close any modal (rating, etc.) if it popped up
  await page.waitForTimeout(300);
  await closeAnyModal();

  // Verify a product exists
  const prodId = await page.evaluate(() => {
    const s = globalThis.__w3dt?.getState?.();
    const prod = s?.active?.products?.[0];
    if (!prod) return "";
    s.selectedTarget = { kind: "product", id: prod.id };
    return String(prod.id || "");
  });
  assert(prodId, "项目完成后未生成上线产品");

  // Ops tab should render token price text
  await closeAnyModal();
  await page.click('.tab[data-tab="ops"]');
  await page.waitForTimeout(200);
  const opsHasPrice = await page.evaluate(() => {
    const el = document.getElementById("opsPanel");
    return Boolean(el && el.textContent && el.textContent.includes("币价"));
  });
  assert(opsHasPrice, "运营面板未显示“币价”");

  // Dashboard should have done project section and allow opening detail modal (best-effort)
  await closeAnyModal();
  await page.click('.tab[data-tab="dashboard"]');
  await page.waitForTimeout(200);
  const hasDone = await page.evaluate(() => {
    const root = document.getElementById("dashboard");
    return Boolean(root && root.textContent && root.textContent.includes("已研发项目"));
  });
  assert(hasDone, "总览未展示“已研发项目”板块");

  // Open first detail button if exists
  const detailExists = await page.locator("[data-done-detail]").count();
  assert(detailExists > 0, "未找到已研发项目的“详情”按钮");
  await page.locator("[data-done-detail]").first().click();
  await page.waitForFunction(() => !document.getElementById("modal")?.classList.contains("is-hidden"), null, { timeout: 5_000 });
  await closeAnyModal();

  await browser.close();

  const ok = issues.length === 0;
  const result = { ok, url: URL, issues };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
  if (!ok) process.exit(2);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ok: false, url: URL, fatal: String(err?.message || err), stack: err?.stack }, null, 2));
  process.exit(1);
});

