import { $, $$ } from "./dom.js?v=33";
import { clamp, escapeHtml, money } from "./utils.js?v=33";
import { save } from "./storage.js?v=33";
import { healthCap, normalizeState, refreshAP, weekLabel } from "./state.js?v=33";
import { actionCost, ensureSelection, findTarget, itemCount, protocolLabel } from "./logic.js?v=33";
import { SHOP_ITEMS } from "./content.js?v=33";
import { applyI18nDom, t as tr } from "./i18n.js?v=33";

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

function statBar(n) {
  const v = clamp(Math.round(n), 0, 100);
  return `<div class="bar"><i style="width:${v}%"></i></div>`;
}

export function render(state) {
  normalizeState(state);
  applyI18nDom(state);
  $("#timeLabel").textContent = weekLabel(state);
  $("#playerName").textContent = state.player.name;
  $("#playerTitle").textContent = state.player.title;

  refreshAP(state);
  $("#apNow").textContent = String(state.ap.now);
  $("#apMax").textContent = String(state.ap.max);

  const sel = $("#hoursPerDay");
  if (sel) {
    const lockedByWork = state.ap.now < state.ap.max;
    sel.value = String(clamp(Math.round(state.schedule?.hoursPerDay ?? 8), 6, 24));
    sel.disabled = Boolean(state.flags.gameOver) || lockedByWork;
    sel.title = lockedByWork ? tr(state, "ui.hours.locked") : tr(state, "ui.hours.title");
  }

  // Topbar language buttons
  const isEn = state.settings?.lang === "en";
  const btnEn = document.querySelector('[data-ui="langEn"]');
  const btnZh = document.querySelector('[data-ui="langZh"]');
  if (btnEn) btnEn.classList.toggle("btn--primary", isEn);
  if (btnZh) btnZh.classList.toggle("btn--primary", !isEn);
  if (btnEn) btnEn.disabled = Boolean(state.flags.gameOver);
  if (btnZh) btnZh.disabled = Boolean(state.flags.gameOver);

  // Automation controls
  const auto = state.settings?.auto;
  const ae = $("#autoEnabled");
  if (ae) ae.checked = Boolean(auto?.enabled);
  const af = $("#autoFocus");
  if (af) af.value = auto?.focus || "balanced";
  const aew = $("#autoEndWeek");
  if (aew) aew.checked = Boolean(auto?.autoEndWeek);
  const aaj = $("#autoAllowAcceptJob");
  if (aaj) aaj.checked = Boolean(auto?.allowAcceptJob);
  const aqj = $("#autoAllowQuitJob");
  if (aqj) aqj.checked = Boolean(auto?.allowQuitJob);
  const minSta = $("#autoMinSta");
  if (minSta) minSta.value = String(auto?.minStaminaPct ?? 35);
  const minMood = $("#autoMinMood");
  if (minMood) minMood.value = String(auto?.minMoodPct ?? 30);

  renderStats(state);
  renderActions(state);
  renderTargets(state);
  renderMarket(state);
  renderCareer(state);
  renderShop(state);
  renderLog(state);
  renderLeaderboards(state);
  renderXFeed(state);

  save(state);
}

function renderStats(state) {
  const s = state.stats;
  const hcap = healthCap(state);
  const items = [
    [tr(state, "stat.stamina"), s.stamina],
    [tr(state, "stat.mood"), s.mood],
    [tr(state, "stat.skill"), s.skill],
    [tr(state, "stat.tooling"), s.tooling],
    [tr(state, "stat.writing"), s.writing],
    [tr(state, "stat.comms"), s.comms],
    [tr(state, "stat.reputation"), s.reputation],
    [tr(state, "stat.brand"), s.brand],
    [tr(state, "stat.platformRating"), s.platformRating],
    [tr(state, "stat.compliance"), s.compliance],
  ];

  $("#stats").innerHTML =
    items
      .map(([label, val]) => {
        const cap = label === tr(state, "stat.stamina") || label === tr(state, "stat.mood") ? hcap : 100;
        const pct = clamp(Math.round((val / cap) * 100), 0, 100);
        return `
          <div class="stat">
            <div class="stat__row">
              <div class="stat__label">${escapeHtml(label)}</div>
              <div class="stat__value">${val}/${cap}</div>
            </div>
            <div class="bar"><i style="width:${pct}%"></i></div>
          </div>`;
      })
      .join("") +
    `
      <div class="divider"></div>
      <div class="kvs">
        <div class="kv"><div class="kv__k">${escapeHtml(tr(state, "stat.cash"))}</div><div class="kv__v">${money(s.cash)}</div></div>
        <div class="kv"><div class="kv__k">${escapeHtml(tr(state, "stat.network"))}</div><div class="kv__v">${s.network}/100</div></div>
      </div>
    `;
}

