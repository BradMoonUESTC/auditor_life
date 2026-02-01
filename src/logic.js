import { clamp, pick, ri, rnd } from "./utils.js?v=63";
import { clampPct, log, normalizeState } from "./state.js?v=63";

// ===== Constants (MVP) =====

export const CHAINS = [
  { key: "evm_l2", name: "EVM L2" },
  { key: "solana", name: "Solana" },
  { key: "move", name: "Move 系" },
];

export const NARRATIVES = [
  { key: "defi_summer", name: "DeFi Summer" },
  { key: "rwa", name: "RWA 合规金融" },
  { key: "ai_crypto", name: "AI x Crypto" },
  { key: "privacy", name: "隐私叙事" },
  { key: "degen", name: "Degen 投机叙事" },
  { key: "security", name: "安全叙事" },
];

export const AUDIENCES = [
  { key: "retail", name: "散户" },
  { key: "whales", name: "鲸鱼/做市" },
  { key: "institutions", name: "机构" },
  { key: "developers", name: "开发者" },
];

export const ARCHETYPES = [
  { key: "dex", name: "DEX/AMM" },
  { key: "lending", name: "借贷（Lending）" },
  { key: "perps", name: "永续/衍生品（Perps）" },
  { key: "wallet", name: "钱包/AA（Wallet/AA）" },
  { key: "rpc", name: "RPC/节点服务" },
  { key: "indexer", name: "Indexer/数据服务" },
  { key: "bridge", name: "跨链消息/桥" },
];

export const PLATFORMS = [
  { key: "web", name: "Web" },
  { key: "mobile", name: "Mobile" },
  { key: "extension", name: "Browser Extension" },
];

// ===== Known combo match table (Archetype x Narrative/Chain/Audience) =====
// 3 levels only: perfect / mid / bad
export const MATCH_LEVEL = {
  perfect: { key: "perfect", label: "完美匹配", tone: "good", pct: 95 },
  mid: { key: "mid", label: "中等匹配", tone: "warn", pct: 70 },
  bad: { key: "bad", label: "不匹配", tone: "bad", pct: 40 },
};

// “泽娜配方表”解锁阈值：必须是高匹配的项目/产品复盘后才会解锁该类型的已知搭配表
export const ZENA_RECIPE_UNLOCK_MATCH_PCT = 85;

/** @type {Record<string, { narratives: Record<string,string>, chains: Record<string,string>, audiences: Record<string,string> }>} */
export const KNOWN_MATCH_TABLE = {
  dex: {
    narratives: { defi_summer: "perfect", degen: "perfect", rwa: "bad", ai_crypto: "mid", privacy: "mid", security: "mid" },
    chains: { evm_l2: "perfect", solana: "mid", move: "mid" },
    audiences: { retail: "perfect", whales: "perfect", institutions: "mid", developers: "mid" },
  },
  lending: {
    narratives: { defi_summer: "perfect", rwa: "perfect", degen: "mid", ai_crypto: "mid", privacy: "mid", security: "mid" },
    chains: { evm_l2: "perfect", solana: "mid", move: "mid" },
    audiences: { retail: "mid", whales: "perfect", institutions: "perfect", developers: "mid" },
  },
  perps: {
    narratives: { degen: "perfect", defi_summer: "mid", rwa: "bad", ai_crypto: "mid", privacy: "bad", security: "mid" },
    chains: { evm_l2: "perfect", solana: "perfect", move: "mid" },
    audiences: { retail: "mid", whales: "perfect", institutions: "mid", developers: "mid" },
  },
  wallet: {
    narratives: { privacy: "perfect", ai_crypto: "mid", defi_summer: "mid", degen: "mid", rwa: "mid", security: "perfect" },
    chains: { evm_l2: "perfect", solana: "perfect", move: "mid" },
    audiences: { retail: "perfect", whales: "mid", institutions: "mid", developers: "mid" },
  },
  rpc: {
    narratives: { security: "perfect", ai_crypto: "mid", defi_summer: "mid", degen: "bad", rwa: "mid", privacy: "mid" },
    chains: { evm_l2: "perfect", solana: "perfect", move: "perfect" },
    audiences: { developers: "perfect", institutions: "mid", whales: "mid", retail: "bad" },
  },
  indexer: {
    narratives: { ai_crypto: "perfect", security: "mid", defi_summer: "mid", rwa: "mid", privacy: "mid", degen: "bad" },
    chains: { evm_l2: "perfect", solana: "perfect", move: "perfect" },
    audiences: { developers: "perfect", institutions: "perfect", whales: "mid", retail: "bad" },
  },
  bridge: {
    narratives: { defi_summer: "mid", degen: "mid", rwa: "mid", ai_crypto: "mid", privacy: "bad", security: "perfect" },
    chains: { evm_l2: "perfect", solana: "mid", move: "mid" },
    audiences: { retail: "mid", whales: "perfect", institutions: "mid", developers: "mid" },
  },
};

function matchLevelKeyToObj(k) {
  const kk = String(k || "");
  return MATCH_LEVEL[kk] || MATCH_LEVEL.mid;
}

export function knownComboBreakdown(archetype, narrative, chain, audience) {
  const a = String(archetype || "");
  const t = KNOWN_MATCH_TABLE[a] || null;
  const nKey = t?.narratives?.[String(narrative || "")] || "mid";
  const cKey = t?.chains?.[String(chain || "")] || "mid";
  const uKey = t?.audiences?.[String(audience || "")] || "mid";
  const n = matchLevelKeyToObj(nKey);
  const c = matchLevelKeyToObj(cKey);
  const u = matchLevelKeyToObj(uKey);
  const pct = Math.round((n.pct + c.pct + u.pct) / 3);
  return {
    narrative: { key: n.key, label: n.label, tone: n.tone, pct: n.pct },
    chain: { key: c.key, label: c.label, tone: c.tone, pct: c.pct },
    audience: { key: u.key, label: u.label, tone: u.tone, pct: u.pct },
    pct,
  };
}

// ===== Secondary development (product upgrades) =====

export const UPGRADE_CATALOG = {
  wallet: [
    {
      key: "wallet_add_dex",
      title: "内置 DEX 功能",
      desc: "把钱包做成“钱包 + 交易”的一体化入口：开始产生 TVL/Volume/手续费。",
      targetArchetype: "dex",
      scoreDelta: { growth: +6, productFit: +4, techQuality: +3, security: -2, compliance: -1 },
      unlockKpi: { tvl: true, volume: true, fee: true },
    },
  ],
  dex: [
    {
      key: "dex_add_wallet",
      title: "集成 AA / 内置钱包入口",
      desc: "降低门槛，提高转化与留存（更像“产品化”）。",
      targetArchetype: "wallet",
      scoreDelta: { growth: +4, productFit: +6, techQuality: +2, security: -1, compliance: 0 },
    },
  ],
  lending: [
    {
      key: "lending_add_perps",
      title: "加上永续合约（Perps）",
      desc: "提高交易量与手续费，但风险画像更尖锐。",
      targetArchetype: "perps",
      scoreDelta: { growth: +5, productFit: +2, techQuality: +2, security: -3, compliance: -2 },
    },
  ],
  perps: [
    {
      key: "perps_add_lending",
      title: "加上借贷/保证金体系",
      desc: "更完整的金融闭环，提升粘性。",
      targetArchetype: "lending",
      scoreDelta: { growth: +3, productFit: +3, techQuality: +2, security: -2, compliance: -1 },
    },
  ],
  rpc: [
    {
      key: "rpc_add_indexer",
      title: "加上 Indexer/数据服务",
      desc: "从“节点”升级到“数据平台”，商业化更强。",
      targetArchetype: "indexer",
      scoreDelta: { growth: +3, productFit: +3, techQuality: +4, security: -1, compliance: 0 },
    },
  ],
  indexer: [
    {
      key: "indexer_add_rpc",
      title: "加上 RPC/SLA 服务",
      desc: "形成端到端基础设施产品线。",
      targetArchetype: "rpc",
      scoreDelta: { growth: +2, productFit: +2, techQuality: +4, security: -1, compliance: 0 },
    },
  ],
  bridge: [
    {
      key: "bridge_add_wallet",
      title: "钱包入口 + 跨链体验",
      desc: "把跨链能力做成面向用户的产品化入口。",
      targetArchetype: "wallet",
      scoreDelta: { growth: +4, productFit: +4, techQuality: +2, security: -2, compliance: -1 },
    },
  ],
};

export function upgradeOptionsForProduct(prod) {
  const base = String(prod?.archetype || "");
  return Array.isArray(UPGRADE_CATALOG[base]) ? UPGRADE_CATALOG[base] : [];
}

// Each archetype has a "recipe" preference for 3 stages.
// Values 0~100. Matching matters (like GDT sliders).
export const RECIPE = {
  dex: {
    S1: { uxVsMech: 45, decentralVsControl: 55, complianceVsAggro: 35 },
    S2: { onchainVsOffchain: 65, buildVsReuse: 55, speedVsQuality: 50 },
    S3: { securityDepthVsSpeed: 65, monitoringVsFeatures: 70, complianceVsMarketing: 35 },
  },
  lending: {
    S1: { uxVsMech: 35, decentralVsControl: 60, complianceVsAggro: 55 },
    S2: { onchainVsOffchain: 70, buildVsReuse: 60, speedVsQuality: 60 },
    S3: { securityDepthVsSpeed: 80, monitoringVsFeatures: 75, complianceVsMarketing: 55 },
  },
  perps: {
    S1: { uxVsMech: 30, decentralVsControl: 55, complianceVsAggro: 40 },
    S2: { onchainVsOffchain: 55, buildVsReuse: 55, speedVsQuality: 65 },
    S3: { securityDepthVsSpeed: 85, monitoringVsFeatures: 85, complianceVsMarketing: 40 },
  },
  wallet: {
    S1: { uxVsMech: 70, decentralVsControl: 55, complianceVsAggro: 60 },
    S2: { onchainVsOffchain: 35, buildVsReuse: 55, speedVsQuality: 50 },
    S3: { securityDepthVsSpeed: 75, monitoringVsFeatures: 60, complianceVsMarketing: 65 },
  },
  rpc: {
    S1: { uxVsMech: 40, decentralVsControl: 65, complianceVsAggro: 55 },
    S2: { onchainVsOffchain: 10, buildVsReuse: 45, speedVsQuality: 70 },
    S3: { securityDepthVsSpeed: 60, monitoringVsFeatures: 90, complianceVsMarketing: 55 },
  },
  indexer: {
    S1: { uxVsMech: 55, decentralVsControl: 60, complianceVsAggro: 45 },
    S2: { onchainVsOffchain: 15, buildVsReuse: 50, speedVsQuality: 65 },
    S3: { securityDepthVsSpeed: 55, monitoringVsFeatures: 85, complianceVsMarketing: 40 },
  },
  bridge: {
    S1: { uxVsMech: 25, decentralVsControl: 60, complianceVsAggro: 45 },
    S2: { onchainVsOffchain: 55, buildVsReuse: 60, speedVsQuality: 70 },
    S3: { securityDepthVsSpeed: 90, monitoringVsFeatures: 90, complianceVsMarketing: 45 },
  },
};

