import { clamp, pick, ri } from "./utils.js?v=54";
import { adjustAfterAction, healthCap, log, spendAP } from "./state.js?v=54";
import { t } from "./i18n.js?v=54";

/**
 * @typedef {{id:string,title:string,desc:(s:any)=>string,when:(s:any)=>boolean,choices:(s:any)=>{label:string,primary?:boolean,apply:(stt:any)=>void}[]}} GameEvent
 */

/** @param {any} state @returns {GameEvent[]} */
export function rollEvents(state) {
  const st = state.stats;
  const cap = healthCap(state);
  const emp = state.employment;
  const isYh = emp?.employed && emp.companyKey === "yh";
  const needYhGuarantee = Boolean(isYh && (emp.yhToxicTriggered !== true) && (emp.weeksEmployed ?? 0) < 3);
  const pity = clamp(Math.round(state?.world?.eventPityWeeks ?? 0), 0, 99);

  /** @type {GameEvent[]} */
  const POOL = [
    // X（推特）舆情事件：需要一定热度才会触发；翻车后更容易被追打
    {
      id: "x_callout",
      title: t(state, "event.x_callout.title"),
      when: (s) => {
        const heat = clamp(Math.round(s.world?.xHeat ?? 0), 0, 100);
        if (heat < 35) return false;
        const last = s.world?.xLastOutcome;
        const base = last === "fail" ? 0.42 : 0.18;
        return Math.random() < base;
      },
      desc: (s) => t(s, "event.x_callout.desc"),
      choices: () => [
        {
          label: t(state, "event.x_callout.choice.apologize"),
          primary: true,
          apply: (stt) => {
            const heat = clamp(Math.round(stt.world?.xHeat ?? 0), 0, 100);
            if (stt.world) stt.world.xHeat = clamp(heat - ri(12, 22), 0, 100);
            adjustAfterAction(stt, { mood: -1, reputation: +1, brand: +1, compliance: -1 });
            log(stt, t(stt, "event.x_callout.log.apologize"), "info");
          },
        },
        {
          label: t(state, "event.x_callout.choice.doubleDown"),
          apply: (stt) => {
            const heat = clamp(Math.round(stt.world?.xHeat ?? 0), 0, 100);
            if (stt.world) stt.world.xHeat = clamp(heat + ri(8, 18), 0, 100);
            const ok = Math.random() < clamp(0.22 + stt.stats.comms / 320 + stt.stats.brand / 360, 0.08, 0.55);
            adjustAfterAction(stt, { mood: -2, stamina: -1 });
            if (ok) {
              adjustAfterAction(stt, { reputation: +1, brand: +1 });
              log(stt, t(stt, "event.x_callout.log.doubleDown.ok"), "good");
            } else {
              adjustAfterAction(stt, { reputation: -2, brand: -1, compliance: +2 });
              log(stt, t(stt, "event.x_callout.log.doubleDown.fail"), "bad");
            }
          },
        },
      ],
    },
    {
      id: "x_sponsor_dm",
      title: t(state, "event.x_sponsor_dm.title"),
      when: (s) => {
        const heat = clamp(Math.round(s.world?.xHeat ?? 0), 0, 100);
        if (heat < 40) return false;
        if ((s.stats.brand ?? 0) < 10) return false;
        return Math.random() < 0.14;
      },
      desc: (s) => t(s, "event.x_sponsor_dm.desc"),
      choices: () => [
        {
          label: t(state, "event.x_sponsor_dm.choice.accept"),
          primary: true,
          apply: (stt) => {
            const fee = ri(1200, 18000);
            adjustAfterAction(stt, { cash: fee, reputation: +1, brand: +1, mood: +1 });
            if (!stt.progress) stt.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
            stt.progress.earnedTotal = (stt.progress.earnedTotal || 0) + Math.max(0, fee);
            // 偶尔踩线：商单表述容易变“背书”
            if (Math.random() < 0.28) adjustAfterAction(stt, { compliance: +3 });
            log(stt, t(stt, "event.x_sponsor_dm.log.accept", { fee }), "good");
          },
        },
        {
          label: t(state, "event.x_sponsor_dm.choice.decline"),
          apply: (stt) => {
            const heat = clamp(Math.round(stt.world?.xHeat ?? 0), 0, 100);
            if (stt.world) stt.world.xHeat = clamp(heat - ri(6, 14), 0, 100);
            adjustAfterAction(stt, { mood: +1, compliance: -1 });
            log(stt, t(stt, "event.x_sponsor_dm.log.decline"), "info");
          },
        },
      ],
    },
    {
      id: "x_viral_afterglow",
      title: t(state, "event.x_viral_afterglow.title"),
      when: (s) => {
        const heat = clamp(Math.round(s.world?.xHeat ?? 0), 0, 100);
        if (heat < 55) return false;
        if (s.world?.xLastOutcome !== "viral") return false;
        return Math.random() < 0.35;
      },
      desc: (s) => t(s, "event.x_viral_afterglow.desc"),
      choices: () => [
        {
          label: t(state, "event.x_viral_afterglow.choice.monetize"),
          primary: true,
          apply: (stt) => {
            const consult = ri(800, 9000);
            adjustAfterAction(stt, { cash: consult, network: +2, reputation: +1, mood: -1, stamina: -1 });
            if (!stt.progress) stt.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
            stt.progress.earnedTotal = (stt.progress.earnedTotal || 0) + Math.max(0, consult);
            log(stt, t(stt, "event.x_viral_afterglow.log.monetize", { fee: consult }), "good");
          },
        },
        {
          label: t(state, "event.x_viral_afterglow.choice.ignore"),
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "event.x_viral_afterglow.log.ignore"), "info");
          },
        },
      ],
    },
    {
      id: "exchange_report_kpi_hell",
      title: t(state, "event.exchange_report_kpi_hell.title"),
      when: (s) => {
        if (!(s.employment?.employed && s.employment.companyType === "exchange")) return false;
        if ((s.employment.politics ?? 0) <= 45) return false;
        // YH（抽象）更容易触发
        const p = s.employment.companyKey === "yh" ? 0.42 : 0.18;
        return Math.random() < p;
      },
      desc: (s) => t(s, "event.exchange_report_kpi_hell.desc"),
      choices: () => [
        {
          label: t(state, "event.exchange_report_kpi_hell.choice.honest"),
          apply: (stt) => {
            adjustAfterAction(stt, { mood: -1, stamina: -1 });
            stt.stats.writing = clamp(stt.stats.writing + 1, 0, 100);
            stt.employment.performance = clamp((stt.employment.performance || 50) + 1, 0, 100);
            if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
            log(stt, t(stt, "event.exchange_report_kpi_hell.log.honest"), "info");
          },
        },
        {
          label: t(state, "event.exchange_report_kpi_hell.choice.kpi"),
          apply: (stt) => {
            const ok = Math.random() < clamp(0.35 + stt.stats.comms / 220 + stt.stats.writing / 260, 0.15, 0.75);
            adjustAfterAction(stt, { mood: -1 });
            if (ok) {
              stt.employment.performance = clamp((stt.employment.performance || 50) + 2, 0, 100);
              stt.employment.trust = clamp((stt.employment.trust || 50) + 1, 0, 100);
              if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
              log(stt, t(stt, "event.exchange_report_kpi_hell.log.kpi.ok"), "good");
            } else {
              stt.employment.politics = clamp((stt.employment.politics || 20) + 4, 0, 100);
              if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
              log(stt, t(stt, "event.exchange_report_kpi_hell.log.kpi.fail"), "warn");
            }
          },
        },
      ],
    },
    {
      id: "exchange_postmortem_blame",
      title: t(state, "event.exchange_postmortem_blame.title"),
      when: (s) =>
        s.employment?.employed &&
        s.employment.companyType === "exchange" &&
        (s.employment.manager?.toxicity ?? 0) > 55 &&
        (s.majorIncident?.active || Math.random() < (s.employment.companyKey === "yh" ? 0.22 : 0.08)),
      desc: (s) => t(s, "event.exchange_postmortem_blame.desc"),
      choices: () => [
        {
          label: t(state, "event.exchange_postmortem_blame.choice.evidence"),
          apply: (stt) => {
            // 直接花“精力/心态”模拟准备成本
            adjustAfterAction(stt, { mood: -1, stamina: -1 });
            const ok = Math.random() < clamp(0.40 + stt.stats.writing / 240 + stt.stats.comms / 240, 0.15, 0.80);
            if (ok) {
              stt.employment.trust = clamp((stt.employment.trust || 50) + 2, 0, 100);
              stt.employment.politics = clamp((stt.employment.politics || 20) - 3, 0, 100);
              if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
              log(stt, t(stt, "event.exchange_postmortem_blame.log.evidence.ok"), "good");
            } else {
              stt.employment.performance = clamp((stt.employment.performance || 50) - 4, 0, 100);
              if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
              log(stt, t(stt, "event.exchange_postmortem_blame.log.evidence.fail"), "warn");
            }
          },
        },
        {
          label: t(state, "event.exchange_postmortem_blame.choice.take_blame"),
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            stt.employment.performance = clamp((stt.employment.performance || 50) - 6, 0, 100);
            stt.employment.politics = clamp((stt.employment.politics || 20) + 6, 0, 100);
            if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
            log(stt, t(stt, "event.exchange_postmortem_blame.log.take_blame"), "bad");
          },
        },
      ],
    },
    {
      id: "scope_creep",
      title: t(state, "event.scope_creep.title"),
      when: (s) => s.active.direct.length > 0 && Math.random() < 0.35,
      desc: (s) => t(s, "event.scope_creep.desc"),
      choices: () => [
        {
          label: t(state, "event.scope_creep.choice.boundary"),
          apply: (stt) => {
            const up = ri(3, 7);
            stt.stats.comms = clamp(stt.stats.comms + 1, 0, 100);
            stt.stats.reputation = clamp(stt.stats.reputation + 1, 0, 100);
            // 经济缩放：变更费在几百量级
            stt.stats.cash += up * 80;
            if (!stt.progress) stt.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
            stt.progress.earnedTotal = (stt.progress.earnedTotal || 0) + Math.max(0, up * 80);
            log(stt, t(stt, "event.scope_creep.log.boundary"), "good");
          },
        },
        {
          label: t(state, "event.scope_creep.choice.overtime"),
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -8, mood: -4 });
            const p = stt.active.direct[0];
            if (p) p.scope = clamp(p.scope + ri(6, 12), 0, 120);
            log(stt, t(stt, "event.scope_creep.log.overtime"), "warn");
          },
        },
      ],
    },
    {
      id: "endorsement",
      title: t(state, "event.endorsement.title"),
      when: (s) => s.active.direct.length > 0 && Math.random() < 0.22,
      desc: (s) => t(s, "event.endorsement.desc"),
      choices: () => [
        {
          label: t(state, "event.endorsement.choice.refuse"),
          apply: (stt) => {
            adjustAfterAction(stt, { compliance: -2, reputation: +1, mood: -1 });
            log(stt, t(stt, "event.endorsement.log.refuse"), "good");
          },
        },
        {
          label: t(state, "event.endorsement.choice.ambiguous"),
          apply: (stt) => {
            // 经济缩放：小额“感谢费”
            adjustAfterAction(stt, { compliance: +6, cash: +350, mood: +1 });
            log(stt, t(stt, "event.endorsement.log.ambiguous"), "warn");
          },
        },
      ],
    },
    {
      id: "platform_rejudge",
      title: t(state, "event.platform_rejudge.title"),
      when: (s) => s.active.platform.length > 0 && Math.random() < 0.30,
      desc: (s) => t(s, "event.platform_rejudge.desc"),
      choices: () => [
        {
          label: t(state, "event.platform_rejudge.choice.appeal"),
          apply: (stt) => {
            if (!spendAP(stt, 1)) {
              log(stt, t(stt, "event.platform_rejudge.log.noAp"), "bad");
              return;
            }
            const win = Math.random() < clamp(0.35 + stt.stats.writing / 220 + stt.stats.skill / 260, 0.15, 0.7);
            if (win) {
              adjustAfterAction(stt, { platformRating: +2, reputation: +1, mood: +1 });
              log(stt, t(stt, "event.platform_rejudge.log.win"), "good");
            } else {
              adjustAfterAction(stt, { mood: -2 });
              log(stt, t(stt, "event.platform_rejudge.log.lose"), "warn");
            }
          },
        },
        {
          label: t(state, "event.platform_rejudge.choice.move_on"),
          apply: (stt) => {
            adjustAfterAction(stt, { mood: -1 });
            log(stt, t(stt, "event.platform_rejudge.log.move_on"), "info");
          },
        },
      ],
    },
    {
      id: "burnout",
      title: t(state, "event.burnout.title"),
      when: (s) => s.stats.stamina <= Math.round(healthCap(s) * 0.28) && Math.random() < 0.65,
      desc: (s) => t(s, "event.burnout.desc"),
      choices: () => [
        {
          label: t(state, "event.burnout.choice.rest"),
          apply: (stt) => {
            stt.ap.now = 0;
            const c = healthCap(stt);
            adjustAfterAction(stt, { stamina: Math.round(c * 0.14), mood: Math.round(c * 0.10), reputation: -1 });
            log(stt, t(stt, "event.burnout.log.rest"), "good");
          },
        },
        {
          label: t(state, "event.burnout.choice.push"),
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -8, mood: -6, compliance: +2 });
            log(stt, t(stt, "event.burnout.log.push"), "bad");
          },
        },
      ],
    },
    {
      id: "bear",
      title: t(state, "event.bear.title"),
      when: () => Math.random() < 0.18,
      desc: (s) => t(s, "event.bear.desc"),
      choices: () => [
        {
          label: t(state, "event.bear.choice.tooling"),
          apply: (stt) => {
            // 经济缩放：工具/流程升级的支出
            adjustAfterAction(stt, { tooling: +2, cash: -800, mood: -1 });
            log(stt, t(stt, "event.bear.log.tooling"), "info");
          },
        },
        {
          label: t(state, "event.bear.choice.contests"),
          apply: (stt) => {
            adjustAfterAction(stt, { platformRating: +1, mood: -1 });
            log(stt, t(stt, "event.bear.log.contests"), "info");
          },
        },
      ],
    },
    {
      id: "bull",
      title: t(state, "event.bull.title"),
      when: (s) => Math.random() < 0.13 && s.stats.reputation >= 10,
      desc: (s) => t(s, "event.bull.desc"),
      choices: () => [
        {
          label: t(state, "event.bull.choice.raise_price"),
          apply: (stt) => {
            // 经济缩放：牛市小幅加价带来的额外现金流
            adjustAfterAction(stt, { reputation: +1, cash: +650, mood: +2 });
            log(stt, t(stt, "event.bull.log.raise_price"), "good");
          },
        },
        {
          label: t(state, "event.bull.choice.workshop"),
          apply: (stt) => {
            adjustAfterAction(stt, { reputation: +3, network: +2, stamina: -2 });
            log(stt, t(stt, "event.bull.log.workshop"), "info");
          },
        },
      ],
    },
    {
      id: "payment_delay",
      title: t(state, "event.payment_delay.title"),
      when: (s) => s.active.direct.length > 0 && Math.random() < 0.2,
      desc: (s) => t(s, "event.payment_delay.desc"),
      choices: () => [
        {
          label: t(state, "event.payment_delay.choice.formal"),
          apply: (stt) => {
            adjustAfterAction(stt, { compliance: -2, mood: -1, reputation: +1 });
            log(stt, t(stt, "event.payment_delay.log.formal"), "info");
          },
        },
        {
          label: t(state, "event.payment_delay.choice.wait"),
          apply: (stt) => {
            adjustAfterAction(stt, { mood: -2 });
            log(stt, t(stt, "event.payment_delay.log.wait"), "warn");
          },
        },
      ],
    },
    {
      id: "platform_dup_wave",
      title: t(state, "event.platform_dup_wave.title"),
      when: (s) => s.active.platform.length > 0 && Math.random() < 0.22,
      desc: (s) => t(s, "event.platform_dup_wave.desc"),
      choices: () => [
        {
          label: t(state, "event.platform_dup_wave.choice.niche"),
          apply: (stt) => {
            adjustAfterAction(stt, { mood: -1 });
            log(stt, t(stt, "event.platform_dup_wave.log.niche"), "info");
          },
        },
        {
          label: t(state, "event.platform_dup_wave.choice.hot"),
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -3, mood: -2, platformRating: +1 });
            log(stt, t(stt, "event.platform_dup_wave.log.hot"), "warn");
          },
        },
      ],
    },
    {
      id: "health",
      title: t(state, "event.health.title"),
      when: (s) => s.stats.stamina < Math.round(healthCap(s) * 0.45) && Math.random() < 0.18,
      desc: (s) => t(s, "event.health.desc"),
      choices: () => [
        {
          label: t(state, "event.health.choice.rest"),
          apply: (stt) => {
            const c = healthCap(stt);
            adjustAfterAction(stt, { cash: -300, stamina: Math.round(c * 0.08), mood: Math.round(c * 0.05) });
            log(stt, t(stt, "event.health.log.rest"), "good");
          },
        },
        {
          label: t(state, "event.health.choice.coffee"),
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -6, mood: -2 });
            log(stt, t(stt, "event.health.log.coffee"), "bad");
          },
        },
      ],
    },
    {
      id: "exploit_rumor",
      title: t(state, "event.exploit_rumor.title"),
      when: (s) => s.active.direct.length === 0 && Math.random() < 0.14 && s.stats.reputation > 15,
      desc: (s) => t(s, "event.exploit_rumor.desc"),
      choices: () => [
        {
          label: t(state, "event.exploit_rumor.choice.respond"),
          apply: (stt) => {
            const ok = Math.random() < clamp(0.4 + stt.stats.writing / 220 + stt.stats.comms / 220, 0.15, 0.75);
            if (ok) {
              adjustAfterAction(stt, { reputation: +2, mood: +1 });
              log(stt, t(stt, "event.exploit_rumor.log.respond.ok"), "good");
            } else {
              adjustAfterAction(stt, { reputation: -2, mood: -2 });
              log(stt, t(stt, "event.exploit_rumor.log.respond.fail"), "warn");
            }
          },
        },
        {
          label: t(state, "event.exploit_rumor.choice.ignore"),
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1, reputation: -1 });
            log(stt, t(stt, "event.exploit_rumor.log.ignore"), "info");
          },
        },
      ],
    },
  ];

  // 事件数量：提高频率到 ≈ 每 1~2 周 1 次（并加“保底”：连续 1 周没出，第 2 周必出 1 个）
  const baseChance = 0.55; // ~ 1.8 周一次
  const baseCount = pity >= 1 || Math.random() < baseChance ? 1 : 0;
  const extra = st.mood < Math.round(cap * 0.35) || st.stamina < Math.round(cap * 0.35) ? (Math.random() < 0.22 ? 1 : 0) : 0;
  let want = clamp(baseCount + extra, 0, 2);

  const picked = [];

  // YH（抽象）保底：入职后 3 周内必触发一次“恶心事件”
  if (needYhGuarantee) {
    want = Math.max(want, 1);
    picked.push({
      id: "yh_toxic_guarantee",
      title: t(state, "event.yh_toxic_guarantee.title"),
      when: () => true,
      desc: (s) => t(s, "event.yh_toxic_guarantee.desc"),
      choices: () => [
        {
          label: t(state, "event.yh_toxic_guarantee.choice.endure"),
          primary: true,
          apply: (stt) => {
            stt.employment.yhToxicTriggered = true;
            adjustAfterAction(stt, { mood: -2, stamina: -2 });
            stt.employment.politics = clamp((stt.employment.politics || 20) + 6, 0, 100);
            log(stt, t(stt, "event.yh_toxic_guarantee.log.endure"), "warn");
          },
        },
        {
          label: t(state, "event.yh_toxic_guarantee.choice.push_back"),
          apply: (stt) => {
            stt.employment.yhToxicTriggered = true;
            const ok = Math.random() < clamp(0.25 + stt.stats.comms / 260, 0.08, 0.55);
            adjustAfterAction(stt, { mood: -2, stamina: -1 });
            if (ok) {
              stt.employment.trust = clamp((stt.employment.trust || 50) + 2, 0, 100);
              log(stt, t(stt, "event.yh_toxic_guarantee.log.push_back.ok"), "good");
            } else {
              stt.employment.performance = clamp((stt.employment.performance || 50) - 4, 0, 100);
              stt.employment.politics = clamp((stt.employment.politics || 20) + 10, 0, 100);
              log(stt, t(stt, "event.yh_toxic_guarantee.log.push_back.fail"), "bad");
            }
          },
        },
      ],
    });
  }

  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  for (const e of shuffled) {
    if (picked.length >= want) break;
    if (e.when(state)) picked.push(e);
  }

  // 兜底：仅当“完全没有任何事件命中”时才给一个轻量事件
  if (want > 0 && picked.length === 0) {
    picked.push({
      id: "ambient_ping",
      title: t(state, "event.ambient_ping.title"),
      when: () => true,
      desc: (s) => t(s, "event.ambient_ping.desc"),
      choices: () => [
        {
          label: t(state, "event.ambient_ping.choice.scroll"),
          primary: true,
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +2 });
            log(stt, t(stt, "event.ambient_ping.log.scroll"), "info");
          },
        },
        {
          label: t(state, "event.ambient_ping.choice.keep"),
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -1 });
            log(stt, t(stt, "event.ambient_ping.log.keep"), "info");
          },
        },
      ],
    });
  }
  // 更新保底计数器：本周无事件则 +1，否则归零
  if (state.world) {
    state.world.eventPityWeeks = picked.length > 0 ? 0 : clamp(pity + 1, 0, 99);
  }
  return picked;
}