function renderActions(state) {
  const isOver = Boolean(state.flags.gameOver);
  ensureSelection(state);
  const target = state.selectedTarget ? findTarget(state, state.selectedTarget.kind, state.selectedTarget.id) : null;
  const employed = Boolean(state.employment?.employed);
  const hasMI = Boolean(state.majorIncident?.active);

  const actions = [
    { key: "audit", label: tr(state, "action.audit.label"), hint: tr(state, "action.audit.hint") },
    { key: "model", label: tr(state, "action.model.label"), hint: tr(state, "action.model.hint") },
    { key: "write", label: tr(state, "action.write.label"), hint: tr(state, "action.write.hint") },
    { key: "retest", label: tr(state, "action.retest.label"), hint: tr(state, "action.retest.hint") },
    { key: "comms", label: tr(state, "action.comms.label"), hint: tr(state, "action.comms.hint") },
    { key: "submit", label: tr(state, "action.submit.label"), hint: tr(state, "action.submit.hint") },
    { key: "companyWork", label: tr(state, "action.companyWork.label"), hint: tr(state, "action.companyWork.hint") },
    { key: "meeting", label: tr(state, "action.meeting.label"), hint: tr(state, "action.meeting.hint") },
    { key: "aiResearch", label: tr(state, "action.aiResearch.label"), hint: tr(state, "action.aiResearch.hint") },
    { key: "productizeAI", label: tr(state, "action.productizeAI.label"), hint: tr(state, "action.productizeAI.hint") },
    { key: "incidentAnalysis", label: tr(state, "action.incidentAnalysis.label"), hint: tr(state, "action.incidentAnalysis.hint") },
    { key: "fundTrace", label: tr(state, "action.fundTrace.label"), hint: tr(state, "action.fundTrace.hint") },
    { key: "writeBrief", label: tr(state, "action.writeBrief.label"), hint: tr(state, "action.writeBrief.hint") },
    { key: "postX", label: tr(state, "action.postX.label"), hint: tr(state, "action.postX.hint") },
    { key: "blog", label: tr(state, "action.blog.label"), hint: tr(state, "action.blog.hint") },
    { key: "learn", label: tr(state, "action.learn.label"), hint: tr(state, "action.learn.hint") },
    { key: "rest", label: tr(state, "action.rest.label"), hint: tr(state, "action.rest.hint") },
    { key: "compliance", label: tr(state, "action.compliance.label"), hint: tr(state, "action.compliance.hint") },
  ].map((a) => ({ ...a, cost: actionCost(state, a.key, target) }));

  $("#actions").innerHTML = actions
    .map((a) => {
      let disabled = isOver || state.ap.now < a.cost;
      if (a.key === "companyWork" || a.key === "meeting") disabled = disabled || !employed;
      if (a.key === "companyWork") disabled = disabled || !(target && target.kind === "company");
      if (a.key === "incidentAnalysis" || a.key === "fundTrace" || a.key === "writeBrief" || a.key === "postX") disabled = disabled || !hasMI;
      if (a.key === "productizeAI") disabled = disabled || !employed;
      return `
        <button class="btn" data-action="${a.key}" ${disabled ? "disabled" : ""} title="${escapeHtml(a.hint)}">
          ${escapeHtml(a.label)} <span class="muted">(-${a.cost})</span>
        </button>`;
    })
    .join("");
}

