import { clamp, ri } from "./utils.js?v=33";
import { adjustAfterAction, healthCap, log, spendAP } from "./state.js?v=33";

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
      title: "日报/周报地狱",
      when: (s) => {
        if (!(s.employment?.employed && s.employment.companyType === "exchange")) return false;
        if ((s.employment.politics ?? 0) <= 45) return false;
        // YH（抽象）更容易触发
        const p = s.employment.companyKey === "yh" ? 0.42 : 0.18;
        return Math.random() < p;
      },
      desc: () => `主管：“每天日报、每周周报，字数要够，体现加班和产出。年终就看这个。”`,
      choices: () => [
        {
          label: "讲真话写（认真但费时）",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: -1, stamina: -1 });
            stt.stats.writing = clamp(stt.stats.writing + 1, 0, 100);
            stt.employment.performance = clamp((stt.employment.performance || 50) + 1, 0, 100);
            if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
            log(stt, `你写了份“讲人话”的周报：有用但不讨喜。`, "info");
          },
        },
        {
          label: "用 KPI 语言写（向上管理）",
          apply: (stt) => {
            const ok = Math.random() < clamp(0.35 + stt.stats.comms / 220 + stt.stats.writing / 260, 0.15, 0.75);
            adjustAfterAction(stt, { mood: -1 });
            if (ok) {
              stt.employment.performance = clamp((stt.employment.performance || 50) + 2, 0, 100);
              stt.employment.trust = clamp((stt.employment.trust || 50) + 1, 0, 100);
              if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
              log(stt, `你把工作翻译成了 KPI 语言：上面很满意。`, "good");
            } else {
              stt.employment.politics = clamp((stt.employment.politics || 20) + 4, 0, 100);
              if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
              log(stt, `你写得太“实诚”，被说“不够积极”。`, "warn");
            }
          },
        },
      ],
    },
    {
      id: "exchange_postmortem_blame",
      title: "复盘会：找背锅的人",
      when: (s) =>
        s.employment?.employed &&
        s.employment.companyType === "exchange" &&
        (s.employment.manager?.toxicity ?? 0) > 55 &&
        (s.majorIncident?.active || Math.random() < (s.employment.companyKey === "yh" ? 0.22 : 0.08)),
      desc: () => `你隐约感觉：这场复盘不太像“找 root cause”，更像“找一个人背锅”。`,
      choices: () => [
        {
          label: "整理证据链（自保）",
          apply: (stt) => {
            // 直接花“精力/心态”模拟准备成本
            adjustAfterAction(stt, { mood: -1, stamina: -1 });
            const ok = Math.random() < clamp(0.40 + stt.stats.writing / 240 + stt.stats.comms / 240, 0.15, 0.80);
            if (ok) {
              stt.employment.trust = clamp((stt.employment.trust || 50) + 2, 0, 100);
              stt.employment.politics = clamp((stt.employment.politics || 20) - 3, 0, 100);
              if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
              log(stt, `你用证据对抗叙事：这次没人敢把锅扣你头上。`, "good");
            } else {
              stt.employment.performance = clamp((stt.employment.performance || 50) - 4, 0, 100);
              if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
              log(stt, `你准备不够充分：会议上被反复追问，气氛很差。`, "warn");
            }
          },
        },
        {
          label: "背锅换平静（短期）",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1 });
            stt.employment.performance = clamp((stt.employment.performance || 50) - 6, 0, 100);
            stt.employment.politics = clamp((stt.employment.politics || 20) + 6, 0, 100);
            if (stt.employment?.companyKey === "yh") stt.employment.yhToxicTriggered = true;
            log(stt, `你把锅背了：会议很快结束，但你知道这会变成“习惯”。`, "bad");
          },
        },
      ],
    },
    {
      id: "scope_creep",
      title: "范围蔓延",
      when: (s) => s.active.direct.length > 0 && Math.random() < 0.35,
      desc: () => `客户：“顺便把另一个仓库也看一下吧？不多，就一点点。”`,
      choices: () => [
        {
          label: "明确边界：加钱/延时（沟通）",
          apply: (stt) => {
            const up = ri(3, 7);
            stt.stats.comms = clamp(stt.stats.comms + 1, 0, 100);
            stt.stats.reputation = clamp(stt.stats.reputation + 1, 0, 100);
            // 经济缩放：变更费在几百量级
            stt.stats.cash += up * 80;
            if (!stt.progress) stt.progress = { noOrderWeeks: 0, totalWeeks: 0, earnedTotal: 0, findingsTotal: 0 };
            stt.progress.earnedTotal = (stt.progress.earnedTotal || 0) + Math.max(0, up * 80);
            log(stt, `你把范围钉死了，还顺手谈到了一点“变更费用”。`, "good");
          },
        },
        {
          label: "先做了再说（加班）",
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -8, mood: -4 });
            const p = stt.active.direct[0];
            if (p) p.scope = clamp(p.scope + ri(6, 12), 0, 120);
            log(stt, `你默默加班把活接了，心里开始泛酸。`, "warn");
          },
        },
      ],
    },
    {
      id: "endorsement",
      title: "背书式审计请求",
      when: (s) => s.active.direct.length > 0 && Math.random() < 0.22,
      desc: () => `客户希望你在公告里写：“已由顶级审计师全面审计，绝对安全”。`,
      choices: () => [
        {
          label: "拒绝夸大（合规优先）",
          apply: (stt) => {
            adjustAfterAction(stt, { compliance: -2, reputation: +1, mood: -1 });
            log(stt, `你坚持写了克制的表述：只陈述范围与发现。`, "good");
          },
        },
        {
          label: "含糊其辞（埋雷）",
          apply: (stt) => {
            // 经济缩放：小额“感谢费”
            adjustAfterAction(stt, { compliance: +6, cash: +350, mood: +1 });
            log(stt, `你写了句“基本安全”，收到了一点额外“感谢费”。`, "warn");
          },
        },
      ],
    },
    {
      id: "platform_rejudge",
      title: "平台评审降级风波",
      when: (s) => s.active.platform.length > 0 && Math.random() < 0.30,
      desc: () => `评审：你这条高危看起来更像中危。你要不要申诉补材料？`,
      choices: () => [
        {
          label: "补充 PoC/影响面（消耗行动点）",
          apply: (stt) => {
            if (!spendAP(stt, 1)) {
              log(stt, `你想申诉，但本周行动点已经见底。`, "bad");
              return;
            }
            const win = Math.random() < clamp(0.35 + stt.stats.writing / 220 + stt.stats.skill / 260, 0.15, 0.7);
            if (win) {
              adjustAfterAction(stt, { platformRating: +2, reputation: +1, mood: +1 });
              log(stt, `申诉成功：评审接受了你的补充材料。`, "good");
            } else {
              adjustAfterAction(stt, { mood: -2 });
              log(stt, `申诉失败：评审表示“感谢参与”。`, "warn");
            }
          },
        },
        {
          label: "算了，继续找洞",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: -1 });
            log(stt, `你决定把时间留给更确定的产出。`, "info");
          },
        },
      ],
    },
    {
      id: "burnout",
      title: "透支警告",
      when: (s) => s.stats.stamina <= Math.round(healthCap(s) * 0.28) && Math.random() < 0.65,
      desc: () => `你开始靠咖啡续命，代码在晃，世界也在晃。`,
      choices: () => [
        {
          label: "强制休息一周",
          apply: (stt) => {
            stt.ap.now = 0;
            const c = healthCap(stt);
            adjustAfterAction(stt, { stamina: Math.round(c * 0.14), mood: Math.round(c * 0.10), reputation: -1 });
            log(stt, `你选择停一停：项目进度慢了点，但你活下来了。`, "good");
          },
        },
        {
          label: "继续硬扛（风险↑）",
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -8, mood: -6, compliance: +2 });
            log(stt, `你硬扛下去：产出也许没变，但你变脆了。`, "bad");
          },
        },
      ],
    },
    {
      id: "bear",
      title: "市场转冷",
      when: () => Math.random() < 0.18,
      desc: () => `熊市气息蔓延，客户压价、缩范围，平台竞赛也更卷了。`,
      choices: () => [
        {
          label: "降本增效（工具链/流程）",
          apply: (stt) => {
            // 经济缩放：工具/流程升级的支出
            adjustAfterAction(stt, { tooling: +2, cash: -800, mood: -1 });
            log(stt, `你花钱上了更顺手的工具/流程，效率更稳。`, "info");
          },
        },
        {
          label: "去平台冲奖金",
          apply: (stt) => {
            adjustAfterAction(stt, { platformRating: +1, mood: -1 });
            log(stt, `你决定把一部分精力转去平台赛道。`, "info");
          },
        },
      ],
    },
    {
      id: "bull",
      title: "牛市开闸",
      when: (s) => Math.random() < 0.13 && s.stats.reputation >= 10,
      desc: () => `链上热钱回来了：新项目扎堆，大家都想“尽快上线”。`,
      choices: () => [
        {
          label: "趁势涨价（直客优先）",
          apply: (stt) => {
            // 经济缩放：牛市小幅加价带来的额外现金流
            adjustAfterAction(stt, { reputation: +1, cash: +650, mood: +2 });
            log(stt, `你把报价抬了抬，客户居然还说“行”。`, "good");
          },
        },
        {
          label: "开公开课引流（社区优先）",
          apply: (stt) => {
            adjustAfterAction(stt, { reputation: +3, network: +2, stamina: -2 });
            log(stt, `你连发三条科普：点赞很多，精力也被吸走一些。`, "info");
          },
        },
      ],
    },
    {
      id: "payment_delay",
      title: "尾款拖延",
      when: (s) => s.active.direct.length > 0 && Math.random() < 0.2,
      desc: () => `客户财务：“流程有点慢，下周一定打。”`,
      choices: () => [
        {
          label: "发正式催款函（法务/合规）",
          apply: (stt) => {
            adjustAfterAction(stt, { compliance: -2, mood: -1, reputation: +1 });
            log(stt, `你把流程写得很清楚：对方也不敢再装死。`, "info");
          },
        },
        {
          label: "先相信一次（心态）",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: -2 });
            log(stt, `你选择等等：希望别把“拖延”当成习惯。`, "warn");
          },
        },
      ],
    },
    {
      id: "platform_dup_wave",
      title: "去重海啸",
      when: (s) => s.active.platform.length > 0 && Math.random() < 0.22,
      desc: () => `平台公告：本场竞赛重复提交率异常高，去重会更严格。`,
      choices: () => [
        {
          label: "立刻转攻冷门模块（策略）",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: -1 });
            log(stt, `你改了打法：不拼速度，拼深度。`, "info");
          },
        },
        {
          label: "继续冲热门点位（硬刚）",
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -3, mood: -2, platformRating: +1 });
            log(stt, `你决定硬刚：成败都看这一波。`, "warn");
          },
        },
      ],
    },
    {
      id: "health",
      title: "小病来袭",
      when: (s) => s.stats.stamina < Math.round(healthCap(s) * 0.45) && Math.random() < 0.18,
      desc: () => `你嗓子开始疼，脑子像在加载 2G 网。`,
      choices: () => [
        {
          label: "买药+睡觉（休息）",
          apply: (stt) => {
            const c = healthCap(stt);
            adjustAfterAction(stt, { cash: -300, stamina: Math.round(c * 0.08), mood: Math.round(c * 0.05) });
            log(stt, `你终于像个人类一样照顾自己了。`, "good");
          },
        },
        {
          label: "喝咖啡硬顶（风险）",
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -6, mood: -2 });
            log(stt, `咖啡把你推上去，又把你摔下来。`, "bad");
          },
        },
      ],
    },
    {
      id: "exploit_rumor",
      title: "爆雷传闻",
      when: (s) => s.active.direct.length === 0 && Math.random() < 0.14 && s.stats.reputation > 15,
      desc: () => `社区里有人在传：“某项目审计没看出来，真能行吗？”（你被点名）`,
      choices: () => [
        {
          label: "公开解释（写作+沟通）",
          apply: (stt) => {
            const ok = Math.random() < clamp(0.4 + stt.stats.writing / 220 + stt.stats.comms / 220, 0.15, 0.75);
            if (ok) {
              adjustAfterAction(stt, { reputation: +2, mood: +1 });
              log(stt, `你把范围、方法与限制讲清楚了，舆情缓和。`, "good");
            } else {
              adjustAfterAction(stt, { reputation: -2, mood: -2 });
              log(stt, `解释没打动人，反而引来更多阴阳怪气。`, "warn");
            }
          },
        },
        {
          label: "装死（心态优先）",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +1, reputation: -1 });
            log(stt, `你选择不回：今天的网络，不值得。`, "info");
          },
        },
      ],
    },
    // 兜底事件：确保“保底计数器”能真正生效（即使其它事件条件都没满足）
    {
      id: "ambient_ping",
      title: "小插曲",
      when: () => true,
      desc: () => `没什么大事发生，但生活总会来点小波动：一条消息、一次误会、或一阵突然的疲惫。`,
      choices: () => [
        {
          label: "刷会儿时间线，缓一下",
          apply: (stt) => {
            adjustAfterAction(stt, { mood: +2 });
            log(stt, `你随手刷了会儿时间线：心态稍微回了点。`, "info");
          },
        },
        {
          label: "继续干活（当没发生）",
          apply: (stt) => {
            adjustAfterAction(stt, { stamina: -1 });
            log(stt, `你选择继续干：小事别影响节奏。`, "info");
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
      title: "上级“阿里味”发作",
      when: () => true,
      desc: () => `你刚入职不久，就感受到一股熟悉的“阿里味”：周报 KPI、复盘背锅、向上管理……总得先来一拳。`,
      choices: () => [
        {
          label: "先忍（保住饭碗）",
          primary: true,
          apply: (stt) => {
            stt.employment.yhToxicTriggered = true;
            adjustAfterAction(stt, { mood: -2, stamina: -2 });
            stt.employment.politics = clamp((stt.employment.politics || 20) + 6, 0, 100);
            log(stt, `你选择先忍：嘴上说“收到”，心里说“我草”。`, "warn");
          },
        },
        {
          label: "硬刚讲道理（高风险）",
          apply: (stt) => {
            stt.employment.yhToxicTriggered = true;
            const ok = Math.random() < clamp(0.25 + stt.stats.comms / 260, 0.08, 0.55);
            adjustAfterAction(stt, { mood: -2, stamina: -1 });
            if (ok) {
              stt.employment.trust = clamp((stt.employment.trust || 50) + 2, 0, 100);
              log(stt, `你这次说服了对方：暂时没再追着你喷。`, "good");
            } else {
              stt.employment.performance = clamp((stt.employment.performance || 50) - 4, 0, 100);
              stt.employment.politics = clamp((stt.employment.politics || 20) + 10, 0, 100);
              log(stt, `你被贴上了“难管/不配合”的标签：接下来会更难受。`, "bad");
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

