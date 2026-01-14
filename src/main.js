// cache-bust: 避免浏览器强缓存旧模块导致“按钮没反应/文案不更新”
import { clamp, escapeHtml } from "./utils.js?v=35";
import { load, resetStorage, save } from "./storage.js?v=35";
import { adjustAfterAction, defaultState, healthCap, log, normalizeState, refreshAP, weekLabel } from "./state.js?v=35";
import {
  acceptJob,
  actionCost,
  activateDirect,
  activatePlatform,
  buyItem,
  careerAdvanceWeek,
  doAction,
  ensureCompanyTickets,
  findTarget,
  migrateCompensation,
  quitJob,
  requestRemoteWork,
  seedMarket,
  settleProjects,
  tickLeaderboards,
  useItem,
} from "./logic.js?v=35";
import { rollEvents } from "./events.js?v=35";
import { closeModal, openModal, toast } from "./modal.js?v=35";
import { bind, render, switchTab } from "./ui.js?v=35";
import { addXPosts } from "./xfeed.js?v=35";
import { setLang, t } from "./i18n.js?v=35";
import { pickAutoStep } from "./auto.js?v=35";
import { applyNegotiationMove, negotiationBody, negotiationMoves, startDirectNegotiation } from "./negotiation.js?v=35";

function isFreshStart(state) {
  return (
    state.now?.year === 1 &&
    state.now?.week === 1 &&
    (state.progress?.totalWeeks ?? 0) === 0 &&
    (state.active?.direct?.length ?? 0) === 0 &&
    (state.active?.platform?.length ?? 0) === 0
  );
}

function initNewState() {
  const s = normalizeState(defaultState());
  seedMarket(s, true);
  log(s, t(s, "log.welcome"));
  addXPosts(s, 4);
  refreshAP(s);
  s.ap.now = s.ap.max;
  s.flags.startFilled = true;
  return s;
}

function openNewGameModal(state, onStart) {
  const currentName = String(state?.player?.name || "");
  openModal({
    title: t(state, "modal.new.title"),
    body: `
      <div>${escapeHtml(t(state, "modal.new.body"))}</div>
      <div style="margin-top:12px;">
        <div class="muted" style="margin-bottom:6px;">${escapeHtml(t(state, "ui.newGame.name.label"))}</div>
        <input id="newPlayerName" class="input" type="text" value="${escapeHtml(currentName)}" placeholder="${escapeHtml(t(state, "ui.newGame.name.placeholder"))}" />
        <div class="muted" style="margin-top:6px;">${escapeHtml(t(state, "ui.newGame.name.hint"))}</div>
      </div>
    `,
    actions: [
      { label: t(state, "modal.common.cancel"), onClick: closeModal },
      {
        label: t(state, "modal.new.confirm"),
        kind: "primary",
        onClick: () => {
          const raw = /** @type {HTMLInputElement|null} */ (document.getElementById("newPlayerName"))?.value || "";
          const name = raw.trim();
          closeModal();
          onStart?.(name);
        },
      },
    ],
  });
}