function renderTargets(state) {
  ensureSelection(state);
  const sel = state.selectedTarget;
  const d = state.active.direct;
  const p = state.active.platform;
  const c = state.active.company || [];

  const displayTitle = (proj) => {
    if (proj?.kind === "company") {
      const tt = proj.ticketType;
      const scope = proj.scope ?? 0;
      if (tt) return tr(state, "project.company.title", { type: tr(state, `company.ticketType.${tt}`), scope });
    }
    return proj?.title || "";
  };

  const card = (proj) => {
    const chips = [];
    chips.push(
      `<span class="chip">${escapeHtml(
        proj.kind === "direct" ? tr(state, "chip.direct") : proj.kind === "platform" ? tr(state, "chip.platform") : tr(state, "chip.company")
      )}</span>`
    );
    chips.push(`<span class="chip">${escapeHtml(protocolLabel(state, proj.protocol))}</span>`);
    chips.push(`<span class="chip">${proj.deadlineWeeks} ${escapeHtml(tr(state, "ui.unit.week"))}</span>`);
    chips.push(
      `<span class="chip">${proj.kind === "direct" ? money(proj.fee) : proj.kind === "platform" ? money(proj.prizePool) : escapeHtml(tr(state, "ui.career.kpi"))}</span>`
    );

    let line = "";
    if (proj.kind === "direct") {
      const fixRate = clamp(proj.fixRate ?? 50, 0, 100);
      const shipUrgency = clamp(proj.shipUrgency ?? 50, 0, 100);
      const retestScore = clamp(proj.retestScore ?? 0, 0, 100);
      line = `${tr(state, "ui.project.coverage")}${proj.coverage}% ｜ ${tr(state, "ui.project.report")}${clamp(
        proj.report?.draft ?? 0,
        0,
        100
      )}% ｜ ${tr(state, "ui.project.fixRate")}${fixRate}% ｜ ${tr(state, "ui.project.shipUrgency")}${shipUrgency}% ｜ ${tr(state, "ui.project.retest")}${retestScore}%`;
    } else if (proj.kind === "platform") {
      const drafts = proj.submissions.filter((x) => x.status === "draft");
      const submitted = proj.submissions.filter((x) => x.status === "submitted");
      const submittedPts = submitted.reduce((a, x) => a + x.points, 0);
      const evidence = clamp(proj.evidence ?? 0, 0, 100);
      line = `${tr(state, "ui.project.coverage")}${proj.coverage}% ｜ ${tr(state, "ui.project.draft")}${drafts.length} ${tr(
        state,
        "ui.unit.entry"
      )} ｜ ${tr(state, "ui.project.submitted")}${submitted.length} ${tr(state, "ui.unit.entry")}（${submittedPts} ${tr(
        state,
        "ui.unit.point"
      )}）｜ ${tr(state, "ui.project.evidence")}${evidence}%`;
    } else {
      line = `${tr(state, "ui.project.progress")}${clamp(proj.progress ?? 0, 0, 100)}% ｜ ${tr(state, "ui.project.impact")}${clamp(
        proj.impact ?? 50,
        0,
        100
      )}/100 ｜ ${tr(state, "ui.project.risk")}${clamp(proj.risk ?? 50, 0, 100)}/100`;
    }

    return `
        <div class="item">
          <div class="item__top">
            <div>
              <div class="item__title">${escapeHtml(displayTitle(proj))}</div>
              <div class="muted" style="margin-top:6px;">${escapeHtml(line)}</div>
            </div>
            <div class="chips">${chips.join("")}</div>
          </div>
          <div class="item__actions">
            <button class="btn" data-select="${proj.kind}:${proj.id}">${escapeHtml(tr(state, "ui.common.setAsTarget"))}</button>
          </div>
        </div>
      `;
  };

  let html = "";
  if (!d.length && !p.length && !c.length) {
    html = `<div class="muted">${escapeHtml(tr(state, "ui.workbench.noTargets"))}</div>`;
  } else {
    html += `<div class="list">`;
    for (const x of d) html += card(x);
    for (const x of p) html += card(x);
    for (const x of c) html += card(x);
    html += `</div>`;
  }

  if (sel) {
    const target = findTarget(state, sel.kind, sel.id);
    if (target) html = `<div class="muted" style="margin-bottom:10px;">${escapeHtml(tr(state, "ui.workbench.currentPick", { title: displayTitle(target) }))}</div>` + html;
  }

  $("#activeTarget").innerHTML = html;
}

