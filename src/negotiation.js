import { clamp, ri } from "./utils.js?v=37";
import { t } from "./i18n.js?v=37";

function pct(n) {
  return `${Math.round(n * 100)}%`;
}

function fmtCash(state, amount) {
  const loc = state?.settings?.lang === "en" ? "en-US" : "zh-CN";
  const n = Math.round(amount || 0);
  return `¥${n.toLocaleString(loc)}`;
}

/**
 * @param {any} state
 * @param {any} order direct market order
 */
export function startDirectNegotiation(state, order) {
  const rep = clamp(state.stats?.reputation ?? 0, 0, 100);
  const comms = clamp(state.stats?.comms ?? 0, 0, 100);
  const coop = clamp(order.cooperation ?? 50, 0, 100);
  const rush = (order.deadlineWeeks ?? 3) <= 2;

  // 对方画像（简化）：配合越低越难谈；rush 越急压力越高
  const patience = clamp(55 + Math.round(coop / 4) - (rush ? 10 : 0), 25, 90);
  const trust = clamp(35 + Math.round(rep / 4) + Math.round(comms / 6), 20, 95);
  const pressure = clamp(35 + (rush ? 25 : 0) + Math.round((order.hackerAttention ?? 50) / 6), 20, 95);

  const baseFee = Math.round(order.fee || 0);
  const baseDeadline = clamp(Math.round(order.deadlineWeeks || 3), 1, 8);
  const baseScope = clamp(Math.round(order.scope || 40), 10, 120);

  return {
    kind: "direct",
    orderId: order.id,
    title: order.title,
    base: { fee: baseFee, deadlineWeeks: baseDeadline, scope: baseScope },
    terms: {
      fee: baseFee,
      deadlineWeeks: baseDeadline,
      scope: baseScope,
      depositPct: 0.2,
      scopeClarity: 40, // 0~100，越高越不容易 scope creep（后续可接入事件概率）
    },
    stats: { patience, trust, pressure },
    round: 1,
    maxRounds: 4,
    last: null, // last system message
  };
}

