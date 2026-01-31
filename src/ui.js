import { $, $$ } from "./dom.js?v=57";
import { clamp, escapeHtml, money } from "./utils.js?v=57";
import { normalizeState, weekLabel } from "./state.js?v=57";
import { ARCHETYPES, AUDIENCES, CHAINS, INBOX_DEFS, NARRATIVES, PLATFORMS, RESEARCH_TREE, ensureSelection, estimateDailyCashDelta, findTarget, projectProductScore10, projectStage, projectTechScore10, researchNodeStatus } from "./logic.js?v=57";

export function switchTab(tabKey) {
  for (const btn of $$(".tab")) {
    const active = btn.dataset.tab === tabKey;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  }
  for (const panel of $$("[data-tab-panel]")) {
    const active = panel.dataset.tabPanel === tabKey;
    panel.classList.toggle("is-hidden", !active);
  }
}

function labelOf(list, key) {
  return (list.find((x) => x.key === key) || { name: key }).name;
}

function chip(text, tone = "") {
  const cls = tone ? `chip chip--${tone}` : "chip";
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

function renderStats(state) {
  const r = state.resources;
  const host = document.getElementById("stats");
  if (!host) return;
  const delta = estimateDailyCashDelta(state);
  const sign = delta.net >= 0 ? "+" : "-";
  const netAbs = Math.abs(delta.net);
  const netText = `${sign}${money(netAbs)}/天`;
  const parts = [];
  if (delta.salaryDaily > 0) parts.push(`工资 -${money(delta.salaryDaily)}/天`);
  if (delta.livingCostDaily > 0) parts.push(`杂费 -${money(delta.livingCostDaily)}/天`);
  const burnText = parts.length ? `（${parts.join("，")}）` : "";
  const rows = [
    ["现金", money(r.cash)],
    ["预计每日现金变化", `${netText} ${burnText}`.trim()],
    ["声誉", `${r.reputation}/100`],
    ["社区", `${r.community}/100`],
    ["技术点", String(r.techPoints)],
    ["粉丝", `${Math.round(r.fans || 0).toLocaleString("zh-CN")}`],
    ["人脉", `${r.network}/100`],
    ["安全风险", `${r.securityRisk}/100`],
    ["合规风险", `${r.complianceRisk}/100`],
  ];
  host.innerHTML = `<div class="kvs">${rows
    .map(([k, v]) => `<div class="kv"><div class="kv__k">${escapeHtml(k)}</div><div class="kv__v">${escapeHtml(v)}</div></div>`)
    .join("")}</div>`;
}

function renderTopbar(state) {
  const timeLabel = document.getElementById("timeLabel");
  if (timeLabel) timeLabel.textContent = weekLabel(state);
  const pn = document.getElementById("playerName");
  if (pn) pn.textContent = state.player?.name || "—";
  const pt = document.getElementById("playerTitle");
  if (pt) pt.textContent = state.player?.title || "—";

  // Dev scores next to "立项" (GDT-like)
  const scoreHost = document.getElementById("topDevScores");
  if (scoreHost) {
    ensureSelection(state);
    const sel = state.selectedTarget;
    const p = sel && sel.kind === "project" ? findTarget(state, "project", sel.id) : null;
    if (p) {
      const idx = clamp(Math.round(p.stageIndex || 0), 0, 2);
      const pct = clamp(Number(p.stageProgress) || 0, 0, 100);
      const progress01 = clamp((idx + pct / 100) / 3, 0, 1);
      const ease = Math.pow(progress01, 0.65);
      const baseStart = 2 + clamp((Number(p.scale) || 1) - 1, 0, 2) * 0.4;
      const targetP = projectProductScore10(p, state);
      const targetT = projectTechScore10(p, state);
      const curP = clamp(Math.round(baseStart + (targetP - baseStart) * ease), 1, 10);
      const curT = clamp(Math.round(baseStart + (targetT - baseStart) * ease), 1, 10);
      scoreHost.innerHTML = `${chip(`产品分 ${curP}/10`)}${chip(`技术分 ${curT}/10`)}`;
    } else {
      scoreHost.innerHTML = "";
    }
  }

  const speedLabel = document.getElementById("timeSpeedLabel");
  if (speedLabel) speedLabel.textContent = `x${state.time?.speed ?? 1}`;
  const toggleBtn = document.querySelector('[data-ui="toggleTime"]');
  if (toggleBtn) toggleBtn.textContent = state.time?.paused ? "开始" : "暂停";

  const timeSpeed = document.getElementById("timeSpeed");
  if (timeSpeed) timeSpeed.value = String(state.time?.speed ?? 1);
}

function applyLayout(state) {
  const w = clamp(Math.round(state.settings?.layout?.colLeft ?? 420), 260, 560);
  document.documentElement.style.setProperty("--col-left", `${w}px`);
}

function renderDashboard(state) {
  const host = document.getElementById("dashboard");
  if (!host) return;
  ensureSelection(state);
  const sel = state.selectedTarget;
  const target = sel ? findTarget(state, sel.kind, sel.id) : null;

  const active = state.active.projects || [];
  const live = state.active.products || [];

  const projectLine = (p) => {
    const stg = projectStage(p);
    const pct = clamp(Math.round(p.stageProgress || 0), 0, 100);
    const paused = p.stagePaused ? "（待配置）" : "";
    return `<div class="item">
      <div class="item__top">
        <div>
          <div class="item__title">${escapeHtml(p.title)}</div>
          <div class="muted" style="margin-top:6px;">
            ${escapeHtml(labelOf(ARCHETYPES, p.archetype))} · ${escapeHtml(labelOf(CHAINS, p.chain))} · ${escapeHtml(labelOf(NARRATIVES, p.narrative))}
          </div>
        </div>
        <div class="chips">
          ${chip(stg)}${chip(`${pct}%`, p.stagePaused ? "warn" : "good")}${chip(`预算 ${money(p.budget)}`)}
        </div>
      </div>
      <div class="item__actions">
        <button class="btn" data-select="project:${p.id}">设为当前</button>
        <button class="btn btn--ghost" data-stage="project:${p.id}">阶段配置</button>
        <button class="btn btn--ghost" data-abandon="project:${p.id}">废弃</button>
      </div>
    </div>`;
  };

  const productLine = (p) => {
    const k = p.kpi || {};
    const s = p.scores || {};
    const known = Boolean(p?.archetype && Array.isArray(state.knowledge?.zenaKnownArchetypes) && state.knowledge.zenaKnownArchetypes.includes(String(p.archetype)));
    const quality10 = clamp(Math.round(1 + clamp(Math.round(s.match || 0), 0, 100) / 100 * 9), 1, 10);
    return `<div class="item">
      <div class="item__top">
        <div>
          <div class="item__title">${escapeHtml(p.title)}</div>
          <div class="muted" style="margin-top:6px;">
            DAU ${Math.round(k.dau || 0).toLocaleString("zh-CN")} · TVL ${Math.round(k.tvl || 0).toLocaleString("zh-CN")} · 周利润 ${money(k.profit || 0)}
          </div>
        </div>
        <div class="chips">
          ${chip(`安全 ${s.security}`)}${chip(`增长 ${s.growth}`)}${known ? chip(`质量 ${quality10}/10`) : chip("质量 未知", "warn")}
        </div>
      </div>
      <div class="item__actions">
        <button class="btn" data-select="product:${p.id}">设为当前</button>
        <button class="btn btn--ghost" data-postmortem="${escapeHtml(p.id)}">复盘</button>
      </div>
    </div>`;
  };

  const done = Array.isArray(state.history?.projectsDone) ? state.history.projectsDone.slice(0, 12) : [];
  const doneLine = (d) => {
    const pf = (PLATFORMS || []).find((x) => x.key === d.platform)?.name || d.platform || "—";
    const meta = `${escapeHtml(labelOf(ARCHETYPES, d.archetype))} · ${escapeHtml(labelOf(NARRATIVES, d.narrative))} · ${escapeHtml(labelOf(CHAINS, d.chain))} · ${escapeHtml(labelOf(AUDIENCES, d.audience))} · ${escapeHtml(pf)}`;
    const avg = Number(d.avgRating10) || 0;
    const ps = Math.round(Number(d.productScore10) || 0);
    const ts = Math.round(Number(d.techScore10) || 0);
    const fansG = Math.round(Number(d.fansGained) || 0);
    const cost = Math.round(Number(d.costSpent) || 0);
    const postId = d.kind === "launch" ? d.productId : d.baseProductId;
    return `
      <div class="item">
        <div class="item__top">
          <div>
            <div class="item__title">${escapeHtml(d.title || "（未命名）")} <span class="muted">（评分 ${avg.toFixed(1)}/10）</span></div>
            <div class="muted" style="margin-top:6px;">${meta}</div>
          </div>
          <div class="chips">
            ${chip(`产品分 ${ps}/10`)}
            ${chip(`技术分 ${ts}/10`)}
            ${chip(`粉丝 +${fansG.toLocaleString("zh-CN")}`)}
            ${chip(`成本 ${money(cost)}`)}
          </div>
        </div>
        <div class="item__actions">
          <button class="btn" data-done-detail="${escapeHtml(d.id)}">详情</button>
          ${postId ? `<button class="btn btn--ghost" data-postmortem="${escapeHtml(postId)}">复盘</button>` : ""}
        </div>
      </div>
    `;
  };

  const pickLine = target
    ? `<div class="muted" style="margin-bottom:10px;">当前选中：${escapeHtml(target.title || "")}</div>`
    : `<div class="muted" style="margin-bottom:10px;">当前选中：无</div>`;

  const stageBoard =
    target && target.kind === "project"
      ? (() => {
          const p = target;
          const idx = clamp(Math.round(p.stageIndex || 0), 0, 2);
          const curPct = clamp(Math.round(p.stageProgress || 0), 0, 100);
          const stageMeta = [
            { key: "S1", name: "阶段 1：产品/架构" },
            { key: "S2", name: "阶段 2：开发实现" },
            { key: "S3", name: "阶段 3：上线准备" },
          ];
          const cell = (i) => {
            const isCur = i === idx;
            const isDone = i < idx;
            const pct = isDone ? 100 : isCur ? curPct : 0;
            const tag = isDone ? chip("已完成", "good") : isCur ? chip(p.stagePaused ? "待配置" : "进行中", p.stagePaused ? "warn" : "good") : chip("未开始");
            return `
              <div class="card" style="padding:12px; background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.10);">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                  <div style="font-weight:900;">${escapeHtml(stageMeta[i].name)}</div>
                  <div class="chips">${tag}${chip(`${pct}%`, isDone ? "good" : isCur && p.stagePaused ? "warn" : isCur ? "good" : "")}</div>
                </div>
                <div class="bar" style="margin-top:10px;"><i style="width:${pct}%"></i></div>
                <div class="muted" style="margin-top:8px;">
                  ${isCur ? (p.stagePaused ? "需要先做“阶段配置”（滑条配方），否则进度不会推进。" : "时间推进时会持续推进本阶段进度。") : isDone ? "该阶段已结算完成。" : "尚未进入该阶段。"}
                </div>
              </div>
            `;
          };
          return `
            <div class="item" style="margin-bottom:12px;">
              <div class="item__top">
                <div>
                  <div class="item__title">开发进度（核心玩法）</div>
                  <div class="muted" style="margin-top:6px;">三阶段是主循环：每次进新阶段都会弹出“配方滑条”。</div>
                </div>
                <div class="chips">${chip(`当前 ${projectStage(p)}`, p.stagePaused ? "warn" : "good")}</div>
              </div>
              <div class="item__body">
                <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
                  ${cell(0)}
                  ${cell(1)}
                  ${cell(2)}
                </div>
              </div>
            </div>
          `;
        })()
      : "";

  const researchPanel =
    state.research?.task
      ? (() => {
          const t = state.research.task;
          const pct = clamp(Math.round(((Number(t.hoursDone) || 0) / Math.max(1, Number(t.hoursTotal) || 1)) * 100), 0, 100);
          const title = t.kind === "node" ? "科研进行中" : "研发进行中";
          const name =
            t.kind === "node"
              ? `节点：${t.nodeId || "—"}`
              : t.engineKey
                ? `引擎：${String(t.engineKey).toUpperCase()}`
                : "—";
          const who = t.assigneeId ? (state.team?.members || []).find((m) => m.id === t.assigneeId)?.name || "（未知）" : "（未指派）";
          return `
            <div class="item" style="margin-bottom:12px;">
              <div class="item__top">
                <div>
                  <div class="item__title">${escapeHtml(title)}</div>
                  <div class="muted" style="margin-top:6px;">${escapeHtml(name)} · 负责人：${escapeHtml(who)} · ${pct}%</div>
                </div>
                <div class="chips">${chip(`${Math.round(Number(t.hoursDone) || 0)}/${Math.round(Number(t.hoursTotal) || 0)}h`)}</div>
              </div>
              <div class="bar" style="margin-top:10px;"><i style="width:${pct}%"></i></div>
            </div>
          `;
        })()
      : "";

  host.innerHTML = `
    ${pickLine}
    ${researchPanel}
    ${stageBoard}
    <div class="subhead">进行中的项目</div>
    <div class="list">${active.length ? active.map(projectLine).join("") : `<div class="muted">暂无进行中项目。</div>`}</div>
    <div class="divider"></div>
    <div class="subhead">已上线产品</div>
    <div class="list">${live.length ? live.map(productLine).join("") : `<div class="muted">暂无上线产品。</div>`}</div>
    <div class="divider"></div>
    <div class="subhead">已研发项目</div>
    <div class="list">${done.length ? done.map(doneLine).join("") : `<div class="muted">暂无已研发项目。</div>`}</div>
  `;
}

function renderMarket(state) {
  const hireHost = document.getElementById("hireMarket");
  if (!hireHost) return;
  const hires = state.market.hires || [];
  hireHost.innerHTML = hires.length
    ? hires
        .map((c) => {
          const s = c.skills || {};
          const perkText = c.perk?.name ? `${c.perk.name}：${c.perk.desc || ""}` : "";
          const highlights = [
            ["产品", s.product],
            ["合约", s.contract],
            ["安全", s.security],
            ["增长", s.growth],
          ]
            .map(([k, v]) => `${k}${Math.round(v)}`)
            .join(" · ");
          return `<div class="item">
        <div class="item__top">
          <div>
            <div class="item__title">${escapeHtml(c.name)} <span class="muted">(${escapeHtml(c.trait || "")})</span></div>
            <div class="muted" style="margin-top:6px;">${escapeHtml(highlights)}${perkText ? `<br/>${escapeHtml(perkText)}` : ""}</div>
          </div>
          <div class="chips">${chip(`周薪 ${money(c.salaryWeekly)}`)}</div>
        </div>
        <div class="item__actions">
          <button class="btn" data-accept="hire:${c.id}">招募</button>
        </div>
      </div>`;
        })
        .join("")
    : `<div class="muted">暂无候选人。</div>`;
}

function renderTeam(state) {
  const host = document.getElementById("teamList");
  if (!host) return;
  const ms = state.team?.members || [];
  if (!ms.length) {
    host.innerHTML = `<div class="muted">暂无团队成员。</div>`;
    return;
  }

  const card = (m) => {
    const s = m.skills || {};
    const perk = m.perk?.name ? `${m.perk.name}：${m.perk.desc || ""}` : "";
    const rows = [
      ["产品", s.product],
      ["设计", s.design],
      ["机制", s.protocol],
      ["合约", s.contract],
      ["运维", s.infra],
      ["安全", s.security],
      ["增长", s.growth],
      ["合规", s.compliance],
    ]
      .map(([k, v]) => {
        const n = clamp(Math.round(Number(v) || 0), 0, 100);
        return `<div class="statRow"><div class="statRow__k">${escapeHtml(k)}</div><div class="statRow__v">${n}</div></div>`;
      })
      .join("");

    return `
      <div class="memberCard">
        <div class="memberCard__top">
          <div>
            <div class="memberCard__name">${escapeHtml(m.name)}</div>
            <div class="muted" style="margin-top:4px;">${escapeHtml(m.role || "staff")}</div>
          </div>
          <div class="chips">${chip(m.salaryWeekly ? `周薪 ${money(m.salaryWeekly)}` : "创始人")}</div>
        </div>
        ${perk ? `<div class="memberCard__perk muted">${escapeHtml(perk)}</div>` : ""}
        <div class="memberCard__stats">
          ${rows}
        </div>
      </div>
    `;
  };

  host.innerHTML = `
    <div class="item" style="margin-bottom:12px;">
      <div class="item__top">
        <div>
          <div class="item__title">人才探索</div>
          <div class="muted" style="margin-top:6px;">从不同渠道拉候选人（猎头 / 招聘平台 / 朋友介绍），会消耗现金。</div>
        </div>
        <div class="chips">${chip(`当前候选人 ${Math.round((state.market?.hires || []).length)}`)}</div>
      </div>
      <div class="item__actions">
        <button class="btn" data-ui="exploreCandidates">探索候选人</button>
      </div>
    </div>
    <div class="teamGrid">${ms.map(card).join("")}</div>
  `;
}

function renderResearch(state) {
  const host = document.getElementById("researchPanel");
  if (!host) return;
  const e = state.engine || {};
  const r = state.resources;
  const task = state.research?.task || null;
  const pct = task ? clamp(Math.round(((Number(task.hoursDone) || 0) / Math.max(1, Number(task.hoursTotal) || 1)) * 100), 0, 100) : 0;

  const nextUpgrade = (engineKey) => {
    const cur = clamp(Math.round(e?.[engineKey]?.version ?? 1), 1, 9);
    const target = clamp(cur + 1, 1, 9);
    const node = (RESEARCH_TREE?.nodes || []).find((n) => n?.kind === "engine_upgrade" && n?.engineKey === engineKey && Number(n?.targetVersion) === target) || null;
    if (!node) return { label: `${engineKey.toUpperCase()}：已满级`, disabled: true };
    return { label: `${engineKey.toUpperCase()}：${node.title}（v${cur}→v${target}）`, disabled: false };
  };
  const uDev = nextUpgrade("dev");
  const uSec = nextUpgrade("sec");
  const uInfra = nextUpgrade("infra");
  const uEco = nextUpgrade("eco");

  const nodes = (RESEARCH_TREE?.nodes || []).filter((n) => n && n.id && n.pos);
  const edges = [];
  for (const n of nodes) {
    for (const pre of n.requires || []) {
      const from = nodes.find((x) => x.id === pre);
      if (!from) continue;
      edges.push({ from, to: n });
    }
  }
  const minX = Math.min(...nodes.map((n) => n.pos.x));
  const minY = Math.min(...nodes.map((n) => n.pos.y));
  const maxX = Math.max(...nodes.map((n) => n.pos.x + 160));
  const maxY = Math.max(...nodes.map((n) => n.pos.y + 92));
  const width = Math.max(900, maxX - minX + 80);
  const height = Math.max(520, maxY - minY + 80);

  const nodeHtml = nodes
    .map((n) => {
      const st = researchNodeStatus(state, n.id);
      const cls =
        st.kind === "done"
          ? "rgnode is-done"
          : st.kind === "locked"
            ? "rgnode is-locked"
            : st.kind === "researching"
              ? "rgnode is-doing"
              : "rgnode is-avail";
      const badge = st.kind === "done" ? "已完成" : st.kind === "locked" ? "锁定" : st.kind === "researching" ? "研究中" : "可研究";
      const disabled = st.kind === "done" || st.kind === "locked" || (state.research?.task && st.kind !== "researching");
      const left = n.pos.x - minX + 40;
      const top = n.pos.y - minY + 40;
      return `
        <button class="${cls}" style="left:${left}px; top:${top}px;" ${disabled ? "disabled" : ""} data-research="treeNode:${escapeHtml(n.id)}">
          <div class="rgnode__title">${escapeHtml(n.title || n.id)}</div>
          <div class="rgnode__meta">${escapeHtml(n.effectLabel || "")}${n.effectLabel ? " · " : ""}${escapeHtml(badge)}</div>
          <div class="rgnode__hint">${escapeHtml(n.hint || "")}</div>
        </button>
      `;
    })
    .join("");

  const edgeSvg = edges
    .map((e) => {
      const x1 = e.from.pos.x - minX + 40 + 80;
      const y1 = e.from.pos.y - minY + 40 + 46;
      const x2 = e.to.pos.x - minX + 40 + 80;
      const y2 = e.to.pos.y - minY + 40 + 46;
      return `<path d="M ${x1} ${y1} C ${x1 + 60} ${y1} ${x2 - 60} ${y2} ${x2} ${y2}" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="2"/>`;
    })
    .join("");

  host.innerHTML = `
    <div class="item">
      <div class="item__top">
        <div>
          <div class="item__title">研发中心</div>
          <div class="muted" style="margin-top:6px;">Dev v${e.dev?.version ?? 1} · Sec v${e.sec?.version ?? 1} · Infra v${e.infra?.version ?? 1} · Eco v${e.eco?.version ?? 1}</div>
        </div>
        <div class="chips">${chip(`技术点 ${r.techPoints}`)}</div>
      </div>
      <div class="item__actions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn" data-research="upgrade:dev" ${(task || uDev.disabled) ? "disabled" : ""}>${escapeHtml(uDev.label)}</button>
        <button class="btn" data-research="upgrade:sec" ${(task || uSec.disabled) ? "disabled" : ""}>${escapeHtml(uSec.label)}</button>
        <button class="btn" data-research="upgrade:infra" ${(task || uInfra.disabled) ? "disabled" : ""}>${escapeHtml(uInfra.label)}</button>
        <button class="btn" data-research="upgrade:eco" ${(task || uEco.disabled) ? "disabled" : ""}>${escapeHtml(uEco.label)}</button>
        <button class="btn btn--ghost" data-research="treeNode:postmortem_zena" ${task ? "disabled" : ""}>泽娜复盘（解锁搭配）</button>
      </div>
      ${task ? `
        <div class="divider"></div>
        <div class="subhead">进行中的研发</div>
        <div class="muted">进度 ${pct}%（${Math.round(Number(task.hoursDone)||0)}/${Math.round(Number(task.hoursTotal)||0)}h）</div>
        <div class="bar" style="margin-top:10px;"><i style="width:${pct}%"></i></div>
      ` : ""}
    </div>

    <div class="item">
      <div class="item__top">
        <div>
          <div class="item__title">科研树（合并大树）</div>
          <div class="muted" style="margin-top:6px;">点击节点开始研发；分支可以交汇形成新节点。</div>
        </div>
          <div class="chips">${chip("可横向滚动 / 触控板平移")}</div>
      </div>
      <div class="researchGraph" style="margin-top:10px;">
        <div class="researchGraph__canvas" style="width:${width}px; height:${height}px;">
          <svg class="researchGraph__edges" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            ${edgeSvg}
          </svg>
          ${nodeHtml}
        </div>
      </div>
    </div>
  `;
}

function renderOpsInto(host, state, compact = false) {
  if (!host) return;
  ensureSelection(state);
  const sel = state.selectedTarget;
  const target = sel ? findTarget(state, sel.kind, sel.id) : null;
  if (!target || target.kind !== "product") {
    host.innerHTML = `<div class="muted">请先在“总览”里选中一个已上线产品。</div>`;
    return;
  }
  const k = target.kpi || {};
  const ops = target.ops || {};
  const hist = Array.isArray(target.history) ? target.history.slice(-30) : [];

  const sparkline = (vals, labels, w = 520, h = 110) => {
    const xs = vals.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0));
    if (xs.length < 2) {
      return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="sparkline"><path d="M0 ${h - 18} L ${w} ${h - 18}" stroke="rgba(0,0,0,.12)" stroke-width="2" fill="none"/></svg>`;
    }
    let min = Math.min(...xs);
    let max = Math.max(...xs);
    if (min === max) {
      min -= 1;
      max += 1;
    }

    const fmt = (n) => {
      const v = Number(n) || 0;
      const abs = Math.abs(v);
      // small numbers (e.g., token price)
      if (abs < 50 && Math.max(Math.abs(min), Math.abs(max)) < 50) return v.toFixed(2);
      if (abs >= 1e8) return `${(v / 1e8).toFixed(1)}亿`;
      if (abs >= 1e4) return `${(v / 1e4).toFixed(1)}万`;
      return `${Math.round(v)}`;
    };

    // paddings for axes labels
    const padL = 46;
    const padR = 10;
    const padT = 10;
    const padB = 22;

    const toX = (i) => padL + (i * (w - padL - padR)) / (xs.length - 1);
    const toY = (v) => {
      const t = (v - min) / (max - min);
      return padT + (1 - t) * (h - padT - padB);
    };
    const pts = xs.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

    const axisStroke = "rgba(0,0,0,.18)";
    const gridStroke = "rgba(0,0,0,.08)";
    const textFill = "rgba(0,0,0,.62)";
    const lineStroke = "rgba(214,179,95,.95)";
    const areaFill = "rgba(214,179,95,.18)";

    const x0 = padL;
    const x1 = w - padR;
    const y0 = padT;
    const y1 = h - padB;

    const pickLabel = (idx) => {
      const l = labels?.[idx];
      if (!l) return `${idx + 1}`;
      // YYYY-MM-DD -> MM-DD
      return String(l).slice(5);
    };

    const xTicks = [
      { i: 0, x: toX(0), label: pickLabel(0) },
      { i: Math.floor((xs.length - 1) / 2), x: toX(Math.floor((xs.length - 1) / 2)), label: pickLabel(Math.floor((xs.length - 1) / 2)) },
      { i: xs.length - 1, x: toX(xs.length - 1), label: pickLabel(xs.length - 1) },
    ];

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="sparkline">
        <!-- grid -->
        <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${gridStroke}" stroke-width="1"/>
        <line x1="${x0}" y1="${(y0 + y1) / 2}" x2="${x1}" y2="${(y0 + y1) / 2}" stroke="${gridStroke}" stroke-width="1"/>
        <line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${axisStroke}" stroke-width="1"/>

        <!-- y axis labels -->
        <text x="6" y="${y0 + 4}" font-size="11" fill="${textFill}" font-family="var(--mono)">${escapeHtml(fmt(max))}</text>
        <text x="6" y="${y1}" font-size="11" fill="${textFill}" font-family="var(--mono)">${escapeHtml(fmt(min))}</text>

        <!-- area + line -->
        <polyline points="${pts} ${x1},${y1} ${x0},${y1}" fill="${areaFill}" stroke="none"/>
        <polyline points="${pts}" fill="none" stroke="${lineStroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- x axis ticks -->
        ${xTicks
          .map(
            (t) => `
          <line x1="${t.x}" y1="${y1}" x2="${t.x}" y2="${y1 + 5}" stroke="${axisStroke}" stroke-width="1"/>
          <text x="${t.x}" y="${h - 6}" font-size="11" fill="${textFill}" text-anchor="middle" font-family="var(--mono)">${escapeHtml(t.label)}</text>
        `
          )
          .join("")}
      </svg>
    `;
  };

  const chartBlock =
    !compact && hist.length >= 2
      ? `
        <div class="item" style="margin-top:12px;">
          <div class="item__top">
            <div>
              <div class="item__title">最近 ${hist.length} 天趋势</div>
              <div class="muted" style="margin-top:6px;">按“天”结算，便于观察运营参数即时影响。</div>
            </div>
          </div>
          <div class="item__body">
            <div class="muted" style="margin-bottom:6px;">币价</div>
            ${sparkline(
              hist.map((x) => x.tokenPrice),
              hist.map((x) => x?.t?.dateISO || ""),
              520,
              110
            )}
            <div class="muted" style="margin-bottom:6px;">DAU</div>
            ${sparkline(
              hist.map((x) => x.dau),
              hist.map((x) => x?.t?.dateISO || ""),
              520,
              110
            )}
            <div class="muted" style="margin-top:10px;margin-bottom:6px;">TVL</div>
            ${sparkline(
              hist.map((x) => x.tvl),
              hist.map((x) => x?.t?.dateISO || ""),
              520,
              110
            )}
            <div class="muted" style="margin-top:10px;margin-bottom:6px;">利润（每日）</div>
            ${sparkline(
              hist.map((x) => x.profit),
              hist.map((x) => x?.t?.dateISO || ""),
              520,
              110
            )}
          </div>
        </div>
      `
      : compact
        ? ""
        : `<div class="muted" style="margin-top:10px;">趋势图需要至少 2 天游玩数据（先跑一跑时间）。</div>`;

  host.innerHTML = `
    <div class="item">
      <div class="item__top">
        <div>
          <div class="item__title">${escapeHtml(target.title)}</div>
          <div class="muted" style="margin-top:6px;">币价 $${(Number(k.tokenPrice) || 0).toFixed(2)} · DAU ${Math.round(k.dau || 0).toLocaleString("zh-CN")} · TVL ${Math.round(k.tvl || 0).toLocaleString("zh-CN")} · 日利润 ${money(k.profit || 0)}</div>
        </div>
        <div class="chips">${chip(`费率 ${k.feeRateBps || 0} bps`)}</div>
      </div>
      <div class="item__body">
        <div class="muted" style="margin-bottom:6px;">手续费 (bps)</div>
        <input class="input" type="range" min="0" max="80" value="${clamp(Math.round(k.feeRateBps || 0), 0, 80)}" data-ops="feeRateBps:${target.id}" />
        <div class="muted" style="margin-top:10px;margin-bottom:6px;">回购比例 (0~50%)</div>
        <input class="input" type="range" min="0" max="50" value="${clamp(Math.round((ops.buybackPct || 0) * 100), 0, 50)}" data-ops="buybackPct:${target.id}" />
        <div class="muted" style="margin-top:10px;margin-bottom:6px;">排放/增发强度 (0~100)</div>
        <input class="input" type="range" min="0" max="100" value="${clamp(Math.round((ops.emissions || 0) * 100), 0, 100)}" data-ops="emissions:${target.id}" />
        <div class="muted" style="margin-top:10px;margin-bottom:6px;">每周激励预算 (¥)</div>
        <input class="input" type="number" min="0" step="100" value="${clamp(Math.round(ops.incentivesBudgetWeekly || 0), 0, 999999999)}" data-ops="incentivesBudgetWeekly:${target.id}" />
      </div>
      <div class="item__actions">
        <button class="btn btn--ghost" data-upgrade="${escapeHtml(target.id)}">二次开发</button>
      </div>
    </div>
    ${chartBlock}
  `;
}