function renderCareer(state) {
  // Job offers
  const offersHost = $("#jobOffers");
  if (offersHost) {
    const offers = state.market.jobs || [];
    offersHost.innerHTML =
      offers.length === 0
        ? `<div class="muted">${escapeHtml(tr(state, "ui.career.offers.empty"))}</div>`
        : offers
            .map((o) => {
              const cls = o.companyType === "exchange" ? "chip chip--warn" : "chip chip--good";
              const typeText = o.companyType === "exchange" ? tr(state, "chip.exchange") : tr(state, "chip.sec");
              const wm = o.workMode === "onsite" ? tr(state, "ui.workMode.onsite") : tr(state, "ui.workMode.remote");
              return `<div class="item">
                <div class="item__top">
                  <div>
                    <div class="item__title">${escapeHtml(o.companyName)} · ${escapeHtml(o.title)}</div>
              <div class="muted" style="margin-top:6px;">${escapeHtml(tr(state, "ui.career.salary"))}：${money(o.salaryWeekly)} ｜ ${escapeHtml(tr(state, "ui.career.level"))}：L${o.levelOffer} ｜ ${escapeHtml(tr(state, "ui.career.workMode"))}：${escapeHtml(wm)} ｜ ${escapeHtml(tr(state, "ui.career.complianceStrict"))}：${o.complianceStrict}/100</div>
                  </div>
                  <div class="chips"><span class="${cls}">${escapeHtml(typeText)}</span></div>
                </div>
                <div class="item__body">${escapeHtml(o.notes || "")}</div>
                <div class="item__actions">
                  <button class="btn btn--primary" data-career="acceptJob:${o.id}">${escapeHtml(tr(state, "ui.career.btn.accept"))}</button>
                </div>
              </div>`;
            })
            .join("");
  }

  // Employment card
  const empHost = $("#employmentCard");
  if (empHost) {
    const e = state.employment;
    if (!e?.employed) {
      empHost.innerHTML = `<div class="muted">${escapeHtml(tr(state, "ui.career.employment.none"))}</div>`;
    } else {
      const cls = e.companyType === "exchange" ? "chip chip--warn" : "chip chip--good";
      const typeText = e.companyType === "exchange" ? tr(state, "chip.exchange") : tr(state, "chip.sec");
      const wm = e.workMode === "onsite" ? tr(state, "ui.workMode.onsite") : tr(state, "ui.workMode.remote");
      const rep = clamp(state.stats.reputation ?? 0, 0, 100);
      const plat = clamp(state.stats.platformRating ?? 0, 0, 100);
      const promoTarget = 10;
      const bonus = clamp((rep + plat) / 120, 0, 1);
      const promoGain = clamp(1 + bonus, 1, 2);
      const promoNow = clamp(e.promoProgress ?? 0, 0, 999);
      empHost.innerHTML = `<div class="item">
        <div class="item__top">
          <div>
            <div class="item__title">${escapeHtml(e.companyName)} · L${e.level}</div>
            <div class="muted" style="margin-top:6px;">${escapeHtml(tr(state, "ui.career.salary"))}：${money(e.salaryWeekly)} ｜ ${escapeHtml(tr(state, "ui.career.workMode"))}：${escapeHtml(wm)} ｜ ${escapeHtml(tr(state, "ui.career.performance"))}：${clamp(e.performance, 0, 100)}/100 ｜ ${escapeHtml(tr(state, "ui.career.trust"))}：${clamp(e.trust, 0, 100)}/100 ｜ ${escapeHtml(tr(state, "ui.career.politics"))}：${clamp(e.politics, 0, 100)}/100</div>
          </div>
          <div class="chips"><span class="${cls}">${escapeHtml(typeText)}</span></div>
        </div>
        <div class="item__body muted">
          ${escapeHtml(tr(state, "ui.career.managerToxicity"))}：${clamp(e.manager?.toxicity ?? 0, 0, 100)}/100 ｜ ${escapeHtml(tr(state, "ui.career.kpi"))}：${escapeHtml(e.vanityKpi?.mode || "none")}
          <div style="margin-top:6px;">${escapeHtml(tr(state, "ui.career.promoLine", { now: promoNow.toFixed(1), target: promoTarget, gain: promoGain.toFixed(1) }))}</div>
        </div>
        <div class="item__actions">
          ${
            e.workMode === "onsite"
              ? `<button class="btn" data-career="requestRemote">${escapeHtml(tr(state, "ui.career.btn.requestRemote"))}</button>`
              : ""
          }
          <button class="btn" data-career="quitJob">${escapeHtml(tr(state, "ui.career.btn.quit"))}</button>
        </div>
      </div>`;
    }
  }

  // Company tickets
  const tasksHost = $("#companyTasks");
  if (tasksHost) {
    const list = state.active.company || [];
    tasksHost.innerHTML =
      list.length === 0
        ? `<div class="muted">${escapeHtml(tr(state, "ui.career.tasks.empty"))}</div>`
        : list
            .map((tk) => {
              const chips = [
                `<span class="chip">${escapeHtml(tr(state, `company.ticketType.${tk.ticketType}`))}</span>`,
                `<span class="chip">${tk.deadlineWeeks} ${escapeHtml(tr(state, "ui.unit.week"))}</span>`,
              ];
              const line = tr(state, "ui.career.ticket.line", {
                progress: clamp(tk.progress ?? 0, 0, 100),
                impact: clamp(tk.impact ?? 50, 0, 100),
              });
              const title =
                tk.kind === "company"
                  ? tr(state, "project.company.title", { type: tr(state, `company.ticketType.${tk.ticketType}`), scope: tk.scope ?? 0 })
                  : tk.title;
              return `<div class="item">
                <div class="item__top">
                  <div>
                    <div class="item__title">${escapeHtml(title)}</div>
                    <div class="muted" style="margin-top:6px;">${escapeHtml(line)}</div>
                  </div>
                  <div class="chips">${chips.join("")}</div>
                </div>
                <div class="item__actions">
                  <button class="btn" data-select="company:${tk.id}">${escapeHtml(tr(state, "ui.common.setAsTarget"))}</button>
                </div>
              </div>`;
            })
            .join("");
  }

  // Major incident panel
  const miHost = $("#majorIncidentPanel");
  if (miHost) {
    const mi = state.majorIncident;
    if (!mi || !mi.active) {
      miHost.innerHTML = `<div class="muted">${escapeHtml(tr(state, "ui.career.major.empty"))}</div>`;
    } else {
      const p = mi.progress || {};
      miHost.innerHTML = `<div class="item">
        <div class="item__top">
          <div>
            <div class="item__title">⚠️ ${escapeHtml(mi.title)}</div>
            <div class="muted" style="margin-top:6px;">${escapeHtml(
              tr(state, "ui.career.major.windowLine", {
                weeks: mi.weeksLeft,
                wk: tr(state, "ui.unit.week"),
                analysis: clamp(p.analysis || 0, 0, 100),
                tracing: clamp(p.tracing || 0, 0, 100),
                writeup: clamp(p.writeup || 0, 0, 100),
                x: clamp(p.xThread || 0, 0, 100),
              })
            )}</div>
          </div>
          <div class="chips"><span class="chip chip--warn">${escapeHtml(tr(state, "ui.career.major.chip"))}</span></div>
        </div>
        <div class="item__body muted">${escapeHtml(tr(state, "ui.career.major.tip"))}</div>
      </div>`;
    }
  }
}

