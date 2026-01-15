import { clamp, ri } from "./utils.js?v=37";
import { adjustAfterAction, healthCap, log, spendAP } from "./state.js?v=37";
import { t } from "./i18n.js?v=37";

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
    // 兜底事件：确保“保底计数器”能真正生效（即使其它事件条件都没满足）
    {
      id: "ambient_ping",
      title: t(state, "event.ambient_ping.title"),
      when: () => true,
      desc: (s) => t(s, "event.ambient_ping.desc"),
      choices: () => [
        {
          label: t(state, "event.ambient_ping.choice.scroll"),
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
    },
  ];

  // 事件数量：目标频率 ≈ 每 2~3 周 1 次（并加“保底”：连续 2 周没出，第 3 周必出 1 个）
  const baseChance = 0.38; // ~ 2.6 周一次
  const baseCount = pity >= 2 || Math.random() < baseChance ? 1 : 0;
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
  // 更新保底计数器：本周无事件则 +1，否则归零
  if (state.world) {
    state.world.eventPityWeeks = picked.length > 0 ? 0 : clamp(pity + 1, 0, 99);
  }
  return picked;
}

