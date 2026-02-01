import { clamp, escapeHtml } from "./utils.js?v=62";
import { load, resetStorage, save } from "./storage.js?v=62";
import { defaultState, log, normalizeState, weekLabel } from "./state.js?v=62";
import { closeModal, openModal, toast } from "./modal.js?v=62";
import { bind, render, switchTab } from "./ui.js?v=62";
import { ARCHETYPES, AUDIENCES, CHAINS, KNOWN_MATCH_TABLE, MATCH_LEVEL, NARRATIVES, PLATFORMS, RECIPE, RESEARCH_TREE, STAGE_DIMS, ZENA_RECIPE_UNLOCK_MATCH_PCT, abandonLiveProduct, abandonProject, applyInboxChoice, autoAssignProjectStageTeam, createProject, ensureSelection, exploreCandidates, findTarget, hire, knownComboBreakdown, projectStage, seedMarket, setProjectTeam, setResearchAssignee, startProject, startResearch, startResearchNode, tickDay, tickProjects, tickResearch, tickWeek, upgradeOptionsForProduct } from "./logic.js?v=62";

function initNewState() {
  const s = normalizeState(defaultState());
  seedMarket(s, true);
  log(s, "欢迎来到 Web3 项目开发大亨：做项目、攒技术、造引擎、上线产品、跑指标。", "good");
  return s;
}

function isZenaKnown(state, archetype) {
  const k = String(archetype || "");
  return Boolean(k && Array.isArray(state.knowledge?.zenaKnownArchetypes) && state.knowledge.zenaKnownArchetypes.includes(k));
}

function openDeliveryRatingModal(state, entry) {
  const title = String(entry?.title || "开发评分");
  const ratings = Array.isArray(entry?.ratings) ? entry.ratings.slice(0, 3) : [];
  const archetype = String(entry?.archetype || "");
  const combo = isZenaKnown(state, archetype) ? (entry?.combo || null) : null;
  const match = clamp(Math.round(entry?.match || 0), 0, 100);
  const qualityLine = isZenaKnown(state, archetype) ? `质量 ${Math.round(1 + (match / 100) * 9)}/10` : "质量 未知（需复盘）";

  const timers = [];
  const cleanup = () => {
    while (timers.length) clearInterval(timers.pop());
  };

  const rows = ratings
    .map((r, i) => {
      const idx = i + 1;
      return `
        <div class="rateRow" id="rateRow${idx}">
          <div class="rateRow__name">${escapeHtml(r.name || `机构 ${idx}`)}</div>
          <div class="rateRow__score"><span class="rateRoll" id="rateRoll${idx}">—</span><span class="rateUnit">/10</span></div>
        </div>
      `;
    })
    .join("");

  openModal({
    title: "开发完成 · 评分",
    wide: true,
    body: `
      <div class="muted">${escapeHtml(title)}（${escapeHtml(qualityLine)}）</div>
      ${combo ? `
        <div class="item" style="margin-top:12px;">
          <div class="item__top">
            <div class="item__title">已知搭配匹配</div>
          </div>
          <div class="item__body">
            <div class="chips" style="display:flex;gap:10px;flex-wrap:wrap;">
              <span class="chip chip--${escapeHtml(combo.narrative.tone)}">叙事：${escapeHtml(combo.narrative.label)}</span>
              <span class="chip chip--${escapeHtml(combo.chain.tone)}">链：${escapeHtml(combo.chain.label)}</span>
              <span class="chip chip--${escapeHtml(combo.audience.tone)}">受众：${escapeHtml(combo.audience.label)}</span>
              <span class="chip">已知搭配得分 ${escapeHtml(String(combo.pct))}%</span>
            </div>
          </div>
        </div>
      ` : `
        <div class="item" style="margin-top:12px;">
          <div class="item__top">
            <div class="item__title">泽娜的已知搭配</div>
          </div>
          <div class="item__body">
            <div class="muted">未知：需要在科研里做一次“泽娜复盘”，选择一个历史项目/产品，完成后才会告诉你该类型的匹配。</div>
          </div>
        </div>
      `}
      <div class="rateBoard" style="margin-top:12px;">
        ${rows}
      </div>
      <div class="muted" style="margin-top:12px;">提示：评分依次公布，数字会先随机跳动再落到最终分数。</div>
    `,
    actions: [
      {
        label: "关闭",
        kind: "primary",
        onClick: () => {
          cleanup();
          closeModal();
        },
      },
    ],
  });

  const animateOne = (idx, finalScore, onDone) => {
    const row = document.getElementById(`rateRow${idx}`);
    const el = document.getElementById(`rateRoll${idx}`);
    if (!row || !el) {
      onDone?.();
      return;
    }
    row.classList.add("is-running");
    const tickMs = 60;
    const totalMs = 980;
    const t0 = Date.now();
    const intId = setInterval(() => {
      const t = Date.now() - t0;
      if (t >= totalMs) {
        clearInterval(intId);
        // settle
        el.textContent = String(clamp(Math.round(finalScore || 1), 1, 10));
        row.classList.remove("is-running");
        row.classList.add("is-done");
        onDone?.();
        return;
      }
      el.textContent = String(1 + Math.floor(Math.random() * 10));
    }, tickMs);
    timers.push(intId);
  };

  const runSeq = (i) => {
    const r = ratings[i];
    if (!r) return;
    animateOne(i + 1, r.score, () => {
      // small gap before next institution
      const t = setTimeout(() => runSeq(i + 1), 260);
      timers.push(t);
    });
  };
  // start after short suspense
  const t = setTimeout(() => runSeq(0), 380);
  timers.push(t);
}

function openKnownMatchTableModal(state) {
  const labelOf = (list, key) => (list.find((x) => x.key === key) || { name: key }).name;
  const chipOf = (lvlKey, text) => {
    const lvl = MATCH_LEVEL?.[String(lvlKey || "")] || MATCH_LEVEL.mid;
    const tone = lvl?.tone || "warn";
    return `<span class="chip chip--${escapeHtml(tone)}">${escapeHtml(text)}：${escapeHtml(lvl.label)}</span>`;
  };

  const archetypeBlocks = (ARCHETYPES || [])
    .map((a) => {
      const known = isZenaKnown(state, a.key);
      const t = KNOWN_MATCH_TABLE?.[a.key] || { narratives: {}, chains: {}, audiences: {} };
      const narr = known ? (NARRATIVES || []).map((n) => chipOf(t.narratives?.[n.key] || "mid", labelOf(NARRATIVES, n.key))).join("") : `<div class="muted">未知（需要复盘该类型的历史项目/产品）。</div>`;
      const ch = known ? (CHAINS || []).map((c) => chipOf(t.chains?.[c.key] || "mid", labelOf(CHAINS, c.key))).join("") : "";
      const aud = known ? (AUDIENCES || []).map((u) => chipOf(t.audiences?.[u.key] || "mid", labelOf(AUDIENCES, u.key))).join("") : "";
      return `
        <div class="item">
          <div class="item__top">
            <div class="item__title">${escapeHtml(labelOf(ARCHETYPES, a.key))}</div>
          </div>
          <div class="item__body">
            <div class="subhead">叙事</div>
            <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;">${narr}</div>
            ${known ? `
              <div class="divider"></div>
              <div class="subhead">链/生态</div>
              <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;">${ch}</div>
              <div class="divider"></div>
              <div class="subhead">受众</div>
              <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;">${aud}</div>
            ` : ``}
          </div>
        </div>
      `;
    })
    .join("");

  openModal({
    title: "已知搭配表（完美 / 中等 / 不匹配）",
    wide: true,
    body: `
      <div class="muted">这是“泽娜的已知搭配”。需要先在科研里做复盘，才会逐个类型解锁显示；未解锁的类型会显示为“未知”。</div>
      <div style="margin-top:12px; display:flex; flex-direction:column; gap:12px;">
        ${archetypeBlocks}
      </div>
    `,
    actions: [{ label: "关闭", kind: "primary", onClick: closeModal }],
  });
}