export function negotiationBody(state, nego) {
  const s = nego.stats;
  const x = nego.terms;
  const b = nego.base;
  const roundLine = t(state, "ui.nego.round", { now: nego.round, max: nego.maxRounds });

  const hint =
    nego.last ||
    t(state, "ui.nego.opening", {
      fee: fmtCash(state, b.fee),
      deadline: b.deadlineWeeks,
      scope: b.scope,
    });

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="muted">${roundLine}</div>
      <div>${hint}</div>
      <div class="divider"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <div class="subhead">${t(state, "ui.nego.terms")}</div>
          <div class="muted" style="margin-top:6px;line-height:1.7;">
            <div>${t(state, "ui.nego.term.fee")}: <b>${fmtCash(state, x.fee)}</b> (${t(state, "ui.nego.base")}: ${fmtCash(state, b.fee)})</div>
            <div>${t(state, "ui.nego.term.deadline")}: <b>${x.deadlineWeeks}</b></div>
            <div>${t(state, "ui.nego.term.deposit")}: <b>${pct(x.depositPct)}</b></div>
            <div>${t(state, "ui.nego.term.scope")}: <b>${x.scope}</b></div>
            <div>${t(state, "ui.nego.term.scopeClarity")}: <b>${clamp(Math.round(x.scopeClarity), 0, 100)}/100</b></div>
          </div>
        </div>
        <div>
          <div class="subhead">${t(state, "ui.nego.meters")}</div>
          <div class="muted" style="margin-top:6px;line-height:1.7;">
            <div>${t(state, "ui.nego.m.patience")}: <b>${clamp(Math.round(s.patience), 0, 100)}/100</b></div>
            <div>${t(state, "ui.nego.m.trust")}: <b>${clamp(Math.round(s.trust), 0, 100)}/100</b></div>
            <div>${t(state, "ui.nego.m.pressure")}: <b>${clamp(Math.round(s.pressure), 0, 100)}/100</b></div>
          </div>
        </div>
      </div>
      <div class="muted" style="margin-top:2px;">${t(state, "ui.nego.tip")}</div>
      <div class="divider"></div>
      <div class="muted" style="line-height:1.7;">
        <div class="subhead" style="margin-bottom:6px;">${t(state, "ui.nego.movesTitle")}</div>
        <div><b>${t(state, "ui.nego.move.anchor")}</b>：${t(state, "ui.nego.explain.anchor")}</div>
        <div><b>${t(state, "ui.nego.move.trade")}</b>：${t(state, "ui.nego.explain.trade")}</div>
        <div><b>${t(state, "ui.nego.move.freeze")}</b>：${t(state, "ui.nego.explain.freeze")}</div>
        <div><b>${t(state, "ui.nego.move.wbs")}</b>：${t(state, "ui.nego.explain.wbs")}</div>
        <div><b>${t(state, "ui.nego.move.walk")}</b>：${t(state, "ui.nego.explain.walk")}</div>
        <div><b>${t(state, "ui.nego.move.sign")}</b>：${t(state, "ui.nego.explain.sign")}</div>
        <div><b>${t(state, "ui.nego.move.cancel")}</b>：${t(state, "ui.nego.explain.cancel")}</div>
      </div>
    </div>
  `;
}

export function negotiationMoves(state, nego) {
  const canSign = true;
  const canContinue = nego.round <= nego.maxRounds;
  /** @type {{key:string,label:string,kind?:'primary'|'danger'}[]} */
  const moves = [];
  if (canContinue) {
    moves.push({ key: "anchor", label: t(state, "ui.nego.move.anchor") });
    moves.push({ key: "trade", label: t(state, "ui.nego.move.trade") });
    moves.push({ key: "freeze", label: t(state, "ui.nego.move.freeze") });
    moves.push({ key: "wbs", label: t(state, "ui.nego.move.wbs") });
    moves.push({ key: "walk", label: t(state, "ui.nego.move.walk"), kind: "danger" });
  }
  if (canSign) moves.push({ key: "sign", label: t(state, "ui.nego.move.sign"), kind: "primary" });
  moves.push({ key: "cancel", label: t(state, "ui.nego.move.cancel") });
  return moves;
}

function applyClampTerms(nego) {
  const b = nego.base;
  const x = nego.terms;
  x.depositPct = clamp(x.depositPct, 0.1, 0.5);
  x.deadlineWeeks = clamp(Math.round(x.deadlineWeeks), 1, 8);
  x.scope = clamp(Math.round(x.scope), 10, 140);
  // fee 保护：避免离谱
  const minFee = Math.round(b.fee * 0.65);
  const maxFee = Math.round(b.fee * 1.6);
  x.fee = clamp(Math.round(x.fee), minFee, maxFee);
  x.scopeClarity = clamp(Math.round(x.scopeClarity), 0, 100);
}

function opponentReact(state, nego) {
  const s = nego.stats;
  const x = nego.terms;

  // 概率：压力越大越愿意妥协；信任越低越爱砍价；耐心越低越容易谈崩
  const pAccept = clamp(0.25 + s.pressure / 160 + s.trust / 260, 0.15, 0.75);
  const pCounter = clamp(0.35 + (100 - s.trust) / 220, 0.15, 0.65);

  const roll = Math.random();
  if (s.patience <= 0) {
    return { ok: false, msg: t(state, "ui.nego.fail.patience") };
  }
  if (roll < pAccept) {
    s.trust = clamp(s.trust + ri(1, 4), 0, 100);
    return { ok: true, msg: t(state, "ui.nego.react.accept") };
  }
  if (roll < pAccept + pCounter) {
    // 还价：稍砍价/压定金
    x.fee = Math.round(x.fee * (0.95 - ri(0, 2) / 100));
    x.depositPct = x.depositPct - 0.03;
    s.patience = clamp(s.patience - ri(3, 7), 0, 100);
    return { ok: true, msg: t(state, "ui.nego.react.counter") };
  }
  // 转移话题/加范围
  if (Math.random() < 0.5) {
    x.scope += ri(4, 10);
    s.patience = clamp(s.patience - ri(4, 9), 0, 100);
    return { ok: true, msg: t(state, "ui.nego.react.scopeAdd") };
  }
  s.patience = clamp(s.patience - ri(2, 6), 0, 100);
  return { ok: true, msg: t(state, "ui.nego.react.stall") };
}

export function applyNegotiationMove(state, nego, moveKey) {
  const s = nego.stats;
  const x = nego.terms;

  if (moveKey === "cancel") {
    return { done: true, outcome: "cancel" };
  }
  if (moveKey === "sign") {
    applyClampTerms(nego);
    return { done: true, outcome: "sign" };
  }

  // 玩家动作
  switch (moveKey) {
    case "anchor": {
      x.fee = Math.round(x.fee * 1.12);
      s.patience -= ri(6, 12);
      s.trust -= ri(2, 6);
      s.pressure += ri(1, 4);
      nego.last = t(state, "ui.nego.you.anchor");
      break;
    }
    case "trade": {
      x.fee = Math.round(x.fee * 0.97);
      x.depositPct += 0.05;
      // 用条款换工期：更“好加”
      // 逻辑：信任越高/对方越急（pressure 越高）越愿意给时间；最多加到 6 周
      if (x.deadlineWeeks < 6) {
        const p = clamp(0.7 + s.trust / 220 + s.pressure / 320, 0.55, 0.95);
        if (Math.random() < p) x.deadlineWeeks += 1;
        // 极少数情况下再多给 1 周（但仍封顶）
        if (x.deadlineWeeks < 6 && s.trust >= 70 && s.patience >= 55 && Math.random() < 0.18) x.deadlineWeeks += 1;
      }
      s.trust += ri(2, 6);
      s.patience -= ri(2, 5);
      nego.last = t(state, "ui.nego.you.trade");
      break;
    }
    case "freeze": {
      x.scopeClarity += ri(18, 30);
      s.trust += ri(4, 9);
      s.patience -= ri(1, 4);
      nego.last = t(state, "ui.nego.you.freeze");
      break;
    }
    case "wbs": {
      x.fee = Math.round(x.fee * 1.05);
      s.trust += ri(3, 7);
      s.patience -= ri(1, 3);
      nego.last = t(state, "ui.nego.you.wbs");
      break;
    }
    case "walk": {
      // 走人威胁：要么让对方压力上来，要么直接谈崩
      s.pressure += ri(8, 14);
      s.patience -= ri(10, 18);
      if (s.trust < 25 && Math.random() < 0.55) {
        s.patience = 0;
      } else {
        s.trust -= ri(0, 4);
      }
      nego.last = t(state, "ui.nego.you.walk");
      break;
    }
    default:
      break;
  }

  applyClampTerms(nego);

  // 对方回应
  const react = opponentReact(state, nego);
  if (!react.ok) return { done: true, outcome: "fail", reason: react.msg };
  nego.last = `${nego.last}<br/><span class="muted">${react.msg}</span>`;

  // 推进回合
  nego.round += 1;
  if (nego.round > nego.maxRounds) {
    // 最后一回合：自动落锤（信任太低可能失败）
    if (nego.stats.trust < 15 && Math.random() < 0.55) {
      return { done: true, outcome: "fail", reason: t(state, "ui.nego.fail.trust") };
    }
    return { done: true, outcome: "sign" };
  }

  return { done: false };
}