function renderMarket(state) {
  $("#directMarket").innerHTML = state.market.direct.map((o) => renderMarketCard(state, o)).join("");
  $("#platformMarket").innerHTML = state.market.platform.map((o) => renderMarketCard(state, o)).join("");

  $("#directActive").innerHTML =
    state.active.direct.length === 0
      ? `<div class="muted">${escapeHtml(tr(state, "ui.common.none"))}</div>`
      : state.active.direct.map((p) => renderActiveCard(state, p)).join("");
  $("#platformActive").innerHTML =
    state.active.platform.length === 0
      ? `<div class="muted">${escapeHtml(tr(state, "ui.common.none"))}</div>`
      : state.active.platform.map((p) => renderActiveCard(state, p)).join("");
}

function renderMarketCard(state, o) {
  const chips = [];
  chips.push(`<span class="chip">${escapeHtml(protocolLabel(state, o.protocol))}</span>`);
  chips.push(`<span class="chip">${escapeHtml(tr(state, "ui.market.scope"))} ${o.scope}</span>`);
  chips.push(`<span class="chip">${o.deadlineWeeks} ${escapeHtml(tr(state, "ui.unit.week"))}</span>`);
  if (o.kind === "direct") {
    chips.push(`<span class="chip chip--good">${money(o.fee)}</span>`);
    chips.push(
      `<span class="chip ${o.cooperation >= 70 ? "chip--good" : o.cooperation <= 45 ? "chip--warn" : ""}">${escapeHtml(
        tr(state, "ui.marketCard.direct.coop")
      )} ${o.cooperation}</span>`
    );
    chips.push(
      `<span class="chip ${o.deadlineWeeks <= 2 ? "chip--warn" : ""}">${escapeHtml(tr(state, "ui.marketCard.direct.rush"))} ${
        o.deadlineWeeks <= 2 ? escapeHtml(tr(state, "ui.bool.yes")) : escapeHtml(tr(state, "ui.bool.no"))
      }</span>`
    );
  } else {
    chips.push(`<span class="chip chip--good">${money(o.prizePool)}</span>`);
    chips.push(
      `<span class="chip ${o.popularity >= 75 ? "chip--warn" : ""}">${escapeHtml(tr(state, "ui.market.hype"))} ${o.popularity}</span>`
    );
  }

  const bodyLines = [];
  bodyLines.push(o.notes);
  if (o.kind === "direct") bodyLines.push(tr(state, "ui.market.riskHint", { v: o.adversary }));
  else bodyLines.push(tr(state, "ui.market.contestHint"));

  return `
      <div class="item">
        <div class="item__top">
          <div class="item__title">${escapeHtml(o.title)}</div>
          <div class="chips">${chips.join("")}</div>
        </div>
        <div class="item__body">${bodyLines.map(escapeHtml).join("<br/>")}</div>
        <div class="item__actions">
          <button class="btn btn--primary" data-accept="${o.kind}:${o.id}">${escapeHtml(o.kind === "direct" ? tr(state, "ui.market.accept.direct") : tr(state, "ui.market.accept.platform"))}</button>
        </div>
      </div>
    `;
}