function renderOps(state) {
  renderOpsInto(document.getElementById("opsPanel"), state, false);
  renderOpsInto(document.getElementById("opsPanelFixed"), state, true);
}

function renderLog(state) {
  const host = document.getElementById("log");
  if (!host) return;
  host.innerHTML =
    (state.log || []).length === 0
      ? `<div class="muted">暂无日志。</div>`
      : state.log
          .slice(0, 60)
          .map((x) => {
            const line = escapeHtml(x.text);
            const cls = x.tone === "good" ? "feed__item feed__item--good" : x.tone === "warn" ? "feed__item feed__item--warn" : x.tone === "bad" ? "feed__item feed__item--bad" : "feed__item";
            return `<div class="${cls}"><div class="muted">${escapeHtml(x.t)}</div><div>${line}</div></div>`;
          })
          .join("");
}

function renderInbox(state) {
  const host = document.getElementById("inbox");
  if (!host) return;
  const items = (state.inbox?.items || []).slice(0, 30);
  if (items.length === 0) {
    host.innerHTML = `<div class="muted">暂无事件（下周再看看）。</div>`;
    return;
  }

  const now = state.now || { year: 0, week: 0 };
  const weeksBetween = (a, b) => (Math.round(b.year || 0) - Math.round(a.year || 0)) * 52 + (Math.round(b.week || 0) - Math.round(a.week || 0));

  host.innerHTML = items
    .map((it) => {
      const def = INBOX_DEFS?.[it.def];
      const title = def?.title || it.def;
      const age = weeksBetween(it.created || now, now);
      const ttl = clamp(Math.round(it.expiresInWeeks || 2), 1, 8);
      const left = clamp(ttl - age, 0, ttl);
      const desc = typeof def?.desc === "function" ? def.desc(state, it.payload || {}) : "";
      const choices = (def?.choices || []).map((c) => {
        const cls = c.primary ? "btn btn--primary" : "btn";
        return `<button class="${cls}" data-inbox="${escapeHtml(it.id)}:${escapeHtml(c.key)}">${escapeHtml(c.label)}</button>`;
      });

      return `
        <div class="item">
          <div class="item__top">
            <div>
              <div class="item__title">${escapeHtml(title)}</div>
              <div class="muted" style="margin-top:6px;">剩余 ${left} 周 · 创建于 ${escapeHtml(`第 ${it.created?.year} 年 · 第 ${it.created?.week} 周`)}</div>
            </div>
            <div class="chips">${chip(left <= 1 ? "即将过期" : "可选", left <= 1 ? "warn" : "")}</div>
          </div>
          <div class="item__body muted">${escapeHtml(desc || "")}</div>
          <div class="item__actions" style="display:flex;gap:10px;flex-wrap:wrap;">
            ${choices.join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

export function render(state) {
  normalizeState(state);
  applyLayout(state);
  renderTopbar(state);
  renderStats(state);
  renderDashboard(state);
  renderMarket(state);
  renderTeam(state);
  renderResearch(state);
  renderOps(state);
  renderLog(state);
  renderInbox(state);
}

/**
 * Bind UI events.
 * @param {any} state
 * @param {any} handlers
 */
export function bind(state, handlers) {
  // resizable left panel
  const leftSplit = document.querySelector('.vsplit[data-split="left"]');
  const leftPanel = document.getElementById("leftPanel");
  if (leftSplit && leftPanel) {
    let dragging = false;
    let startX = 0;
    let startW = 0;
    const minW = 260;
    const maxW = 560;

    const onMove = (clientX) => {
      if (!dragging) return;
      const dx = clientX - startX;
      const next = clamp(Math.round(startW + dx), minW, maxW);
      state.settings = state.settings || {};
      state.settings.layout = state.settings.layout || {};
      state.settings.layout.colLeft = next;
      document.documentElement.style.setProperty("--col-left", `${next}px`);
    };

    const stop = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("is-resizing");
      window.removeEventListener("mousemove", onMouseMove, true);
      window.removeEventListener("mouseup", stop, true);
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("touchend", stop, true);
      window.removeEventListener("touchcancel", stop, true);
      handlers.onLayoutChange?.(state.settings.layout.colLeft);
    };

    const onMouseMove = (ev) => onMove(ev.clientX);
    const onTouchMove = (ev) => {
      const t = ev.touches?.[0];
      if (!t) return;
      onMove(t.clientX);
    };

    const start = (clientX) => {
      dragging = true;
      startX = clientX;
      startW = clamp(Math.round(state.settings?.layout?.colLeft ?? 420), minW, maxW);
      document.body.classList.add("is-resizing");
      window.addEventListener("mousemove", onMouseMove, true);
      window.addEventListener("mouseup", stop, true);
      window.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
      window.addEventListener("touchend", stop, true);
      window.addEventListener("touchcancel", stop, true);
    };

    leftSplit.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      start(ev.clientX);
    });
    leftSplit.addEventListener("touchstart", (ev) => {
      const t = ev.touches?.[0];
      if (!t) return;
      start(t.clientX);
    }, { passive: true });
  }

  const closeMenus = () => {
    const overlay = document.getElementById("menuOverlay");
    if (!overlay) return;
    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");
    for (const p of overlay.querySelectorAll(".menuPanel")) p.classList.add("is-hidden");
  };

  const openMenu = (kind, anchorEl) => {
    const overlay = document.getElementById("menuOverlay");
    if (!overlay) return;
    const panel = document.getElementById(`menu-${kind}`);
    if (!panel) return;
    const isOpen = !overlay.classList.contains("is-hidden") && !panel.classList.contains("is-hidden");
    if (isOpen) {
      closeMenus();
      return;
    }
    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");
    for (const p of overlay.querySelectorAll(".menuPanel")) p.classList.add("is-hidden");
    panel.classList.remove("is-hidden");

    const r = anchorEl.getBoundingClientRect();
    const vw = window.innerWidth || 1200;
    const vh = window.innerHeight || 800;
    const w = Math.min(520, Math.floor(vw * 0.92));
    const margin = 10;
    let left = Math.round(r.left);
    left = Math.max(margin, Math.min(left, vw - w - margin));
    let top = Math.round(r.bottom + 10);
    top = Math.max(margin, Math.min(top, vh - margin - 60));
    panel.style.width = `${w}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  };

  document.addEventListener("click", (ev) => {
    const raw = ev.target;
    const el = raw instanceof Element ? raw : raw?.parentElement;
    if (!el) return;

    const menuBtn = el.closest?.("[data-menu]");
    if (menuBtn) {
      const kind = String(menuBtn.getAttribute("data-menu") || "").trim();
      if (kind) openMenu(kind, menuBtn);
      return;
    }

    const tabBtn = el.closest?.(".tab");
    if (tabBtn) {
      switchTab(tabBtn.dataset.tab);
      return;
    }

    const uiBtn = el.closest?.("[data-ui]");
    if (uiBtn) {
      const key = uiBtn.getAttribute("data-ui");
      if (key === "closeModal") handlers.onCloseModal?.();
      if (key === "closeMenus") closeMenus();
      if (key === "toggleTime") handlers.onToggleTime?.();
      if (key === "saveGame") handlers.onSave?.();
      if (key === "newGame") handlers.onNewGame?.();
      if (key === "createProject") handlers.onCreateProject?.();
      if (key === "exploreCandidates") handlers.onExploreCandidates?.();
      if (key === "resetGame") handlers.onResetGame?.();
      if (key === "clearLog") handlers.onClearLog?.();
      return;
    }

    const upBtn = el.closest?.("[data-upgrade]");
    if (upBtn) {
      const productId = String(upBtn.getAttribute("data-upgrade") || "");
      if (productId) handlers.onCreateProject?.(productId);
      return;
    }

    const accBtn = el.closest?.("[data-accept]");
    if (accBtn) {
      const [kind, id] = String(accBtn.getAttribute("data-accept") || "").split(":");
      handlers.onAccept?.(kind, id);
      return;
    }

    const selBtn = el.closest?.("[data-select]");
    if (selBtn) {
      const [kind, id] = String(selBtn.getAttribute("data-select") || "").split(":");
      handlers.onSelect?.(kind, id);
      return;
    }

    const stageBtn = el.closest?.("[data-stage]");
    if (stageBtn) {
      const [kind, id] = String(stageBtn.getAttribute("data-stage") || "").split(":");
      handlers.onStage?.(kind, id);
      return;
    }

    const autoTeamBtn = el.closest?.("[data-autoteam]");
    if (autoTeamBtn) {
      const [projectId, stageKey] = String(autoTeamBtn.getAttribute("data-autoteam") || "").split(":");
      if (projectId && stageKey) handlers.onAutoTeam?.(projectId, stageKey);
      return;
    }

    const abandonBtn = el.closest?.("[data-abandon]");
    if (abandonBtn) {
      const [kind, id] = String(abandonBtn.getAttribute("data-abandon") || "").split(":");
      handlers.onAbandon?.(kind, id);
      return;
    }

    const pmBtn = el.closest?.("[data-postmortem]");
    if (pmBtn) {
      const productId = String(pmBtn.getAttribute("data-postmortem") || "");
      if (productId) handlers.onPostmortem?.(productId);
      return;
    }

    const doneBtn = el.closest?.("[data-done-detail]");
    if (doneBtn) {
      const id = String(doneBtn.getAttribute("data-done-detail") || "");
      if (id) handlers.onDoneDetail?.(id);
      return;
    }

    const rBtn = el.closest?.("[data-research]");
    if (rBtn) {
      handlers.onResearch?.(String(rBtn.getAttribute("data-research") || ""));
      return;
    }

    const inboxBtn = el.closest?.("[data-inbox]");
    if (inboxBtn) {
      const [itemId, choiceKey] = String(inboxBtn.getAttribute("data-inbox") || "").split(":");
      if (itemId && choiceKey) handlers.onInboxChoice?.(itemId, choiceKey);
      return;
    }
  });

  document.addEventListener("input", (ev) => {
    const raw = ev.target;
    const el = raw instanceof Element ? raw : raw?.parentElement;
    if (!el) return;

    const pref = el.getAttribute?.("data-stagepref");
    if (pref) {
      const [stage, key] = pref.split(":");
      const v = parseInt(String(/** @type {HTMLInputElement} */ (el).value || "50"), 10);
      handlers.onStagePrefChange?.(stage, key, v);
      return;
    }

    const ops = el.getAttribute?.("data-ops");
    if (ops) {
      const [k, id] = ops.split(":");
      const rawVal = /** @type {HTMLInputElement} */ (el).value;
      handlers.onOpsChange?.(k, id, rawVal);
      return;
    }
  });

  document.addEventListener("change", (ev) => {
    const raw = ev.target;
    const el = raw instanceof Element ? raw : raw?.parentElement;
    if (!el) return;
    const assign = el.getAttribute?.("data-assign");
    if (assign) {
      const parts = assign.split(":");
      const v = String(/** @type {HTMLSelectElement} */ (el).value || "");
      if (parts.length === 3) {
        const [projectId, stageKey, roleKey] = parts;
        handlers.onAssign?.(projectId, stageKey, roleKey, v || null);
      } else if (parts.length === 2) {
        // backward compatible
        const [projectId, roleKey] = parts;
        handlers.onAssign?.(projectId, "S1", roleKey, v || null);
      }
      return;
    }
  });

  const timeSpeed = $("#timeSpeed");
  if (timeSpeed) {
    timeSpeed.addEventListener("change", () => {
      handlers.onTimeSpeedChange?.(parseFloat(String(timeSpeed.value || "1")) || 1);
    });
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      const overlay = document.getElementById("menuOverlay");
      const menusOpen = overlay && !overlay.classList.contains("is-hidden");
      if (menusOpen) {
        closeMenus();
        return;
      }
      handlers.onCloseModal?.();
    }
  });

  // Drag-to-pan for research graph (scroll container)
  // IMPORTANT: research panel is rerendered often; use event delegation so it keeps working.
  if (document.documentElement.dataset.researchDragPanBound !== "1") {
    document.documentElement.dataset.researchDragPanBound = "1";

    let dragging = false;
    let activeEl = /** @type {HTMLElement|null} */ (null);
    let startX = 0;
    let startY = 0;
    let startSL = 0;
    let startST = 0;
    let pointerId = null;

    const stop = () => {
      dragging = false;
      pointerId = null;
      if (activeEl) activeEl.classList.remove("is-dragging");
      activeEl = null;
    };

    document.addEventListener("pointerdown", (ev) => {
      const t = ev.target instanceof Element ? ev.target : null;
      if (!t) return;
      const el = t.closest?.(".researchGraph");
      if (!el || !(el instanceof HTMLElement)) return;
      // If user clicks a node, let the node handle it (no drag-pan).
      if (t.closest?.(".rgnode")) return;
      if (ev.button != null && ev.button !== 0) return; // left button only

      dragging = true;
      activeEl = el;
      pointerId = ev.pointerId;
      startX = ev.clientX;
      startY = ev.clientY;
      startSL = el.scrollLeft;
      startST = el.scrollTop;
      el.classList.add("is-dragging");
      el.setPointerCapture?.(ev.pointerId);
      ev.preventDefault();
    });

    document.addEventListener("pointermove", (ev) => {
      if (!dragging || !activeEl) return;
      if (pointerId != null && ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      activeEl.scrollLeft = startSL - dx;
      activeEl.scrollTop = startST - dy;
      ev.preventDefault();
    }, { passive: false });

    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
  }
}