function openDirectNegotiation(state, order, onDone) {
  // 自动化模式：不进谈判，避免卡弹窗
  if (state.settings?.auto?.enabled) {
    const r = activateDirect(state, order);
    if (!r.ok) toast(state, r.msg);
    onDone?.();
    return;
  }

  if (!state.negotiation || state.negotiation.kind !== "direct" || state.negotiation.orderId !== order.id) {
    state.negotiation = startDirectNegotiation(state, order);
    log(state, t(state, "log.nego.start", { title: order.title }));
    save(state);
  }

  const nego = state.negotiation;
  openModal({
    title: t(state, "ui.nego.title"),
    body: negotiationBody(state, nego),
    actions: negotiationMoves(state, nego).map((m) => ({
      label: m.label,
      kind: m.kind,
      onClick: () => {
        const res = applyNegotiationMove(state, nego, m.key);
        if (res.done) {
          closeModal();

          if (res.outcome === "cancel") {
            log(state, t(state, "log.nego.cancel", { title: order.title }), "warn");
            state.negotiation = null;
            save(state);
            onDone?.();
            return;
          }

          if (res.outcome === "fail") {
            log(state, t(state, "log.nego.fail", { title: order.title, reason: res.reason || "" }), "bad");
            state.stats.mood = Math.max(0, (state.stats.mood || 0) - 2);
            state.negotiation = null;
            save(state);
            onDone?.();
            return;
          }

          if (res.outcome === "sign") {
            const negotiated = {
              ...order,
              fee: nego.terms.fee,
              deadlineWeeks: nego.terms.deadlineWeeks,
              scope: nego.terms.scope,
              depositPct: nego.terms.depositPct,
            };
            const r = activateDirect(state, negotiated);
            if (!r.ok) {
              // 没接成（比如直客上限）：不要写“达成签约”的成功日志
              toast(state, r.msg);
              state.negotiation = null;
              save(state);
              onDone?.();
              return;
            }
            log(
              state,
              t(state, "log.nego.success", {
                title: order.title,
                fee: `¥${Math.round(nego.terms.fee).toLocaleString(state.settings?.lang === "en" ? "en-US" : "zh-CN")}`,
                weeks: nego.terms.deadlineWeeks,
                depositPct: `${Math.round(nego.terms.depositPct * 100)}%`,
              }),
              "good"
            );
            state.negotiation = null;
            save(state);
            onDone?.();
            return;
          }
        }

        // 未结束：刷新弹窗
        save(state);
        openDirectNegotiation(state, order, onDone);
      },
    })),
  });
}

function advanceWeek(state) {
  const h = clamp(Math.round(state.schedule?.hoursPerDay ?? 8), 6, 24);
  const cap = healthCap(state);
  const livingCost = 700;

  state.now.week += 1;
  if (state.now.week > 52) {
    state.now.week = 1;
    state.now.year += 1;
    log(state, t(state, "log.week.newYear"), "good");
  }

  // 每周刷新市场：直客/平台/职业 offer 都重刷一轮
  seedMarket(state, true);
  // 氛围向：每周刷几条 X 梗
  addXPosts(state);
  // 职业/公司/重大事件推进（工资、tickets、job offers、重大事件 tick）
  careerAdvanceWeek(state);

  // 每周固定生活成本：现金持续被“现实”抽干
  state.stats.cash -= livingCost;
  log(state, t(state, "log.week.livingCost", { amount: `¥${livingCost.toLocaleString(state.settings?.lang === "en" ? "en-US" : "zh-CN")}` }), "warn");

  // 每周自然恢复 + 工时代价/恢复
  // 血厚一点：基础恢复更强（且 cap 更高），避免“轻易嘎”
  adjustAfterAction(state, { stamina: Math.round(cap * 0.04), mood: Math.round(cap * 0.03) }); // 150 cap: +6/+5
  if (h > 8) {
    const t = h - 8;
    // 非线性损耗：越接近“不睡觉”，代价越夸张；但不做成“24h 一周必死”
    // 经验目标：24h 极其危险（本周不休息会很快见底），但如果本周大量休息/下周躺平，仍可苟住
    // 调得更像“能扛但会折寿”：整体放缓系数
    let sta = Math.round(t * 0.9 + (t * t) / 14);
    let md = Math.round(t * 0.5 + (t * t) / 24);
    // 22~24h 额外伤害递增，但幅度收敛（避免秒杀）
    if (h >= 22) {
      const x = h - 22; // 22->0, 24->2
      sta += Math.round(x * 2.0); // 24 额外 +4（仍明显更伤）
      md += Math.round(x * 1.2); // 24 额外 +2~3
    }
    adjustAfterAction(state, { stamina: -sta, mood: -md });
  }
  if (h < 8) adjustAfterAction(state, { stamina: +(8 - h), mood: Math.round((8 - h) / 2) });

  refreshAP(state);
  state.ap.now = state.ap.max;

  const hasActive = state.active.direct.length > 0 || state.active.platform.length > 0 || (state.active.company?.length || 0) > 0;
  if (!hasActive) state.progress.noOrderWeeks += 1;
  else state.progress.noOrderWeeks = 0;
  state.progress.totalWeeks += 1;

  // 现金压力（按新币值缩放）
  if (state.stats.cash < livingCost * 2) adjustAfterAction(state, { mood: -2 });
  if (state.stats.compliance > 70) adjustAfterAction(state, { mood: -2 });

  // 同行榜：每周滚动一次（尽量贴近玩家本周增速）
  tickLeaderboards(state);

  log(state, t(state, "log.week.enter", { week: weekLabel(state) }));
}