export const STAGE_DIMS = {
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

// ===== Inbox events (optional weekly choices) =====

function weeksBetween(a, b) {
  // a/b: {year, week}
  if (!a || !b) return 0;
  const ay = Math.round(a.year || 0);
  const aw = Math.round(a.week || 0);
  const by = Math.round(b.year || 0);
  const bw = Math.round(b.week || 0);
  return (by - ay) * 52 + (bw - aw);
}

function pruneInbox(state) {
  normalizeState(state);
  const now = state.now || { year: 0, week: 0 };
  state.inbox.items = (state.inbox.items || []).filter((it) => {
    const age = weeksBetween(it.created, now);
    const ttl = clamp(Math.round(it.expiresInWeeks || 2), 1, 8);
    return age >= 0 && age < ttl;
  });
}

function pushInbox(state, def, payload = {}, expiresInWeeks = 2) {
  normalizeState(state);
  pruneInbox(state);
  const id = `in_${Date.now()}_${ri(1000, 9999)}`;
  state.inbox.items.unshift({
    id,
    def,
    created: { ...(state.now || { year: 0, week: 0 }) },
    expiresInWeeks: clamp(Math.round(expiresInWeeks || 2), 1, 8),
    payload: payload && typeof payload === "object" ? payload : {},
  });
  state.inbox.items = state.inbox.items.slice(0, 30);
  return id;
}

export const INBOX_DEFS = {
  wallet_distribution: {
    title: "钱包入口合作机会",
    desc: (state, payload) => {
      const cost = Math.round(payload.cost || 0);
      const inc = Math.round(payload.communityInc || 0);
      return `某钱包 BD 主动联系：愿意给你一个入口位（冷启动友好）。代价是一次性合作费 ¥${cost.toLocaleString("zh-CN")}。预计社区势能 +${inc}。`;
    },
    choices: [
      {
        key: "take",
        label: "签合作（花钱换增长）",
        primary: true,
        apply: (state, payload) => {
          const cost = Math.max(0, Math.round(payload.cost || 0));
          const inc = Math.max(0, Math.round(payload.communityInc || 0));
          if ((state.resources?.cash ?? 0) < cost) {
            log(state, "你想签合作，但现金不够。", "bad");
            return { ok: false, msg: "现金不足" };
          }
          state.resources.cash -= cost;
          state.resources.community = clampPct((state.resources.community || 0) + inc);
          state.resources.network = clampPct((state.resources.network || 0) + ri(1, 3));
          log(state, `签下钱包入口合作：社区势能 +${inc}（花费 ¥${cost.toLocaleString("zh-CN")}）。`, "good");
          return { ok: true };
        },
      },
      {
        key: "skip",
        label: "先不签（保现金）",
        apply: (state) => {
          state.resources.network = clampPct((state.resources.network || 0) + 1);
          log(state, "你选择暂缓：先把产品做稳。", "info");
          return { ok: true };
        },
      },
    ],
  },
  security_review: {
    title: "安全公司审计报价",
    desc: (state, payload) => {
      const cost = Math.round(payload.cost || 0);
      const down = Math.round(payload.securityDown || 0);
      return `一家安全公司给出快速审计/赏金方案，报价 ¥${cost.toLocaleString("zh-CN")}。预计全局安全风险 -${down}（更不容易翻车）。`;
    },
    choices: [
      {
        key: "buy",
        label: "采购安全服务",
        primary: true,
        apply: (state, payload) => {
          const cost = Math.max(0, Math.round(payload.cost || 0));
          const down = Math.max(0, Math.round(payload.securityDown || 0));
          if ((state.resources?.cash ?? 0) < cost) {
            log(state, "你想采购安全服务，但现金不够。", "bad");
            return { ok: false, msg: "现金不足" };
          }
          state.resources.cash -= cost;
          state.resources.securityRisk = clampPct((state.resources.securityRisk || 0) - down);
          log(state, `采购安全服务：安全风险 -${down}（花费 ¥${cost.toLocaleString("zh-CN")}）。`, "good");
          return { ok: true };
        },
      },
      {
        key: "skip",
        label: "先不做（等上线后再说）",
        apply: (state) => {
          state.resources.securityRisk = clampPct((state.resources.securityRisk || 0) + 1);
          log(state, "你选择先不做：把时间留给功能与上线。", "warn");
          return { ok: true };
        },
      },
    ],
  },
  regulator_ping: {
    title: "监管风向：材料抽查",
    desc: (state, payload) => {
      const cost = Math.round(payload.cost || 0);
      const down = Math.round(payload.complianceDown || 0);
      return `某渠道要求你补交合规材料（KYC/免责声明/地区限制说明等）。外包法务报价 ¥${cost.toLocaleString("zh-CN")}。预计合规风险 -${down}。`;
    },
    choices: [
      {
        key: "do",
        label: "做合规材料（稳）",
        primary: true,
        apply: (state, payload) => {
          const cost = Math.max(0, Math.round(payload.cost || 0));
          const down = Math.max(0, Math.round(payload.complianceDown || 0));
          if ((state.resources?.cash ?? 0) < cost) {
            log(state, "你想补材料，但现金不够。", "bad");
            return { ok: false, msg: "现金不足" };
          }
          state.resources.cash -= cost;
          state.resources.complianceRisk = clampPct((state.resources.complianceRisk || 0) - down);
          state.resources.reputation = clampPct((state.resources.reputation || 0) + 1);
          log(state, `合规材料补齐：合规风险 -${down}（花费 ¥${cost.toLocaleString("zh-CN")}）。`, "good");
          return { ok: true };
        },
      },
      {
        key: "ignore",
        label: "先不管（赌窗口期）",
        apply: (state) => {
          state.resources.complianceRisk = clampPct((state.resources.complianceRisk || 0) + ri(2, 5));
          log(state, "你选择先不管：窗口期最重要。", "warn");
          return { ok: true };
        },
      },
    ],
  },
  prod_incident: {
    title: "线上事故：漏洞/宕机",
    desc: (state, payload) => {
      const title = String(payload.title || "某产品");
      const loss = Math.round(payload.loss || 0);
      return `线上出现事故苗头：${title} 被社区质疑（或出现间歇性宕机/异常交易）。如果处理不当，本周可能造成现金损失约 ¥${loss.toLocaleString("zh-CN")} 以及声誉下滑。`;
    },
    choices: [
      {
        key: "hotfix",
        label: "紧急热修（花钱止损）",
        primary: true,
        apply: (state, payload) => {
          const productId = String(payload.productId || "");
          const loss = Math.max(0, Math.round(payload.loss || 0));
          const cost = Math.round(loss * 0.45);
          if ((state.resources?.cash ?? 0) < cost) {
            log(state, "你想热修，但现金不够，只能硬扛。", "bad");
            return { ok: false, msg: "现金不足" };
          }
          const prod = (state.active?.products || []).find((x) => x.id === productId);
          if (prod?.risk) {
            prod.risk.security = clampPct((prod.risk.security || 0) - ri(12, 22));
          }
          state.resources.cash -= cost;
          state.resources.reputation = clampPct((state.resources.reputation || 0) + 1);
          state.resources.securityRisk = clampPct((state.resources.securityRisk || 0) - ri(2, 5));
          log(state, `紧急热修完成：花费 ¥${cost.toLocaleString("zh-CN")}，舆情暂时压住。`, "good");
          return { ok: true };
        },
      },
      {
        key: "ignore",
        label: "先观望（省钱但风险↑）",
        apply: (state, payload) => {
          const loss = Math.max(0, Math.round(payload.loss || 0));
          state.resources.cash = Math.round((state.resources.cash || 0) - Math.round(loss * 0.6));
          state.resources.reputation = clampPct((state.resources.reputation || 0) - ri(2, 4));
          state.resources.securityRisk = clampPct((state.resources.securityRisk || 0) + ri(3, 6));
          log(state, "你选择观望：社区情绪开始变差。", "bad");
          return { ok: true };
        },
      },
    ],
  },
};

export function applyInboxChoice(state, itemId, choiceKey) {
  normalizeState(state);
  pruneInbox(state);
  const it = (state.inbox.items || []).find((x) => x.id === itemId);
  if (!it) return { ok: false, msg: "该事件已过期/不存在。" };
  const def = INBOX_DEFS[it.def];
  if (!def) return { ok: false, msg: "未知事件类型。" };
  const choice = (def.choices || []).find((c) => c.key === choiceKey);
  if (!choice) return { ok: false, msg: "未知选项。" };
  const r = choice.apply?.(state, it.payload || {}) || { ok: true };
  // 无论成功与否，玩家做了选择就算处理过（避免卡住）
  state.inbox.items = (state.inbox.items || []).filter((x) => x.id !== itemId);
  return r;
}

function maybeGenerateInboxWeekly(state) {
  normalizeState(state);
  pruneInbox(state);
  const r = state.resources || {};
  const products = state.active?.products || [];

  // 控制频率：每周 0~2 条
  let quota = 0;
  if (Math.random() < 0.35) quota += 1;
  if (Math.random() < 0.12) quota += 1;
  quota = clamp(quota, 0, 2);
  if (quota === 0) return;

  const candidates = [];
  candidates.push(() =>
    pushInbox(state, "wallet_distribution", { cost: ri(18_000, 65_000), communityInc: ri(4, 10) }, 2)
  );
  candidates.push(() =>
    pushInbox(state, "security_review", { cost: ri(12_000, 48_000), securityDown: ri(4, 10) }, 2)
  );
  candidates.push(() =>
    pushInbox(state, "regulator_ping", { cost: ri(8_000, 36_000), complianceDown: ri(4, 9) }, 2)
  );

  // 线上事故：需要至少 1 个产品，且风险较高时更可能出现
  if (products.length > 0) {
    const risky = products
      .map((p) => ({ p, s: clampPct(p.risk?.security ?? 0) }))
      .sort((a, b) => b.s - a.s)[0];
    if (risky && (risky.s >= 55 || (r.securityRisk || 0) >= 55) && Math.random() < clamp(risky.s / 120, 0.1, 0.65)) {
      candidates.push(() =>
        pushInbox(
          state,
          "prod_incident",
          { productId: risky.p.id, title: risky.p.title, loss: ri(18_000, 120_000) },
          1
        )
      );
    }
  }

  // 按资源状态做一点偏置：现金少时减少“花钱事件”密度
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  let added = 0;
  for (const gen of shuffled) {
    if (added >= quota) break;
    if ((state.resources?.cash ?? 0) < 25_000 && Math.random() < 0.45) continue;
    gen();
    added += 1;
  }
  if (added > 0) log(state, `收件箱新增 ${added} 条事件（可选处理，不会打断时间）。`, "info");
}

// ===== Selection helpers =====

export function ensureSelection(state) {
  if (!state.selectedTarget) {
    const p = state.active?.projects?.[0];
    const prod = state.active?.products?.[0];
    if (p) state.selectedTarget = { kind: "project", id: p.id };
    else if (prod) state.selectedTarget = { kind: "product", id: prod.id };
  }
}

export function findTarget(state, kind, id) {
  const list = kind === "product" ? state.active.products : state.active.projects;
  return (list || []).find((x) => x.id === id) || null;
}

// ===== Market generation =====

function titleOf(archetype, narrative) {
  const a = ARCHETYPES.find((x) => x.key === archetype)?.name || archetype;
  const n = NARRATIVES.find((x) => x.key === narrative)?.name || narrative;
  return `${n} · ${a}`;
}

function makeProjectOpportunity() {
  const archetype = pick(ARCHETYPES).key;
  const chain = pick(CHAINS).key;
  const narrative = pick(NARRATIVES).key;
  const audience = pick(AUDIENCES).key;
  const platform = pick(PLATFORMS).key;

  const scale = ri(1, 3); // 1 small, 2 medium, 3 large
  const estWeeks = scale === 1 ? ri(3, 5) : scale === 2 ? ri(5, 8) : ri(8, 12);
  const baseBudget = scale === 1 ? ri(12000, 26000) : scale === 2 ? ri(28000, 68000) : ri(80000, 160000);

  return {
    id: `PRJ_${Date.now()}_${ri(100, 999)}`,
    kind: "project",
    title: titleOf(archetype, narrative),
    archetype,
    narrative,
    chain,
    audience,
    platform,
    scale,
    estWeeks,
    budget: baseBudget,
    // simple fee model (for onchain protocols)
    feeRateBps: archetype === "rpc" || archetype === "indexer" ? 0 : ri(5, 35), // 0.05%~0.35%
    takeRatePct: 0.35, // protocol treasury take
    prefs: JSON.parse(JSON.stringify(RECIPE[archetype] || RECIPE.dex)),
    notes: scale === 3 ? "高难度：工期长、事故代价更大。" : scale === 2 ? "中等难度：需要兼顾质量与进度。" : "小项目：适合快速回本与试配方。",
  };
}

function makeCandidate() {
  const names = ["小王", "小李", "小赵", "小周", "小陈", "小吴"];
  const name = pick(names) + ri(1, 99);
  const skew = rnd(0.85, 1.15);
  const mk = (base) => clampPct(base * skew + rnd(-6, 6));
  const perks = [
    { key: "spec_security", name: "安全老兵", desc: "安全专精：安全 +18", bonus: { security: 18 } },
    { key: "spec_contract", name: "合约硬核", desc: "合约专精：合约 +18", bonus: { contract: 18 } },
    { key: "spec_growth", name: "增长黑客", desc: "增长专精：增长 +18", bonus: { growth: 18 } },
    { key: "spec_product", name: "产品嗅觉", desc: "产品专精：产品 +18", bonus: { product: 18 } },
    { key: "researcher", name: "研究狂人", desc: "研发速度 +25%（作为负责人）", researchSpeedMul: 1.25 },
    { key: "frugal", name: "节俭体质", desc: "日常杂费 -200/天", livingCostDelta: -200 },
  ];
  const perk = pick(perks);
  const skills = {
    product: mk(ri(20, 70)),
    design: mk(ri(20, 70)),
    protocol: mk(ri(20, 70)),
    contract: mk(ri(20, 70)),
    infra: mk(ri(20, 70)),
    security: mk(ri(20, 70)),
    growth: mk(ri(20, 70)),
    compliance: mk(ri(10, 55)),
  };

  // 薪资：按能力定价（低属性尽量低），范围 200~3000/天
  const keys = Object.keys(skills);
  const avg = keys.reduce((acc, k) => acc + clampPct(skills[k]), 0) / Math.max(1, keys.length); // 0~100
  const t = clamp(avg / 100, 0, 1);
  let salaryDaily = 200 + Math.pow(t, 2.2) * 2800; // 200~3000
  // perk 溢价：专精/研究加成会更贵一点
  const bonusSum =
    perk?.bonus && typeof perk.bonus === "object"
      ? Object.values(perk.bonus).reduce((a, v) => a + Math.max(0, Math.round(Number(v) || 0)), 0)
      : 0;
  let premium = 1 + Math.min(0.25, bonusSum / 200); // +18 => ~+9%
  if (typeof perk?.researchSpeedMul === "number" && perk.researchSpeedMul > 1) premium *= 1.12;
  // 少量随机波动（同档位有差异）
  salaryDaily = salaryDaily * premium * rnd(0.92, 1.08);
  salaryDaily = clamp(Math.round(salaryDaily), 200, 3000);
  const salaryWeekly = salaryDaily * 7;

  return {
    id: `H_${Date.now()}_${ri(100, 999)}`,
    kind: "hire",
    name,
    salaryWeekly,
    skills,
    trait: Math.random() < 0.33 ? "学得快" : Math.random() < 0.5 ? "稳健" : "冲劲",
    perk,
  };
}

export function seedMarket(state, fresh = false) {
  normalizeState(state);
  if (fresh) {
    state.market.projects = [];
    state.market.hires = [];
  }
  while (state.market.projects.length < 5) state.market.projects.push(makeProjectOpportunity());
  while (state.market.hires.length < 4) state.market.hires.push(makeCandidate());
  // cap
  state.market.projects = state.market.projects.slice(0, 8);
  state.market.hires = state.market.hires.slice(0, 8);
}

export function exploreCandidates(state, sourceKey) {
  normalizeState(state);
  const key = String(sourceKey || "");
  const cash = state.resources?.cash ?? 0;

  const sources = {
    headhunter: { name: "猎头", cost: ri(32_000, 55_000), n: ri(1, 2), qualityMul: 1.10, salaryMul: 1.12 },
    jobboard: { name: "招聘平台", cost: ri(9_000, 18_000), n: ri(1, 3), qualityMul: 1.00, salaryMul: 1.00 },
    referral: { name: "朋友介绍", cost: ri(3_000, 9_000), n: ri(1, 1), qualityMul: 1.05, salaryMul: 0.95 },
  };
  const src = sources[key];
  if (!src) return { ok: false, msg: "未知探索渠道。" };
  if (cash < src.cost) return { ok: false, msg: `现金不足：需要 ¥${src.cost.toLocaleString("zh-CN")}。` };

  if (!state.market) state.market = { projects: [], hires: [] };
  if (!Array.isArray(state.market.hires)) state.market.hires = [];

  const tweak = (c) => {
    if (!c || typeof c !== "object") return c;
    const s = c.skills || {};
    for (const k of Object.keys(s)) s[k] = clampPct(clampPct(s[k]) * src.qualityMul + rnd(-2, 3));
    c.skills = s;
    c.salaryWeekly = Math.max(0, Math.round((Number(c.salaryWeekly) || 0) * src.salaryMul * rnd(0.98, 1.05)));
    return c;
  };

  const added = [];
  for (let i = 0; i < src.n; i += 1) added.push(tweak(makeCandidate()));

  state.resources.cash -= src.cost;
  // add to front
  state.market.hires = [...added, ...state.market.hires].slice(0, 8);

  log(state, `探索候选人：通过${src.name}获得 ${added.length} 位候选人（花费 ¥${src.cost.toLocaleString("zh-CN")}）。`, "info");
  return { ok: true, addedCount: added.length, cost: src.cost, sourceName: src.name };
}

// ===== Project lifecycle =====

export function projectStage(project) {
  const idx = clamp(Math.round(project?.stageIndex ?? 0), 0, 2);
  return idx === 0 ? "S1" : idx === 1 ? "S2" : "S3";
}

function defaultStagePrefs() {
  return {
    S1: { uxVsMech: 50, decentralVsControl: 50, complianceVsAggro: 50 },
    S2: { onchainVsOffchain: 50, buildVsReuse: 50, speedVsQuality: 50 },
    S3: { securityDepthVsSpeed: 50, monitoringVsFeatures: 50, complianceVsMarketing: 50 },
  };
}

export function startProject(state, id) {
  normalizeState(state);
  const src = state.market.projects.find((x) => x.id === id);
  if (!src) return { ok: false, msg: "该项目已过期。" };
  if ((state.active.projects?.length || 0) >= 2) return { ok: false, msg: "同时进行的项目太多了（上限 2）。" };

  const p = {
    ...src,
    stageIndex: 0,
    stageProgress: 0,
    stagePaused: true, // stage gate
    stagePrefs: defaultStagePrefs(),
    stageTeam: {
      S1: { product: null, design: null, protocol: null, compliance: null },
      S2: { contract: null, infra: null, security: null, protocol: null },
      S3: { security: null, infra: null, compliance: null, growth: null },
    },
    startedAt: { ...state.now },
    // runtime accumulators
    investedBudget: 0,
  };
  state.active.projects.push(p);
  state.market.projects = state.market.projects.filter((x) => x.id !== id);
  state.selectedTarget = { kind: "project", id: p.id };

  // push stage gate to queue
  state.stageQueue = state.stageQueue || [];
  state.stageQueue.push({ kind: "project", id: p.id });

  log(state, `立项：${p.title}（${p.estWeeks} 周，预算 ¥${Math.round(p.budget).toLocaleString("zh-CN")}）`, "good");
  return { ok: true };
}

export function abandonProject(state, projectId) {
  normalizeState(state);
  const id = String(projectId || "");
  const p = (state.active?.projects || []).find((x) => x.id === id) || null;
  if (!p) return { ok: false, msg: "找不到该进行中的项目。" };

  state.active.projects = (state.active.projects || []).filter((x) => x.id !== id);
  // remove pending stage gate entries
  if (Array.isArray(state.stageQueue)) state.stageQueue = state.stageQueue.filter((x) => !(x?.kind === "project" && x?.id === id));

  if (state.selectedTarget?.kind === "project" && state.selectedTarget?.id === id) {
    state.selectedTarget = null;
  }

  const spent = Math.round(Number(p.investedBudget) || 0);
  const pct = clamp(Math.round(p.stageProgress || 0), 0, 100);
  log(state, `废弃项目：${p.title}（已投入 ¥${spent.toLocaleString("zh-CN")}，当前进度 ${pct}%）`, "warn");
  return { ok: true };
}

/**
 * Abandon an already-launched product.
 * mode:
 * - "sunset": gradual shutdown, mild damage
 * - "rug": rug pull, heavy damage (and some cash gain)
 */
export function abandonLiveProduct(state, productId, mode = "sunset") {
  normalizeState(state);
  const id = String(productId || "");
  const prod = (state.active?.products || []).find((x) => x.id === id) || null;
  if (!prod) return { ok: false, msg: "找不到该已上线产品。" };

  const m = String(mode || "sunset");
  const r = state.resources || (state.resources = {});
  const k = prod.kpi || {};

  const fans0 = Math.max(0, Math.round(r.fans || 0));
  let fansLoss = 0;
  let cashGain = 0;

  if (m === "sunset") {
    fansLoss = Math.max(30, Math.round(fans0 * 0.06));
    r.fans = clamp(Math.round(fans0 - fansLoss), 0, 999999999);
    r.reputation = clampPct((r.reputation || 0) - 1);
    r.community = clampPct((r.community || 0) - 2);
    r.network = clampPct((r.network || 0) - 1);
    r.securityRisk = clampPct((r.securityRisk || 0) + 1);
    r.complianceRisk = clampPct((r.complianceRisk || 0) + 1);
    log(state, `逐渐废弃产品：${prod.title}（粉丝 -${fansLoss.toLocaleString("zh-CN")}）`, "warn");
  } else if (m === "rug") {
    // cash gain: loosely tied to TVL/user base, capped to avoid breaking economy
    const tvl = Number.isFinite(Number(k.tvl)) ? Math.max(0, Math.round(Number(k.tvl))) : 0;
    const users = Number.isFinite(Number(k.users)) ? Math.max(0, Math.round(Number(k.users))) : 0;
    cashGain = tvl > 0 ? Math.round(tvl * 0.02) : Math.round(users * 8);
    cashGain = clamp(cashGain, 50_000, 5_000_000);
    r.cash = Math.round((r.cash || 0) + cashGain);

    fansLoss = Math.max(800, Math.round(fans0 * 0.35));
    r.fans = clamp(Math.round(fans0 - fansLoss), 0, 999999999);
    r.reputation = clampPct((r.reputation || 0) - 8);
    r.community = clampPct((r.community || 0) - 12);
    r.network = clampPct((r.network || 0) - 6);
    r.securityRisk = clampPct((r.securityRisk || 0) + 15);
    r.complianceRisk = clampPct((r.complianceRisk || 0) + 22);
    log(
      state,
      `【Rug Pull】${prod.title}：现金 +${cashGain.toLocaleString("zh-CN")}，粉丝 -${fansLoss.toLocaleString("zh-CN")}，声誉/社区大幅受损。`,
      "bad"
    );
  } else {
    return { ok: false, msg: "未知废弃模式。" };
  }

  // remove product from live list
  state.active.products = (state.active.products || []).filter((x) => x.id !== id);
  if (state.selectedTarget?.kind === "product" && state.selectedTarget?.id === id) state.selectedTarget = null;
  // pick a reasonable selection if needed
  ensureSelection(state);

  return { ok: true, mode: m, cashGain, fansLoss };
}

export function createProject(state, cfg) {
  normalizeState(state);
  if ((state.active.projects?.length || 0) >= 2) return { ok: false, msg: "同时进行的项目太多了（上限 2）。" };
  // secondary dev (upgrade existing product) OR new project
  const baseProductId = cfg?.baseProductId ? String(cfg.baseProductId) : "";
  const baseProd = baseProductId ? (state.active?.products || []).find((x) => x.id === baseProductId) : null;
  const upgradeKey = cfg?.upgradeKey ? String(cfg.upgradeKey) : "";
  if (baseProd) {
    const opts = upgradeOptionsForProduct(baseProd);
    if (!opts || opts.length === 0) return { ok: false, msg: "该产品暂无可用二次开发方向。" };
    const picked = opts.find((x) => x.key === upgradeKey) || null;
    if (!picked) return { ok: false, msg: "请选择有效的二次开发方向。" };
  }

  const archetype = baseProd ? (upgradeOptionsForProduct(baseProd).find((x) => x.key === upgradeKey)?.targetArchetype || baseProd.archetype) : (cfg?.archetype || pick(ARCHETYPES).key);
  const chain = baseProd ? baseProd.chain : (cfg?.chain || pick(CHAINS).key);
  const narrative = baseProd ? baseProd.narrative : (cfg?.narrative || pick(NARRATIVES).key);
  const audience = baseProd ? baseProd.audience : (cfg?.audience || pick(AUDIENCES).key);
  const platform = baseProd ? (baseProd.platform || "web") : (cfg?.platform || pick(PLATFORMS).key);
  const scale = clamp(Math.round(cfg?.scale || 1), 1, 3);
  const estWeeks = scale === 1 ? ri(3, 5) : scale === 2 ? ri(5, 8) : ri(8, 12);
  const baseBudget = scale === 1 ? ri(12000, 26000) : scale === 2 ? ri(28000, 68000) : ri(80000, 160000);
  const feeRateBps = ["rpc", "indexer"].includes(archetype) ? 0 : ri(5, 35);
  const upgrade = baseProd ? upgradeOptionsForProduct(baseProd).find((x) => x.key === upgradeKey) : null;

  const p = {
    id: `PRJ_${Date.now()}_${ri(100, 999)}`,
    kind: "project",
    title: baseProd && upgrade ? `${baseProd.title} · 二次开发：${upgrade.title}` : titleOf(archetype, narrative),
    archetype,
    narrative,
    chain,
    audience,
    platform,
    scale,
    estWeeks,
    budget: baseBudget,
    feeRateBps,
    takeRatePct: 0.35,
    prefs: JSON.parse(JSON.stringify(RECIPE[archetype] || RECIPE.dex)),
    notes: scale === 3 ? "高难度：工期长、事故代价更大。" : scale === 2 ? "中等难度：需要兼顾质量与进度。" : "小项目：适合快速回本与试配方。",
    stageIndex: 0,
    stageProgress: 0,
    stagePaused: true,
    stagePrefs: defaultStagePrefs(),
    stageTeam: {
      S1: { product: null, design: null, protocol: null, compliance: null },
      S2: { contract: null, infra: null, security: null, protocol: null },
      S3: { security: null, infra: null, compliance: null, growth: null },
    },
    startedAt: { ...state.now },
    investedBudget: 0,
    // upgrade metadata (optional)
    upgradeOf: baseProd ? baseProd.id : null,
    upgradeKey: baseProd ? upgradeKey : null,
  };
  state.active.projects.push(p);
  // 二次开发：这是对“原产品基础属性”的提升；运营应保持原来的（仍选中原产品）。
  // 新项目：仍默认选中项目以便继续阶段配置。
  state.selectedTarget = baseProd ? { kind: "product", id: baseProd.id } : { kind: "project", id: p.id };
  state.stageQueue = state.stageQueue || [];
  state.stageQueue.push({ kind: "project", id: p.id });
  log(state, baseProd ? `二次开发立项：${p.title}（预计 ${estWeeks} 周，预算 ¥${Math.round(p.budget).toLocaleString("zh-CN")}）` : `立项：${p.title}（规模 L${scale}，预计 ${estWeeks} 周，预算 ¥${Math.round(p.budget).toLocaleString("zh-CN")}）`, "good");
  return { ok: true, id: p.id };
}

export function hire(state, id) {
  normalizeState(state);
  const c = state.market.hires.find((x) => x.id === id);
  if (!c) return { ok: false, msg: "候选人已过期。" };
  // signing fee
  const signFee = Math.round(c.salaryWeekly * 1.2);
  if ((state.resources?.cash ?? 0) < signFee) return { ok: false, msg: "现金不足：付不起签约成本。" };
  state.resources.cash -= signFee;
  state.team.members.push({
    id: `m_${c.id}`,
    name: c.name,
    role: "staff",
    salaryWeekly: c.salaryWeekly,
    skills: c.skills,
    trait: c.trait,
    perk: c.perk || null,
  });
  state.market.hires = state.market.hires.filter((x) => x.id !== id);
  log(state, `招募：${c.name}（周薪 ¥${c.salaryWeekly.toLocaleString("zh-CN")}，签约 ¥${signFee.toLocaleString("zh-CN")}）`, "info");
  return { ok: true };
}

export function setProjectTeam(state, projectId, stageKey, roleKey, memberIdOrNull) {
  normalizeState(state);
  const p = state.active.projects.find((x) => x.id === projectId);
  if (!p) return { ok: false, msg: "项目不存在。" };
  if (!p.stageTeam || typeof p.stageTeam !== "object") {
    p.stageTeam = {
      S1: { product: null, design: null, protocol: null, compliance: null },
      S2: { contract: null, infra: null, security: null, protocol: null },
      S3: { security: null, infra: null, compliance: null, growth: null },
    };
  }
  if (!p.stageTeam[stageKey]) p.stageTeam[stageKey] = {};
  p.stageTeam[stageKey][roleKey] = memberIdOrNull || null;
  return { ok: true };
}

export function autoAssignProjectStageTeam(state, projectId, stageKeyOrNull = null) {
  normalizeState(state);
  const p = state.active.projects.find((x) => x.id === projectId);
  if (!p) return { ok: false, msg: "项目不存在。" };
  const stageKey = stageKeyOrNull ? String(stageKeyOrNull) : projectStage(p);
  const roles =
    stageKey === "S1"
      ? ["product", "design", "protocol", "compliance"]
      : stageKey === "S2"
        ? ["contract", "infra", "security", "protocol"]
        : ["security", "infra", "compliance", "growth"];

  const members = state.team?.members || [];
  const scoreOf = (m, roleKey) => {
    const base = clampPct(m?.skills?.[roleKey] ?? 0);
    const bonus = clampPct(m?.perk?.bonus?.[roleKey] ?? 0);
    return clampPct(base + bonus);
  };

  const used = new Set();
  if (!p.stageTeam || typeof p.stageTeam !== "object") {
    p.stageTeam = {
      S1: { product: null, design: null, protocol: null, compliance: null },
      S2: { contract: null, infra: null, security: null, protocol: null },
      S3: { security: null, infra: null, compliance: null, growth: null },
    };
  }
  if (!p.stageTeam[stageKey]) p.stageTeam[stageKey] = {};

  const picked = {};
  for (const roleKey of roles) {
    let best = null;
    let bestScore = -1;
    for (const m of members) {
      const raw = scoreOf(m, roleKey);
      const penalty = used.has(m.id) ? 8 : 0; // prefer unique people if possible
      const v = raw - penalty;
      if (v > bestScore) {
        bestScore = v;
        best = m;
      }
    }
    if (best) {
      p.stageTeam[stageKey][roleKey] = best.id;
      picked[roleKey] = best.id;
      used.add(best.id);
    }
  }
  return { ok: true, stageKey, picked };
}

function avgSkill(memberIds, key, state) {
  const ids = (memberIds || []).filter(Boolean);
  if (ids.length === 0) return 0;
  const map = new Map((state.team?.members || []).map((m) => [m.id, m]));
  let sum = 0;
  let n = 0;
  for (const id of ids) {
    const m = map.get(id);
    if (!m) continue;
    const base = clampPct(m.skills?.[key] ?? 0);
    const bonus = clampPct(m.perk?.bonus?.[key] ?? 0);
    sum += clampPct(base + bonus);
    n += 1;
  }
  return n ? sum / n : 0;
}

function stageRoles(stage) {
  if (stage === "S1") return ["product", "design", "protocol", "compliance"];
  if (stage === "S2") return ["contract", "infra", "security", "protocol"];
  return ["security", "infra", "compliance", "growth"]; // S3
}

function effectiveTeamPower(project, state) {
  const stage = projectStage(project);
  const t = project.stageTeam?.[stage] || {};
  const roles = stageRoles(stage);
  const ids = roles.map((r) => t?.[r]).filter(Boolean);
  const filled = ids.length;
  if (filled === 0) return 18;

  const avg = (k) => avgSkill(ids, k, state);
  let base = 50;
  if (stage === "S1") base = (avg("product") * 0.35 + avg("design") * 0.25 + avg("protocol") * 0.25 + avg("compliance") * 0.15);
  else if (stage === "S2") base = (avg("contract") * 0.40 + avg("infra") * 0.20 + avg("security") * 0.20 + avg("protocol") * 0.20);
  else base = (avg("security") * 0.35 + avg("infra") * 0.25 + avg("compliance") * 0.20 + avg("growth") * 0.20);

  const fillPenalty = filled >= roles.length ? 1 : filled >= 2 ? 0.82 : 0.65;
  return clamp(base * fillPenalty, 10, 95);
}

function matchScore(project) {
  const pref = project.prefs || RECIPE.dex;
  const cur = project.stagePrefs || defaultStagePrefs();
  const dist = (a, b) => Math.abs(clampPct(a) - clampPct(b));
  const stageMatch = (stageKey) => {
    const dims = Object.keys(pref[stageKey] || {});
    if (dims.length === 0) return 50;
    const avgDist = dims.reduce((acc, k) => acc + dist(cur[stageKey]?.[k] ?? 50, pref[stageKey]?.[k] ?? 50), 0) / dims.length;
    return clamp(100 - avgDist, 0, 100);
  };
  const sliderPct = Math.round((stageMatch("S1") + stageMatch("S2") + stageMatch("S3")) / 3);
  const combo = knownComboBreakdown(project.archetype, project.narrative, project.chain, project.audience);
  // blend: slider is still the main driver, known combo adds "flavor" & known meta
  return clamp(Math.round(sliderPct * 0.7 + combo.pct * 0.3), 0, 100);
}

function engineBonus(state) {
  const e = state.engine || {};
  const dev = clamp(Math.round(e.dev?.version ?? 1), 1, 9);
  const sec = clamp(Math.round(e.sec?.version ?? 1), 1, 9);
  const infra = clamp(Math.round(e.infra?.version ?? 1), 1, 9);
  const eco = clamp(Math.round(e.eco?.version ?? 1), 1, 9);
  return { dev, sec, infra, eco };
}

function computeLaunchScores(project, state) {
  const power = effectiveTeamPower(project, state); // 10~95
  const match = matchScore(project); // 0~100
  const e = engineBonus(state);

  const base = 35 + power * 0.35 + match * 0.35;
  const productFit = clampPct(base + (e.eco - 1) * 2 + (project.stagePrefs?.S1?.uxVsMech ?? 50) * 0.05);
  const techQuality = clampPct(base + (e.dev - 1) * 2 + (e.infra - 1) * 1.5);
  const security = clampPct(base + (e.sec - 1) * 3 + (project.stagePrefs?.S3?.securityDepthVsSpeed ?? 50) * 0.08);
  const growth = clampPct(base + (project.stagePrefs?.S3?.complianceVsMarketing ?? 50) * 0.10 + (project.stagePrefs?.S1?.complianceVsAggro ?? 50) * 0.05);
  const compliance = clampPct(base + (project.stagePrefs?.S1?.complianceVsAggro ?? 50) * 0.08 + (project.stagePrefs?.S3?.complianceVsMarketing ?? 50) * -0.06);

  return { productFit, techQuality, security, growth, compliance, match, teamPower: Math.round(power) };
}

function initialMetrics(project, scores, state) {
  const rep = clampPct(state.resources?.reputation ?? 0);
  const comm = clampPct(state.resources?.community ?? 0);
  const fans = Math.max(0, Math.round(state.resources?.fans ?? 0));
  const marketMul = 0.85 + rnd(0, 0.4); // bull/bear placeholder
  // fans adds a small but real boost (intentionally not huge)
  const fanBoost = clamp(fans * 0.18, 0, 45_000);
  const baseUsers = (rep * 80 + comm * 60 + scores.growth * 90 + scores.productFit * 60) * marketMul + fanBoost;
  const users = Math.round(clamp(baseUsers, 50, 220000));
  const dau = Math.round(users * clamp(0.04 + scores.productFit / 300 + scores.growth / 380, 0.03, 0.22));
  const retention = clampPct(25 + scores.productFit * 0.45 + scores.techQuality * 0.15 - (100 - scores.security) * 0.15);

  let tvl = 0;
  let volume = 0;
  if (["dex", "lending", "perps", "bridge"].includes(project.archetype)) {
    const trust = clamp(0.6 + scores.security / 180 + scores.compliance / 260, 0.3, 1.3);
    tvl = Math.round(clamp(users * rnd(8, 28) * trust, 0, 3_000_000_000));
    volume = Math.round(clamp(tvl * rnd(0.25, 1.2), 0, 6_000_000_000));
  }

  return { users, dau, retention, tvl, volume };
}

function score10(x01) {
  return clamp(Math.round(1 + clamp(x01, 0, 1) * 9), 1, 10);
}

function projectScorePotentials(project, state) {
  // 用户不知道“上限”，但分数仍由“潜力”驱动（且无硬上限）。
  // 设计目标：
  // - 引擎未研究（v1）时，产品/技术分通常 <10
  // - 大后期（研究满 + 资源增长）才到 1000+
  const scale = clamp(Math.round(project?.scale ?? 1), 1, 9999);
  const companyLevel = clamp(Math.round(state?.company?.level ?? 1), 1, 9999);
  const e = engineBonus(state);

  // capability: 1..9
  const capProduct = Math.sqrt(e.eco * e.dev);
  const capTech = (e.dev + e.sec + e.infra) / 3;
  const t01 = (cap) => clamp((cap - 1) / 8, 0, 1);
  const p01 = t01(capProduct);
  const te01 = t01(capTech);

  // minor bumps (won't dominate early game)
  const rep = clamp(Math.round(state?.resources?.reputation ?? 0), 0, 9999);
  const comm = clamp(Math.round(state?.resources?.community ?? 0), 0, 9999);
  const tp = Math.max(0, Math.round(state?.resources?.techPoints ?? 0));
  const net = clamp(Math.round(state?.resources?.network ?? 0), 0, 9999);
  const fans = Math.max(0, Math.round(state?.resources?.fans ?? 0));
  const fanTier = Math.log10(1 + fans); // 0.. (no cap)

  // start around single digits; late game ramps hard via engine research
  const productPotential =
    8 +
    1200 * Math.pow(p01, 2.2) +
    fanTier * 200 +
    (companyLevel - 1) * 40 +
    (scale - 1) * 80 +
    rep * 0.02 +
    comm * 0.02 +
    net * 0.03 +
    Math.log10(1 + tp) * 2.5;

  const techPotential =
    6 +
    1600 * Math.pow(te01, 2.4) +
    fanTier * 220 +
    (companyLevel - 1) * 55 +
    (scale - 1) * 110 +
    rep * 0.02 +
    comm * 0.02 +
    net * 0.03 +
    Math.log10(1 + tp) * 3.5;

  return {
    productMax: Math.max(0, Math.round(productPotential)),
    techMax: Math.max(0, Math.round(techPotential)),
  };
}

const PRODUCT_SCORE_GAMMA = 1.35;
const TECH_SCORE_GAMMA = 1.55;

export function projectProductScore(project, state) {
  const s = computeLaunchScores(project, state);
  const ratio = clamp((s.productFit * 0.55 + s.growth * 0.30 + s.compliance * 0.15) / 100, 0, 1);
  const { productMax } = projectScorePotentials(project, state);
  // 曲线：压低中低档，鼓励冲高质量
  const curved = clamp(Math.pow(ratio, PRODUCT_SCORE_GAMMA), 0, 1);
  return { score: Math.round(curved * productMax), max: productMax, ratio };
}

export function projectTechScore(project, state) {
  const s = computeLaunchScores(project, state);
  const ratio = clamp((s.techQuality * 0.55 + s.security * 0.35 + s.teamPower * 0.10) / 100, 0, 1);
  const { techMax } = projectScorePotentials(project, state);
  const curved = clamp(Math.pow(ratio, TECH_SCORE_GAMMA), 0, 1);
  return { score: Math.round(curved * techMax), max: techMax, ratio };
}

export function projectProductScore10(project, state) {
  // legacy helper (keep for balancing formulas)
  return score10(projectProductScore(project, state).ratio);
}

export function projectTechScore10(project, state) {
  // legacy helper (keep for balancing formulas)
  return score10(projectTechScore(project, state).ratio);
}

function makeLiveProduct(project, state) {
  const scores = computeLaunchScores(project, state);
  const m = initialMetrics(project, scores, state);
  const initTokenPrice = clamp(0.35 + (scores.match / 100) * 1.8 + rnd(-0.08, 0.18), 0.08, 12);
  const ps = projectProductScore(project, state);
  const ts = projectTechScore(project, state);
  const productScore10 = score10(ps.ratio);
  const techScore10 = score10(ts.ratio);
  return {
    id: `PROD_${project.id}`,
    kind: "product",
    title: project.title,
    archetype: project.archetype,
    narrative: project.narrative,
    chain: project.chain,
    audience: project.audience,
    platform: project.platform || "web",
    launchedAt: { ...state.now },
    scores,
    productScore: ps.score,
    productScoreMax: ps.max,
    productScore10,
    techScore: ts.score,
    techScoreMax: ts.max,
    techScore10,
    features: [project.archetype],
    kpi: {
      users: m.users,
      dau: m.dau,
      retention: m.retention,
      tvl: m.tvl,
      volume: m.volume,
      feeRateBps: clampPct(project.feeRateBps ?? 15),
      protocolTakePct: clamp(project.takeRatePct ?? 0.35, 0.05, 0.9),
      tokenPrice: initTokenPrice,
      cumProfit: 0,
      cumRevenue: 0,
      fees: 0,
      revenue: 0,
      profit: 0,
    },
    ops: {
      buybackPct: clamp(state.ops?.buybackPct ?? 0, 0, 0.5),
      emissions: clamp(state.ops?.emissions ?? 0, 0, 1),
      incentivesBudgetWeekly: clamp(Math.round(state.ops?.incentivesBudgetWeekly ?? 0), 0, 999999999),
      marketingBudgetWeekly: clamp(Math.round(state.ops?.marketingBudgetWeekly ?? 0), 0, 999999999),
      securityBudgetWeekly: clamp(Math.round(state.ops?.securityBudgetWeekly ?? 0), 0, 999999999),
      infraBudgetWeekly: clamp(Math.round(state.ops?.infraBudgetWeekly ?? 0), 0, 999999999),
      complianceBudgetWeekly: clamp(Math.round(state.ops?.complianceBudgetWeekly ?? 0), 0, 999999999),
      referralPct: clamp(state.ops?.referralPct ?? 0, 0, 0.3),
      supportBudgetWeekly: clamp(Math.round(state.ops?.supportBudgetWeekly ?? 0), 0, 999999999),
    },
    risk: {
      // Risk should build up slowly over time (avoid early accidental "crisis").
      security: clampPct(8 + (100 - scores.security) * 0.35),
      compliance: clampPct(8 + (100 - scores.compliance) * 0.28),
    },
  };
}

function scoreRatioFromSavedScores(scores) {
  const s = scores || {};
  const pf = clampPct(s.productFit ?? 50);
  const g = clampPct(s.growth ?? 50);
  const c = clampPct(s.compliance ?? 50);
  const tq = clampPct(s.techQuality ?? 50);
  const sec = clampPct(s.security ?? 50);
  const tp = clamp(Math.round(s.teamPower ?? 50), 10, 95);
  const productRatio = clamp((pf * 0.55 + g * 0.30 + c * 0.15) / 100, 0, 1);
  const techRatio = clamp((tq * 0.55 + sec * 0.35 + tp * 0.10) / 100, 0, 1);
  return { productRatio, techRatio };
}

function ensureProductFields(prod, state = null) {
  if (!prod || typeof prod !== "object") return;
  if (!Array.isArray(prod.features)) prod.features = [];
  if (!prod.kpi) prod.kpi = {};
  if (!prod.risk) prod.risk = { security: 10, compliance: 10 };
  if (!prod.scores) prod.scores = {};
  if (typeof prod.kpi.tokenPrice !== "number") prod.kpi.tokenPrice = clamp(0.5 + rnd(-0.1, 0.2), 0.05, 8);
  if (typeof prod.kpi.cumProfit !== "number") prod.kpi.cumProfit = 0;
  if (typeof prod.kpi.cumRevenue !== "number") prod.kpi.cumRevenue = 0;
  if (typeof prod.costSpent !== "number") prod.costSpent = 0;
  if (typeof prod.scale !== "number") prod.scale = 1;
  if (typeof prod.platform !== "string") prod.platform = "web";

  // ops defaults (may be inherited from state.ops in UI, but ensure fields exist)
  prod.ops = prod.ops && typeof prod.ops === "object" ? prod.ops : {};
  if (typeof prod.ops.buybackPct !== "number") prod.ops.buybackPct = 0;
  if (typeof prod.ops.emissions !== "number") prod.ops.emissions = 0;
  if (typeof prod.ops.incentivesBudgetWeekly !== "number") prod.ops.incentivesBudgetWeekly = 0;
  if (typeof prod.ops.marketingBudgetWeekly !== "number") prod.ops.marketingBudgetWeekly = 0;
  if (typeof prod.ops.securityBudgetWeekly !== "number") prod.ops.securityBudgetWeekly = 0;
  if (typeof prod.ops.infraBudgetWeekly !== "number") prod.ops.infraBudgetWeekly = 0;
  if (typeof prod.ops.complianceBudgetWeekly !== "number") prod.ops.complianceBudgetWeekly = 0;
  if (typeof prod.ops.referralPct !== "number") prod.ops.referralPct = 0;
  if (typeof prod.ops.supportBudgetWeekly !== "number") prod.ops.supportBudgetWeekly = 0;

  // 新的产品分/技术分：动态上限（可增长）
  if (typeof prod.productScoreMax !== "number" || !Number.isFinite(prod.productScoreMax)) {
    const maxes = state ? projectScorePotentials({ scale: prod.scale || 1 }, state) : { productMax: 0, techMax: 0 };
    prod.productScoreMax = maxes.productMax;
  }
  if (typeof prod.techScoreMax !== "number" || !Number.isFinite(prod.techScoreMax)) {
    const maxes = state ? projectScorePotentials({ scale: prod.scale || 1 }, state) : { productMax: 0, techMax: 0 };
    prod.techScoreMax = maxes.techMax;
  }

  const { productRatio, techRatio } = scoreRatioFromSavedScores(prod.scores);
  if (typeof prod.productScore !== "number" || !Number.isFinite(prod.productScore)) prod.productScore = Math.round(productRatio * prod.productScoreMax);
  if (typeof prod.techScore !== "number" || !Number.isFinite(prod.techScore)) prod.techScore = Math.round(techRatio * prod.techScoreMax);

  // legacy scores for balancing and old UI
  if (typeof prod.productScore10 !== "number" || !Number.isFinite(prod.productScore10)) prod.productScore10 = score10(productRatio);
  if (typeof prod.techScore10 !== "number" || !Number.isFinite(prod.techScore10)) prod.techScore10 = score10(techRatio);
}

function applyUpgradeToProduct(state, baseProdId, upgradeKey, projectLike) {
  normalizeState(state);
  const prod = (state.active?.products || []).find((x) => x.id === baseProdId);
  if (!prod) return { ok: false, msg: "找不到要二次开发的产品。" };
  ensureProductFields(prod, state);
  const opts = upgradeOptionsForProduct(prod);
  const up = opts.find((x) => x.key === upgradeKey);
  if (!up) return { ok: false, msg: "该产品不支持这个二次开发方向。" };

  // mark feature
  const tag = up.targetArchetype || up.key;
  if (!prod.features.includes(tag)) prod.features.push(tag);

  // blend in scores using current project performance as a proxy
  const s2 = projectLike ? computeLaunchScores(projectLike, state) : null;
  const sd = up.scoreDelta || {};
  const blend = (k, delta) => {
    const cur = clampPct(prod.scores?.[k] ?? 50);
    const fromProj = s2 ? clampPct(s2[k] ?? 50) : 50;
    const next = clampPct(cur * 0.86 + fromProj * 0.14 + (delta || 0));
    prod.scores[k] = next;
  };
  for (const k of ["productFit", "techQuality", "security", "growth", "compliance"]) blend(k, sd[k] || 0);

  // if upgrade enables DeFi KPIs on a previously non-DeFi product
  prod.kpi.users = Math.round(prod.kpi.users || 0);
  prod.kpi.dau = Math.round(prod.kpi.dau || 0);
  if (up.unlockKpi?.tvl && (prod.kpi.tvl == null || prod.kpi.volume == null)) {
    const baseUsers = Math.max(200, Math.round(prod.kpi.users || 2000));
    const trust = clamp(0.55 + (prod.scores.security || 50) / 200, 0.25, 1.2);
    prod.kpi.tvl = Math.round(clamp(baseUsers * rnd(6, 18) * trust, 0, 3_000_000_000));
    prod.kpi.volume = Math.round(clamp(prod.kpi.tvl * rnd(0.18, 0.85), 0, 6_000_000_000));
    prod.kpi.feeRateBps = clampPct(prod.kpi.feeRateBps ?? 15);
    prod.kpi.protocolTakePct = clamp(prod.kpi.protocolTakePct ?? 0.35, 0.05, 0.9);
  }

  // immediate growth bump (feel-good)
  const bump = clamp(0.02 + (prod.scores.growth || 50) / 800, 0.01, 0.08);
  prod.kpi.users = Math.round(clamp((prod.kpi.users || 0) * (1 + bump), 0, 9_999_999));
  prod.kpi.dau = Math.round(clamp((prod.kpi.dau || 0) * (1 + bump), 0, prod.kpi.users));

  // risk adjusts slightly with added complexity
  prod.risk.security = clampPct((prod.risk.security || 10) + 2 + Math.max(0, (50 - (prod.scores.security || 50)) / 25));
  prod.risk.compliance = clampPct((prod.risk.compliance || 10) + 1 + Math.max(0, (50 - (prod.scores.compliance || 50)) / 30));

  // refresh product/tech scores with current state (dynamic caps, no fixed upper bound)
  const maxes = projectScorePotentials({ scale: prod.scale || 1 }, state);
  prod.productScoreMax = maxes.productMax;
  prod.techScoreMax = maxes.techMax;
  const { productRatio, techRatio } = scoreRatioFromSavedScores(prod.scores);
  prod.productScore = Math.round(productRatio * prod.productScoreMax);
  prod.techScore = Math.round(techRatio * prod.techScoreMax);
  prod.productScore10 = score10(productRatio);
  prod.techScore10 = score10(techRatio);

  return { ok: true, upgrade: up };
}

export function tickProjects(state, deltaHours) {
  normalizeState(state);
  const hours = Math.max(0, deltaHours || 0);
  if (!hours) return;

  const makeRatingEntry = (title, match, kind = "launch", projectLike = null) => {
    const m = clamp(Math.round(match || 0), 0, 100);
    const base = 1 + (m / 100) * 9; // 1~10
    // 3 realistic institutions (different "taste" but still mainly driven by match)
    const insts = [
      { name: "a16z Crypto", bias: +0.2 },
      { name: "Paradigm", bias: +0.0 },
      { name: "慢雾科技（SlowMist）", bias: -0.2 },
    ];
    const ratings = insts.map((it) => {
      const jitter = rnd(-0.6, 0.6);
      const s = clamp(Math.round(base + it.bias + jitter), 1, 10);
      return { name: it.name, score: s };
    });
    const a = projectLike?.archetype;
    const n = projectLike?.narrative;
    const c = projectLike?.chain;
    const u = projectLike?.audience;
    const combo = projectLike ? knownComboBreakdown(a, n, c, u) : null;
    return {
      id: `rate_${Date.now()}_${ri(100, 999)}`,
      kind,
      title: String(title || ""),
      match: m,
      archetype: a ? String(a) : "",
      combo,
      ratings,
    };
  };

  const advanceOne = (p) => {
    if (!p) return;
    if (p.stagePaused) return;
    const power = effectiveTeamPower(p, state); // 10~95
    const scaleMul = p.scale === 3 ? 0.75 : p.scale === 2 ? 0.9 : 1.05;
    const engineMul = 1 + (engineBonus(state).dev - 1) * 0.03;
    const rate = (0.9 + power / 130) * scaleMul * engineMul; // % per hour baseline-ish
    const inc = rate * hours;
    p.stageProgress = clamp((p.stageProgress || 0) + inc, 0, 100);

    // burn budget while building
    const burn = Math.round((p.budget / (p.estWeeks * 40)) * hours * rnd(0.85, 1.15));
    const cash = state.resources?.cash ?? 0;
    const spent = clamp(burn, 0, Math.max(0, cash));
    if (state.resources) state.resources.cash -= spent;
    p.investedBudget = Math.round((p.investedBudget || 0) + spent);

    if (p.stageProgress >= 100) {
      p.stageIndex = clamp(Math.round((p.stageIndex ?? 0) + 1), 0, 3);
      p.stageProgress = 0;
      if (p.stageIndex >= 3) return { done: true };
      p.stagePaused = true;
      state.stageQueue = state.stageQueue || [];
      state.stageQueue.push({ kind: "project", id: p.id });
      return { done: false, stageChanged: true };
    }
    return { done: false };
  };

  for (const p of [...state.active.projects]) {
    const r = advanceOne(p);
    if (r?.done) {
      if (p.upgradeOf && p.upgradeKey) {
        const spentCost = Math.round(Number(p.investedBudget) || 0);
        const ps = projectProductScore(p, state);
        const ts = projectTechScore(p, state);
        const productScore10 = score10(ps.ratio);
        const techScore10 = score10(ts.ratio);
        const rr = applyUpgradeToProduct(state, p.upgradeOf, p.upgradeKey, p);
        state.active.projects = state.active.projects.filter((x) => x.id !== p.id);
        if (rr.ok) {
          // 二次开发完成后继续选中原产品，保证运营参数/面板保持原来的
          state.selectedTarget = { kind: "product", id: String(p.upgradeOf) };
          const techGain = Math.round(2 + (matchScore(p) || 50) / 40);
          state.resources.techPoints = clamp((state.resources.techPoints || 0) + techGain, 0, 999999);
          log(state, `二次开发完成：${rr.upgrade.title}（技术点 +${techGain}）`, "good");
          state.ui = state.ui || { ratingQueue: [] };
          state.ui.ratingQueue = state.ui.ratingQueue || [];
          const mp = matchScore(p) || 50;
          const entry = makeRatingEntry(`二次开发交付：${rr.upgrade.title}`, mp, "upgrade", p);
          state.ui.ratingQueue.push(entry);

          // fans gain (small impact overall)
          const avg10 = entry?.ratings?.length ? entry.ratings.reduce((a, x) => a + (Number(x.score) || 0), 0) / entry.ratings.length : 6;
          const fansGain = clamp(Math.round(20 + avg10 * 16 + productScore10 * 8 + (p.scale || 1) * 35 + rnd(-30, 30)), 0, 5000);
          state.resources.fans = Math.round((state.resources.fans || 0) + fansGain);

          state.history = state.history || { projectsDone: [] };
          state.history.projectsDone = Array.isArray(state.history.projectsDone) ? state.history.projectsDone : [];
          state.history.projectsDone.unshift({
            id: `DONE_${p.id}`,
            kind: "upgrade",
            title: rr.upgrade.title,
            baseProductId: p.upgradeOf,
            archetype: p.archetype,
            narrative: p.narrative,
            chain: p.chain,
            audience: p.audience,
            platform: p.platform || "web",
            scale: p.scale || 1,
            productScore: ps.score,
            productScoreMax: ps.max,
            productScore10,
            techScore: ts.score,
            techScoreMax: ts.max,
            techScore10,
            avgRating10: Math.round(avg10 * 10) / 10,
            matchPct: mp,
            fansGained: fansGain,
            costSpent: spentCost,
            stagePrefs: JSON.parse(JSON.stringify(p.stagePrefs || {})),
            stageTeam: JSON.parse(JSON.stringify(p.stageTeam || {})),
            finishedAt: { ...(state.now || {}) },
          });
        } else {
          log(state, `二次开发完成但应用失败：${rr.msg}`, "warn");
        }
      } else {
        const spentCost = Math.round(Number(p.investedBudget) || 0);
        const prod = makeLiveProduct(p, state);
        prod.costSpent = spentCost;
        prod.scale = p.scale || 1;
        state.active.products.push(prod);
        state.active.projects = state.active.projects.filter((x) => x.id !== p.id);
        state.selectedTarget = { kind: "product", id: prod.id };

        // rewards: tech points + reputation bump for good match/security
        const techGain = Math.round(3 + prod.scores.match / 30 + prod.scores.techQuality / 45);
        state.resources.techPoints = clamp((state.resources.techPoints || 0) + techGain, 0, 999999);
        const repGain = Math.round((prod.scores.productFit + prod.scores.security + prod.scores.growth) / 120 - 1);
        state.resources.reputation = clamp(state.resources.reputation + repGain, 0, 100);
        log(state, `上线：${prod.title}（匹配度 ${prod.scores.match}，技术点 +${techGain}，声誉 ${repGain >= 0 ? "+" : ""}${repGain}）`, "good");

        state.ui = state.ui || { ratingQueue: [] };
        state.ui.ratingQueue = state.ui.ratingQueue || [];
        const mp = prod.scores.match || 50;
        const entry = makeRatingEntry(`开发完成：${prod.title}`, mp, "launch", p);
        state.ui.ratingQueue.push(entry);

        const avg10 = entry?.ratings?.length ? entry.ratings.reduce((a, x) => a + (Number(x.score) || 0), 0) / entry.ratings.length : 6;
        const fansGain = clamp(Math.round(30 + avg10 * 18 + (prod.productScore10 || 6) * 10 + (p.scale || 1) * 60 + rnd(-50, 60)), 0, 12000);
        state.resources.fans = Math.round((state.resources.fans || 0) + fansGain);

        state.history = state.history || { projectsDone: [] };
        state.history.projectsDone = Array.isArray(state.history.projectsDone) ? state.history.projectsDone : [];
        state.history.projectsDone.unshift({
          id: `DONE_${p.id}`,
          kind: "launch",
          title: prod.title,
          productId: prod.id,
          archetype: prod.archetype,
          narrative: prod.narrative,
          chain: prod.chain,
          audience: prod.audience,
          platform: prod.platform || "web",
          scale: p.scale || 1,
          productScore: prod.productScore,
          productScoreMax: prod.productScoreMax,
          productScore10: prod.productScore10,
          techScore: prod.techScore,
          techScoreMax: prod.techScoreMax,
          techScore10: prod.techScore10,
          avgRating10: Math.round(avg10 * 10) / 10,
          matchPct: mp,
          fansGained: fansGain,
          costSpent: spentCost,
          stagePrefs: JSON.parse(JSON.stringify(p.stagePrefs || {})),
          stageTeam: JSON.parse(JSON.stringify(p.stageTeam || {})),
          finishedAt: { ...(state.now || {}) },
        });
      }
    }
  }
}

function researchSkillKey(engineKey) {
  if (engineKey === "dev") return "contract";
  if (engineKey === "sec") return "security";
  if (engineKey === "infra") return "infra";
  if (engineKey === "eco") return "growth";
  return "contract";
}

function memberById(state, id) {
  return (state.team?.members || []).find((m) => m.id === id) || null;
}

function researchCostForVersion(v) {
  const vv = clamp(Math.round(v || 1), 1, 9);
  return vv <= 2 ? 0 : Math.round(20 * (vv - 2));
}

function researchHoursForVersion(v) {
  const vv = clamp(Math.round(v || 1), 1, 9);
  // 让“科研需要时间但不会拖太久”：前期几小时，后期十几小时
  return clamp(Math.round(6 + vv * 2.5), 6, 28);
}

export function startResearch(state, engineKey, assigneeIdOrNull) {
  normalizeState(state);
  if (!state.engine?.[engineKey]) return { ok: false, msg: "未知引擎。" };
  if (state.research?.task) return { ok: false, msg: "已有进行中的研发（一次只能跑一项）。" };

  const cur = clamp(Math.round(state.engine[engineKey].version || 1), 1, 9);
  if (cur >= 9) return { ok: false, msg: "已满级。" };
  const cost = researchCostForVersion(cur);
  if ((state.resources?.techPoints ?? 0) < cost) return { ok: false, msg: `技术点不足：需要 ${cost}。` };

  state.resources.techPoints -= cost;
  const hoursTotal = researchHoursForVersion(cur);
  state.research.task = {
    engineKey,
    targetVersion: clamp(cur + 1, 1, 9),
    hoursTotal,
    hoursDone: 0,
    assigneeId: assigneeIdOrNull || null,
  };
  const who = assigneeIdOrNull ? memberById(state, assigneeIdOrNull)?.name || "（未知）" : "（未指派）";
  log(state, `开始研发：${engineKey.toUpperCase()} v${cur}→v${cur + 1}（用时约 ${hoursTotal}h，指派：${who}，消耗技术点 ${cost}）`, "info");
  return { ok: true };
}

export function setResearchAssignee(state, memberIdOrNull) {
  normalizeState(state);
  if (!state.research?.task) return { ok: false, msg: "当前没有进行中的研发。" };
  state.research.task.assigneeId = memberIdOrNull || null;
  return { ok: true };
}

export function tickResearch(state, deltaHours) {
  normalizeState(state);
  const t = state.research?.task;
  if (!t) return;
  const hours = Math.max(0, deltaHours || 0);
  if (!hours) return;

  const m = t.assigneeId ? memberById(state, t.assigneeId) : null;
  const engineKey = t.engineKey || t.engineKey === 0 ? t.engineKey : null;
  const skillKey = researchSkillKey(engineKey);
  const skill = clampPct(m?.skills?.[skillKey] ?? 0);
  const perkMul = typeof m?.perk?.researchSpeedMul === "number" ? m.perk.researchSpeedMul : 1;
  const traitMul = m?.trait === "学得快" ? 1.08 : m?.trait === "冲劲" ? 1.05 : 1;
  const speed = clamp((0.55 + skill / 100) * perkMul * traitMul, 0.55, 1.85); // 指派合适的人会更快
  // IMPORTANT: keep fractional progress; rounding each frame will stall at small deltaHours
  t.hoursDone = clamp((Number(t.hoursDone) || 0) + hours * speed, 0, 999999);

  if (t.hoursDone >= t.hoursTotal) {
    if (t.kind === "node" && t.nodeId) {
      const node = researchNodeById(t.nodeId);
      applyResearchNodeEffect(state, t.nodeId);
      // repeatable nodes should not be marked as permanently unlocked
      if (node?.kind !== "postmortem") {
        state.research.unlocked = Array.isArray(state.research.unlocked) ? state.research.unlocked : [];
        if (!state.research.unlocked.includes(t.nodeId)) state.research.unlocked.push(t.nodeId);
        log(state, `科研完成：${node?.title || t.nodeId}。`, "good");
      }
      state.research.task = null;
      return;
    }

    const key = t.engineKey;
    const targetV = clamp(Math.round(t.targetVersion || 1), 1, 9);
    if (state.engine?.[key]) state.engine[key].version = targetV;
    log(state, `研发完成：${key.toUpperCase()} 引擎升级到 v${targetV}。`, "good");
    state.research.task = null;
  }
}

export function estimateDailyCashDelta(state) {
  normalizeState(state);
  const salaryDaily = Math.round((state.team?.members || []).reduce((acc, m) => acc + Math.max(0, Math.round(m.salaryWeekly || 0)), 0) / 7);
  const livingCostDaily = computeLivingCostDaily(state);
  const prodProfitDaily = Math.round((state.active?.products || []).reduce((acc, p) => acc + Math.round(p.kpi?.profit || 0), 0));
  return {
    salaryDaily,
    livingCostDaily,
    prodProfitDaily,
    net: Math.round(prodProfitDaily - salaryDaily - livingCostDaily),
  };
}

function computeLivingCostDaily(state) {
  normalizeState(state);
  const members = state.team?.members || [];
  const perksDelta = members.reduce((acc, m) => acc + Math.round(m?.perk?.livingCostDelta || 0), 0);
  // 办公/生活杂费：先按固定 100/天（更符合“日常消耗”的体感），perk 可微调
  return Math.max(0, Math.round(100 + perksDelta));
}

// ===== Research tree (real "tree UI") =====

export const RESEARCH_TREE = {
  // 单棵大树（DAG）：多分支 + 多前置交汇节点
  nodes: [
    // hub
    { id: "hub", kind: "meta", title: "研发中心", hint: "从这里开始点亮分支。", effectLabel: "起点", pos: { x: 0, y: 240 }, requires: [] },

    // Postmortem / review (repeatable)
    { id: "postmortem_zena", kind: "postmortem", engineKey: "eco", title: "泽娜复盘：已知搭配", hint: "选择一个历史产品/项目做复盘；完成后才能“知道”该类型的已知搭配。不同对象可重复，但同一对象只能复盘一次。", effectLabel: "解锁情报", pos: { x: 260, y: 240 }, requires: ["hub"] },

    // Dev branch
    { id: "ci_cd", kind: "engine_upgrade", engineKey: "dev", targetVersion: 2, title: "CI/CD 基础管线", hint: "自动化构建/测试/发布。", effectLabel: "Dev +1", pos: { x: 260, y: 120 }, requires: ["hub"] },
    { id: "component_lib", kind: "engine_upgrade", engineKey: "dev", targetVersion: 3, title: "可复用组件库", hint: "更快拼装更少返工。", effectLabel: "Dev +1", pos: { x: 520, y: 60 }, requires: ["ci_cd"] },
    { id: "plugin_arch", kind: "engine_slots", engineKey: "dev", slotsDelta: 1, title: "插件化架构", hint: "允许装配更多模块。", effectLabel: "Dev 插槽 +1", pos: { x: 520, y: 180 }, requires: ["ci_cd"] },
    { id: "mod_build", kind: "engine_upgrade", engineKey: "dev", targetVersion: 4, title: "模块化构建系统", hint: "工程化进阶：速度与质量增强。", effectLabel: "Dev +1", pos: { x: 780, y: 120 }, requires: ["component_lib", "plugin_arch"] },

    // Sec branch
    { id: "threat_model", kind: "engine_upgrade", engineKey: "sec", targetVersion: 2, title: "威胁建模方法论", hint: "更早识别攻击面。", effectLabel: "Sec +1", pos: { x: 260, y: 360 }, requires: ["hub"] },
    { id: "audit_rules", kind: "engine_upgrade", engineKey: "sec", targetVersion: 3, title: "自动化审计规则集", hint: "常见漏洞模式工具化。", effectLabel: "Sec +1", pos: { x: 520, y: 300 }, requires: ["threat_model"] },
    { id: "sec_toolchain", kind: "engine_slots", engineKey: "sec", slotsDelta: 1, title: "安全工具链扩展", hint: "更丰富的安全工具组合。", effectLabel: "Sec 插槽 +1", pos: { x: 520, y: 420 }, requires: ["threat_model"] },
    { id: "fuzz_formal", kind: "engine_upgrade", engineKey: "sec", targetVersion: 4, title: "模糊测试 + 形式化", hint: "上线前安全深度显著提升。", effectLabel: "Sec +1", pos: { x: 780, y: 360 }, requires: ["audit_rules", "sec_toolchain"] },

    // Infra branch
    { id: "observability", kind: "engine_upgrade", engineKey: "infra", targetVersion: 2, title: "可观测性三件套", hint: "Metrics/Logs/Tracing。", effectLabel: "Infra +1", pos: { x: 260, y: 600 }, requires: ["hub"] },
    { id: "autoscale_cost", kind: "engine_upgrade", engineKey: "infra", targetVersion: 3, title: "自动扩缩容与成本模型", hint: "SLA 更稳、成本更可控。", effectLabel: "Infra +1", pos: { x: 520, y: 540 }, requires: ["observability"] },
    { id: "infra_suite", kind: "engine_slots", engineKey: "infra", slotsDelta: 1, title: "运维自动化套件", hint: "应急/观测组合更强。", effectLabel: "Infra 插槽 +1", pos: { x: 520, y: 660 }, requires: ["observability"] },
    { id: "incident_drill", kind: "engine_upgrade", engineKey: "infra", targetVersion: 4, title: "演练式应急预案", hint: "事故损失可控，恢复更快。", effectLabel: "Infra +1", pos: { x: 780, y: 600 }, requires: ["autoscale_cost", "infra_suite"] },

    // Eco branch
    { id: "funnel_dash", kind: "engine_upgrade", engineKey: "eco", targetVersion: 2, title: "增长漏斗仪表盘", hint: "定位转化瓶颈。", effectLabel: "Eco +1", pos: { x: 260, y: 840 }, requires: ["hub"] },
    { id: "dist_templates", kind: "engine_upgrade", engineKey: "eco", targetVersion: 3, title: "渠道素材与分发模板", hint: "冷启动更强。", effectLabel: "Eco +1", pos: { x: 520, y: 780 }, requires: ["funnel_dash"] },
    { id: "growth_lab", kind: "engine_slots", engineKey: "eco", slotsDelta: 1, title: "增长实验平台", hint: "A/B 与实验编排。", effectLabel: "Eco 插槽 +1", pos: { x: 520, y: 900 }, requires: ["funnel_dash"] },
    { id: "ecosystem_playbook", kind: "engine_upgrade", engineKey: "eco", targetVersion: 4, title: "生态合作打法", hint: "分发/生态复利更强。", effectLabel: "Eco +1", pos: { x: 780, y: 840 }, requires: ["dist_templates", "growth_lab"] },

    // Intersections / new unlocks (DAG joins)
    { id: "safe_release", kind: "global_mod", title: "安全发布流程", hint: "CI/CD + 威胁建模 → 更少线上事故", effectLabel: "事故风险 -", pos: { x: 1040, y: 240 }, requires: ["ci_cd", "threat_model"], mod: { riskSecurityDelta: -2 } },
    { id: "prod_analytics", kind: "global_mod", title: "产品数据闭环", hint: "漏斗仪表盘 + 可观测性 → 留存与增长更稳", effectLabel: "ARPU +", pos: { x: 1040, y: 420 }, requires: ["funnel_dash", "observability"], mod: { arpuMul: 1.15 } },
    { id: "cost_optimization", kind: "global_mod", title: "成本优化体系", hint: "成本模型 + 分发模板 → 获客更便宜、infra 更省", effectLabel: "成本 -", pos: { x: 1040, y: 600 }, requires: ["autoscale_cost", "dist_templates"], mod: { infraCostMul: 0.88 } },
    { id: "security_tooling_ops", kind: "global_mod", title: "安全运营联动", hint: "安全工具链 + 应急演练 → 降低安全损失与安全成本", effectLabel: "安全成本 -", pos: { x: 1040, y: 780 }, requires: ["sec_toolchain", "incident_drill"], mod: { secCostMul: 0.88, riskSecurityDelta: -2 } },

    { id: "platform_scale", kind: "global_mod", title: "规模化交付体系", hint: "模块化构建 + 生态合作 → 更快做更大项目", effectLabel: "进度 +", pos: { x: 1300, y: 510 }, requires: ["mod_build", "ecosystem_playbook"], mod: { projectSpeedMul: 1.08 } },
  ],
};

function researchNodeById(id) {
  return (RESEARCH_TREE.nodes || []).find((n) => n.id === id) || null;
}

export function researchNodeStatus(state, nodeId) {
  normalizeState(state);
  const node = researchNodeById(nodeId);
  if (!node) return { kind: "missing" };
  const task = state.research?.task || null;
  const inProgress = task && task.nodeId === nodeId;

  // done?
  if (node.kind === "engine_upgrade") {
    const cur = clamp(Math.round(state.engine?.[node.engineKey]?.version ?? 1), 1, 9);
    if (cur >= node.targetVersion) return { kind: "done" };
  } else if (node.kind === "postmortem") {
    // repeatable: never "done"
  } else if (node.kind === "meta") {
    return { kind: "done" };
  } else {
    if (Array.isArray(state.research?.unlocked) && state.research.unlocked.includes(nodeId)) return { kind: "done" };
  }
  if (inProgress) return { kind: "researching" };

  // unlocked prerequisites?
  const reqs = Array.isArray(node.requires) ? node.requires : [];
  const hasReq = (rid) => {
    if (rid === "hub") return true;
    const reqNode = researchNodeById(rid);
    if (!reqNode) return false;
    if (reqNode.kind === "engine_upgrade") {
      const cur = clamp(Math.round(state.engine?.[reqNode.engineKey]?.version ?? 1), 1, 9);
      return cur >= (reqNode.targetVersion || 1);
    }
    if (reqNode.kind === "meta") return true;
    return Array.isArray(state.research?.unlocked) && state.research.unlocked.includes(rid);
  };
  const ok = reqs.every(hasReq);
  return ok ? { kind: "available" } : { kind: "locked" };
}

export function startResearchNode(state, nodeId, assigneeIdOrNull, payload = null) {
  normalizeState(state);
  const node = researchNodeById(nodeId);
  if (!node) return { ok: false, msg: "未知科研节点。" };
  if (state.research?.task) return { ok: false, msg: "已有进行中的研发（一次只能跑一项）。" };

  const st = researchNodeStatus(state, nodeId);
  if (st.kind === "done") return { ok: false, msg: "该节点已完成。" };
  if (st.kind === "locked") return { ok: false, msg: "前置未解锁。" };

  // derive cost/time
  let costTech = 0;
  let hoursTotal = 8;
  if (node.kind === "engine_upgrade") {
    // 统一沿用版本成本：v1->v2、v2->v3 免费
    const cur = clamp(Math.round(state.engine?.[node.engineKey]?.version ?? 1), 1, 9);
    costTech = researchCostForVersion(cur);
    hoursTotal = researchHoursForVersion(cur);
  } else {
    // slot/global nodes: moderate cost/time
    if (node.kind === "postmortem") {
      costTech = 6;
      hoursTotal = 10;
      const pid = payload?.productId ? String(payload.productId) : "";
      if (!pid) return { ok: false, msg: "复盘需要选择一个历史产品/项目。" };
      const prod = (state.active?.products || []).find((x) => x.id === pid) || null;
      if (!prod) return { ok: false, msg: "找不到该历史产品/项目。" };
      const done = Array.isArray(state.knowledge?.postmortemedProductIds) ? state.knowledge.postmortemedProductIds : [];
      if (done.includes(pid)) return { ok: false, msg: "该产品已复盘过（同一对象只能复盘一次）。" };
    } else {
      costTech = node.kind === "global_mod" ? 12 : 8;
      hoursTotal = node.kind === "global_mod" ? 14 : 10;
    }
  }
  if ((state.resources?.techPoints ?? 0) < costTech) return { ok: false, msg: `技术点不足：需要 ${costTech}。` };

  state.resources.techPoints -= costTech;
  state.research.task = {
    kind: "node",
    nodeId,
    engineKey: node.engineKey || null,
    targetVersion: node.targetVersion || null,
    hoursTotal,
    hoursDone: 0,
    assigneeId: assigneeIdOrNull || null,
    costTech,
    payload: payload && typeof payload === "object" ? payload : null,
  };
  return { ok: true };
}

function applyResearchNodeEffect(state, nodeId) {
  normalizeState(state);
  const node = researchNodeById(nodeId);
  if (!node) return;

  if (node.kind === "postmortem") {
    const pid = state.research?.task?.payload?.productId ? String(state.research.task.payload.productId) : "";
    const prod = pid ? (state.active?.products || []).find((x) => x.id === pid) : null;
    const archetype = prod?.archetype ? String(prod.archetype) : "";
    state.knowledge = state.knowledge || { zenaKnownArchetypes: [], postmortemedProductIds: [] };
    state.knowledge.postmortemedProductIds = Array.isArray(state.knowledge.postmortemedProductIds) ? state.knowledge.postmortemedProductIds : [];
    if (pid && !state.knowledge.postmortemedProductIds.includes(pid)) state.knowledge.postmortemedProductIds.push(pid);
    if (!archetype) {
      log(state, "复盘完成，但没有得到有效的项目类型信息。", "warn");
      return;
    }
    const match = clamp(Math.round(prod?.scores?.match ?? 0), 0, 100);
    if (match < ZENA_RECIPE_UNLOCK_MATCH_PCT) {
      log(state, `泽娜复盘完成：匹配度 ${match} 未达到“高匹配”阈值（≥${ZENA_RECIPE_UNLOCK_MATCH_PCT}），未解锁该类型配方表。`, "warn");
      return;
    }
    state.knowledge.zenaKnownArchetypes = Array.isArray(state.knowledge.zenaKnownArchetypes) ? state.knowledge.zenaKnownArchetypes : [];
    if (!state.knowledge.zenaKnownArchetypes.includes(archetype)) state.knowledge.zenaKnownArchetypes.push(archetype);
    log(state, `泽娜复盘完成：已解锁【${archetype.toUpperCase()}】类型的已知搭配表。`, "good");
    return;
  }

  if (node.kind === "engine_upgrade") {
    const key = node.engineKey;
    if (key && state.engine?.[key]) {
      state.engine[key].version = clamp(Math.round(node.targetVersion || 1), 1, 9);
    }
    return;
  }

  if (node.kind === "engine_slots") {
    const key = node.engineKey;
    const d = clamp(Math.round(node.slotsDelta || 0), 0, 9);
    if (key && state.engine?.[key]) {
      state.engine[key].slots = clamp(Math.round((state.engine[key].slots || 1) + d), 1, 9);
    }
    return;
  }

  if (node.kind === "global_mod") {
    // effect is applied by being in research.unlocked; no immediate mutation needed
    return;
  }
}

// ===== Weekly settlement =====

function salaryBurnWeekly(state) {
  const ms = state.team?.members || [];
  const total = ms.reduce((acc, m) => acc + Math.max(0, Math.round(m.salaryWeekly || 0)), 0);
  return total;
}

export function tickLiveProductsWeekly(state) {
  normalizeState(state);
  const products = state.active.products || [];

  for (const prod of products) {
    ensureProductFields(prod, state);
    const k = prod.kpi || {};
    const scores = prod.scores || {};
    const ops = prod.ops || {};

    // adoption update
    const natural = clamp(0.015 + scores.productFit / 520 + scores.growth / 650 - prod.risk.security / 500, -0.03, 0.06);
    const incentiveBoost = clamp((ops.incentivesBudgetWeekly || 0) / 120000, 0, 0.08);
    const emissionsBoost = clamp((ops.emissions || 0) * 0.06, 0, 0.06);
    const crashPenalty = prod.risk.security >= 70 ? -0.05 : 0;
    const growthRate = natural + incentiveBoost + emissionsBoost + crashPenalty;

    k.users = Math.round(clamp((k.users || 0) * (1 + growthRate), 0, 9_999_999));
    const retention = clampPct((k.retention || 30) + (scores.productFit - 50) * 0.02 - incentiveBoost * 20 - crashPenalty * 30);
    k.retention = retention;
    k.dau = Math.round(clamp(k.users * clamp(0.03 + retention / 300, 0.03, 0.25), 0, k.users));

    // DeFi metrics
    if (k.tvl != null && k.volume != null) {
      const trust = clamp(0.5 + scores.security / 200 + scores.compliance / 260 - prod.risk.security / 220, 0.2, 1.25);
      const tvlRate = clamp(growthRate * 0.8 + (trust - 0.8) * 0.06, -0.08, 0.10);
      k.tvl = Math.round(clamp((k.tvl || 0) * (1 + tvlRate), 0, 9_999_999_999));
      const volumeRate = clamp(0.08 + trust * 0.15 + incentiveBoost * 0.6, 0.05, 0.6);
      k.volume = Math.round(clamp((k.tvl || 0) * volumeRate, 0, 9_999_999_999));
    }

    // revenue & profit
    const feeRate = clamp((k.feeRateBps || 0) / 10_000, 0, 0.02);
    const vol = Math.max(0, Math.round(k.volume || 0));
    const fees = Math.round(vol * feeRate);
    const revenue = Math.round(fees * clamp(k.protocolTakePct || 0.35, 0.05, 0.95));

    const infraCost = Math.round(600 + (k.dau || 0) * 0.6 + (vol / 1_000_000) * 120);
    const secCost = Math.round(350 + (100 - scores.security) * 8);
    const buyback = Math.round(revenue * clamp(ops.buybackPct || 0, 0, 0.5));
    const incentives = Math.round(clamp(ops.incentivesBudgetWeekly || 0, 0, 999999999));

    const profit = revenue - infraCost - secCost - incentives - buyback;
    k.fees = fees;
    k.revenue = revenue;
    k.profit = profit;
    k.cumProfit = Math.round((Number(k.cumProfit) || 0) + profit);
    k.cumRevenue = Math.round((Number(k.cumRevenue) || 0) + revenue);

    // apply cash
    state.resources.cash = Math.round((state.resources.cash || 0) + profit);
    state.progress.earnedTotal = Math.round((state.progress.earnedTotal || 0) + Math.max(0, profit));

    // risk drift
    // Weekly drift should be mild; avoid pushing risks to 100 too fast.
    prod.risk.security = clampPct((prod.risk.security || 10) + (100 - scores.security) * 0.008 + ri(-2, 2) - (ops.incentivesBudgetWeekly > 0 ? 0.4 : 0));
    prod.risk.compliance = clampPct((prod.risk.compliance || 10) + (100 - scores.compliance) * 0.008 + ri(-2, 2) + (ops.emissions > 0.3 ? 0.6 : 0));
  }
}

function recordProductHistoryDaily(state) {
  normalizeState(state);
  for (const prod of state.active.products || []) {
    prod.history = Array.isArray(prod.history) ? prod.history : [];
    const k = prod.kpi || {};
    if (typeof k.tokenPrice !== "number") k.tokenPrice = clamp(0.5 + rnd(-0.1, 0.2), 0.05, 8);
    prod.history.push({
      t: { ...(state.now || {}) },
      dau: Math.round(k.dau || 0),
      tvl: Math.round(k.tvl || 0),
      profit: Math.round(k.profit || 0),
      revenue: Math.round(k.revenue || 0),
      retention: clampPct(k.retention || 0),
      tokenPrice: Number(k.tokenPrice) || 0,
      riskSecurity: clampPct(prod.risk?.security ?? 0),
      riskCompliance: clampPct(prod.risk?.compliance ?? 0),
      cash: Math.round(state.resources?.cash || 0),
    });
    // keep last ~90 days
    prod.history = prod.history.slice(-90);
  }
}

export function tickLiveProductsDaily(state) {
  normalizeState(state);
  const products = state.active.products || [];

  for (const prod of products) {
    const k = prod.kpi || {};
    const scores = prod.scores || {};
    const ops = prod.ops || {};
    ensureProductFields(prod, state);

    // daily adoption update (approx weekly/7)
    const naturalW = clamp(0.015 + scores.productFit / 520 + scores.growth / 650 - prod.risk.security / 500, -0.03, 0.06);
    const incentiveBoostW = clamp((ops.incentivesBudgetWeekly || 0) / 120000, 0, 0.08);
    const marketingBoostW = clamp((ops.marketingBudgetWeekly || 0) / 220000, 0, 0.10);
    const supportBoostW = clamp((ops.supportBudgetWeekly || 0) / 180000, 0, 0.05);
    const emissionsBoostW = clamp((ops.emissions || 0) * 0.06, 0, 0.06);
    const crashPenaltyW = prod.risk.security >= 70 ? -0.05 : 0;
    const growthRateW = naturalW + incentiveBoostW + marketingBoostW + emissionsBoostW + crashPenaltyW;
    const growthRateD = growthRateW / 7;

    k.users = Math.round(clamp((k.users || 0) * (1 + growthRateD), 0, 9_999_999));
    const retentionW = clampPct((k.retention || 30) + (scores.productFit - 50) * 0.02 + supportBoostW * 22 - incentiveBoostW * 20 - crashPenaltyW * 30);
    // smooth retention daily
    k.retention = clampPct((k.retention || 30) * 0.8 + retentionW * 0.2);
    k.dau = Math.round(clamp(k.users * clamp(0.03 + k.retention / 300, 0.03, 0.25), 0, k.users));

    // DeFi metrics daily
    if (k.tvl != null && k.volume != null) {
      const secSpendBoost = clamp((ops.securityBudgetWeekly || 0) / 220000, 0, 0.10);
      const compSpendBoost = clamp((ops.complianceBudgetWeekly || 0) / 220000, 0, 0.08);
      const trust = clamp(0.5 + scores.security / 200 + scores.compliance / 260 + secSpendBoost + compSpendBoost - prod.risk.security / 220, 0.2, 1.28);
      const tvlRateW = clamp(growthRateW * 0.8 + (trust - 0.8) * 0.06, -0.08, 0.10);
      const tvlRateD = tvlRateW / 7;
      k.tvl = Math.round(clamp((k.tvl || 0) * (1 + tvlRateD), 0, 9_999_999_999));

      const volumeRateW = clamp(0.08 + trust * 0.15 + incentiveBoostW * 0.6, 0.05, 0.6);
      const volumeRateD = volumeRateW / 7;
      k.volume = Math.round(clamp((k.tvl || 0) * volumeRateD, 0, 9_999_999_999));
    }

    // revenue & profit daily
    // 1) DeFi 业务：volume * feeRate
    // 2) 非 DeFi 产品也应有基础商业化（订阅/服务费/增值）：按 DAU 给一个轻量 ARPU
    const feeRate = clamp((k.feeRateBps || 0) / 10_000, 0, 0.02);
    const vol = Math.max(0, Math.round(k.volume || 0));
    const fees = Math.round(vol * feeRate);
    const take = clamp(k.protocolTakePct || 0.35, 0.05, 0.95);
    const feeRevenue = Math.round(fees * take);

    // Base revenue: makes early ops less punishing, especially for wallet/rpc/indexer
    const dau = Math.max(0, Math.round(k.dau || 0));
    const unlocked = Array.isArray(state.research?.unlocked) ? state.research.unlocked : [];
    const has = (id) => unlocked.includes(id);
    const arpuMulGlobal = has("prod_analytics") ? 1.15 : 1.0;
    const infraCostMulGlobal = has("cost_optimization") ? 0.88 : 1.0;
    const secCostMulGlobal = has("security_tooling_ops") ? 0.88 : 1.0;
    const arpuBase = clamp(0.08 + (scores.productFit || 50) / 900 + (scores.growth || 50) / 1100, 0.06, 0.35) * arpuMulGlobal;
    const archetype = String(prod.archetype || "");
    const arpuMul = archetype === "rpc" || archetype === "indexer" ? 2.2 : archetype === "wallet" ? 1.4 : 1.0;
    // DeFi 也有“非交易”收入，但更低
    const isDefi = k.tvl != null && k.volume != null;
    const baseRevenue = Math.round(dau * arpuBase * arpuMul * (isDefi ? 0.45 : 1.0));

    const revenue = Math.round(feeRevenue + baseRevenue);
    k.revenueFee = feeRevenue;
    k.revenueBase = baseRevenue;

    // Costs: tune down to make early-game less negative
    const infraCostW = Math.round((240 + (dau || 0) * 0.18 + (vol / 1_000_000) * 28) * infraCostMulGlobal);
    const secCostW = Math.round((160 + (100 - (scores.security || 50)) * 3.2) * secCostMulGlobal);
    const buybackW = Math.round(revenue * clamp(ops.buybackPct || 0, 0, 0.5));
    const incentivesW = Math.round(clamp(ops.incentivesBudgetWeekly || 0, 0, 999999999));
    const marketingW = Math.round(clamp(ops.marketingBudgetWeekly || 0, 0, 999999999));
    const securityW = Math.round(clamp(ops.securityBudgetWeekly || 0, 0, 999999999));
    const infraW = Math.round(clamp(ops.infraBudgetWeekly || 0, 0, 999999999));
    const complianceW = Math.round(clamp(ops.complianceBudgetWeekly || 0, 0, 999999999));
    const supportW = Math.round(clamp(ops.supportBudgetWeekly || 0, 0, 999999999));
    const referralPct = clamp(Number(ops.referralPct) || 0, 0, 0.3);
    const referralW = Math.round(revenue * referralPct * 0.25);

    // Optional “extra spend” can reduce certain costs (but you still pay the spend)
    const infraCostMulSpend = clamp(1 - infraW / 350000 * 0.22, 0.78, 1.0);
    const secCostMulSpend = clamp(1 - securityW / 350000 * 0.25, 0.75, 1.0);
    const infraCost = Math.round((infraCostW * infraCostMulSpend) / 7);
    const secCost = Math.round((secCostW * secCostMulSpend) / 7);
    const buyback = Math.round(buybackW / 7);
    const incentives = Math.round(incentivesW / 7);
    const marketing = Math.round(marketingW / 7);
    const security = Math.round(securityW / 7);
    const compliance = Math.round(complianceW / 7);
    const support = Math.round(supportW / 7);
    const referral = Math.round(referralW / 7);

    const profit = revenue - infraCost - secCost - incentives - buyback - marketing - security - compliance - support - referral;
    k.fees = fees;
    k.revenue = revenue;
    k.profit = profit;
    k.costInfra = infraCost;
    k.costSec = secCost;
    k.costIncentives = incentives;
    k.costBuyback = buyback;
    k.costMarketing = marketing;
    k.costSecurity = security;
    k.costCompliance = compliance;
    k.costSupport = support;
    k.costReferral = referral;
    k.marginPct = revenue > 0 ? Math.round(clamp((profit / revenue) * 100, -999, 999)) : 0;
    k.cumProfit = Math.round((Number(k.cumProfit) || 0) + profit);
    k.cumRevenue = Math.round((Number(k.cumRevenue) || 0) + revenue);

    // apply cash
    state.resources.cash = Math.round((state.resources.cash || 0) + profit);
    state.progress.earnedTotal = Math.round((state.progress.earnedTotal || 0) + Math.max(0, profit));

    // risk drift daily (milder)
    const secSpendRiskCut = clamp((ops.securityBudgetWeekly || 0) / 260000, 0, 1.4) * 0.35;
    const compSpendRiskCut = clamp((ops.complianceBudgetWeekly || 0) / 260000, 0, 1.2) * 0.30;
    // Make risk growth very slow; rely on rare shocks + player neglect to create crises.
    prod.risk.security = clampPct((prod.risk.security || 10) + (100 - scores.security) * 0.0015 + ri(-1, 1) - (ops.incentivesBudgetWeekly > 0 ? 0.12 : 0) - secSpendRiskCut);
    prod.risk.compliance = clampPct((prod.risk.compliance || 10) + (100 - scores.compliance) * 0.0015 + ri(-1, 1) + (ops.emissions > 0.3 ? 0.18 : 0) - compSpendRiskCut);

    // token price (daily) - responds to ops params + fundamentals
    const token0 = typeof k.tokenPrice === "number" ? k.tokenPrice : 1;
    const rev = Math.max(0, Number(k.revenue) || 0);
    const prof = Number(k.profit) || 0;
    const margin = rev > 0 ? clamp(prof / rev, -1, 1) : 0;
    const buybackBoost = clamp(Number(ops.buybackPct) || 0, 0, 0.5) * 0.03;
    const emissionPenalty = clamp(Number(ops.emissions) || 0, 0, 1) * 0.035;
    const incentiveHype = clamp((Number(ops.incentivesBudgetWeekly) || 0) / 200000, 0, 0.05) * 0.01;
    const growthTilt = (clampPct(scores.growth || 50) - 50) / 25000;
    const qualityTilt = (clampPct(scores.security || 50) - 50) / 45000 + (clampPct(scores.techQuality || 50) - 50) / 60000;
    const riskPenalty = (clampPct(prod.risk.security || 10) / 100) * 0.010 + (clampPct(prod.risk.compliance || 10) / 100) * 0.006;
    const profitTilt = margin * 0.010;
    const baseDrift = 0.0015; // mild bull bias to feel alive
    let rD = baseDrift + growthTilt + qualityTilt + profitTilt + buybackBoost - emissionPenalty + incentiveHype - riskPenalty + rnd(-0.008, 0.008);
    // occasional shock when risk is high
    if ((prod.risk.security || 0) >= 75 && Math.random() < 0.06) rD -= rnd(0.08, 0.22);
    rD = clamp(rD, -0.18, 0.18);
    k.tokenPrice = clamp(token0 * (1 + rD), 0.01, 9999);
  }
}

function salaryBurnDaily(state) {
  const weekly = salaryBurnWeekly(state);
  return Math.round(weekly / 7);
}

export function tickDay(state) {
  normalizeState(state);

  // salaries daily
  const sal = salaryBurnDaily(state);
  state.resources.cash -= sal;

  // living/office overhead daily
  const living = computeLivingCostDaily(state);
  state.resources.cash -= living;

  // products daily economics
  tickLiveProductsDaily(state);

  // global risk drift tied to products (daily)
  const products = state.active.products || [];
  if (products.length > 0) {
    const avgSec = products.reduce((a, p) => a + clampPct(p.risk?.security ?? 0), 0) / products.length;
    const avgComp = products.reduce((a, p) => a + clampPct(p.risk?.compliance ?? 0), 0) / products.length;
    // Pull global risk towards product risk slowly.
    state.resources.securityRisk = clampPct((state.resources.securityRisk || 0) * 0.92 + avgSec * 0.08 + ri(-2, 1));
    state.resources.complianceRisk = clampPct((state.resources.complianceRisk || 0) * 0.92 + avgComp * 0.08 + ri(-2, 1));
  } else {
    // No products => risks should naturally cool down.
    state.resources.securityRisk = clampPct((state.resources.securityRisk || 0) + ri(-3, 0));
    state.resources.complianceRisk = clampPct((state.resources.complianceRisk || 0) + ri(-3, 0));
  }

  // light daily noise so charts move even early game
  if (Math.random() < 0.06) state.resources.community = clampPct(state.resources.community + ri(0, 2));
  if (Math.random() < 0.04) state.resources.complianceRisk = clampPct(state.resources.complianceRisk + ri(0, 2));

  recordProductHistoryDaily(state);
}

export function tickWeek(state) {
  normalizeState(state);

  // inbox optional events (weekly cadence, doesn't interrupt)
  maybeGenerateInboxWeekly(state);

  seedMarket(state, false);
}