function renderActiveCard(state, p) {
  const chips = [];
  chips.push(`<span class="chip">${escapeHtml(protocolLabel(state, p.protocol))}</span>`);
  chips.push(`<span class="chip">${p.deadlineWeeks} ${escapeHtml(tr(state, "ui.unit.week"))}</span>`);
  chips.push(`<span class="chip">${escapeHtml(tr(state, "ui.project.coverage"))}${p.coverage}%</span>`);
  chips.push(`<span class="chip chip--good">${money(p.kind === "direct" ? p.fee : p.prizePool)}</span>`);

  const summary =
    p.kind === "direct"
      ? tr(state, "ui.active.direct.summary", {
          report: tr(state, "ui.marketCard.active.report"),
          reportPct: clamp(p.report?.draft ?? 0, 0, 100),
          findings: tr(state, "ui.marketCard.active.findings"),
          found: p.found.length,
          entry: tr(state, "ui.unit.entry"),
          fixRate: tr(state, "ui.marketCard.active.fixRate"),
          fixRatePct: clamp(p.fixRate ?? 50, 0, 100),
          shipUrgency: tr(state, "ui.marketCard.active.shipUrgency"),
          shipUrgencyPct: clamp(p.shipUrgency ?? 50, 0, 100),
        })
      : tr(state, "ui.active.platform.summary", {
          draft: tr(state, "ui.marketCard.active.draft"),
          draftN: p.submissions.filter((x) => x.status === "draft").length,
          submitted: tr(state, "ui.marketCard.active.submitted"),
          submittedN: p.submissions.filter((x) => x.status === "submitted").length,
          entry: tr(state, "ui.unit.entry"),
          evidence: tr(state, "ui.marketCard.active.evidence"),
          evidencePct: clamp(p.evidence ?? 0, 0, 100),
        });

  return `
      <div class="item">
        <div class="item__top">
          <div>
            <div class="item__title">${escapeHtml(p.title)}</div>
            <div class="muted" style="margin-top:6px;">${escapeHtml(summary)}</div>
          </div>
          <div class="chips">${chips.join("")}</div>
        </div>
        <div class="item__actions">
          <button class="btn" data-select="${p.kind}:${p.id}">${escapeHtml(tr(state, "ui.common.setAsTarget"))}</button>
        </div>
      </div>
    `;
}

function renderLog(state) {
  const host = $("#log");
  if (!host) return;
  host.innerHTML =
    state.log.length === 0
      ? `<div class="muted">${escapeHtml(tr(state, "ui.log.empty"))}</div>`
      : state.log
          .slice(0, 60)
          .map((x) => {
            const line = escapeHtml(x.text);
            const cls = x.tone === "good" ? "feed__item feed__item--good" : x.tone === "warn" ? "feed__item feed__item--warn" : x.tone === "bad" ? "feed__item feed__item--bad" : "feed__item";
            return `<div class="${cls}"><div class="muted">${escapeHtml(x.t)}</div><div>${line}</div></div>`;
          })
          .join("");
}