// ===== 可选事件列表（Inbox）=====
// 不把函数存进 state（可序列化），这里只用 def + payload 的方式处理

/**
 * @typedef {{
 *  labelKey: string,
 *  primary?: boolean,
 *  tone?: 'good'|'info'|'warn'|'bad',
 *  apply: (state:any,payload:any)=>void
 * }} InboxChoice
 */

/**
 * @typedef {{
 *  id: string,
 *  titleKey: string,
 *  descKey: string,
 *  kind: 'meme'|'security'|'market'|'social',
 *  expiresInWeeks?: number,
 *  gen?: (state:any)=>any,
 *  choices: InboxChoice[]
 * }} InboxDef
 */

/** @returns {InboxDef[]} */
export function inboxDefs() {
  return [
    {
      id: "meme_mev_sandwich",
      kind: "meme",
      titleKey: "inbox.meme_mev_sandwich.title",
      descKey: "inbox.meme_mev_sandwich.desc",
      choices: [
        {
          labelKey: "inbox.choice.laugh",
          primary: true,
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.read"), "info");
          },
        },
        {
          labelKey: "inbox.choice.quote",
          tone: "info",
          apply: (stt) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(6, 12)), 0, 100);
            adjustAfterAction(stt, { brand: +1, reputation: +1, mood: +0 });
            log(stt, t(stt, "inbox.log.quote"), "info");
          },
        },
        {
          labelKey: "inbox.choice.bookmark",
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { tooling: +1 });
            log(stt, t(stt, "inbox.log.bookmark"), "info");
          },
        },
      ],
    },
    {
      id: "meme_scope_creep",
      kind: "meme",
      titleKey: "inbox.meme_scope_creep.title",
      descKey: "inbox.meme_scope_creep.desc",
      choices: [
        {
          labelKey: "inbox.choice.laughCry",
          primary: true,
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.read"), "info");
          },
        },
        {
          labelKey: "inbox.choice.writeChecklist",
          tone: "good",
          apply: (stt) => {
            adjustAfterAction(stt, { writing: +1, mood: -1 });
            log(stt, t(stt, "inbox.log.checklist"), "good");
          },
        },
        {
          labelKey: "inbox.choice.quote",
          tone: "info",
          apply: (stt) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(6, 12)), 0, 100);
            adjustAfterAction(stt, { brand: +1, mood: 0 });
            log(stt, t(stt, "inbox.log.quote"), "info");
          },
        },
      ],
    },
    {
      id: "sec_oracle_glitch",
      kind: "security",
      titleKey: "inbox.sec_oracle_glitch.title",
      descKey: "inbox.sec_oracle_glitch.desc",
      gen: () => ({ repSkim: ri(0, 2), repDeep: ri(1, 3), brandDeep: ri(0, 2) }),
      choices: [
        {
          labelKey: "inbox.choice.skim",
          primary: true,
          tone: "info",
          apply: (stt, p) => {
            adjustAfterAction(stt, { reputation: p.repSkim, mood: -1 });
            log(stt, t(stt, "inbox.log.smallImpact", { rep: p.repSkim }), "info");
          },
        },
        {
          labelKey: "inbox.choice.deepDive",
          tone: "good",
          apply: (stt, p) => {
            adjustAfterAction(stt, { reputation: p.repDeep, brand: p.brandDeep, mood: -2, stamina: -1 });
            log(stt, t(stt, "inbox.log.deepDive", { rep: p.repDeep, brand: p.brandDeep }), "good");
          },
        },
        {
          labelKey: "inbox.choice.postThread",
          tone: "info",
          apply: (stt) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(10, 18)), 0, 100);
            adjustAfterAction(stt, { brand: +2, mood: -1 });
            log(stt, t(stt, "inbox.log.threadShort"), "info");
          },
        },
      ],
    },
    {
      id: "sec_upgrade_admin_key",
      kind: "security",
      titleKey: "inbox.sec_upgrade_admin_key.title",
      descKey: "inbox.sec_upgrade_admin_key.desc",
      gen: () => ({ comp: ri(0, 2), rep: ri(0, 1) }),
      choices: [
        {
          labelKey: "inbox.choice.checkControls",
          primary: true,
          tone: "info",
          apply: (stt, p) => {
            adjustAfterAction(stt, { compliance: -p.comp, stamina: -1 });
            log(stt, t(stt, "inbox.log.check", { comp: p.comp }), "info");
          },
        },
        {
          labelKey: "inbox.choice.writePolicy",
          tone: "good",
          apply: (stt, p) => {
            adjustAfterAction(stt, { compliance: -p.comp, reputation: p.rep, writing: +1, mood: -1 });
            log(stt, t(stt, "inbox.log.policy", { rep: p.rep, comp: p.comp }), "good");
          },
        },
        {
          labelKey: "inbox.choice.ignoreSilently",
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.ignoreSilently"), "info");
          },
        },
      ],
    },
    {
      id: "sec_reentrancy_meme",
      kind: "meme",
      titleKey: "inbox.sec_reentrancy_meme.title",
      descKey: "inbox.sec_reentrancy_meme.desc",
      choices: [
        {
          labelKey: "inbox.choice.laugh",
          primary: true,
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.read"), "info");
          },
        },
        {
          labelKey: "inbox.choice.postThread",
          tone: "info",
          apply: (stt) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(10, 18)), 0, 100);
            adjustAfterAction(stt, { brand: +1, reputation: +1, mood: -1 });
            log(stt, t(stt, "inbox.log.threadShort"), "info");
          },
        },
        {
          labelKey: "inbox.choice.saveToNotes",
          tone: "good",
          apply: (stt) => {
            adjustAfterAction(stt, { skill: +1 });
            log(stt, t(stt, "inbox.log.savedNotes"), "good");
          },
        },
      ],
    },
    {
      id: "market_airdrop_farm",
      kind: "market",
      titleKey: "inbox.market_airdrop_farm.title",
      descKey: "inbox.market_airdrop_farm.desc",
      gen: () => ({ cashLite: ri(0, 900), cashHard: ri(600, 2600) }),
      choices: [
        {
          labelKey: "inbox.choice.farmLite",
          primary: true,
          tone: "info",
          apply: (stt, p) => {
            adjustAfterAction(stt, { cash: p.cashLite, stamina: -1 });
            if (!stt.progress) stt.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
            stt.progress.earnedTotal = (stt.progress.earnedTotal || 0) + Math.max(0, p.cashLite);
            log(stt, t(stt, "inbox.log.airdrop", { cash: p.cashLite }), "info");
          },
        },
        {
          labelKey: "inbox.choice.farmHard",
          tone: "good",
          apply: (stt, p) => {
            adjustAfterAction(stt, { cash: p.cashHard, stamina: -2, mood: -1 });
            if (!stt.progress) stt.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
            stt.progress.earnedTotal = (stt.progress.earnedTotal || 0) + Math.max(0, p.cashHard);
            // 偶尔带点灰度：合规风险小升（女巫/脚本/灰色地带）
            if (Math.random() < 0.35) adjustAfterAction(stt, { compliance: +1 });
            log(stt, t(stt, "inbox.log.airdrop", { cash: p.cashHard }), "good");
          },
        },
        {
          labelKey: "inbox.choice.skip",
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.skip"), "info");
          },
        },
      ],
    },
    {
      id: "social_tg_scam",
      kind: "social",
      titleKey: "inbox.social_tg_scam.title",
      descKey: "inbox.social_tg_scam.desc",
      gen: () => ({ loss: ri(500, 3200) }),
      choices: [
        {
          labelKey: "inbox.choice.reportScam",
          primary: true,
          tone: "good",
          apply: (stt) => {
            adjustAfterAction(stt, { reputation: +1, compliance: -1, mood: +1 });
            log(stt, t(stt, "inbox.log.scam.avoid"), "good");
          },
        },
        {
          labelKey: "inbox.choice.clickLink",
          tone: "bad",
          apply: (stt, p) => {
            // 小概率你很谨慎没损失；否则掉钱掉心态
            const ok = Math.random() < clamp(0.10 + (stt.stats.tooling || 30) / 260, 0.08, 0.35);
            if (ok) {
              adjustAfterAction(stt, { reputation: +1, mood: +0 });
              log(stt, t(stt, "inbox.log.scam.avoid"), "good");
              return;
            }
            adjustAfterAction(stt, { cash: -p.loss, mood: -2, compliance: +1 });
            log(stt, t(stt, "inbox.log.scam.loss", { loss: p.loss }), "warn");
          },
        },
        {
          labelKey: "inbox.choice.ignore",
          tone: "info",
          apply: (stt) => {
            log(stt, t(stt, "inbox.log.ignored"), "info");
          },
        },
      ],
    },
    {
      id: "sec_l2_sequencer_down",
      kind: "security",
      titleKey: "inbox.sec_l2_sequencer_down.title",
      descKey: "inbox.sec_l2_sequencer_down.desc",
      gen: () => ({ rep: ri(0, 2), brand: ri(0, 3) }),
      choices: [
        {
          labelKey: "inbox.choice.postThread",
          primary: true,
          tone: "info",
          apply: (stt, p) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(10, 18)), 0, 100);
            adjustAfterAction(stt, { reputation: p.rep, brand: p.brand, mood: -1 });
            log(stt, t(stt, "inbox.log.thread", { rep: p.rep, brand: p.brand }), "info");
          },
        },
        {
          labelKey: "inbox.choice.waitForMore",
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.wait"), "info");
          },
        },
        {
          labelKey: "inbox.choice.deepDive",
          tone: "good",
          apply: (stt) => {
            adjustAfterAction(stt, { reputation: +1, brand: +1, stamina: -1, mood: -1 });
            log(stt, t(stt, "inbox.log.deepDive", { rep: 1, brand: 1 }), "good");
          },
        },
      ],
    },
    {
      id: "meme_gas_golf",
      kind: "meme",
      titleKey: "inbox.meme_gas_golf.title",
      descKey: "inbox.meme_gas_golf.desc",
      choices: [
        {
          labelKey: "inbox.choice.facepalm",
          primary: true,
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.read"), "info");
          },
        },
        {
          labelKey: "inbox.choice.commentCodeReview",
          tone: "good",
          apply: (stt) => {
            adjustAfterAction(stt, { reputation: +1, mood: -1 });
            log(stt, t(stt, "inbox.log.codeReview"), "good");
          },
        },
        {
          labelKey: "inbox.choice.quote",
          tone: "info",
          apply: (stt) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(6, 12)), 0, 100);
            adjustAfterAction(stt, { brand: +1 });
            log(stt, t(stt, "inbox.log.quote"), "info");
          },
        },
      ],
    },
    {
      id: "sec_signature_malleability",
      kind: "security",
      titleKey: "inbox.sec_signature_malleability.title",
      descKey: "inbox.sec_signature_malleability.desc",
      gen: (s) => ({ inc: clamp(Math.round(1 + (s.stats.tooling || 30) / 40), 1, 3), rep: ri(0, 1) }),
      choices: [
        {
          labelKey: "inbox.choice.learn",
          primary: true,
          tone: "good",
          apply: (stt, p) => {
            adjustAfterAction(stt, { tooling: p.inc, mood: -1 });
            log(stt, t(stt, "inbox.log.learn", { inc: p.inc }), "info");
          },
        },
        {
          labelKey: "inbox.choice.writeMiniNote",
          tone: "info",
          apply: (stt, p) => {
            adjustAfterAction(stt, { tooling: +1, reputation: p.rep, writing: +1, mood: -1 });
            log(stt, t(stt, "inbox.log.miniNote", { rep: p.rep }), "info");
          },
        },
        {
          labelKey: "inbox.choice.ignore",
          tone: "info",
          apply: (stt) => {
            log(stt, t(stt, "inbox.log.ignored"), "info");
          },
        },
      ],
    },
    // ===== 扩充：更多种类/梗 =====
    {
      id: "market_stable_depeg",
      kind: "market",
      titleKey: "inbox.market_stable_depeg.title",
      descKey: "inbox.market_stable_depeg.desc",
      gen: () => ({ cash: ri(0, 1800) }),
      choices: [
        {
          labelKey: "inbox.choice.waitForMore",
          primary: true,
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.wait"), "info");
          },
        },
        {
          labelKey: "inbox.choice.postThread",
          tone: "info",
          apply: (stt) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(10, 18)), 0, 100);
            adjustAfterAction(stt, { brand: +1, mood: -1 });
            log(stt, t(stt, "inbox.log.threadShort"), "info");
          },
        },
        {
          labelKey: "inbox.choice.farmLite",
          tone: "warn",
          apply: (stt, p) => {
            adjustAfterAction(stt, { cash: p.cash, mood: -1, stamina: -1, compliance: +1 });
            if (!stt.progress) stt.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
            stt.progress.earnedTotal = (stt.progress.earnedTotal || 0) + Math.max(0, p.cash);
            log(stt, t(stt, "inbox.log.airdrop", { cash: p.cash }), "warn");
          },
        },
      ],
    },
    {
      id: "social_discord_drama",
      kind: "social",
      titleKey: "inbox.social_discord_drama.title",
      descKey: "inbox.social_discord_drama.desc",
      choices: [
        {
          labelKey: "inbox.choice.ignoreSilently",
          primary: true,
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.ignoreSilently"), "info");
          },
        },
        {
          labelKey: "inbox.choice.postThread",
          tone: "info",
          apply: (stt) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(10, 18)), 0, 100);
            const ok = Math.random() < 0.45;
            if (ok) {
              adjustAfterAction(stt, { reputation: +1, brand: +1, mood: -1 });
              log(stt, t(stt, "inbox.log.threadShort"), "info");
            } else {
              adjustAfterAction(stt, { reputation: -1, brand: -1, mood: -2 });
              log(stt, t(stt, "log.action.blog.fail", { rep: -1, brand: -1, mood: -2, compliance: 0 }), "warn");
            }
          },
        },
        {
          labelKey: "inbox.choice.writeChecklist",
          tone: "good",
          apply: (stt) => {
            adjustAfterAction(stt, { comms: +1, writing: +1, mood: -1 });
            log(stt, t(stt, "inbox.log.checklist"), "good");
          },
        },
      ],
    },
    {
      id: "meme_wagmi_ngmi",
      kind: "meme",
      titleKey: "inbox.meme_wagmi_ngmi.title",
      descKey: "inbox.meme_wagmi_ngmi.desc",
      choices: [
        {
          labelKey: "inbox.choice.laugh",
          primary: true,
          tone: "info",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            log(stt, t(stt, "inbox.log.read"), "info");
          },
        },
        {
          labelKey: "inbox.choice.quote",
          tone: "info",
          apply: (stt) => {
            if (!stt.world) stt.world = {};
            stt.world.xHeat = clamp(Math.round((stt.world.xHeat ?? 0) + ri(6, 12)), 0, 100);
            adjustAfterAction(stt, { brand: +1 });
            log(stt, t(stt, "inbox.log.quote"), "info");
          },
        },
        {
          labelKey: "inbox.choice.saveToNotes",
          tone: "good",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1, stamina: +1 });
            log(stt, t(stt, "inbox.log.savedNotes"), "good");
          },
        },
      ],
    },
  ];
}

