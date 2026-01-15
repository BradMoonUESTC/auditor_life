import { pick, ri } from "./utils.js?v=54";
import { weekLabel } from "./state.js?v=54";
import { getXMemes } from "./i18n.js?v=54";

const AUTHORS = [
  { handle: "@ser_auditor", name: "Ser Auditor" },
  { handle: "@reentrancy_enjoyer", name: "Reentrancy Enjoyer" },
  { handle: "@bridge_is_fine", name: "This Bridge Is Fine" },
  { handle: "@gas_optimooor", name: "Gas Optimooor" },
  { handle: "@foundry_maxi", name: "Foundry Maxi" },
  { handle: "@formal-ish", name: "Formal-ish Methods" },
  { handle: "@scope_creep", name: "Scope Creep PM" },
  { handle: "@c4_dup", name: "C4 Duplicate Bot" },
  { handle: "@sherlock_judge", name: "Sherlock Judge (parody)" },
  { handle: "@cantina_member", name: "Cantina Member (parody)" },
];


function mkPost(state) {
  const a = pick(AUTHORS);
  const text = pick(getXMemes(state));
  const likes = ri(12, 1200);
  const rts = ri(3, 420);
  return {
    id: `x_${Date.now()}_${ri(1000, 9999)}`,
    t: weekLabel(state),
    author: `${a.name} ${a.handle}`,
    text,
    likes,
    rts,
  };
}

export function addXPosts(state, count) {
  if (!state.x) state.x = { feed: [] };
  if (!Array.isArray(state.x.feed)) state.x.feed = [];
  const n = typeof count === "number" ? count : ri(2, 4);
  for (let i = 0; i < n; i++) state.x.feed.unshift(mkPost(state));
  state.x.feed = state.x.feed.slice(0, 80);
}

export function addCustomXPost(state, { author, text, likes, rts }) {
  if (!state.x) state.x = { feed: [] };
  if (!Array.isArray(state.x.feed)) state.x.feed = [];
  state.x.feed.unshift({
    id: `x_custom_${Date.now()}_${ri(1000, 9999)}`,
    t: weekLabel(state),
    author: author || "@you (thread)",
    text,
    likes: typeof likes === "number" ? likes : ri(120, 2400),
    rts: typeof rts === "number" ? rts : ri(30, 880),
  });
  state.x.feed = state.x.feed.slice(0, 80);
}