function triggerEnd(state, kind, title, reason, restart) {
  state.flags.gameOver = { kind, title, reason };
  log(state, `【${title}】${reason}`, kind === "win" ? "good" : "bad");
  openModal({
    title,
    body: `<div>${escapeHtml(reason)}</div><div style="margin-top:10px;" class="muted">你可以重置存档重新开始，或关闭弹窗查看时间线。</div>`,
    actions: [
      { label: "关闭", onClick: closeModal },
      { label: "重置并重开", kind: "primary", onClick: restart },
    ],
  });
}

function checkEndings(state, restart) {
  if (state.flags.gameOver) return;
  const s = state.stats;

  if (s.cash < 0) return triggerEnd(state, "lose", "资金链断裂", "现金为负，无法维持开销。", restart);
  if (s.stamina <= 0) return triggerEnd(state, "lose", "身心崩溃", "精力归零：你连 IDE 都不想打开了。", restart);
  if (s.mood <= 0) return triggerEnd(state, "lose", "精神崩溃", "心态归零：你选择退网，世界清净。", restart);
  if (s.compliance >= 100) return triggerEnd(state, "lose", "监管介入", "合规风险爆表：你决定暂时离开这个圈子。", restart);
  if (s.reputation <= 0 && state.progress.noOrderWeeks >= 8) return triggerEnd(state, "lose", "声望归零", "连续 8 周没有订单，市场把你忘了。", restart);

  // 经济缩放：现金阈值相应降低
  const win1 = s.reputation >= 90 && s.compliance < 20 && s.cash >= 20000;
  const win2 = s.platformRating >= 70 && s.reputation >= 60 && s.compliance < 35;
  if (win1) return triggerEnd(state, "win", "合伙人结局", "你建立了稳定的品牌与交付体系，成为行业“常青树”。", restart);
  if (win2) return triggerEnd(state, "win", "平台封神结局", "你在平台赛道冲到前排，名字被写进邀请名单。", restart);
}

