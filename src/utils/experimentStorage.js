const STORAGE_KEY = "experimentData";

const ROUND_ORDER = ["baseline", "improved", "adaptive"];

function makeRound(wipLimits) {
  return {
    status: "pending",
    wipLimits,
    startTime: null,
    endTime: null,
    scannedItems: {},
    blockingEvents: [],
    starvingEvents: [],
    decisions: [],
  };
}

const DEFAULT_DATA = {
  currentRound: "baseline",
  rounds: {
    baseline: makeRound({ stage1: 999, stage2: 999, stage3: 999 }),
    improved: makeRound({ stage1: 2, stage2: 2, stage3: 2 }),
    adaptive: makeRound({ stage1: 2, stage2: 2, stage3: 2 }),
  },
};

export function getExperimentData() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveExperimentData(data) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Dispatch storage event for same-tab listeners
  window.dispatchEvent(new Event("experimentDataChanged"));
}

export function initExperimentData() {
  if (!getExperimentData()) {
    saveExperimentData(DEFAULT_DATA);
  }
}

export function resetExperimentData() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem("scannedItems");
  saveExperimentData(DEFAULT_DATA);
}

export function getCurrentRound() {
  const data = getExperimentData();
  return data?.currentRound ?? "baseline";
}

export function getActiveWipLimits() {
  const data = getExperimentData();
  if (!data) return { stage1: 999, stage2: 999, stage3: 999 };
  const round = data.rounds[data.currentRound];
  if (!round || round.status !== "active") return { stage1: 999, stage2: 999, stage3: 999 };
  return round.wipLimits;
}

export function setWipLimits(roundName, limits) {
  const data = getExperimentData();
  if (!data) return;
  data.rounds[roundName].wipLimits = limits;
  saveExperimentData(data);
}

export function startRound(roundName) {
  const data = getExperimentData();
  if (!data) return;
  data.rounds[roundName].status = "active";
  data.rounds[roundName].startTime = new Date().toISOString();
  data.currentRound = roundName;
  saveExperimentData(data);
}

export function endRound() {
  const data = getExperimentData();
  if (!data) return;
  const roundName = data.currentRound;
  const round = data.rounds[roundName];
  if (!round || round.status !== "active") return;

  round.status = "completed";
  round.endTime = new Date().toISOString();

  // Snapshot current scannedItems
  const raw = sessionStorage.getItem("scannedItems");
  round.scannedItems = raw ? JSON.parse(raw) : {};

  // Clear scannedItems for next round
  sessionStorage.removeItem("scannedItems");

  // Advance to next round
  const idx = ROUND_ORDER.indexOf(roundName);
  if (idx < ROUND_ORDER.length - 1) {
    data.currentRound = ROUND_ORDER[idx + 1];
  }

  saveExperimentData(data);
}

export function logBlockingEvent(itemCode, targetStage, currentWip, wipLimit) {
  const data = getExperimentData();
  if (!data) return;
  const round = data.rounds[data.currentRound];
  if (!round || round.status !== "active") return;
  round.blockingEvents.push({
    timestamp: new Date().toISOString(),
    itemCode,
    targetStage,
    currentWip,
    wipLimit,
  });
  saveExperimentData(data);
}

export function logStarvingEvent(emptyStage, upstreamStage, upstreamCount) {
  const data = getExperimentData();
  if (!data) return;
  const round = data.rounds[data.currentRound];
  if (!round || round.status !== "active") return;
  round.starvingEvents.push({
    timestamp: new Date().toISOString(),
    emptyStage,
    upstreamStage,
    upstreamCount,
  });
  saveExperimentData(data);
}

export function logDecision(stage, oldLimit, newLimit) {
  const data = getExperimentData();
  if (!data) return;
  const round = data.rounds["adaptive"];
  if (!round) return;
  round.decisions.push({
    timestamp: new Date().toISOString(),
    stage,
    oldLimit,
    newLimit,
  });
  saveExperimentData(data);
}

export function getRoundMetrics(roundName) {
  const data = getExperimentData();
  if (!data) return null;
  const round = data.rounds[roundName];
  if (!round || round.status === "pending") return null;

  const items = Object.values(round.scannedItems || {});
  const completedItems = items.filter((i) => (i.scanCount || 0) >= 4);
  const throughput = completedItems.length;

  const times = completedItems.map((i) => Number(i.totalTimeGapSeconds) || 0);
  const avgCycleTime =
    times.length > 0
      ? Math.floor(times.reduce((s, v) => s + v, 0) / times.length)
      : 0;

  const finalWip = {
    stage1: items.filter((i) => i.scanCount === 1).length,
    stage2: items.filter((i) => i.scanCount === 2).length,
    stage3: items.filter((i) => i.scanCount === 3).length,
  };

  const durationSec =
    round.startTime && round.endTime
      ? Math.floor(
          (new Date(round.endTime) - new Date(round.startTime)) / 1000
        )
      : null;

  return {
    roundName,
    status: round.status,
    throughput,
    avgCycleTime,
    finalWip,
    blockingCount: round.blockingEvents.length,
    starvingCount: round.starvingEvents.length,
    decisionCount: round.decisions.length,
    durationSec,
    wipLimits: round.wipLimits,
  };
}

export function formatSeconds(totalSeconds) {
  const s = Number(totalSeconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
