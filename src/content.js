export const PROTOCOLS = [
  { key: "erc20", name: "ERC20/代币经济", diff: 22 },
  { key: "dex", name: "AMM/DEX", diff: 35 },
  { key: "lending", name: "借贷协议", diff: 42 },
  { key: "bridge", name: "跨链桥", diff: 55 },
  { key: "perp", name: "衍生品/永续", diff: 48 },
  { key: "aa", name: "账户抽象/钱包", diff: 40 },
  { key: "rollup", name: "Rollup/链级系统", diff: 62 },
];

export const DIRECT_CLIENTS = [
  "某 DeFi 初创团队",
  "某 VC 投后项目",
  "某交易所孵化项目",
  "某老牌 Web2 团队转型",
  "匿名资方支持的神秘项目",
  "朋友转介绍的“靠谱”项目",
];

export const PLATFORM_NAMES = ["Sherlock（抽象）", "Code4rena（抽象）", "Cantina（抽象）"];

// 公司池（玩法抽象）：用于 job offer / 在职状态 / 交易所“硬合规”差异
// 字段含义（0-100）：complianceStrict 越高越严格；shipUrgency 越高越卷；culture 越高越不容易 burnout
export const COMPANIES = [
  // Security firms / audit teams（相对自由）
  {
    key: "web3dao",
    name: "磐石安全实验室",
    type: "sec",
    workMode: "remote", // DAO 气质：远程为主（且穷）
    complianceStrict: 28,
    processMaturity: 35,
    culture: 72,
    shipUrgency: 45,
    // 给钱很少：≈ 其它公司的 1/10
    payBandWeekly: [720, 980],
  },
  {
    key: "cantina",
    name: "Cantina",
    type: "sec",
    workMode: "remote", // 欧美公司：远程为主
    complianceStrict: 35,
    processMaturity: 70,
    culture: 68,
    shipUrgency: 55,
    // L1 参考：≈ 7500 * 1.5 = 11250（更偏高，且有一点区间）
    payBandWeekly: [11800, 13000],
  },
  {
    key: "spearbit",
    name: "Spearbit",
    type: "sec",
    workMode: "remote",
    complianceStrict: 40,
    processMaturity: 78,
    culture: 62,
    shipUrgency: 58,
    payBandWeekly: [11800, 13200],
  },
  {
    key: "hashlock",
    name: "Hashlock",
    type: "sec",
    workMode: "remote",
    complianceStrict: 45,
    processMaturity: 66,
    culture: 60,
    shipUrgency: 60,
    // 其它公司：略低于欧美远程
    payBandWeekly: [8200, 9500],
  },
  {
    key: "certik",
    name: "CertiK（抽象）",
    type: "sec",
    workMode: "onsite",
    complianceStrict: 55,
    processMaturity: 75,
    culture: 55,
    shipUrgency: 62,
    payBandWeekly: [7800, 9000],
  },
  {
    key: "yubit",
    name: "Yubit",
    type: "sec",
    workMode: "onsite", // 你提到：Yubit 非远程
    complianceStrict: 48,
    processMaturity: 72,
    culture: 60,
    shipUrgency: 58,
    // L1 参考：≈ 7500/wk（给区间，后续由 levelOffer 乘子微调）
    payBandWeekly: [7800, 8200],
  },

  // Exchanges（更严格、更卷）
  {
    key: "binance",
    name: "Binance（抽象）",
    type: "exchange",
    workMode: "onsite",
    complianceStrict: 80,
    processMaturity: 80,
    culture: 45,
    shipUrgency: 78,
    payBandWeekly: [8200, 9800],
  },
  {
    key: "yh",
    name: "YH（抽象）",
    type: "exchange",
    workMode: "onsite", // 你提到：YH 也差不多
    complianceStrict: 78,
    processMaturity: 78,
    culture: 48,
    shipUrgency: 76,
    payBandWeekly: [7800, 8200],
  },
];

// 商店物品：用于“用钱换效率/抗压/训练”的轻量系统
// kind: permanent(永久加成) | consumable(一次性消耗品)
export const SHOP_ITEMS = [
  { key: "better_chair", kind: "permanent", once: true, cost: 1200 },
  { key: "report_templates", kind: "permanent", once: true, cost: 1400 },
  { key: "tooling_suite", kind: "permanent", once: true, cost: 2200 },
  { key: "gym_membership", kind: "permanent", once: true, cost: 1600 },
  { key: "therapy_session", kind: "consumable", once: false, cost: 300 },
  { key: "training_pack", kind: "consumable", once: false, cost: 500 },
];

// Feedback (Google Forms embed)
// - 使用 Google Forms 最省事：用户提交自动进 Google Sheet
// - 这里放 iframe 的 src 即可（embedded=true）
export const FEEDBACK_FORM_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdy7-mhsrVVAQrxnyxskTe-UKwzry8LBgB1o9zFDUnF1jP2nA/viewform?embedded=true";