function isFreshStart(state) {
  return (state.progress?.totalWeeks ?? 0) === 0 && (state.active?.projects?.length ?? 0) === 0 && (state.active?.products?.length ?? 0) === 0;
}

function stagePrefsModalBody(state, project) {
  if (!project) return `<div class="muted">未选择项目。</div>`;
  if (!project.stagePrefs) project.stagePrefs = {};
  const stage = projectStage(project);
  if (!project.stagePrefs[stage]) {
    // initialize with 50s
    project.stagePrefs[stage] = {};
    for (const d of STAGE_DIMS[stage] || []) project.stagePrefs[stage][d.key] = 50;
  }
  const prefs = project.stagePrefs[stage] || {};
  const dims = STAGE_DIMS[stage] || [];

  const roleLabels = {
    product: "产品",
    design: "设计/UI",
    protocol: "机制",
    contract: "合约",
    infra: "运维/Infra",
    security: "安全",
    growth: "增长/BD",
    compliance: "合规",
  };
  const members = state.team?.members || [];
  const memberOptions = (pickedId) =>
    `<option value="">（空）</option>` +
    members
      .map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === pickedId ? "selected" : ""}>${escapeHtml(m.name)}</option>`)
      .join("");
  // stage-specific team roles (each stage can be configured)
  const stageRoleKeys =
    stage === "S1"
      ? ["product", "design", "protocol", "compliance"]
      : stage === "S2"
        ? ["contract", "infra", "security", "protocol"]
        : ["security", "infra", "compliance", "growth"];
  const t = project.stageTeam?.[stage] || {};
  const teamRows = stageRoleKeys
    .map((k) => {
      return `<label class="autoItem" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <span class="muted" style="min-width:120px;">${escapeHtml(roleLabels[k])}</span>
        <select class="select" style="min-width:240px;" data-assign="${escapeHtml(project.id)}:${escapeHtml(stage)}:${escapeHtml(k)}">
          ${memberOptions(t[k] || "")}
        </select>
      </label>`;
    })
    .join("");

  return `
    <div class="item">
      <div class="item__top">
        <div class="item__title">阶段配置：${escapeHtml(stage)}（${escapeHtml(project.title || "")}）</div>
      </div>
      <div class="item__body">
        <div class="muted">每个阶段的团队分工不同：阶段 1 偏产品/设计/机制/合规；阶段 2 偏合约/运维/安全；阶段 3 偏上线准备（安全/监控/合规/增长）。</div>
        <div class="divider"></div>
        <div class="subhead">团队分工（本阶段）</div>
        <div class="item__actions" style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 2px;">
          <button class="btn" data-autoteam="${escapeHtml(project.id)}:${escapeHtml(stage)}">一键最佳配置</button>
          <div class="muted" style="align-self:center;">提示：会按当前团队能力自动分配到最合适岗位。</div>
        </div>
        <div class="autoGrid muted" style="grid-template-columns:1fr;">
          ${teamRows}
        </div>
        <div class="divider"></div>
        <div class="subhead">阶段配方（滑条）</div>
        ${dims
          .map((d) => {
            const val = clamp(Math.round(prefs[d.key] ?? 50), 0, 100);
            return `
              <div style="margin:12px 0;">
                <div class="muted" style="display:flex;justify-content:space-between;">
                  <span>${escapeHtml(d.left)}</span>
                  <span>${escapeHtml(d.right)}</span>
                </div>
                <input class="input" type="range" min="0" max="100" value="${val}" data-stagepref="${stage}:${d.key}" />
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function openStagePrefsModal(state, projectId) {
  const p = findTarget(state, "project", projectId);
  if (!p) return;
  state.selectedTarget = { kind: "project", id: projectId };

  const shouldResume = Boolean(!state.time?.paused);
  if (state.time) {
    state.time.resumeAfterStageModal = shouldResume;
    state.time.paused = true;
  }

  openModal({
    title: "阶段配置",
    body: stagePrefsModalBody(state, p),
    actions: [
      {
        label: "确认并继续",
        kind: "primary",
        onClick: () => {
          const p2 = findTarget(state, "project", projectId);
          if (p2) p2.stagePaused = false;
          const resume = Boolean(state.time?.resumeAfterStageModal);
          if (state.time) state.time.resumeAfterStageModal = false;
          if (state.time && resume) state.time.paused = false;
          closeModal();
          render(state);
        },
      },
    ],
  });
}

function applyWeeklyTick(state) {
  seedMarket(state, false);
  tickWeek(state);
  log(state, `进入 ${weekLabel(state)}。`, "info");
}

function advanceTime(state, deltaHours) {
  if (!state.time) return;
  const HOURS_PER_DAY = 8;
  const DAYS_PER_WEEK = 7;
  const HOURS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK;
  const baseYear = 2017;
  const baseDateUtc = new Date(Date.UTC(2017, 0, 1));
  const prevDays = Math.floor((state.time.elapsedHours || 0) / HOURS_PER_DAY);
  const prevWeeks = Math.floor((state.time.elapsedHours || 0) / HOURS_PER_WEEK);
  state.time.elapsedHours = Math.max(0, (state.time.elapsedHours || 0) + deltaHours);
  const totalDays = Math.floor(state.time.elapsedHours / HOURS_PER_DAY);
  const totalWeeks = Math.floor(state.time.elapsedHours / HOURS_PER_WEEK);

  // daily settlement (ops charts become visible)
  if (totalDays !== prevDays) {
    for (let d = prevDays + 1; d <= totalDays; d++) {
      const weekIndex = Math.floor(d / DAYS_PER_WEEK);
      const years = Math.floor(weekIndex / 52);
      const week = (weekIndex % 52) + 1;
      const day = (d % DAYS_PER_WEEK) + 1;
      state.now.year = baseYear + years;
      state.now.week = week;
      state.now.day = day;
      const date = new Date(baseDateUtc.getTime() + d * 24 * 3600 * 1000);
      state.now.dateISO = date.toISOString().slice(0, 10);
      tickDay(state);
      // weekly settlement at the first day of a new week
      if (day === 1 && d !== 0) applyWeeklyTick(state);
    }
  } else {
    // keep label in sync even within a day (no settlement)
    const weekIndex = Math.floor(totalDays / DAYS_PER_WEEK);
    const years = Math.floor(weekIndex / 52);
    const week = (weekIndex % 52) + 1;
    const day = (totalDays % DAYS_PER_WEEK) + 1;
    state.now.year = baseYear + years;
    state.now.week = week;
    state.now.day = day;
    const date = new Date(baseDateUtc.getTime() + totalDays * 24 * 3600 * 1000);
    state.now.dateISO = date.toISOString().slice(0, 10);
  }

  state.progress.totalWeeks = totalWeeks;
  tickProjects(state, deltaHours);
  tickResearch(state, deltaHours);
}

function exposeDevApi(getState, api) {
  // 仅用于自动化调试/自测；不作为玩法的一部分
  globalThis.__w3dt = {
    getState,
    ...api,
  };
}

function checkGameOver(state, restart) {
  if (state.flags.gameOver) return;
  if ((state.resources?.cash ?? 0) < 0) {
    state.flags.gameOver = { kind: "lose", title: "资金链断裂", reason: "现金为负，无法维持团队与基础设施开销。" };
    log(state, `【资金链断裂】现金为负，无法维持团队与基础设施开销。`, "bad");
    openModal({
      title: "资金链断裂",
      body: `<div>${escapeHtml("现金为负，无法维持团队与基础设施开销。")}</div>`,
      actions: [
        { label: "关闭", onClick: closeModal },
        { label: "重开", kind: "primary", onClick: restart },
      ],
    });
  }
  if ((state.resources?.complianceRisk ?? 0) >= 100) {
    const dayIndex = Math.floor((state.time?.elapsedHours || 0) / 8);
    if (dayIndex >= (state.flags.complianceCrisisNextAtDay || 0)) {
      state.flags.complianceCrisisNextAtDay = dayIndex + 14; // 2-week cooldown
      const cash = Math.max(0, Math.round(state.resources?.cash || 0));
      const loss = Math.round(cash * 0.5);
      state.resources.cash = Math.round(cash - loss);
      // pull back from 100 to avoid instant retrigger
      state.resources.complianceRisk = 72;
      log(state, `【合规风暴】合规风险爆表触发监管风波：现金 -¥${loss.toLocaleString("zh-CN")}（可继续经营）。`, "bad");
      openModal({
        title: "合规风暴（可继续）",
        body: `
          <div>${escapeHtml("合规风险爆表：触发监管风波，资金被冻结/罚没一部分，但你仍可继续经营（需要尽快降低合规风险）。")}</div>
          <div class="divider"></div>
          <div class="muted">处罚：现金 -¥${escapeHtml(loss.toLocaleString("zh-CN"))}（扣除 50% 现金）</div>
          <div class="muted" style="margin-top:8px;">冷却：14 天内不会重复触发同类事件。</div>
        `,
        actions: [{ label: "继续经营", kind: "primary", onClick: closeModal }],
      });
    }
  }
  if ((state.resources?.securityRisk ?? 0) >= 100) {
    const dayIndex = Math.floor((state.time?.elapsedHours || 0) / 8);
    if (dayIndex < (state.flags.securityCrisisNextAtDay || 0)) return;
    state.flags.securityCrisisNextAtDay = dayIndex + 14; // 2-week cooldown

    const cash = Math.max(0, Math.round(state.resources?.cash || 0));
    const loss = Math.round(cash * 0.5);
    state.resources.cash = Math.round(cash - loss);
    // pull back from 100 to avoid instant retrigger
    state.resources.securityRisk = 72;
    log(state, `【重大安全事故】安全风险爆表触发事故：现金 -¥${loss.toLocaleString("zh-CN")}（可继续经营）。`, "bad");
    openModal({
      title: "重大安全事故（可继续）",
      body: `
        <div>${escapeHtml("安全风险爆表：发生重大事故，现金流受挫，但你仍可继续经营（需要尽快降低安全风险）。")}</div>
        <div class="divider"></div>
        <div class="muted">处罚：现金 -¥${escapeHtml(loss.toLocaleString("zh-CN"))}（扣除 50% 现金）</div>
        <div class="muted" style="margin-top:8px;">冷却：14 天内不会重复触发同类事件。</div>
      `,
      actions: [{ label: "继续经营", kind: "primary", onClick: closeModal }],
    });
  }
}

function main() {
  let state = normalizeState(load() || initNewState());
  seedMarket(state, false);
  let lastUiRenderAt = 0;
  const RENDER_INTERVAL_MS = 250;
  const renderThrottled = (ts) => {
    if (ts - lastUiRenderAt < RENDER_INTERVAL_MS) return;
    lastUiRenderAt = ts;
    render(state);
  };
  // Coalesce manual renders (e.g. slider input) to 1 per frame.
  let pendingRender = false;
  const renderSoon = () => {
    if (pendingRender) return;
    pendingRender = true;
    requestAnimationFrame(() => {
      pendingRender = false;
      render(state);
    });
  };

  const refreshDevApi = () => {
    exposeDevApi(
      () => state,
      {
        advanceHours: (h) => {
          const n = Number(h) || 0;
          if (n <= 0) return;
          advanceTime(state, n);
          render(state);
        },
        // 更贴近真实 tick：推进 + 检查 game over + 触发阶段门（如需要）
        step: (h) => {
          const n = Number(h) || 0;
          if (n <= 0) return { ok: false, msg: "hours<=0" };
          if (state.flags.gameOver) return { ok: false, msg: "gameOver" };
          advanceTime(state, n);
          checkGameOver(state, restart);
          const modalEl = document.getElementById("modal");
          const modalOpen = modalEl && !modalEl.classList.contains("is-hidden");
          if (!modalOpen && Array.isArray(state.stageQueue) && state.stageQueue.length > 0) {
            const next = state.stageQueue.shift();
            if (next?.kind === "project" && next?.id) openStagePrefsModal(state, next.id);
            save(state);
          }
          render(state);
          return { ok: true };
        },
        openNextStageModal: () => {
          const modalEl = document.getElementById("modal");
          const modalOpen = modalEl && !modalEl.classList.contains("is-hidden");
          if (modalOpen) return false;
          if (!Array.isArray(state.stageQueue) || state.stageQueue.length === 0) return false;
          const next = state.stageQueue.shift();
          if (next?.kind === "project" && next?.id) {
            openStagePrefsModal(state, next.id);
            save(state);
            return true;
          }
          return false;
        },
        setCash: (v) => {
          normalizeState(state);
          state.resources.cash = Math.round(Number(v) || 0);
          render(state);
          return state.resources.cash;
        },
        grantTechPoints: (n) => {
          normalizeState(state);
          const add = Math.max(0, Math.round(Number(n) || 0));
          state.resources.techPoints = Math.max(0, (state.resources.techPoints || 0) + add);
          render(state);
          return state.resources.techPoints;
        },
        forceSave: () => {
          save(state);
          return true;
        },
      }
    );
  };
  refreshDevApi();

  // first-week convenience: start with time paused but ready
  if (isFreshStart(state) && !state.flags.startFilled) {
    state.flags.startFilled = true;
    save(state);
  }

  const restart = () => {
    closeModal();
    resetStorage();
    state = initNewState();
    refreshDevApi();
    save(state);
    render(state);
    switchTab("dashboard");
  };

  bind(state, {
    onAccept: (kind, id) => {
      if (kind === "project") {
        const r = startProject(state, id);
        if (!r.ok) toast(r.msg);
      }
      if (kind === "hire") {
        const r = hire(state, id);
        if (!r.ok) toast(r.msg);
      }
      render(state);
    },
    onSelect: (kind, id) => {
      state.selectedTarget = { kind, id };
      render(state);
    },
    onStage: (kind, id) => {
      if (kind !== "project") return;
      openStagePrefsModal(state, id);
      render(state);
    },
    onAutoTeam: (projectId, stageKey) => {
      const r = autoAssignProjectStageTeam(state, projectId, stageKey);
      if (!r.ok) {
        toast(r.msg);
        return;
      }
      // rerender modal body in-place so selects update immediately
      const p = findTarget(state, "project", projectId);
      const body = document.getElementById("modalBody");
      if (p && body) body.innerHTML = stagePrefsModalBody(state, p);
      save(state);
      render(state);
    },
    onPostmortem: (productId) => {
      const prod = findTarget(state, "product", productId);
      if (!prod) return;
      const done = Array.isArray(state.knowledge?.postmortemedProductIds) ? state.knowledge.postmortemedProductIds : [];
      if (done.includes(String(productId || ""))) {
        toast("该产品已复盘过（同一对象只能复盘一次）。");
        return;
      }
      const match = clamp(Math.round(prod?.scores?.match ?? 0), 0, 100);
      const archetype = String(prod.archetype || "");
      const alreadyKnown = archetype && Array.isArray(state.knowledge?.zenaKnownArchetypes) && state.knowledge.zenaKnownArchetypes.includes(archetype);
      const members = state.team?.members || [];
      const options =
        `<option value="">（未指派）</option>` +
        members.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join("");
      openModal({
        title: "泽娜复盘（解锁配方表）",
        body: `
          <div class="muted">复盘对象：${escapeHtml(prod.title || prod.id)}（类型 ${escapeHtml(String(prod.archetype || ""))}）。</div>
          <div class="muted" style="margin-top:8px;">当前匹配度：<b>${match}</b>。只有<b>高匹配（≥${ZENA_RECIPE_UNLOCK_MATCH_PCT}）</b>复盘后才会解锁该类型的“配方表”。</div>
          ${alreadyKnown ? `<div class="muted" style="margin-top:8px;">该类型配方表已解锁：本次复盘只会记录“已复盘”。</div>` : ``}
          <div style="margin-top:12px;">
            <div class="muted" style="margin-bottom:6px;">指派负责人</div>
            <select class="select" id="pmAssignee2">${options}</select>
          </div>
        `,
        actions: [
          { label: "取消", onClick: closeModal },
          {
            label: "开始复盘",
            kind: "primary",
            onClick: () => {
              const selA = /** @type {HTMLSelectElement|null} */ (document.getElementById("pmAssignee2"));
              const assigneeId = String(selA?.value || "") || null;
              const r2 = startResearchNode(state, "postmortem_zena", assigneeId, { productId });
              if (!r2.ok) {
                toast(r2.msg);
                return;
              }
              closeModal();
              save(state);
              render(state);
              switchTab("research");
            },
          },
        ],
      });
    },
    onDoneDetail: (doneId) => {
      const list = Array.isArray(state.history?.projectsDone) ? state.history.projectsDone : [];
      const d = list.find((x) => x.id === doneId) || null;
      if (!d) return;
      const pf = (PLATFORMS || []).find((x) => x.key === d.platform)?.name || d.platform || "—";
      const prodId = d.kind === "launch" ? d.productId : d.baseProductId;
      const prod = prodId ? findTarget(state, "product", prodId) : null;
      const earned = prod ? Math.round(Number(prod.kpi?.cumProfit) || 0) : 0;
      const rev = prod ? Math.round(Number(prod.kpi?.cumRevenue) || 0) : 0;
      const users = prod ? Math.round(Number(prod.kpi?.users) || 0) : 0;
      const dau = prod ? Math.round(Number(prod.kpi?.dau) || 0) : 0;
      const tokenPrice = prod ? Number(prod.kpi?.tokenPrice) || 0 : 0;
      const cost = Math.round(Number(d.costSpent) || 0);
      const fansG = Math.round(Number(d.fansGained) || 0);
      const fansAll = Math.round(Number(state.resources?.fans) || 0);
      const known = isZenaKnown(state, d.archetype);
      const qualityLine = known ? `质量 ${clamp(Math.round(1 + clamp(Math.round(d.matchPct || 0), 0, 100) / 100 * 9), 1, 10)}/10` : "质量：未知（需复盘）";
      const pScore = Number.isFinite(Number(d.productScore))
        ? Math.round(Number(d.productScore))
        : Number.isFinite(Number(d.productScore10))
          ? Math.round(Number(d.productScore10))
          : 0;
      const tScore = Number.isFinite(Number(d.techScore))
        ? Math.round(Number(d.techScore))
        : Number.isFinite(Number(d.techScore10))
          ? Math.round(Number(d.techScore10))
          : 0;

      const stageDims = {
        S1: [
          { key: "uxVsMech", left: "产品体验", right: "机制深度" },
          { key: "decentralVsControl", left: "去中心化叙事", right: "可控性" },
          { key: "complianceVsAggro", left: "合规保守", right: "增长激进" },
        ],
        S2: [
          { key: "onchainVsOffchain", left: "链上逻辑", right: "链下服务" },
          { key: "buildVsReuse", left: "自研", right: "复用/依赖" },
          { key: "speedVsQuality", left: "速度", right: "代码质量" },
        ],
        S3: [
          { key: "securityDepthVsSpeed", left: "安全深度", right: "上线速度" },
          { key: "monitoringVsFeatures", left: "监控/应急", right: "功能完善" },
          { key: "complianceVsMarketing", left: "合规/材料", right: "市场攻势" },
        ],
      };
      const prefs = d.stagePrefs || {};
      const team = d.stageTeam || {};
      const stageBlock = (stageKey) => {
        const dims = stageDims[stageKey] || [];
        const pv = prefs?.[stageKey] || {};
        const tv = team?.[stageKey] || {};
        const prefRows = dims
          .map((it) => {
            const v = clamp(Math.round(pv?.[it.key] ?? 50), 0, 100);
            const side = v === 50 ? "平衡" : v > 50 ? it.right : it.left;
            const intensity = Math.abs(v - 50);
            const pri = intensity >= 30 ? "高" : intensity >= 15 ? "中" : "低";
            return { it, v, side, pri, intensity };
          })
          .sort((a, b) => b.intensity - a.intensity);
        const topPrefs = prefRows.slice(0, 2);

        const chip = (text, tone = "") => {
          const cls = tone ? `chip chip--${tone}` : "chip";
          return `<span class="${cls}">${escapeHtml(text)}</span>`;
        };

        const recipeMatch = (() => {
          // 只有复盘解锁该类型配方表后，才显示“配方优先级是否高匹配”
          if (!known) return { pct: null, level: "unknown" };
          const archetypeKey = String(d.archetype || "");
          const recipe = RECIPE?.[archetypeKey]?.[stageKey] || {};
          if (!dims.length) return { pct: 0, level: "bad" };
          const avgDist =
            dims.reduce((acc, it) => {
              const target = clamp(Math.round(recipe?.[it.key] ?? 50), 0, 100);
              const cur = clamp(Math.round(pv?.[it.key] ?? 50), 0, 100);
              return acc + Math.abs(cur - target);
            }, 0) / dims.length;
          const pct = clamp(Math.round(100 - avgDist), 0, 100);
          const level = pct >= 85 ? "good" : pct >= 65 ? "mid" : "bad";
          return { pct, level };
        })();

        const matchChip =
          recipeMatch.level === "unknown"
            ? chip("配方匹配：未知（需复盘）", "warn")
            : recipeMatch.level === "good"
              ? chip(`配方匹配：高（${recipeMatch.pct}%）`, "good")
              : recipeMatch.level === "mid"
                ? chip(`配方匹配：中（${recipeMatch.pct}%）`, "warn")
                : chip(`配方匹配：低（${recipeMatch.pct}%）`, "bad");

        const prefChips = topPrefs.length
          ? topPrefs
              .map((x) => chip(`${x.side}（${x.pri}·${x.v}）`))
              .join("")
          : `<span class="muted">未记录。</span>`;

        const roleChips = Object.entries(tv || {})
          .map(([role, mid]) => {
            const m = (state.team?.members || []).find((x) => x.id === mid);
            const who = m?.name || "（空）";
            return chip(`${role}：${who}`);
          })
          .join("");

        // 默认折叠，避免弹窗出现滚动条；需要时再展开看完整细节
        const fullPrefRows = dims
          .map((it) => {
            const v = clamp(Math.round(pv?.[it.key] ?? 50), 0, 100);
            const side = v === 50 ? "平衡" : v > 50 ? it.right : it.left;
            const intensity = Math.abs(v - 50);
            const pri = intensity >= 30 ? "高" : intensity >= 15 ? "中" : "低";
            return `<div class="statRow"><div class="statRow__k">${escapeHtml(it.left)} ↔ ${escapeHtml(it.right)}</div><div class="statRow__v">${escapeHtml(`${side}（${pri}·${v}）`)}</div></div>`;
          })
          .join("");
        const fullRoleLines = Object.entries(tv || {})
          .map(([role, mid]) => {
            const m = (state.team?.members || []).find((x) => x.id === mid);
            return `<div class="statRow"><div class="statRow__k">${escapeHtml(role)}</div><div class="statRow__v">${escapeHtml(m?.name || "（空）")}</div></div>`;
          })
          .join("");

        return `
          <details style="margin-top:10px;">
            <summary class="muted" style="cursor:pointer; user-select:none;">
              阶段 ${escapeHtml(stageKey)} · 配方 ${escapeHtml(topPrefs.map((x) => x.side).join(" / ") || "—")} · 团队 ${escapeHtml(Object.keys(tv || {}).length ? `${Object.keys(tv || {}).length} 角色` : "—")}
            </summary>
            <div style="margin-top:8px;">
              <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;">${matchChip}</div>
              <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;">${prefChips}</div>
              <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">${roleChips || `<span class="muted">未记录。</span>`}</div>
              <div class="divider"></div>
              <div class="subhead">完整记录</div>
              <div class="memberCard__stats">${fullPrefRows || `<div class="muted">未记录。</div>`}</div>
              <div class="divider"></div>
              <div class="memberCard__stats">${fullRoleLines || `<div class="muted">未记录。</div>`}</div>
            </div>
          </details>
        `;
      };

      openModal({
        title: "项目详情",
        wide: true,
        body: `
          <div class="item">
            <div class="item__top">
              <div>
                <div class="item__title">${escapeHtml(d.title || "（未命名）")}</div>
                <div class="muted" style="margin-top:6px;">
                  评分 ${escapeHtml(String(Number(d.avgRating10 || 0).toFixed(1)))} / 10 · 产品分 ${escapeHtml(pScore.toLocaleString("zh-CN"))} · 技术分 ${escapeHtml(tScore.toLocaleString("zh-CN"))} · ${escapeHtml(qualityLine)}
                </div>
              </div>
            </div>
            <div class="item__body">
              <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;">
                <span class="chip">${escapeHtml((NARRATIVES.find((x) => x.key === d.narrative) || { name: d.narrative }).name)}</span>
                <span class="chip">${escapeHtml((ARCHETYPES.find((x) => x.key === d.archetype) || { name: d.archetype }).name)}</span>
                <span class="chip">${escapeHtml((CHAINS.find((x) => x.key === d.chain) || { name: d.chain }).name)}</span>
                <span class="chip">${escapeHtml((AUDIENCES.find((x) => x.key === d.audience) || { name: d.audience }).name)}</span>
                <span class="chip">${escapeHtml(pf)}</span>
                <span class="chip">L${escapeHtml(String(d.scale || 1))}</span>
                <span class="chip">成本 ¥${escapeHtml(cost.toLocaleString("zh-CN"))}</span>
                <span class="chip">粉丝 +${escapeHtml(fansG.toLocaleString("zh-CN"))}</span>
              </div>
            </div>
          </div>
          ${prod ? `
            <details style="margin-top:10px;">
              <summary class="muted" style="cursor:pointer; user-select:none;">产品现状 · 用户 ${escapeHtml(users.toLocaleString("zh-CN"))} · DAU ${escapeHtml(dau.toLocaleString("zh-CN"))} · 累计利润 ¥${escapeHtml(earned.toLocaleString("zh-CN"))}</summary>
              <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                ${tokenPrice ? `<span class="chip">币价 $${escapeHtml(tokenPrice.toFixed(2))}</span>` : ""}
                <span class="chip">用户 ${escapeHtml(users.toLocaleString("zh-CN"))}</span>
                <span class="chip">DAU ${escapeHtml(dau.toLocaleString("zh-CN"))}</span>
                <span class="chip">累计收入 ¥${escapeHtml(rev.toLocaleString("zh-CN"))}</span>
                <span class="chip">累计利润 ¥${escapeHtml(earned.toLocaleString("zh-CN"))}</span>
              </div>
            </details>
          ` : `<div class="muted" style="margin-top:10px;">提示：对应产品未找到（旧存档或尚未生成）。</div>`}
          ${stageBlock("S1")}
          ${stageBlock("S2")}
          ${stageBlock("S3")}
        `,
        actions: [
          { label: "关闭", kind: "primary", onClick: closeModal },
        ],
      });
    },
    onAbandon: (kind, id) => {
      if (kind === "project") {
        const p = findTarget(state, "project", id);
        if (!p) return;
        openModal({
          title: "废弃项目",
          body: `
            <div class="muted">确认要废弃该项目吗？废弃后会从进行中列表移除，并清除待配置队列（不会返还已消耗的现金）。</div>
            <div class="divider"></div>
            <div class="item">
              <div class="item__top">
                <div>
                  <div class="item__title">${escapeHtml(p.title || "")}</div>
                  <div class="muted" style="margin-top:6px;">当前阶段 ${escapeHtml(projectStage(p))} · 进度 ${clamp(Math.round(p.stageProgress || 0), 0, 100)}%</div>
                </div>
              </div>
            </div>
          `,
          actions: [
            { label: "取消", onClick: closeModal },
            {
              label: "确认废弃",
              kind: "primary",
              onClick: () => {
                const r = abandonProject(state, id);
                if (!r.ok) toast(r.msg);
                closeModal();
                save(state);
                render(state);
              },
            },
          ],
        });
        return;
      }

      if (kind === "product") {
        const prod = findTarget(state, "product", id);
        if (!prod) return;
        const k = prod.kpi || {};
        const tvl = Math.round(Number(k.tvl) || 0);
        const dau = Math.round(Number(k.dau) || 0);
        const profit = Math.round(Number(k.profit) || 0);
        const price = Number(k.tokenPrice) || 0;
        openModal({
          title: "废弃已上线产品",
          body: `
            <div class="muted">你可以选择“逐渐废弃”（温和下线）或“Rug Pull”（一次性收割/跑路）。Rug Pull 会对粉丝、声誉、社区、风险等造成严重伤害。</div>
            <div class="divider"></div>
            <div class="item">
              <div class="item__top">
                <div>
                  <div class="item__title">${escapeHtml(prod.title || prod.id)}</div>
                  <div class="muted" style="margin-top:6px;">币价 $${escapeHtml(price.toFixed(2))} · DAU ${escapeHtml(dau.toLocaleString("zh-CN"))} · TVL ${escapeHtml(tvl.toLocaleString("zh-CN"))} · 日利润 ¥${escapeHtml(profit.toLocaleString("zh-CN"))}</div>
                </div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="subhead">Rug Pull 二次确认</div>
            <div class="muted">为避免误触：如果你要 Rug Pull，请在下面输入 <b>RUG</b>。</div>
            <input class="input" id="rugConfirm" placeholder="输入 RUG" style="margin-top:8px; width: 180px;" />
          `,
          actions: [
            { label: "取消", onClick: closeModal },
            {
              label: "逐渐废弃",
              onClick: () => {
                const r = abandonLiveProduct(state, id, "sunset");
                if (!r.ok) toast(r.msg);
                else toast("已逐渐废弃该产品。");
                closeModal();
                save(state);
                render(state);
              },
            },
            {
              label: "Rug Pull",
              kind: "primary",
              onClick: () => {
                const el = /** @type {HTMLInputElement|null} */ (document.getElementById("rugConfirm"));
                const v = String(el?.value || "").trim().toUpperCase();
                if (v !== "RUG") {
                  toast("请输入 RUG 以确认 Rug Pull。");
                  return;
                }
                const r = abandonLiveProduct(state, id, "rug");
                if (!r.ok) toast(r.msg);
                else toast("已执行 Rug Pull（声誉/粉丝受到严重伤害）。");
                closeModal();
                save(state);
                render(state);
              },
            },
          ],
        });
      }
    },
    onStagePrefChange: (stage, key, val) => {
      ensureSelection(state);
      const sel = state.selectedTarget;
      const p = sel && sel.kind === "project" ? findTarget(state, "project", sel.id) : null;
      if (!p) return;
      if (!p.stagePrefs) p.stagePrefs = {};
      if (!p.stagePrefs[stage]) p.stagePrefs[stage] = {};
      p.stagePrefs[stage][key] = clamp(Math.round(val || 0), 0, 100);
      renderSoon();
    },
    onOpsChange: (k, productId, rawVal) => {
      const p = findTarget(state, "product", productId);
      if (!p) return;
      p.kpi = p.kpi || {};
      p.ops = p.ops || {};
      if (k === "feeRateBps") {
        p.kpi.feeRateBps = clamp(Math.round(parseFloat(String(rawVal || "0")) || 0), 0, 80);
      }
      if (k === "buybackPct") {
        p.ops.buybackPct = clamp((parseFloat(String(rawVal || "0")) || 0) / 100, 0, 0.5);
      }
      if (k === "emissions") {
        p.ops.emissions = clamp((parseFloat(String(rawVal || "0")) || 0) / 100, 0, 1);
      }
      if (k === "incentivesBudgetWeekly") {
        p.ops.incentivesBudgetWeekly = clamp(Math.round(parseFloat(String(rawVal || "0")) || 0), 0, 999999999);
      }
      if (k === "marketingBudgetWeekly") {
        p.ops.marketingBudgetWeekly = clamp(Math.round(parseFloat(String(rawVal || "0")) || 0), 0, 999999999);
      }
      if (k === "securityBudgetWeekly") {
        p.ops.securityBudgetWeekly = clamp(Math.round(parseFloat(String(rawVal || "0")) || 0), 0, 999999999);
      }
      if (k === "infraBudgetWeekly") {
        p.ops.infraBudgetWeekly = clamp(Math.round(parseFloat(String(rawVal || "0")) || 0), 0, 999999999);
      }
      if (k === "complianceBudgetWeekly") {
        p.ops.complianceBudgetWeekly = clamp(Math.round(parseFloat(String(rawVal || "0")) || 0), 0, 999999999);
      }
      if (k === "supportBudgetWeekly") {
        p.ops.supportBudgetWeekly = clamp(Math.round(parseFloat(String(rawVal || "0")) || 0), 0, 999999999);
      }
      if (k === "referralPct") {
        p.ops.referralPct = clamp((parseFloat(String(rawVal || "0")) || 0) / 100, 0, 0.3);
      }
      renderSoon();
    },
    onAssign: (projectId, stageKey, roleKey, memberIdOrNull) => {
      setProjectTeam(state, projectId, stageKey, roleKey, memberIdOrNull);
      render(state);
    },
    onInboxChoice: (itemId, choiceKey) => {
      const r = applyInboxChoice(state, itemId, choiceKey);
      if (!r?.ok && r?.msg) toast(r.msg);
      save(state);
      checkGameOver(state, restart);
      render(state);
    },
    onLayoutChange: () => {
      save(state);
    },
    onResearch: (raw) => {
      const s = String(raw || "");
      if (s.startsWith("treeNode:")) {
        const nodeId = s.split(":")[1] || "";
        const members = state.team?.members || [];
        const options =
          `<option value="">（未指派）</option>` +
          members.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join("");
        // Special: postmortem requires choosing a historical product/project
        const n = (RESEARCH_TREE?.nodes || []).find((x) => x.id === nodeId) || null;
        if (n?.kind === "postmortem") {
          const prods = state.active?.products || [];
        const done = Array.isArray(state.knowledge?.postmortemedProductIds) ? state.knowledge.postmortemedProductIds : [];
          const prodOptions =
          `<option value="">（请选择）</option>` +
          prods
            .map((p) => {
              const pid = String(p.id || "");
              const disabled = done.includes(pid);
              const suffix = disabled ? "（已复盘）" : "";
              return `<option value="${escapeHtml(pid)}" ${disabled ? "disabled" : ""}>${escapeHtml(p.title || pid)}（${escapeHtml(String(p.archetype || ""))}）${suffix}</option>`;
            })
            .join("");
          openModal({
            title: "泽娜复盘（解锁已知搭配）",
            body: `
            <div class="muted">选择一个历史产品/项目做复盘。同一对象只能复盘一次；且只有<b>高匹配（≥${ZENA_RECIPE_UNLOCK_MATCH_PCT}）</b>复盘后才会解锁该【类型】的配方表。</div>
              <div style="margin-top:12px;">
                <div class="muted" style="margin-bottom:6px;">选择历史产品/项目</div>
                <select class="select" id="pmProductId">${prodOptions}</select>
              </div>
              <div style="margin-top:12px;">
                <div class="muted" style="margin-bottom:6px;">指派负责人</div>
                <select class="select" id="pmAssignee">${options}</select>
              </div>
            `,
            actions: [
              { label: "取消", onClick: closeModal },
              {
                label: "开始复盘",
                kind: "primary",
                onClick: () => {
                  const selP = /** @type {HTMLSelectElement|null} */ (document.getElementById("pmProductId"));
                  const productId = String(selP?.value || "") || "";
                  const selA = /** @type {HTMLSelectElement|null} */ (document.getElementById("pmAssignee"));
                  const assigneeId = String(selA?.value || "") || null;
                  const r = startResearchNode(state, nodeId, assigneeId, { productId });
                  if (!r.ok) {
                    toast(r.msg);
                    return;
                  }
                  save(state);
                  render(state);
                  switchTab("research");
                  closeModal();
                },
              },
            ],
          });
          return;
        }

        openModal({
          title: "开始科研",
          body: `
            <div class="muted">选择负责人（可为空）。开始后会占用一条研发队列，并随时间推进。</div>
            <div style="margin-top:12px;">
              <div class="muted" style="margin-bottom:6px;">指派负责人</div>
              <select class="select" id="rtAssignee">${options}</select>
            </div>
          `,
          actions: [
            { label: "取消", onClick: closeModal },
            {
              label: "开始",
              kind: "primary",
              onClick: () => {
                const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById("rtAssignee"));
                const assigneeId = String(sel?.value || "") || null;
                const r = startResearchNode(state, nodeId, assigneeId);
                if (!r.ok) toast(r.msg);
                save(state);
                render(state);
                switchTab("research");
                closeModal();
              },
            },
          ],
        });
        return;
      }

      const [op, key] = s.split(":");
      if (op !== "upgrade") return;
      // 改为“开始研发→随时间推进→完成”
      const members = state.team?.members || [];
      const options =
        `<option value="">（未指派）</option>` +
        members.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join("");
      openModal({
        title: "开始研发",
        body: `
          <div class="muted">研发需要时间推进；指派更合适的人会更快完成。</div>
          <div style="margin-top:12px;">
            <div class="muted" style="margin-bottom:6px;">指派研发负责人</div>
            <select class="select" id="researchAssignee">${options}</select>
          </div>
        `,
        actions: [
          { label: "取消", onClick: closeModal },
          {
            label: "开始",
            kind: "primary",
            onClick: () => {
              const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById("researchAssignee"));
              const assigneeId = String(sel?.value || "") || null;
              // 旧按钮仍走原逻辑（版本升级），科研树走 node 逻辑
              const r = startResearch(state, key, assigneeId);
              if (!r.ok) toast(r.msg);
              closeModal();
              save(state);
              render(state);
            },
          },
        ],
      });
    },
    onToggleTime: () => {
      normalizeState(state);
      if (state.flags.gameOver) return;
      state.time.paused = !state.time.paused;
      render(state);
    },
    onTimeSpeedChange: (speed) => {
      normalizeState(state);
      if (state.flags.gameOver) return;
      state.time.speed = clamp(Number(speed) || 1, 0.5, 8);
      render(state);
    },
    onSave: () => {
      save(state);
      toast("已保存。");
      render(state);
    },
    onNewGame: () => {
      openModal({
        title: "新档",
        body: `<div class="muted">创建新存档会覆盖当前进度（可先点“保存”）。</div>`,
        actions: [
          { label: "取消", onClick: closeModal },
          {
            label: "创建",
            kind: "primary",
            onClick: () => {
              closeModal();
              state = initNewState();
              refreshDevApi();
              save(state);
              render(state);
              switchTab("dashboard");
            },
          },
        ],
      });
    },
    onCreateProject: (baseProductId = null) => {
      const opt = (list, val) => list.map((x) => `<option value="${escapeHtml(x.key)}" ${x.key === val ? "selected" : ""}>${escapeHtml(x.name)}</option>`).join("");
      const products = state.active?.products || [];
      const prodOptions =
        `<option value="">（不选择：开发新项目）</option>` +
        products.map((p) => `<option value="${escapeHtml(p.id)}" ${p.id === baseProductId ? "selected" : ""}>${escapeHtml(p.title)}</option>`).join("");

      const baseProd = baseProductId ? products.find((p) => p.id === baseProductId) : null;
      const upgrades = baseProd ? upgradeOptionsForProduct(baseProd) : [];
      const upgradeOptions =
        upgrades.length > 0
          ? upgrades.map((u) => `<option value="${escapeHtml(u.key)}">${escapeHtml(u.title)}</option>`).join("")
          : `<option value="">（该产品暂无可用二次开发）</option>`;

      openModal({
        title: "立项 / 二次开发",
        body: `
          <div class="muted">你可以选择：① 新项目；② 基于某个已上线产品做二次开发（扩展能力）。</div>
          <div style="margin-top:12px;">
            <div class="muted" style="margin-bottom:6px;">基于已有产品（二次开发，可选）</div>
            <select class="select" id="cp_baseProduct">${prodOptions}</select>
          </div>

          ${baseProd ? `
            <div style="margin-top:12px;">
              <div class="muted" style="margin-bottom:6px;">二次开发方向</div>
              <select class="select" id="cp_upgradeKey">${upgradeOptions}</select>
              <div class="muted" style="margin-top:8px;">完成后会把扩展效果合并回原产品（例如钱包 +DEX 会开始产生 TVL/Volume/手续费）。</div>
            </div>
          ` : (() => {
            const a = ARCHETYPES[0]?.key;
            const n = NARRATIVES[0]?.key;
            const c = CHAINS[0]?.key;
            const u = AUDIENCES[0]?.key;
            const known = isZenaKnown(state, a);
            const combo = knownComboBreakdown(a, n, c, u);
            const chip2 = (label, it) => `<span class="chip chip--${escapeHtml(it.tone)}">${escapeHtml(label)}：${escapeHtml(it.label)}</span>`;
            const hi = (label, it, pickedName) => (it.key === "perfect" ? `<span class="chip chip--good">高匹配：${escapeHtml(label)}=${escapeHtml(pickedName)}</span>` : "");
            const nName0 = (NARRATIVES.find((x) => x.key === n) || { name: n }).name;
            const cName0 = (CHAINS.find((x) => x.key === c) || { name: c }).name;
            const uName0 = (AUDIENCES.find((x) => x.key === u) || { name: u }).name;
            return `
            <div class="divider"></div>
            <div class="subhead">新项目配置</div>
            <div style="margin-top:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <label class="muted">类型（Archetype）
                <select class="select" id="cp_archetype">${opt(ARCHETYPES, ARCHETYPES[0]?.key)}</select>
              </label>
              <label class="muted">题材/叙事（Narrative）
                <select class="select" id="cp_narrative">${opt(NARRATIVES, NARRATIVES[0]?.key)}</select>
              </label>
              <label class="muted">链/生态（Chain）
                <select class="select" id="cp_chain">${opt(CHAINS, CHAINS[0]?.key)}</select>
              </label>
              <label class="muted">受众（Audience）
                <select class="select" id="cp_audience">${opt(AUDIENCES, AUDIENCES[0]?.key)}</select>
              </label>
              <label class="muted">规模（Scale）
                <select class="select" id="cp_scale">
                  <option value="1" selected>小（L1）</option>
                  <option value="2">中（L2）</option>
                  <option value="3">大（L3）</option>
                </select>
              </label>
            </div>
            <div class="divider"></div>
            <div class="item" style="margin-top:8px;">
              <div class="item__top">
                <div>
                  <div class="item__title">匹配信息（已知搭配）</div>
                  <div class="muted" style="margin-top:6px;">根据“类型×叙事/链/受众”的已知搭配表计算。</div>
                </div>
              </div>
              <div class="item__body">
                <div id="cp_matchInfo">
                  ${known ? `
                    <div class="chips" style="display:flex;gap:10px;flex-wrap:wrap;">
                      ${chip2("叙事", combo.narrative)}
                      ${chip2("链", combo.chain)}
                      ${chip2("受众", combo.audience)}
                      <span class="chip">已知搭配得分 ${escapeHtml(String(combo.pct))}%</span>
                      ${hi("叙事", combo.narrative, nName0)}
                      ${hi("链", combo.chain, cName0)}
                      ${hi("受众", combo.audience, uName0)}
                    </div>
                  ` : `<div class="muted">未知：需要先对该【类型】做一次复盘，才会显示高匹配点。</div>`}
                </div>
                <div class="muted" style="margin-top:8px;">提示：会随你修改下拉选项实时刷新；如果已复盘，会标出“高匹配点”。</div>
              </div>
            </div>
          `;
          })()}
        `,
        actions: [
          { label: "取消", onClick: closeModal },
          { label: "查看泽娜已知搭配表", onClick: () => openKnownMatchTableModal(state) },
          {
            label: baseProd ? "二次开发并开始" : "立项并开始",
            kind: "primary",
            onClick: () => {
              const selBase = /** @type {HTMLSelectElement|null} */ (document.getElementById("cp_baseProduct"));
              const chosenBase = String(selBase?.value || "") || "";
              if (chosenBase) {
                const selUp = /** @type {HTMLSelectElement|null} */ (document.getElementById("cp_upgradeKey"));
                const upgradeKey = String(selUp?.value || "") || "";
                const cfg = { baseProductId: chosenBase, upgradeKey, scale: 1 };
                const r = createProject(state, cfg);
                if (!r.ok) {
                  toast(r.msg);
                  return;
                }
              } else {
                const g = (id) => /** @type {HTMLSelectElement|null} */ (document.getElementById(id));
                const cfg = {
                  archetype: g("cp_archetype")?.value,
                  narrative: g("cp_narrative")?.value,
                  chain: g("cp_chain")?.value,
                  audience: g("cp_audience")?.value,
                  scale: parseInt(g("cp_scale")?.value || "1", 10) || 1,
                };
                const r = createProject(state, cfg);
                if (!r.ok) {
                  toast(r.msg);
                  return;
                }
              }
              closeModal();
              save(state);
              render(state);
              switchTab("dashboard");
            },
          },
        ],
      });

      // dynamic rerender when base product changes
      const baseSel = document.getElementById("cp_baseProduct");
      if (baseSel && baseSel instanceof HTMLSelectElement) {
        baseSel.addEventListener("change", () => {
          const v = String(baseSel.value || "") || null;
          closeModal();
          // reopen with selected base
          handlers.onCreateProject?.(v);
        }, { once: true });
      }

      if (!baseProd) {
        const updateMatchInfo = () => {
          const aSel = /** @type {HTMLSelectElement|null} */ (document.getElementById("cp_archetype"));
          const nSel = /** @type {HTMLSelectElement|null} */ (document.getElementById("cp_narrative"));
          const cSel = /** @type {HTMLSelectElement|null} */ (document.getElementById("cp_chain"));
          const uSel = /** @type {HTMLSelectElement|null} */ (document.getElementById("cp_audience"));
          const host = document.getElementById("cp_matchInfo");
          if (!aSel || !nSel || !cSel || !uSel || !host) return;
          const a2 = String(aSel.value || "");
          const n2 = String(nSel.value || "");
          const c2 = String(cSel.value || "");
          const u2 = String(uSel.value || "");
          const known2 = isZenaKnown(state, a2);
          if (!known2) {
            host.innerHTML = `<div class="muted">未知：需要先对【${escapeHtml(a2)}】类型做一次复盘。</div>`;
            return;
          }
          const combo2 = knownComboBreakdown(a2, n2, c2, u2);
          const chip2 = (label, it) => `<span class="chip chip--${escapeHtml(it.tone)}">${escapeHtml(label)}：${escapeHtml(it.label)}</span>`;
          const hi = (label, it, pickedName) => (it.key === "perfect" ? `<span class="chip chip--good">高匹配：${escapeHtml(label)}=${escapeHtml(pickedName)}</span>` : "");
          const nName = (NARRATIVES.find((x) => x.key === n2) || { name: n2 }).name;
          const cName = (CHAINS.find((x) => x.key === c2) || { name: c2 }).name;
          const uName = (AUDIENCES.find((x) => x.key === u2) || { name: u2 }).name;
          host.innerHTML = `
            <div class="chips" style="display:flex;gap:10px;flex-wrap:wrap;">
              ${chip2("叙事", combo2.narrative)}
              ${chip2("链", combo2.chain)}
              ${chip2("受众", combo2.audience)}
              <span class="chip">已知搭配得分 ${escapeHtml(String(combo2.pct))}%</span>
              ${hi("叙事", combo2.narrative, nName)}
              ${hi("链", combo2.chain, cName)}
              ${hi("受众", combo2.audience, uName)}
            </div>
          `;
        };
        for (const id of ["cp_archetype", "cp_narrative", "cp_chain", "cp_audience"]) {
          const el = document.getElementById(id);
          if (el && el instanceof HTMLSelectElement) el.addEventListener("change", updateMatchInfo);
        }
        updateMatchInfo();
      }
    },
    onResetGame: () => {
      openModal({
        title: "重置",
        body: `<div><b>确定要重置并清空存档吗？</b></div><div class="muted" style="margin-top:8px;">这会删除本地存档。</div>`,
        actions: [
          { label: "取消", onClick: closeModal },
          { label: "重置并重开", kind: "primary", onClick: restart },
        ],
      });
    },
    onClearLog: () => {
      state.log = [];
      render(state);
    },
    onExploreCandidates: () => {
      const cash = Math.round(state.resources?.cash ?? 0);
      const line = (name, costRange) => `${name}（¥${costRange}）`;
      openModal({
        title: "探索候选人",
        body: `
          <div class="muted">选择渠道获取新的候选人，候选人会加入“市场→候选人”列表（上限 8）。</div>
          <div class="divider"></div>
          <div class="muted">当前现金：¥${cash.toLocaleString("zh-CN")}</div>
        `,
        actions: [
          { label: "取消", onClick: closeModal },
          {
            label: line("朋友介绍", "3,000~9,000"),
            onClick: () => {
              const r = exploreCandidates(state, "referral");
              if (!r.ok) toast(r.msg);
              else toast(`通过${r.sourceName}获得 ${r.addedCount} 位候选人（花费 ¥${r.cost.toLocaleString("zh-CN")}）。`);
              closeModal();
              save(state);
              render(state);
              // 候选人列表在“团队”页的招聘区（没有单独 market tab）
              switchTab("team");
            },
          },
          {
            label: line("招聘平台", "9,000~18,000"),
            onClick: () => {
              const r = exploreCandidates(state, "jobboard");
              if (!r.ok) toast(r.msg);
              else toast(`通过${r.sourceName}获得 ${r.addedCount} 位候选人（花费 ¥${r.cost.toLocaleString("zh-CN")}）。`);
              closeModal();
              save(state);
              render(state);
              // 候选人列表在“团队”页的招聘区（没有单独 market tab）
              switchTab("team");
            },
          },
          {
            label: line("猎头", "32,000~55,000"),
            kind: "primary",
            onClick: () => {
              const r = exploreCandidates(state, "headhunter");
              if (!r.ok) toast(r.msg);
              else toast(`通过${r.sourceName}获得 ${r.addedCount} 位候选人（花费 ¥${r.cost.toLocaleString("zh-CN")}）。`);
              closeModal();
              save(state);
              render(state);
              // 候选人列表在“团队”页的招聘区（没有单独 market tab）
              switchTab("team");
            },
          },
        ],
      });
    },
    onRecipeBook: () => {
      openKnownMatchTableModal(state);
    },
    onCloseModal: closeModal,
  });

  render(state);
  switchTab("dashboard");

  const tick = (ts) => {
    normalizeState(state);
    const last = state.time?.lastTs || ts;
    const deltaSec = Math.max(0, (ts - last) / 1000);
    if (state.time) state.time.lastTs = ts;
    if (state.time && !state.time.paused && !state.flags.gameOver) {
      // 加速手感：即便 x4 也要看得出“天”的变化
      const BASE_HOURS_PER_SEC = 0.6;
      const deltaHours = deltaSec * BASE_HOURS_PER_SEC * (state.time.speed || 1);
      advanceTime(state, deltaHours);
      checkGameOver(state, restart);
      // Do NOT rerender every animation frame; it breaks interactions (inputs/buttons)
      renderThrottled(ts);
    }

    // stage gate modal (project enters a new stage)
    const modalEl = document.getElementById("modal");
    const modalOpen = modalEl && !modalEl.classList.contains("is-hidden");
    if (!modalOpen && Array.isArray(state.stageQueue) && state.stageQueue.length > 0) {
      const next = state.stageQueue.shift();
      if (next?.kind === "project" && next?.id) openStagePrefsModal(state, next.id);
      save(state);
    }

    // delivery rating modal (after project/upgrade completion)
    const modalOpen2 = modalEl && !modalEl.classList.contains("is-hidden");
    const rq = state.ui?.ratingQueue;
    if (!modalOpen2 && Array.isArray(rq) && rq.length > 0) {
      const entry = rq.shift();
      if (entry) {
        openDeliveryRatingModal(state, entry);
        save(state);
      }
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

main();

