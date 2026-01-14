/* Web3 Auditor 模拟器（纯前端，无依赖）
 * - 状态保存在 localStorage
 * - 按周推进：行动点 -> 项目进度 -> 事件 -> 市场刷新
 */

(() => {
  const STORAGE_KEY = "web3_auditor_sim_v1";

  /** @type {HTMLElement} */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rnd = (a, b) => Math.random() * (b - a) + a;
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (arr) => arr[ri(0, arr.length - 1)];
  const money = (n) => `¥${Math.round(n).toLocaleString("zh-CN")}`;

  const PROTOCOLS = [
    { key: "erc20", name: "ERC20/代币经济", diff: 22 },
    { key: "dex", name: "AMM/DEX", diff: 35 },
    { key: "lending", name: "借贷协议", diff: 42 },
    { key: "bridge", name: "跨链桥", diff: 55 },
    { key: "perp", name: "衍生品/永续", diff: 48 },
    { key: "aa", name: "账户抽象/钱包", diff: 40 },
    { key: "rollup", name: "Rollup/链级系统", diff: 62 },
  ];

  const DIRECT_CLIENTS = [
    "某 DeFi 初创团队",
    "某 VC 投后项目",
    "某交易所孵化项目",
    "某老牌 Web2 团队转型",
    "匿名资方支持的神秘项目",
    "朋友转介绍的“靠谱”项目",
  ];

  const PLATFORM_NAMES = ["Sherlock（抽象）", "Code4rena（抽象）", "Cantina（抽象）"];

  function defaultState() {
    const s = {
      version: 1,
      now: { year: 1, week: 1 },
      player: {
        name: "马某某·审计师",
        title: "自由审计师（从零开荒）",
      },
      stats: {
        skill: 38,
        comms: 36,
        writing: 33,
        tooling: 30,
        stamina: 70,
        mood: 72,
        cash: 120000,
        reputation: 12,
        compliance: 6,
        network: 18,
        platformRating: 8,
      },
      // 现实生活：你可以选择本周“正常上班”还是“加班爆肝”
      schedule: { hoursPerDay: 8, locked: false },
      ap: { max: 0, now: 0 },
      market: {
        direct: [],
        platform: [],
      },
      active: {
        direct: [], // at most 2
        platform: [], // at most 1
      },
      selectedTarget: null, // {kind:'direct'|'platform', id:string}
      log: [],
      flags: {
        tutorialShown: false,
        startFilled: false, // v0.2.1: 新档开局是否已补满行动点（避免反复补满）
        gameOver: null, // { kind:'lose'|'win', title:string, reason:string }
      },
      progress: {
        noOrderWeeks: 0,
        totalWeeks: 0,
      },
    };
    // 新档开局给满行动点（否则旧默认值会导致显示为 4/5 之类的“半管”）
    s.ap.max = computeWeeklyAPMax(s);
    s.ap.now = s.ap.max;
    seedMarket(s, true);
    log(s, `欢迎来到 Web3 审计圈。第 1 年第 1 周，你的“审计生涯”开始了。`);
    return s;
  }

  /** @param {any} state */
  function normalizeState(state) {
    // 老存档兼容：补齐新字段，避免 undefined
    if (!state.schedule) state.schedule = { hoursPerDay: 8, locked: false };
    if (typeof state.schedule.hoursPerDay !== "number") state.schedule.hoursPerDay = 8;
    state.schedule.hoursPerDay = clamp(Math.round(state.schedule.hoursPerDay), 6, 24);
    if (typeof state.schedule.locked !== "boolean") state.schedule.locked = false;
    if (!state.flags) state.flags = { tutorialShown: false, startFilled: false, gameOver: null };
    if (typeof state.flags.startFilled !== "boolean") state.flags.startFilled = false;
    return state;
  }

  /** @param {any} state */
  function computeWeeklyAPMax(state) {
    const { stamina, mood } = state.stats;
    const h = clamp(Math.round(state.schedule?.hoursPerDay ?? 8), 6, 24);
    // 现实手感：工时越长，本周可投入的“时间块”越多；但状态差会明显缩水
    // 8h/天 ≈ 5AP；12h/天 ≈ 8AP；22h/天 ≈ 14AP；24h/天 ≈ 15AP
    const base = clamp(Math.round((h / 8) * 5), 4, 15);
    const bonus = (stamina >= 75 ? 1 : 0) + (mood >= 75 ? 1 : 0);
    const penalty = (stamina <= 25 ? 1 : 0) + (mood <= 25 ? 1 : 0);
    return clamp(base + bonus - penalty, 3, 16);
  }

  function refreshAP(state) {
    state.ap.max = computeWeeklyAPMax(state);
    state.ap.now = clamp(state.ap.now, 0, state.ap.max);
  }

  function spendAP(state, n) {
    if (state.ap.now < n) return false;
    state.ap.now -= n;
    return true;
  }

  function gainAP(state, n) {
    state.ap.now = clamp(state.ap.now + n, 0, state.ap.max);
  }

  function weekLabel(state) {
    return `第 ${state.now.year} 年 · 第 ${state.now.week} 周`;
  }

  function log(state, text, tone = "info") {
    state.log.unshift({
      id: `log_${Date.now()}_${ri(1000, 9999)}`,
      t: weekLabel(state),
      tone,
      text,
    });
    state.log = state.log.slice(0, 120);
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function resetStorage() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function severityPoints(sev) {
    if (sev === "S") return 10;
    if (sev === "H") return 6;
    if (sev === "M") return 3;
    if (sev === "L") return 1;
    return 0;
  }

  function protocolDiff(protocolKey) {
    return (PROTOCOLS.find((x) => x.key === protocolKey) || PROTOCOLS[0]).diff;
  }

  // 项目复杂度（影响动作消耗与推进速度）
  function complexityTier(project) {
    const diff = protocolDiff(project.protocol);
    const scope = project.scope || 0;
    const score = scope + diff * 1.2;
    if (score <= 65) return 1; // 简单
    if (score <= 120) return 2; // 中等
    return 3; // 复杂
  }

  function actionCost(state, actionKey, target) {
    // 非项目相关动作固定成本
    if (!target) {
      if (actionKey === "model") return 3;
      if (actionKey === "audit") return 2;
      if (actionKey === "write") return 1;
      return 1;
    }
    const tier = complexityTier(target);
    const backlog = target.kind === "direct" ? (target.found?.length || 0) : (target.submissions?.filter((x) => x.status === "draft" || x.status === "submitted").length || 0);

    if (actionKey === "audit") return tier === 1 ? 1 : tier === 2 ? 2 : 3;
    if (actionKey === "model") return tier === 1 ? 2 : tier === 2 ? 3 : 4;
    if (actionKey === "retest") return Math.max(1, (tier === 1 ? 1 : tier === 2 ? 2 : 3) - 1);
    if (actionKey === "write") return backlog >= 10 || tier === 3 ? 2 : 1;
    // comms/submit/blog/learn/rest/compliance
    return 1;
  }

  function writeProgressInc(stats, target) {
    const base = Math.round(6 + stats.writing / 10);
    if (!target) return base;
    const tier = complexityTier(target);
    const scope = target.scope || 0;
    const backlog = target.kind === "direct" ? (target.found?.length || 0) : (target.submissions?.length || 0);
    // 漏洞少/范围小 => 写得快；复杂/堆积多 => 写得慢
    const speed =
      clamp(
        1.25 - backlog * 0.06 - scope * 0.003 + (tier === 1 ? 0.12 : tier === 3 ? -0.12 : 0),
        0.45,
        1.35
      );
    return clamp(Math.round(base * speed), 3, 18);
  }

  function makeVulnPool(protocolKey, scope) {
    const p = PROTOCOLS.find((x) => x.key === protocolKey) || PROTOCOLS[0];
    const diff = p.diff + scope * 0.4;
    const severe = clamp(Math.round(rnd(0, diff / 40)), 0, 3);
    const high = clamp(Math.round(rnd(1, diff / 22)), 1, 6);
    const medium = clamp(Math.round(rnd(2, diff / 14)), 2, 10);
    const low = clamp(Math.round(rnd(2, diff / 10)), 2, 14);
    return { S: severe, H: high, M: medium, L: low };
  }

  function makeDirectOrder(state) {
    const proto = pick(PROTOCOLS);
    const scope = ri(18, 80);
    const deadline = ri(2, 5);
    const cooperation = ri(35, 85);
    const adversary = ri(15, 75);
    const baseFee = 60000 + scope * 1800 + proto.diff * 500;
    const rush = deadline <= 2 ? 1.25 : 1;
    const fee = Math.round(baseFee * rush);

    return {
      id: `D_${Date.now()}_${ri(100, 999)}`,
      kind: "direct",
      title: `${pick(DIRECT_CLIENTS)}：${proto.name}`,
      protocol: proto.key,
      scope,
      deadlineWeeks: deadline,
      cooperation,
      adversary,
      fee,
      notes: deadline <= 2 ? "加急交付，漏报风险上升。" : "常规节奏，可做复测与范围管理。",
    };
  }

  function makePlatformContest(state) {
    const proto = pick(PROTOCOLS);
    const scope = ri(20, 90);
    const duration = ri(1, 3);
    const popularity = ri(30, 95);
    const prizePool = Math.round(120000 + scope * 2400 + popularity * 2200);
    const platform = pick(PLATFORM_NAMES);

    return {
      id: `P_${Date.now()}_${ri(100, 999)}`,
      kind: "platform",
      platform,
      title: `${platform}：${proto.name} 竞赛`,
      protocol: proto.key,
      scope,
      deadlineWeeks: duration,
      popularity,
      prizePool,
      notes:
        popularity >= 75
          ? "热度爆表：去重撞车高发，评审更严格。"
          : "中等热度：拼深度与写作，申诉也能翻盘。",
    };
  }

  function seedMarket(state, fresh = false) {
    const nDirect = 4;
    const nPlat = 3;
    if (fresh) {
      state.market.direct = [];
      state.market.platform = [];
    }
    while (state.market.direct.length < nDirect) state.market.direct.push(makeDirectOrder(state));
    while (state.market.platform.length < nPlat) state.market.platform.push(makePlatformContest(state));
  }

  function ensureSelection(state) {
    if (!state.selectedTarget) {
      const d = state.active.direct[0];
      const p = state.active.platform[0];
      if (d) state.selectedTarget = { kind: "direct", id: d.id };
      else if (p) state.selectedTarget = { kind: "platform", id: p.id };
    }
  }

  function findTarget(state, kind, id) {
    const list = kind === "direct" ? state.active.direct : state.active.platform;
    return list.find((x) => x.id === id) || null;
  }

  function activateDirect(state, order) {
    if (state.active.direct.length >= 2) return { ok: false, msg: "你同时最多推进 2 个直客项目。" };
    const project = {
      ...order,
      stage: "active",
      coverage: 0,
      report: { draft: 0, delivered: false },
      // v0.2: 更贴近真实交付
      fixRate: clamp(Math.round(rnd(35, 75) + (order.cooperation - 50) * 0.35), 0, 100), // 客户修复意愿/效率
      shipUrgency: clamp(ri(25, 90) + (order.deadlineWeeks <= 2 ? 8 : 0), 0, 100), // 上线冲动
      retestScore: 0, // 复测/跟进程度（降低扯皮与翻车）
      pool: makeVulnPool(order.protocol, order.scope),
      found: [], // {id, sev, points, status}
      undiscovered: null,
    };
    project.undiscovered = { ...project.pool };
    state.active.direct.push(project);
    state.market.direct = state.market.direct.filter((x) => x.id !== order.id);
    state.stats.cash += Math.round(order.fee * 0.2); // 定金
    state.stats.compliance = clamp(state.stats.compliance + (order.scope > 70 ? 1 : 0), 0, 100);
    log(state, `接下直客项目《${order.title}》，收到定金 ${money(order.fee * 0.2)}。`);
    ensureSelection(state);
    return { ok: true };
  }

  function activatePlatform(state, contest) {
    if (state.active.platform.length >= 1) return { ok: false, msg: "你本周只能同时参加 1 场平台竞赛。" };
    const project = {
      ...contest,
      stage: "active",
      coverage: 0,
      evidence: 0, // v0.2: 补材料/复现质量（影响通过率）
      submissions: [], // {id, sev, points, status:'draft'|'submitted'|'accepted'|'duplicated'|'rejected'}
      pool: makeVulnPool(contest.protocol, contest.scope),
      undiscovered: null,
    };
    project.undiscovered = { ...project.pool };
    state.active.platform.push(project);
    state.market.platform = state.market.platform.filter((x) => x.id !== contest.id);
    log(state, `报名平台竞赛《${contest.title}》，倒计时 ${contest.deadlineWeeks} 周。`);
    ensureSelection(state);
    return { ok: true };
  }

  function adjustAfterAction(state, delta) {
    // delta: { stamina, mood, cash, reputation, compliance, network, platformRating }
    const keys = Object.keys(delta);
    for (const k of keys) {
      state.stats[k] = clamp(state.stats[k] + delta[k], 0, k === "cash" ? 999999999 : 100);
    }
    refreshAP(state);
  }

  function discover(state, project, mode) {
    // mode: 'audit'|'model'|'retest'
    const st = state.stats;
    const scopePenalty = project.scope / 140;
    const deadlinePenalty = project.deadlineWeeks <= 1 ? 0.15 : project.deadlineWeeks <= 2 ? 0.08 : 0;
    const fatiguePenalty = st.stamina < 35 ? 0.10 : 0;
    const base = 0.22 + (st.skill + st.tooling) / 260 - scopePenalty - deadlinePenalty - fatiguePenalty;
    const p = clamp(base + (mode === "model" ? 0.08 : 0) + (mode === "retest" ? 0.04 : 0), 0.06, 0.60);

    // v0.2: 平台竞赛如果“老是 0 产出”会很无聊；给平台 audit/model 一个更稳定的尝试次数
    let rolls = mode === "audit" ? ri(0, 2) : mode === "model" ? ri(0, 2) : ri(0, 1);
    if (project.kind === "platform" && (mode === "audit" || mode === "model")) {
      rolls = ri(1, 2);
    }
    const found = [];

    for (let i = 0; i < rolls; i++) {
      if (Math.random() > p) continue;

      // 严重性权重：默认更容易出中低；建模更容易出高危
      const wS = mode === "model" ? 0.10 : 0.05;
      const wH = mode === "model" ? 0.22 : 0.14;
      const wM = 0.40;
      const wL = 0.28;
      const r = Math.random();
      const sev =
        r < wS ? "S" : r < wS + wH ? "H" : r < wS + wH + wM ? "M" : "L";

      if ((project.undiscovered?.[sev] || 0) <= 0) continue;
      project.undiscovered[sev] -= 1;

      const item = {
        id: `F_${Date.now()}_${ri(100, 999)}`,
        sev,
        points: severityPoints(sev),
        status: project.kind === "platform" ? "draft" : "found",
      };
      found.push(item);
      if (project.kind === "platform") project.submissions.push(item);
      else project.found.push(item);
    }

    return found;
  }

  function coverageGain(state, project, mode) {
    const st = state.stats;
    const skill = st.skill / 100;
    const tooling = st.tooling / 100;
    const stamina = st.stamina / 100;
    const base = mode === "audit" ? 14 : mode === "model" ? 9 : 8;
    const tier = complexityTier(project);
    const tierMul = tier === 1 ? 1.15 : tier === 3 ? 0.9 : 1;
    const gain = base * tierMul * (0.7 + skill * 0.8 + tooling * 0.6) * (0.7 + stamina * 0.6) * (1 - project.scope / 220);
    return clamp(Math.round(gain), 3, mode === "audit" ? 18 : 14);
  }

  function doAction(state, actionKey) {
    const ACTIONS = {
      audit: { name: "审计代码", cost: 2 },
      // 建模/推理更“烧脑”，通常比跑一遍审计更贵
      model: { name: "手工推理/建模", cost: 3 },
      // 写报告：成本与推进会按“漏洞堆积/复杂度”动态变化
      write: { name: "写报告/整理", cost: 1 },
      retest: { name: "复测/二次审计", cost: 1 },
      comms: { name: "客户沟通/范围管理", cost: 1 },
      submit: { name: "提交 finding", cost: 1 },
      blog: { name: "写科普/发动态", cost: 1 },
      learn: { name: "学习/训练", cost: 1 },
      rest: { name: "休息/运动", cost: 1 },
      compliance: { name: "合规/法务", cost: 1 },
    };

    const meta = ACTIONS[actionKey];
    if (!meta) return;

    ensureSelection(state);
    const target = state.selectedTarget ? findTarget(state, state.selectedTarget.kind, state.selectedTarget.id) : null;

    const cost = actionCost(state, actionKey, target);
    if (!spendAP(state, cost)) {
      toast(`行动点不够：需要 ${cost} 点。`);
      return;
    }

    if ((actionKey === "audit" || actionKey === "model" || actionKey === "write" || actionKey === "retest" || actionKey === "comms" || actionKey === "submit") && !target) {
      toast("你还没有进行中的项目/竞赛。先去接单或报名吧。");
      gainAP(state, cost);
      return;
    }

    const st = state.stats;
    let didWork = false;

    if (actionKey === "audit" || actionKey === "model" || actionKey === "retest") {
      const gain = coverageGain(state, target, actionKey === "audit" ? "audit" : actionKey === "model" ? "model" : "retest");
      target.coverage = clamp(target.coverage + gain, 0, 100);

      const found = discover(state, target, actionKey === "audit" ? "audit" : actionKey === "model" ? "model" : "retest");
      const sevText = found.length ? found.map((x) => x.sev).join("") : "";

      // 代价
      const tier = complexityTier(target);
      const fatigue = actionKey === "model" ? -6 - (tier - 1) : -5 - (tier - 1);
      const moodCost = actionKey === "model" ? -3 - (tier - 1) : -2 - (tier - 1);
      adjustAfterAction(state, { stamina: fatigue, mood: moodCost });

      if (target.kind === "platform") {
        log(
          state,
          `投入《${target.title}》：${meta.name}（覆盖率+${gain}）${found.length ? `，产出草稿 finding ${found.length} 条（${sevText}）` : "，暂未产出有效 finding" }。`
        );
      } else {
        if (actionKey === "retest") {
          target.retestScore = clamp((target.retestScore || 0) + 12, 0, 100);
        }
        log(
          state,
          `推进《${target.title}》：${meta.name}（覆盖率+${gain}）${found.length ? `，发现漏洞 ${found.length} 条（${sevText}）` : "，暂未发现新问题" }。`
        );
      }
      didWork = true;
    }

    if (actionKey === "write") {
      const inc = writeProgressInc(st, target);
      if (target.kind === "direct") {
        target.report.draft = clamp(target.report.draft + inc, 0, 100);
        const tier = complexityTier(target);
        adjustAfterAction(state, { stamina: -2 - (tier - 1), mood: -1 });
        log(state, `整理《${target.title}》报告（进度+${inc}）。`);
      } else {
        // v0.2: 平台写作=补材料/复现质量（evidence）提升，通过率更“可解释”
        target.evidence = clamp((target.evidence || 0) + inc, 0, 100);
        target.coverage = clamp(target.coverage + 1, 0, 100);
        const tier = complexityTier(target);
        adjustAfterAction(state, { stamina: -2 - (tier - 1), mood: -1 });
        log(state, `为《${target.title}》补充描述/复现（证据值+${inc}）。`);
      }
      didWork = true;
    }

    if (actionKey === "submit") {
      if (target.kind !== "platform") {
        toast("提交 finding 仅适用于平台竞赛。");
        gainAP(state, cost);
        return;
      }
      const drafts = target.submissions.filter((x) => x.status === "draft");
      if (drafts.length === 0) {
        toast("你当前没有草稿 finding 可提交。");
        gainAP(state, cost);
        return;
      }
      const submitCap = clamp(1 + Math.floor(st.writing / 40), 1, 3);
      const n = Math.min(submitCap, drafts.length);
      for (let i = 0; i < n; i++) drafts[i].status = "submitted";
      adjustAfterAction(state, { mood: -1 });
      log(state, `向平台提交 finding ${n} 条（进入评审/去重池）。`);
      didWork = true;
    }

    if (actionKey === "comms") {
      if (target.kind === "direct") {
        const up = Math.round(6 + st.comms / 10);
        target.cooperation = clamp(target.cooperation + up, 0, 100);
        target.fixRate = clamp((target.fixRate ?? 50) + Math.round(up * 0.6), 0, 100);
        adjustAfterAction(state, { mood: -1, stamina: -1 });
        log(state, `与客户沟通《${target.title}》范围与修复节奏（配合度+${up}，修复率↑）。`);
      } else {
        // 平台：申诉/沟通偏少
        adjustAfterAction(state, { mood: -1 });
        log(state, `在《${target.title}》评论区与评审讨论（心理波动+1）。`);
      }
      didWork = true;
    }

    if (actionKey === "blog") {
      const rep = ri(1, 3) + (st.writing > 55 ? 1 : 0);
      const net = ri(0, 2) + (st.comms > 55 ? 1 : 0);
      adjustAfterAction(state, { reputation: rep, network: net, mood: +1, stamina: -1 });
      log(state, `发了一篇安全科普小作文（声望+${rep}，关系网+${net}）。`);
      didWork = true;
    }

    if (actionKey === "learn") {
      const k = pick(["skill", "tooling", "writing", "comms"]);
      const inc = ri(1, 3);
      adjustAfterAction(state, { [k]: inc, stamina: -1, mood: -1 });
      log(state, `抽时间学习训练：${labelOfStat(k)} +${inc}。`);
      didWork = true;
    }

    if (actionKey === "rest") {
      const sta = ri(6, 10);
      const mood = ri(5, 9);
      adjustAfterAction(state, { stamina: sta, mood });
      log(state, `休息回血（精力+${sta}，心态+${mood}）。`, "good");
      didWork = true;
    }

    if (actionKey === "compliance") {
      const down = ri(3, 7);
      adjustAfterAction(state, { compliance: -down, mood: -1 });
      log(state, `做了一轮合规/法务自查（合规风险-${down}）。`);
      didWork = true;
    }

    // 工时锁定规则：由「本周是否已消耗行动点」决定（见 render/bind），避免状态不同步
  }

  function labelOfStat(k) {
    const map = {
      skill: "审计能力",
      comms: "沟通能力",
      writing: "写作能力",
      tooling: "工具链",
      stamina: "精力",
      mood: "心态",
      cash: "现金",
      reputation: "声望",
      compliance: "合规风险",
      network: "关系网",
      platformRating: "平台评级",
    };
    return map[k] || k;
  }

  function toast(text) {
    openModal({
      title: "提示",
      body: `<div>${escapeHtml(text)}</div>`,
      actions: [{ label: "知道了", kind: "primary", onClick: closeModal }],
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function openModal({ title, body, actions }) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    const host = $("#modalActions");
    host.innerHTML = "";
    for (const a of actions || []) {
      const btn = document.createElement("button");
      btn.className = `btn ${a.kind === "primary" ? "btn--primary" : ""}`;
      btn.textContent = a.label;
      btn.addEventListener("click", () => a.onClick?.());
      host.appendChild(btn);
    }
    $("#modal").classList.remove("is-hidden");
  }

  function closeModal() {
    $("#modal").classList.add("is-hidden");
  }

  function endWeek(state) {
    if (state.flags.gameOver) return;
    // 1) 自动结算项目（deadline、交付、爆雷风险挂起）
    settleProjects(state);

    // 2) 触发事件（0~2）
    const events = rollEvents(state);
    if (events.length) {
      // 用 modal 串行展示事件选择
      playEventsSequentially(state, events, () => {
        // 3) 推进时间 & 刷新市场 & 恢复行动点
        advanceWeek(state);
        checkEndings(state);
        render(state);
      });
      return;
    }

    advanceWeek(state);
    checkEndings(state);
    render(state);
  }

  function advanceWeek(state) {
    // 上周工时的“现实代价”：加班=更累；躺平=恢复更多
    const h = clamp(Math.round(state.schedule?.hoursPerDay ?? 8), 6, 24);
    state.now.week += 1;
    if (state.now.week > 52) {
      state.now.week = 1;
      state.now.year += 1;
      log(state, `新的一年开始了。你活下来了。`, "good");
    }

    // 市场刷新：补齐到固定数量
    seedMarket(state, false);

    // 每周自然恢复少量（但不超过上限）
    adjustAfterAction(state, { stamina: +2, mood: +1 });
    if (h > 8) {
      // 非线性损耗：越接近“不睡觉”，代价越夸张（22/24 接近毁灭）
      const t = h - 8;
      let sta = Math.round(t * 1.2 + (t * t) / 8);
      let md = Math.round(t * 0.7 + (t * t) / 14);
      if (h >= 22) {
        sta += 6;
        md += 3;
      }
      if (h >= 24) {
        sta += 8;
        md += 4;
      }
      adjustAfterAction(state, { stamina: -sta, mood: -md });
    }
    if (h < 8) adjustAfterAction(state, { stamina: +(8 - h), mood: Math.round((8 - h) / 2) });
    refreshAP(state);
    state.ap.now = state.ap.max; // 每周开局满行动点，符合“周推进”节奏

    // 统计：连续无订单周数（不含进行中的项目）
    const hasActive = state.active.direct.length > 0 || state.active.platform.length > 0;
    if (!hasActive) state.progress.noOrderWeeks += 1;
    else state.progress.noOrderWeeks = 0;
    state.progress.totalWeeks += 1;

    // 轻微的市场波动：现金压力越大，心态越容易掉
    if (state.stats.cash < 40000) adjustAfterAction(state, { mood: -2 });
    if (state.stats.compliance > 70) adjustAfterAction(state, { mood: -2 });

    log(state, `进入 ${weekLabel(state)}。行动点已恢复。`);
  }

  function checkEndings(state) {
    if (state.flags.gameOver) return;
    const s = state.stats;

    // 失败条件（MVP）
    if (s.cash < 0) return triggerEnd(state, "lose", "资金链断裂", "现金为负，无法维持开销。");
    if (s.stamina <= 0) return triggerEnd(state, "lose", "身心崩溃", "精力归零：你连 IDE 都不想打开了。");
    if (s.mood <= 0) return triggerEnd(state, "lose", "精神崩溃", "心态归零：你选择退网，世界清净。");
    if (s.compliance >= 100) return triggerEnd(state, "lose", "监管介入", "合规风险爆表：你决定暂时离开这个圈子。");
    if (s.reputation <= 0 && state.progress.noOrderWeeks >= 8) {
      return triggerEnd(state, "lose", "声望归零", "连续 8 周没有订单，市场把你忘了。");
    }

    // 简单胜利条件（可继续游玩）
    const win1 = s.reputation >= 90 && s.compliance < 20 && s.cash >= 800000;
    const win2 = s.platformRating >= 70 && s.reputation >= 60 && s.compliance < 35;
    if (win1) return triggerEnd(state, "win", "合伙人结局", "你建立了稳定的品牌与交付体系，成为行业“常青树”。");
    if (win2) return triggerEnd(state, "win", "平台封神结局", "你在平台赛道冲到前排，名字被写进邀请名单。");
  }

  function triggerEnd(state, kind, title, reason) {
    state.flags.gameOver = { kind, title, reason };
    log(state, `【${title}】${reason}`, kind === "win" ? "good" : "bad");
    openModal({
      title,
      body: `<div>${escapeHtml(reason)}</div><div style="margin-top:10px;" class="muted">你可以重置存档重新开始，或关闭弹窗查看时间线。</div>`,
      actions: [
        { label: "关闭", onClick: closeModal },
        {
          label: "重置并重开",
          kind: "primary",
          onClick: () => {
            closeModal();
            resetStorage();
            const fresh = defaultState();
            Object.assign(state, fresh);
            refreshAP(state);
            state.ap.now = state.ap.max; // 新档/重置后开局满行动点
            save(state);
            render(state);
            switchTab("workbench");
          },
        },
      ],
    });
  }

  function settleProjects(state) {
    // 直客
    for (const p of [...state.active.direct]) {
      p.deadlineWeeks -= 1;

      // deadline 到了：交付 & 收款 & 声望
      if (p.deadlineWeeks <= 0 && !p.report.delivered) {
        // v0.2: 报告没写完，客户不收（强制延期）
        const reportScore = clamp(p.report?.draft ?? 0, 0, 100);
        if (reportScore < 50) {
          p.deadlineWeeks = 1;
          adjustAfterAction(state, { mood: -2 });
          log(state, `直客《${p.title}》：客户表示“报告先写完再交付”，项目被迫延期 1 周（报告进度 ${reportScore}%）。`, "warn");
          continue;
        }

        const outcome = deliverDirect(state, p);
        p.report.delivered = true;
        p.stage = "done";
        state.active.direct = state.active.direct.filter((x) => x.id !== p.id);
        log(state, outcome.text, outcome.tone);
      }
    }

    // 平台
    for (const c of [...state.active.platform]) {
      c.deadlineWeeks -= 1;
      if (c.deadlineWeeks <= 0) {
        const outcome = finishContest(state, c);
        c.stage = "done";
        state.active.platform = state.active.platform.filter((x) => x.id !== c.id);
        log(state, outcome.text, outcome.tone);
      }
    }

    // 交付后的“潜在爆雷”：如果你漏了 S/H，并且项目热度高，下周可能爆
    // MVP：直接用一次小概率事件挂在 rollEvents 里（见事件池）。
  }

  function deliverDirect(state, p) {
    const st = state.stats;
    const foundPts = p.found.reduce((acc, x) => acc + x.points, 0);
    const undisS = p.undiscovered?.S || 0;
    const undisH = p.undiscovered?.H || 0;

    // 报告进度会显著影响交付观感（否则“没写报告也能交付”的体验不合理）
    const reportScore = clamp(p.report?.draft ?? 0, 0, 100);
    const reportPenalty = reportScore < 35 ? 10 : reportScore < 55 ? 4 : 0;

    // v0.2: 修复率/上线冲动会显著影响交付与后续风险
    const fixRate = clamp(p.fixRate ?? 50, 0, 100);
    const shipUrgency = clamp(p.shipUrgency ?? 50, 0, 100);
    const fixPenalty = fixRate < 35 ? 10 : fixRate < 55 ? 4 : 0;
    const rushPenalty = shipUrgency > 80 ? 6 : shipUrgency > 65 ? 3 : 0;
    const retestScore = clamp(p.retestScore ?? 0, 0, 100);

    const quality =
      0.40 * st.writing +
      0.30 * st.comms +
      0.25 * reportScore +
      0.35 * clamp(foundPts * 6, 0, 100) +
      0.20 * p.coverage -
      (st.stamina < 25 ? 8 : 0) -
      reportPenalty -
      fixPenalty -
      rushPenalty;

    const sat = clamp(quality + (p.cooperation - 50) * 0.25, 0, 120);
    const repDelta = Math.round((sat - 60) / 12);

    // 付款：基础尾款 + 质量加成
    const tail = p.fee * 0.8;
    const bonus = sat >= 85 ? p.fee * 0.10 : sat <= 40 ? -p.fee * 0.08 : 0;
    const payout = Math.round(tail + bonus);
    state.stats.cash += payout;
    state.stats.reputation = clamp(state.stats.reputation + repDelta, 0, 100);

    // 爆雷风险：漏了 S/H 会加合规风险与声望波动（不立即爆，但埋雷）
    const baseRisk = undisS * 18 + undisH * 8;
    const risk = baseRisk * (1 - retestScore / 100) * (1 + shipUrgency / 220) * (1 + (60 - fixRate) / 180);
    if (risk >= 18) state.stats.compliance = clamp(state.stats.compliance + ri(1, 4), 0, 100);

    const sevLeft = undisS + undisH > 0 ? `（漏报疑云：S×${undisS} H×${undisH}）` : "";
    const reportLeft = reportScore < 55 ? `（报告进度 ${reportScore}%）` : "";
    const fixLeft = fixRate < 55 ? `（修复率 ${fixRate}%）` : "";
    const tone = repDelta >= 1 ? "good" : repDelta <= -1 ? "bad" : "info";
    const text = `直客交付《${p.title}》，尾款到账 ${money(payout)}，声望${repDelta >= 0 ? "+" : ""}${repDelta} ${sevLeft} ${reportLeft} ${fixLeft}`.trim();
    return { text, tone };
  }

  function finishContest(state, c) {
    const st = state.stats;
    const submitted = c.submissions.filter((x) => x.status === "submitted");
    const draftsLeft = c.submissions.filter((x) => x.status === "draft").length;
    let acceptedPts = 0;
    let duplicated = 0;
    let rejected = 0;

    const writingBonus = st.writing / 100;
    const skillBonus = st.skill / 100;
    const toolBonus = st.tooling / 100;
    const rating = st.platformRating / 100;
    const evidence = clamp(c.evidence ?? 0, 0, 100) / 100;

    const dupBase = clamp(c.popularity / 140 - rating / 3, 0.08, 0.62);
    const rejectBase = clamp(0.18 - writingBonus * 0.12 - skillBonus * 0.05 - evidence * 0.10, 0.05, 0.30);

    for (const s of submitted) {
      const dup = Math.random() < dupBase;
      const rej = !dup && Math.random() < rejectBase;
      if (dup) {
        s.status = "duplicated";
        duplicated += 1;
      } else if (rej) {
        s.status = "rejected";
        rejected += 1;
      } else {
        s.status = "accepted";
        acceptedPts += s.points;
      }
    }

    // 简化的奖金：受 score 与热度影响；评分高也会提高“分蛋糕”概率
    const score = acceptedPts * (0.75 + skillBonus * 0.35 + toolBonus * 0.25);
    // 修复：没有任何有效通过（acceptedPts=0）时，不应该凭空获得奖金
    const shareRaw = score <= 0 ? 0 : score / (score + rnd(25, 95) + c.popularity / 2);
    const share = clamp(shareRaw, 0, 0.45);
    const payout = score <= 0 ? 0 : Math.round(c.prizePool * share);

    state.stats.cash += payout;
    // 修复：没通过时不应该“白涨平台评级”；失败/去重/驳回会扣分
    const ratingDeltaRaw =
      submitted.length === 0
        ? 0
        : acceptedPts > 0
          ? 1 + acceptedPts / 6 - duplicated / 2 - rejected / 3
          : -1 - duplicated / 2 - rejected / 2;
    const ratingDelta = clamp(Math.round(ratingDeltaRaw), -6, 6);
    state.stats.platformRating = clamp(state.stats.platformRating + ratingDelta, 0, 100);
    const repDeltaRaw =
      acceptedPts > 0
        ? acceptedPts / 6 - rejected / 2
        : submitted.length > 0
          ? -1 - rejected / 2
          : 0;
    const repDelta = clamp(Math.round(repDeltaRaw), -6, 6);
    state.stats.reputation = clamp(state.stats.reputation + repDelta, 0, 100);

    const tone = acceptedPts >= 10 ? "good" : acceptedPts === 0 ? "bad" : "info";
    const note = draftsLeft > 0 ? `（未提交 ${draftsLeft} 条作废）` : "";
    const text = `平台结算《${c.title}》：提交 ${submitted.length} 条，通过 ${acceptedPts} 分，去重 ${duplicated}，驳回 ${rejected}；奖金 ${money(payout)}，平台评级${ratingDelta >= 0 ? "+" : ""}${ratingDelta}。${note}`;
    return { text, tone };
  }

  function rollEvents(state) {
    const st = state.stats;
    const activeDirect = state.active.direct.length;
    const activePlat = state.active.platform.length;

    /** @type {{id:string,title:string,desc:(s:any)=>string,when:(s:any)=>boolean,choices:(s:any)=>any[]}[]} */
    const POOL = [
      {
        id: "scope_creep",
        title: "范围蔓延",
        when: (s) => s.active.direct.length > 0 && Math.random() < 0.35,
        desc: (s) => `客户：“顺便把另一个仓库也看一下吧？不多，就一点点。”`,
        choices: (s) => [
          {
            label: "明确边界：加钱/延时（沟通）",
            apply: (stt) => {
              const up = ri(3, 7);
              stt.stats.comms = clamp(stt.stats.comms + 1, 0, 100);
              stt.stats.reputation = clamp(stt.stats.reputation + 1, 0, 100);
              stt.stats.cash += up * 2000;
              log(stt, `你把范围钉死了，还顺手谈到了一点“变更费用”。`, "good");
            },
          },
          {
            label: "先做了再说（加班）",
            apply: (stt) => {
              adjustAfterAction(stt, { stamina: -8, mood: -4 });
              // 把一个直客 scope 小幅抬升（更难）
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
              adjustAfterAction(stt, { compliance: +6, cash: +8000, mood: +1 });
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
              const win = Math.random() < clamp(0.35 + stt.stats.writing / 220 + stt.stats.skill / 260, 0.15, 0.70);
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
        when: (s) => s.stats.stamina <= 28 && Math.random() < 0.65,
        desc: () => `你开始靠咖啡续命，代码在晃，世界也在晃。`,
        choices: () => [
          {
            label: "强制休息一周",
            apply: (stt) => {
              stt.ap.now = 0;
              adjustAfterAction(stt, { stamina: +18, mood: +12, reputation: -1 });
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
        when: (s) => Math.random() < 0.18,
        desc: () => `熊市气息蔓延，客户压价、缩范围，平台竞赛也更卷了。`,
        choices: () => [
          {
            label: "降本增效（工具链/流程）",
            apply: (stt) => {
              adjustAfterAction(stt, { tooling: +2, cash: -12000, mood: -1 });
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
              adjustAfterAction(stt, { reputation: +1, cash: +12000, mood: +2 });
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
        when: (s) => s.active.direct.length > 0 && Math.random() < 0.20,
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
        when: (s) => s.stats.stamina < 45 && Math.random() < 0.18,
        desc: () => `你嗓子开始疼，脑子像在加载 2G 网。`,
        choices: () => [
          {
            label: "买药+睡觉（休息）",
            apply: (stt) => {
              adjustAfterAction(stt, { cash: -300, stamina: +10, mood: +6 });
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
              const ok = Math.random() < clamp(0.40 + stt.stats.writing / 220 + stt.stats.comms / 220, 0.15, 0.75);
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
    ];

    // 事件数量：默认不要太频繁（大多数周都在“干活”）
    // - 正常状态：约 20% 概率出 1 个事件
    // - 状态差：额外再给 0~1 个事件的概率
    const baseCount = Math.random() < 0.20 ? 1 : 0;
    const extra = st.mood < 35 || st.stamina < 35 ? (Math.random() < 0.30 ? 1 : 0) : 0;
    const want = clamp(baseCount + extra, 0, 2);

    const picked = [];
    const shuffled = [...POOL].sort(() => Math.random() - 0.5);
    for (const e of shuffled) {
      if (picked.length >= want) break;
      if (e.when(state)) picked.push(e);
    }
    return picked;
  }

  function playEventsSequentially(state, events, done) {
    const next = () => {
      if (!events.length) return done?.();
      const e = events.shift();
      openModal({
        title: e.title,
        body: `<div>${escapeHtml(e.desc(state))}</div>`,
        actions: e.choices(state).map((c) => ({
          label: c.label,
          kind: c.primary ? "primary" : undefined,
          onClick: () => {
            closeModal();
            c.apply(state);
            render(state);
            next();
          },
        })),
      });
    };
    next();
  }

  function render(state) {
    normalizeState(state);
    $("#timeLabel").textContent = weekLabel(state);
    $("#playerName").textContent = state.player.name;
    $("#playerTitle").textContent = state.player.title;

    refreshAP(state);
    $("#apNow").textContent = String(state.ap.now);
    $("#apMax").textContent = String(state.ap.max);
    const sel = $("#hoursPerDay");
    if (sel) {
      const lockedByWork = state.ap.now < state.ap.max; // 已消耗行动点=本周已开工
      sel.value = String(clamp(Math.round(state.schedule?.hoursPerDay ?? 8), 6, 24));
      sel.disabled = Boolean(state.flags.gameOver) || lockedByWork;
      sel.title = lockedByWork ? "本周已开始行动，工时已锁定（下周可改）。" : "选择本周工时（影响行动点上限，周末会更累）。";
    }

    renderStats(state);
    renderActions(state);
    renderTargets(state);
    renderMarket(state);
    renderLog(state);

    save(state);
  }

  function statBar(n) {
    const v = clamp(Math.round(n), 0, 100);
    return `<div class="bar"><i style="width:${v}%"></i></div>`;
  }

  function toneChip(label, tone) {
    const cls = tone === "good" ? "chip chip--good" : tone === "warn" ? "chip chip--warn" : tone === "bad" ? "chip chip--bad" : "chip";
    return `<span class="${cls}">${escapeHtml(label)}</span>`;
  }

  function renderStats(state) {
    const s = state.stats;
    const items = [
      ["精力", s.stamina, "stamina"],
      ["心态", s.mood, "mood"],
      ["审计能力", s.skill, "skill"],
      ["工具链", s.tooling, "tooling"],
      ["写作能力", s.writing, "writing"],
      ["沟通能力", s.comms, "comms"],
      ["声望", s.reputation, "reputation"],
      ["平台评级", s.platformRating, "platformRating"],
      ["合规风险", s.compliance, "compliance"],
    ];

    $("#stats").innerHTML =
      items
        .map(([label, val, key]) => {
          const valText = key === "compliance" ? `${val}/100` : `${val}/100`;
          return `
          <div class="stat">
            <div class="stat__row">
              <div class="stat__label">${escapeHtml(label)}</div>
              <div class="stat__value">${valText}</div>
            </div>
            ${statBar(val)}
          </div>`;
        })
        .join("") +
      `
      <div class="divider"></div>
      <div class="kvs">
        <div class="kv"><div class="kv__k">现金</div><div class="kv__v">${money(s.cash)}</div></div>
        <div class="kv"><div class="kv__k">关系网</div><div class="kv__v">${s.network}/100</div></div>
      </div>
    `;
  }

  function renderActions(state) {
    const isOver = Boolean(state.flags.gameOver);
    ensureSelection(state);
    const target = state.selectedTarget ? findTarget(state, state.selectedTarget.kind, state.selectedTarget.id) : null;

    const actions = [
      { key: "audit", label: "🧪 审计代码", hint: "覆盖率↑，有概率发现漏洞；简单项目更省点更快" },
      { key: "model", label: "🧠 推理/建模", hint: "更容易挖到高危；复杂项目更烧脑更费点" },
      { key: "write", label: "📝 写报告/整理", hint: "漏洞少/范围小=写得快；堆积多/复杂=更慢更费点" },
      { key: "retest", label: "🔁 复测", hint: "降低上线后翻车概率（复杂项目需要更多跟进）" },
      { key: "comms", label: "📞 沟通/范围", hint: "直客配合度↑，修复率↑" },
      { key: "submit", label: "📮 提交 finding", hint: "平台：把草稿提交到评审/去重池（不提交=不结算）" },
      { key: "blog", label: "📣 发动态", hint: "声望↑ 关系网↑（也可能引来舆情）" },
      { key: "learn", label: "📚 学习", hint: "随机属性小幅成长" },
      { key: "rest", label: "💆 休息", hint: "精力/心态恢复" },
      { key: "compliance", label: "⚖️ 合规", hint: "合规风险下降（短期不赚钱）" },
    ].map((a) => ({ ...a, cost: actionCost(state, a.key, target) }));

    $("#actions").innerHTML = actions
      .map(
        (a) => `
        <button class="btn" data-action="${a.key}" ${isOver || state.ap.now < a.cost ? "disabled" : ""} title="${escapeHtml(a.hint)}">
          ${escapeHtml(a.label)} <span class="muted">(-${a.cost})</span>
        </button>`
      )
      .join("");
  }

  function renderTargets(state) {
    ensureSelection(state);
    const sel = state.selectedTarget;
    const d = state.active.direct;
    const p = state.active.platform;

    const card = (proj) => {
      const chips = [];
      chips.push(`<span class="chip">${proj.kind === "direct" ? "直客" : "平台"}</span>`);
      chips.push(`<span class="chip">${escapeHtml((PROTOCOLS.find((x) => x.key === proj.protocol) || PROTOCOLS[0]).name)}</span>`);
      chips.push(`<span class="chip">${proj.deadlineWeeks} 周</span>`);
      if (proj.kind === "direct") chips.push(`<span class="chip">${money(proj.fee)}</span>`);
      else chips.push(`<span class="chip">${money(proj.prizePool)}</span>`);

      let line = "";
      if (proj.kind === "direct") {
        const fixRate = clamp(proj.fixRate ?? 50, 0, 100);
        const shipUrgency = clamp(proj.shipUrgency ?? 50, 0, 100);
        const retestScore = clamp(proj.retestScore ?? 0, 0, 100);
        line = `覆盖率：${proj.coverage}% ｜ 报告：${clamp(proj.report?.draft ?? 0, 0, 100)}% ｜ 修复率：${fixRate}% ｜ 上线冲动：${shipUrgency}% ｜ 复测：${retestScore}%`;
      } else {
        const drafts = proj.submissions.filter((x) => x.status === "draft");
        const submitted = proj.submissions.filter((x) => x.status === "submitted");
        const submittedPts = submitted.reduce((a, x) => a + x.points, 0);
        const evidence = clamp(proj.evidence ?? 0, 0, 100);
        line = `覆盖率：${proj.coverage}% ｜ 草稿：${drafts.length} 条 ｜ 已提交：${submitted.length} 条（${submittedPts} 分）｜ 证据值：${evidence}%`;
      }

      return `
        <div class="item">
          <div class="item__top">
            <div>
              <div class="item__title">${escapeHtml(proj.title)}</div>
              <div class="muted" style="margin-top:6px;">${escapeHtml(line)}</div>
            </div>
            <div class="chips">
              ${chips.join("")}
            </div>
          </div>
          <div class="item__actions">
            <button class="btn" data-select="${proj.kind}:${proj.id}">设为当前目标</button>
          </div>
        </div>
      `;
    };

    let html = "";
    if (!d.length && !p.length) {
      html = `<div class="muted">你目前没有进行中的项目。去「直客订单」或「平台竞赛」接一个吧。</div>`;
    } else {
      html += `<div class="list">`;
      for (const x of d) html += card(x);
      for (const x of p) html += card(x);
      html += `</div>`;
    }

    if (sel) {
      const target = findTarget(state, sel.kind, sel.id);
      if (target) {
        html =
          `<div class="muted" style="margin-bottom:10px;">当前选择：<b>${escapeHtml(target.title)}</b></div>` + html;
      }
    }

    $("#activeTarget").innerHTML = html;
  }

  function renderMarket(state) {
    // Market lists
    $("#directMarket").innerHTML = state.market.direct.map((o) => renderMarketCard(state, o)).join("");
    $("#platformMarket").innerHTML = state.market.platform.map((o) => renderMarketCard(state, o)).join("");

    $("#directActive").innerHTML =
      state.active.direct.length === 0
        ? `<div class="muted">暂无。</div>`
        : state.active.direct.map((p) => renderActiveCard(state, p)).join("");

    $("#platformActive").innerHTML =
      state.active.platform.length === 0
        ? `<div class="muted">暂无。</div>`
        : state.active.platform.map((p) => renderActiveCard(state, p)).join("");
  }

  function renderMarketCard(state, o) {
    const protoName = (PROTOCOLS.find((x) => x.key === o.protocol) || PROTOCOLS[0]).name;
    const chips = [];
    chips.push(`<span class="chip">${protoName}</span>`);
    chips.push(`<span class="chip">范围 ${o.scope}</span>`);
    chips.push(`<span class="chip">${o.deadlineWeeks} 周</span>`);
    if (o.kind === "direct") {
      chips.push(`<span class="chip chip--good">${money(o.fee)}</span>`);
      chips.push(`<span class="chip ${o.cooperation >= 70 ? "chip--good" : o.cooperation <= 45 ? "chip--warn" : ""}">配合 ${o.cooperation}</span>`);
      chips.push(`<span class="chip ${o.deadlineWeeks <= 2 ? "chip--warn" : ""}">加急 ${o.deadlineWeeks <= 2 ? "是" : "否"}</span>`);
    } else {
      chips.push(`<span class="chip chip--good">${money(o.prizePool)}</span>`);
      chips.push(`<span class="chip ${o.popularity >= 75 ? "chip--warn" : ""}">热度 ${o.popularity}</span>`);
    }

    const bodyLines = [];
    bodyLines.push(o.notes);
    if (o.kind === "direct") bodyLines.push(`风险提示：黑客关注度 ${o.adversary}/100。`);
    else bodyLines.push(`提示：参赛人数越多，去重撞车概率越大。`);

    return `
      <div class="item">
        <div class="item__top">
          <div class="item__title">${escapeHtml(o.title)}</div>
          <div class="chips">${chips.join("")}</div>
        </div>
        <div class="item__body">${bodyLines.map(escapeHtml).join("<br/>")}</div>
        <div class="item__actions">
          <button class="btn btn--primary" data-accept="${o.kind}:${o.id}">${o.kind === "direct" ? "接单" : "报名"}</button>
        </div>
      </div>
    `;
  }

  function renderActiveCard(state, p) {
    const protoName = (PROTOCOLS.find((x) => x.key === p.protocol) || PROTOCOLS[0]).name;
    const chips = [];
    chips.push(`<span class="chip">${protoName}</span>`);
    chips.push(`<span class="chip">${p.deadlineWeeks} 周</span>`);
    chips.push(`<span class="chip">覆盖 ${p.coverage}%</span>`);
    if (p.kind === "direct") chips.push(`<span class="chip chip--good">${money(p.fee)}</span>`);
    else chips.push(`<span class="chip chip--good">${money(p.prizePool)}</span>`);

    const summary =
      p.kind === "direct"
        ? `报告 ${clamp(p.report?.draft ?? 0, 0, 100)}%｜发现 ${p.found.length} 条｜修复率 ${clamp(p.fixRate ?? 50, 0, 100)}%｜上线冲动 ${clamp(p.shipUrgency ?? 50, 0, 100)}%`
        : `草稿 ${p.submissions.filter((x) => x.status === "draft").length} 条｜已提交 ${p.submissions.filter((x) => x.status === "submitted").length} 条｜证据值 ${clamp(p.evidence ?? 0, 0, 100)}%`;

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
          <button class="btn" data-select="${p.kind}:${p.id}">设为当前目标</button>
        </div>
      </div>
    `;
  }

  function renderLog(state) {
    $("#log").innerHTML =
      state.log.length === 0
        ? `<div class="muted">暂无动态。</div>`
        : state.log
            .slice(0, 60)
            .map((x) => {
              const line = escapeHtml(x.text);
              const tone = x.tone === "good" ? "good" : x.tone === "warn" ? "warn" : x.tone === "bad" ? "bad" : "info";
              const leftBorder =
                tone === "good"
                  ? "border-left-color: rgba(46,229,157,.65);"
                  : tone === "warn"
                    ? "border-left-color: rgba(255,204,102,.65);"
                    : tone === "bad"
                      ? "border-left-color: rgba(255,92,122,.65);"
                      : "";
              return `
              <div class="feed__item" style="${leftBorder}">
                <div class="feed__meta"><span>${escapeHtml(x.t)}</span><span>${toneChip(tone.toUpperCase(), tone)}</span></div>
                <div class="feed__text">${line}</div>
              </div>`;
            })
            .join("");
  }

  function switchTab(tabKey) {
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

  function bind(state) {
    document.addEventListener("click", (ev) => {
      const t = /** @type {HTMLElement} */ (ev.target);

      // tabs
      const tabBtn = t.closest?.(".tab");
      if (tabBtn) {
        switchTab(tabBtn.dataset.tab);
        return;
      }

      // actions
      const actionBtn = t.closest?.("[data-action]");
      if (actionBtn) {
        doAction(state, actionBtn.getAttribute("data-action"));
        render(state);
        return;
      }

      // accept
      const accBtn = t.closest?.("[data-accept]");
      if (accBtn) {
        const [kind, id] = accBtn.getAttribute("data-accept").split(":");
        if (kind === "direct") {
          const order = state.market.direct.find((x) => x.id === id);
          if (!order) return;
          const r = activateDirect(state, order);
          if (!r.ok) toast(r.msg);
        } else {
          const contest = state.market.platform.find((x) => x.id === id);
          if (!contest) return;
          const r = activatePlatform(state, contest);
          if (!r.ok) toast(r.msg);
        }
        render(state);
        return;
      }

      // select target
      const selBtn = t.closest?.("[data-select]");
      if (selBtn) {
        const [kind, id] = selBtn.getAttribute("data-select").split(":");
        state.selectedTarget = { kind, id };
        log(state, `已切换当前目标：${kind === "direct" ? "直客" : "平台"} ${id}。`);
        render(state);
        return;
      }

      // ui buttons
      const uiBtn = t.closest?.("[data-ui]");
      if (uiBtn) {
        const key = uiBtn.getAttribute("data-ui");
        if (key === "closeModal") closeModal();
        if (key === "endWeek") {
          openModal({
            title: "结束本周",
            body: `<div>确认结束本周？将进行项目结算、触发事件并进入下一周。</div>`,
            actions: [
              { label: "取消", onClick: closeModal },
              {
                label: "确认",
                kind: "primary",
                onClick: () => {
                  closeModal();
                  endWeek(state);
                },
              },
            ],
          });
        }
        if (key === "saveGame") {
          save(state);
          toast("已保存到本地（localStorage）。");
        }
        if (key === "newGame") {
          openModal({
            title: "新档",
            body: `<div>将创建一个全新存档（不会删除旧存档，除非你点“重置”）。</div>`,
            actions: [
              { label: "取消", onClick: closeModal },
              {
                label: "创建新档",
                kind: "primary",
                onClick: () => {
                  closeModal();
                  const fresh = defaultState();
                  Object.assign(state, fresh);
                  refreshAP(state);
                  state.ap.now = state.ap.max; // 新档开局满行动点
                  state.flags.startFilled = true;
                  save(state);
                  render(state);
                  switchTab("workbench");
                },
              },
            ],
          });
        }
        if (key === "resetGame") {
          openModal({
            title: "重置存档",
            body: `<div><b>危险操作</b>：将删除本地存档并重开。</div>`,
            actions: [
              { label: "取消", onClick: closeModal },
              {
                label: "删除并重开",
                kind: "primary",
                onClick: () => {
                  closeModal();
                  resetStorage();
                  const fresh = defaultState();
                  Object.assign(state, fresh);
                  refreshAP(state);
                  state.ap.now = state.ap.max; // 重置后开局满行动点
                  state.flags.startFilled = true;
                  save(state);
                  render(state);
                  switchTab("workbench");
                },
              },
            ],
          });
        }
        return;
      }
    });

    // 本周工时（影响行动点上限）
    const hoursSel = $("#hoursPerDay");
    if (hoursSel) {
      hoursSel.addEventListener("change", () => {
        normalizeState(state);
        if (state.flags.gameOver) return;
        if (state.ap.now < state.ap.max) {
          toast("本周已开始行动，工时已锁定（下周可改）。");
          hoursSel.value = String(clamp(Math.round(state.schedule.hoursPerDay), 6, 24));
          return;
        }
        const next = clamp(parseInt(hoursSel.value, 10) || 8, 6, 24);
        const oldMax = state.ap.max;
        state.schedule.hoursPerDay = next;
        refreshAP(state);
        const delta = state.ap.max - oldMax;
        if (delta > 0) state.ap.now = clamp(state.ap.now + delta, 0, state.ap.max);
        else state.ap.now = clamp(state.ap.now, 0, state.ap.max);

        log(
          state,
          next > 8
            ? `你决定本周加班到 ${next}h/天：行动点上限↑，但周末更累。`
            : next < 8
              ? `你决定本周只干 ${next}h/天：行动点上限↓，但更能恢复。`
              : "你把本周工时设为 8h/天：正常节奏。"
        );
        render(state);
      });
    }

    // esc close modal
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeModal();
    });
  }

  function main() {
    const loaded = load();
    const state = loaded || defaultState();
    refreshAP(state);
    // v0.2.1: 新档/重置后的第 1 周开局给满行动点（且只补一次）
    // 注意：不要对“中途存档”补满，否则会破坏行动点系统。
    const isFreshStart =
      state.now?.year === 1 &&
      state.now?.week === 1 &&
      (state.progress?.totalWeeks ?? 0) === 0 &&
      (state.active?.direct?.length ?? 0) === 0 &&
      (state.active?.platform?.length ?? 0) === 0;
    if (isFreshStart && !state.flags?.startFilled) {
      state.ap.now = state.ap.max;
      state.flags.startFilled = true;
      save(state);
    }
    bind(state);
    render(state);
    switchTab("workbench");
  }

  main();
})();