function renderLeaderboards(state) {
  const earnHost = $("#lbEarn");
  const findHost = $("#lbFind");
  if (!earnHost || !findHost) return;

  const lb = state.leaderboards || { playerWeek: { earnedWeek: 0, findingsWeek: 0 }, npcs: [] };
  const prog = state.progress || { earnedTotal: 0, findingsTotal: 0 };

  const youName = state?.player?.name || (state?.settings?.lang === "en" ? "You" : "你");
  const rows = [
    {
      name: youName,
      earnedTotal: Math.round(prog.earnedTotal || 0),
      findingsTotal: Math.round(prog.findingsTotal || 0),
      earnedWeek: Math.round(lb.playerWeek?.earnedWeek || 0),
      findingsWeek: Math.round(lb.playerWeek?.findingsWeek || 0),
      tone: "good",
    },
    ...((lb.npcs || []).map((n) => ({
      name: String(n?.name || "anon"),
      earnedTotal: Math.round(n?.earnedTotal || 0),
      findingsTotal: Math.round(n?.findingsTotal || 0),
      earnedWeek: Math.round(n?.earnedWeek || 0),
      findingsWeek: Math.round(n?.findingsWeek || 0),
      tone: "info",
    })) || []),
  ];

  const earnRank = [...rows].sort((a, b) => (b.earnedTotal || 0) - (a.earnedTotal || 0)).slice(0, 10);
  const findRank = [...rows].sort((a, b) => (b.findingsTotal || 0) - (a.findingsTotal || 0)).slice(0, 10);

  const renderList = (items, mode) => {
    const isEarn = mode === "earn";
    const fmtTotal = (n) => (isEarn ? money(n) : String(Math.round(n || 0)));
    const fmtWeek = (n) => (isEarn ? money(n) : String(Math.round(n || 0)));
    return `<div class="feed" style="max-height:240px;overflow:auto;">${items
      .map((r, idx) => {
        const cls = r.tone === "good" ? "feed__item feed__item--good" : "feed__item";
        const title = `${idx + 1}. ${r.name}`;
        const wk = isEarn ? `+${fmtWeek(r.earnedWeek)}` : `+${fmtWeek(r.findingsWeek)}`;
        const tot = isEarn ? fmtTotal(r.earnedTotal) : fmtTotal(r.findingsTotal);
        return `<div class="${cls}">
          <div style="display:flex;justify-content:space-between;gap:10px;">
            <div>${escapeHtml(title)}</div>
            <div class="muted">${escapeHtml(wk)} · ${escapeHtml(tot)}</div>
          </div>
        </div>`;
      })
      .join("")}</div>`;
  };

  earnHost.innerHTML = renderList(earnRank, "earn");
  findHost.innerHTML = renderList(findRank, "find");
}

function renderShop(state) {
  const host = $("#shopList");
  const ownedHost = $("#shopOwned");
  if (!host || !ownedHost) return;

  host.innerHTML = SHOP_ITEMS.map((it) => {
    const owned = itemCount(state, it.key);
    const name = tr(state, `shop.item.${it.key}.name`);
    const desc = tr(state, `shop.item.${it.key}.desc`);
    const canBuy = state.stats.cash >= it.cost && (!it.once || owned === 0);
    const buyLabel = it.once && owned > 0 ? tr(state, "ui.shop.soldout") : tr(state, "ui.shop.buy");
    const btn = `<button class="btn btn--primary" data-shop="buy:${it.key}" ${canBuy ? "" : "disabled"}>${escapeHtml(buyLabel)} <span class="muted">(${money(it.cost)})</span></button>`;
    const useBtn =
      it.kind === "consumable"
        ? `<button class="btn" data-shop="use:${it.key}" ${owned > 0 ? "" : "disabled"}>${escapeHtml(tr(state, "ui.shop.use"))} <span class="muted">(x${owned})</span></button>`
        : "";

    return `<div class="item">
      <div class="item__top">
        <div>
          <div class="item__title">${escapeHtml(name)}</div>
          <div class="muted" style="margin-top:6px;">${escapeHtml(desc)}</div>
        </div>
        <div class="chips"><span class="chip">${escapeHtml(it.kind === "permanent" ? "PERM" : "USE")}</span></div>
      </div>
      <div class="item__actions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
        ${btn}
        ${useBtn}
      </div>
    </div>`;
  }).join("");

  const ownedKeys = Object.keys(state.shop?.owned || {}).filter((k) => itemCount(state, k) > 0);
  ownedHost.innerHTML =
    ownedKeys.length === 0
      ? `<div class="muted">${escapeHtml(tr(state, "ui.common.none"))}</div>`
      : ownedKeys
          .map((k) => {
            const c = itemCount(state, k);
            return `<div class="item"><div class="item__top"><div class="item__title">${escapeHtml(tr(state, `shop.item.${k}.name`))}</div><div class="chips"><span class="chip">x${c}</span></div></div></div>`;
          })
          .join("");
}