export function seedEventInbox(state) {
  if (!state.inbox) state.inbox = { items: [] };
  if (!Array.isArray(state.inbox.items)) state.inbox.items = [];

  // 清理过期：按 totalWeeks 近似计算（每周推进一次即可）
  const nowY = state.now?.year ?? 1;
  const nowW = state.now?.week ?? 1;
  const ageWeeks = (it) => (nowY - it.created.year) * 52 + (nowW - it.created.week);
  state.inbox.items = state.inbox.items.filter((it) => ageWeeks(it) <= (it.expiresInWeeks ?? 2));

  // 每周生成 3~5 条“可选事件”，并尽量保证种类多样（至少 meme + security）
  const want = ri(3, 5);
  const defs = inboxDefs();
  const byKind = {
    meme: defs.filter((d) => d.kind === "meme"),
    security: defs.filter((d) => d.kind === "security"),
    market: defs.filter((d) => d.kind === "market"),
    social: defs.filter((d) => d.kind === "social"),
  };

  /** @param {any} d */
  const addOne = (d) => {
    if (!d) return false;
    // 避免同周重复
    if (state.inbox.items.some((x) => x.def === d.id && x.created?.year === nowY && x.created?.week === nowW)) return false;
    const payload = d.gen ? d.gen(state) : {};
    state.inbox.items.unshift({
      id: `I_${Date.now()}_${ri(100, 999)}`,
      def: d.id,
      created: { year: nowY, week: nowW },
      expiresInWeeks: d.expiresInWeeks ?? 2,
      payload,
    });
    return true;
  };

  let added = 0;
  // 先保证 meme + security
  if (addOne(pick(byKind.security))) added += 1;
  if (added < want && addOne(pick(byKind.meme))) added += 1;
  // 再按概率补 market/social，最后随机补齐
  if (added < want && Math.random() < 0.65 && addOne(pick(byKind.market))) added += 1;
  if (added < want && Math.random() < 0.65 && addOne(pick(byKind.social))) added += 1;

  const pool = defs.sort(() => Math.random() - 0.5);
  for (const d of pool) {
    if (added >= want) break;
    if (addOne(d)) added += 1;
  }
  state.inbox.items = state.inbox.items.slice(0, 30);
}

