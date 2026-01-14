import { clamp } from "./utils.js?v=35";
import { healthCap, log } from "./state.js?v=35";

// 返回一个“下一步该做什么”的决策；不直接改 AP（由 doAction/主逻辑处理）
export function pickAutoStep(state) {
  const auto = state.settings?.auto || {};
  const cap = healthCap(state);
  const minSta = Math.round((clamp(auto.minStaminaPct ?? 35, 5, 90) / 100) * cap);
  const minMood = Math.round((clamp(auto.minMoodPct ?? 30, 5, 90) / 100) * cap);

  // 1) 生存阈值：先休息保命
  if (state.stats.stamina <= minSta || state.stats.mood <= minMood) return { kind: "action", key: "rest", reason: "survival" };
  if (state.stats.compliance >= 90) return { kind: "action", key: "compliance", reason: "compliance" };

  // 2) 重大事件优先（如果玩家偏好 incident 或 balanced）
  const hasMI = Boolean(state.majorIncident?.active);
  const focus = auto.focus || "balanced";
  if (hasMI && (focus === "incident" || focus === "balanced")) {
    const p = state.majorIncident.progress || {};
    if ((p.analysis || 0) < 60) return { kind: "action", key: "incidentAnalysis", reason: "incident" };
    if ((p.tracing || 0) < 50) return { kind: "action", key: "fundTrace", reason: "incident" };
    if ((p.writeup || 0) < 70) return { kind: "action", key: "writeBrief", reason: "incident" };
    return { kind: "action", key: "postX", reason: "incident" };
  }

  // 3) 入职决策（默认关，避免用户不想要的决定）
  if (!state.employment?.employed && auto.allowAcceptJob) {
    const offers = state.market.jobs || [];
    if (offers.length) {
      const best = offers.slice().sort((a, b) => (b.salaryWeekly || 0) - (a.salaryWeekly || 0))[0];
      return { kind: "career", op: "acceptJob", id: best.id, reason: "job" };
    }
  }

  // 4) 公司任务优先
  if (state.employment?.employed && (focus === "company" || focus === "balanced")) {
    const tickets = state.active.company || [];
    if (tickets.length) {
      const best = tickets.slice().sort((a, b) => (a.deadlineWeeks || 9) - (b.deadlineWeeks || 9) || (b.impact || 0) - (a.impact || 0))[0];
      return { kind: "selectAndAction", target: { kind: "company", id: best.id }, key: "companyWork", reason: "company" };
    }
  }

  // 5) 外部工作（直客 / 平台）
  const hasDirect = (state.active.direct || []).length > 0;
  const hasPlat = (state.active.platform || []).length > 0;
  if (focus === "direct" || (focus === "balanced" && hasDirect)) {
    const p = state.active.direct?.[0];
    if (p) return { kind: "selectAndAction", target: { kind: "direct", id: p.id }, key: p.report?.draft < 55 ? "write" : "audit", reason: "direct" };
    // 没有进行中直客：尝试接单
    const m = state.market.direct?.[0];
    if (m) return { kind: "accept", target: { kind: "direct", id: m.id }, reason: "direct" };
  }
  if (focus === "platform" || (focus === "balanced" && hasPlat)) {
    const c = state.active.platform?.[0];
    if (c) return { kind: "selectAndAction", target: { kind: "platform", id: c.id }, key: "audit", reason: "platform" };
    const m = state.market.platform?.[0];
    if (m) return { kind: "accept", target: { kind: "platform", id: m.id }, reason: "platform" };
  }

  // 6) 研究优先（但也不会牺牲生存阈值）
  if (focus === "research") return { kind: "action", key: "aiResearch", reason: "research" };

  // 7) fallback：如果有任何 active，优先推进；否则学习/发动态
  if (hasDirect) {
    const p = state.active.direct[0];
    return { kind: "selectAndAction", target: { kind: "direct", id: p.id }, key: "audit", reason: "fallback" };
  }
  if (hasPlat) {
    const p = state.active.platform[0];
    return { kind: "selectAndAction", target: { kind: "platform", id: p.id }, key: "audit", reason: "fallback" };
  }
  return { kind: "action", key: focus === "survival" ? "rest" : "learn", reason: "fallback" };
}

export function noteAuto(state, text) {
  // 低频记录，避免刷屏（这里直接用普通 log，外层可控制）
  log(state, text, "info");
}