function playEventsSequentially(state, events, done) {
  const next = () => {
    if (!events.length) return done?.();
    const e = events.shift();

    // 自动化：不弹事件选择窗，直接按默认策略选一个选项继续
    if (state.settings?.auto?.enabled) {
      const choices = e.choices(state) || [];
      const picked = choices.find((c) => c.primary) || choices[0];
      if (picked) {
        picked.apply(state);
        render(state);
        next();
        return;
      }
      // 没有选项也继续推进，避免卡死
      next();
      return;
    }

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

function endWeek(state, restart) {
  if (state.flags.gameOver) return;
  settleProjects(state);

  const events = rollEvents(state);
  if (events.length) {
    playEventsSequentially(state, events, () => {
      advanceWeek(state);
      checkEndings(state, restart);
      render(state);
    });
    return;
  }

  advanceWeek(state);
  checkEndings(state, restart);
  render(state);
}

function main() {
  let state = normalizeState(load() || initNewState());
  migrateCompensation(state);
  // 启动时补齐市场与公司任务（避免旧存档出现“职业页空空如也”）
  seedMarket(state, false);
  ensureCompanyTickets(state);
  refreshAP(state);

  let autoTimer = null;
  let autoLastLogAt = 0;
  const stopAuto = () => {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  };
  const startAuto = () => {
    stopAuto();
    const ms = clamp(Math.round(state.settings?.auto?.stepMs ?? 2000), 500, 5000);
    autoTimer = setInterval(() => {
      normalizeState(state);
      if (state.flags.gameOver) return stopAuto();
      if (!state.settings.auto.enabled) return stopAuto();

      // 如果用户此刻打开了弹窗（新档/重置/说明等），自动化先暂停，避免抢焦点/关弹窗
      const modalEl = document.getElementById("modal");
      if (modalEl && !modalEl.classList.contains("is-hidden")) return;

      // AP 不够时：根据选项自动结束本周
      if (state.ap.now <= 0) {
        if (state.settings.auto.autoEndWeek) endWeek(state, restart);
        else stopAuto();
        return;
      }

      const step = pickAutoStep(state);
      if (!step) return;

      // 低频提示：每 20 秒最多一条，避免刷屏
      const now = Date.now();
      if (now - autoLastLogAt > 20000) {
        autoLastLogAt = now;
        log(state, state.settings.lang === "en" ? `Automation: ${step.reason}` : `自动化：${step.reason}`);
      }

      if (step.kind === "accept") {
        const { kind, id } = step.target || {};
        if (kind === "direct") {
          const order = state.market.direct.find((x) => x.id === id);
          if (order) activateDirect(state, order);
        } else if (kind === "platform") {
          const contest = state.market.platform.find((x) => x.id === id);
          if (contest) activatePlatform(state, contest);
        }
        render(state);
        return;
      }

      if (step.kind === "career") {
        if (step.op === "acceptJob") {
          if (state.settings.auto.allowAcceptJob) acceptJob(state, step.id);
        }
        if (step.op === "quitJob") {
          if (state.settings.auto.allowQuitJob) quitJob(state);
        }
        render(state);
        return;
      }

      if (step.kind === "selectAndAction") {
        state.selectedTarget = step.target;
        const target = findTarget(state, step.target.kind, step.target.id);
        const cost = actionCost(state, step.key, target);
        if (cost > state.ap.now) {
          if (state.settings.auto.autoEndWeek) endWeek(state, restart);
          else stopAuto();
          return;
        }
        const before = state.ap.now;
        doAction(state, step.key, null); // 自动化不弹 toast（避免用户不想要的中断）
        if (state.ap.now === before && state.settings.auto.autoEndWeek && state.ap.now <= 1) endWeek(state, restart);
        render(state);
        return;
      }

      if (step.kind === "action") {
        const cost = actionCost(state, step.key, null);
        if (cost > state.ap.now) {
          if (state.settings.auto.autoEndWeek) endWeek(state, restart);
          else stopAuto();
          return;
        }
        const before = state.ap.now;
        doAction(state, step.key, null);
        if (state.ap.now === before && state.settings.auto.autoEndWeek && state.ap.now <= 1) endWeek(state, restart);
        render(state);
        return;
      }
    }, ms);
  };

  // 兼容旧存档：如果没有 X 时间线内容，先补几条（纯氛围，不影响数值）
  if (!state.x?.feed || state.x.feed.length === 0) {
    addXPosts(state, 4);
    save(state);
  }

  // 仅对“全新第一周”补一次满行动点
  if (isFreshStart(state) && !state.flags.startFilled) {
    state.ap.now = state.ap.max;
    state.flags.startFilled = true;
    save(state);
  }

  const restart = () => {
    closeModal();
    resetStorage();
    state = initNewState();
    render(state);
    switchTab("workbench");
  };

  bind(state, {
    onAction: (key) => {
      doAction(state, key, (msg) => toast(state, msg));
      render(state);
    },
    onAccept: (kind, id) => {
      if (kind === "direct") {
        const order = state.market.direct.find((x) => x.id === id);
        if (!order) return;
        openDirectNegotiation(state, order, () => render(state));
      } else {
        const contest = state.market.platform.find((x) => x.id === id);
        if (!contest) return;
        const r = activatePlatform(state, contest);
        if (!r.ok) toast(state, r.msg);
      }
      render(state);
    },
    onSelect: (kind, id) => {
      state.selectedTarget = { kind, id };
      log(
        state,
        t(state, "log.target.switched", {
          kind: t(state, `log.target.kind.${kind === "direct" ? "direct" : kind === "platform" ? "platform" : "company"}`),
          id,
        })
      );
      render(state);
    },
    onCareer: (raw) => {
      if (!raw) return;
      if (raw === "quitJob") {
        const r = quitJob(state);
        if (!r.ok) toast(state, r.msg);
        render(state);
        return;
      }
      if (raw === "requestRemote") {
        const r = requestRemoteWork(state);
        if (!r.ok) toast(state, r.msg);
        render(state);
        return;
      }
      if (raw.startsWith("acceptJob:")) {
        const id = raw.split(":")[1];
        const r = acceptJob(state, id);
        if (!r.ok) toast(state, r.msg);
        render(state);
        return;
      }
    },
    onShop: (raw) => {
      if (!raw) return;
      if (raw.startsWith("buy:")) {
        const key = raw.split(":")[1];
        const r = buyItem(state, key);
        if (!r.ok) toast(state, r.msg);
        render(state);
        return;
      }
      if (raw.startsWith("use:")) {
        const key = raw.split(":")[1];
        const r = useItem(state, key);
        if (!r.ok) toast(state, r.msg);
        render(state);
        return;
      }
    },
    onEndWeek: () => {
      // 自动化开启时：避免“确认弹窗”被自动化抢焦点，直接结束本周
      if (state.settings?.auto?.enabled) {
        endWeek(state, restart);
        return;
      }
      openModal({
        title: t(state, "modal.endWeek.title"),
        body: `<div>${escapeHtml(t(state, "modal.endWeek.body"))}</div>`,
        actions: [
          { label: t(state, "modal.common.cancel"), onClick: closeModal },
          {
            label: t(state, "modal.common.confirm"),
            kind: "primary",
            onClick: () => {
              closeModal();
              endWeek(state, restart);
            },
          },
        ],
      });
    },
    onSave: () => {
      save(state);
      toast(state, t(state, "toast.saved"));
      render(state);
    },
    onClearLog: () => {
      state.log = [];
      save(state);
      render(state);
    },
    onNewGame: () => {
      openNewGameModal(state, (name) => {
        state = initNewState();
        if (name) state.player.name = name;
        save(state);
        render(state);
        switchTab("workbench");
      });
    },
    onResetGame: () => {
      openModal({
        title: t(state, "modal.reset.title"),
        body: `
          <div><b>${escapeHtml(t(state, "modal.reset.body"))}</b></div>
          <div style="margin-top:12px;">
            <div class="muted" style="margin-bottom:6px;">${escapeHtml(t(state, "ui.newGame.name.label"))}</div>
            <input id="newPlayerName" class="input" type="text" value="${escapeHtml(String(state?.player?.name || ""))}" placeholder="${escapeHtml(t(state, "ui.newGame.name.placeholder"))}" />
            <div class="muted" style="margin-top:6px;">${escapeHtml(t(state, "ui.newGame.name.hint"))}</div>
          </div>
        `,
        actions: [
          { label: t(state, "modal.common.cancel"), onClick: closeModal },
          {
            label: t(state, "modal.reset.confirm"),
            kind: "primary",
            onClick: () => {
              const raw = /** @type {HTMLInputElement|null} */ (document.getElementById("newPlayerName"))?.value || "";
              const name = raw.trim();
              closeModal();
              resetStorage();
              state = initNewState();
              if (name) state.player.name = name;
              save(state);
              render(state);
              switchTab("workbench");
            },
          },
        ],
      });
    },
    onCloseModal: closeModal,
    onLangChange: (lang) => {
      setLang(state, lang);
      render(state);
    },
    onAutoChange: (next) => {
      normalizeState(state);
      state.settings.auto = { ...state.settings.auto, ...next };
      save(state);
      if (state.settings.auto.enabled) startAuto();
      else stopAuto();
      render(state);
    },
    onHoursChange: (h) => {
      normalizeState(state);
      if (state.flags.gameOver) return;
      if (state.ap.now < state.ap.max) {
        toast(state, t(state, "ui.hours.locked"));
        render(state);
        return;
      }
      const next = clamp(h || 8, 6, 24);
      const oldMax = state.ap.max;
      state.schedule.hoursPerDay = next;
      refreshAP(state);
      const delta = state.ap.max - oldMax;
      if (delta > 0) state.ap.now = clamp(state.ap.now + delta, 0, state.ap.max);
      else state.ap.now = clamp(state.ap.now, 0, state.ap.max);
      log(
        state,
        next > 8
          ? t(state, "log.hours.set.overtime", { h: next })
          : next < 8
            ? t(state, "log.hours.set.chill", { h: next })
            : t(state, "log.hours.set.normal")
      );
      render(state);
    },
  });

  render(state);
  switchTab("workbench");

  // 自动化：如果存档里已开启，启动
  if (state.settings?.auto?.enabled) startAuto();
}

main();