function renderXFeed(state) {
  const host = $("#xFeed");
  if (!host) return;
  const feed = state.x?.feed || [];
  host.innerHTML =
    feed.length === 0
      ? `<div class="muted">${escapeHtml(tr(state, "ui.x.empty"))}</div>`
      : feed
          .slice(0, 40)
          .map((p) => {
            return `<div class="feed__item">
              <div class="muted">${escapeHtml(p.t)} · ${escapeHtml(p.author)} · ♻ ${p.rts} · ♥ ${p.likes}</div>
              <div>${escapeHtml(p.text)}</div>
            </div>`;
          })
          .join("");
}

/**
 * 绑定 UI 事件；业务动作由 handlers 提供（方便你/我改逻辑时不动 UI）
 * @param {any} state
 * @param {{
 *  onAction:(key:string)=>void,
 *  onAccept:(kind:string,id:string)=>void,
 *  onSelect:(kind:string,id:string)=>void,
 *  onEndWeek:()=>void,
 *  onSave:()=>void,
 *  onNewGame:()=>void,
 *  onResetGame:()=>void,
 *  onCloseModal:()=>void,
 *  onHoursChange:(h:number)=>void,
 *  onLangChange?:(lang:string)=>void
 *  onAutoChange?:(next:any)=>void
 *  onCareer?:(raw:string)=>void
 *  onShop?:(raw:string)=>void
 * }} handlers
 */
export function bind(state, handlers) {
  document.addEventListener("click", (ev) => {
    // 兼容：点击按钮文本时，ev.target 可能是 TextNode（没有 closest）
    /** @type {any} */
    const raw = ev.target;
    const el = raw instanceof Element ? raw : raw?.parentElement;
    if (!el) return;

    const tabBtn = el.closest?.(".tab");
    if (tabBtn) {
      switchTab(tabBtn.dataset.tab);
      return;
    }

    const actionBtn = el.closest?.("[data-action]");
    if (actionBtn) {
      handlers.onAction(actionBtn.getAttribute("data-action"));
      return;
    }

    const accBtn = el.closest?.("[data-accept]");
    if (accBtn) {
      const [kind, id] = accBtn.getAttribute("data-accept").split(":");
      handlers.onAccept(kind, id);
      return;
    }

    const selBtn = el.closest?.("[data-select]");
    if (selBtn) {
      const [kind, id] = selBtn.getAttribute("data-select").split(":");
      handlers.onSelect(kind, id);
      return;
    }

    const uiBtn = el.closest?.("[data-ui]");
    if (uiBtn) {
      const key = uiBtn.getAttribute("data-ui");
      if (key === "closeModal") handlers.onCloseModal();
      if (key === "endWeek") handlers.onEndWeek();
      if (key === "saveGame") handlers.onSave();
      if (key === "newGame") handlers.onNewGame();
      if (key === "resetGame") handlers.onResetGame();
      if (key === "clearLog") handlers.onClearLog?.();
      if (key === "langEn") handlers.onLangChange?.("en");
      if (key === "langZh") handlers.onLangChange?.("zh");
      return;
    }

    const careerBtn = el.closest?.("[data-career]");
    if (careerBtn) {
      const raw = careerBtn.getAttribute("data-career");
      handlers.onCareer?.(raw);
      return;
    }

    const shopBtn = el.closest?.("[data-shop]");
    if (shopBtn) {
      const raw = shopBtn.getAttribute("data-shop");
      handlers.onShop?.(raw);
      return;
    }
  });

  const hoursSel = $("#hoursPerDay");
  if (hoursSel) {
    hoursSel.addEventListener("change", () => {
      const next = parseInt(hoursSel.value, 10) || 8;
      handlers.onHoursChange(next);
    });
  }

  const notifyAuto = () => {
    handlers.onAutoChange?.({
      enabled: Boolean($("#autoEnabled")?.checked),
      focus: String($("#autoFocus")?.value || "balanced"),
      autoEndWeek: Boolean($("#autoEndWeek")?.checked),
      allowAcceptJob: Boolean($("#autoAllowAcceptJob")?.checked),
      allowQuitJob: Boolean($("#autoAllowQuitJob")?.checked),
      minStaminaPct: parseInt(String($("#autoMinSta")?.value || "35"), 10) || 35,
      minMoodPct: parseInt(String($("#autoMinMood")?.value || "30"), 10) || 30,
    });
  };
  for (const id of ["autoEnabled", "autoFocus", "autoEndWeek", "autoAllowAcceptJob", "autoAllowQuitJob", "autoMinSta", "autoMinMood"]) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", notifyAuto);
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") handlers.onCloseModal();
  });
}

