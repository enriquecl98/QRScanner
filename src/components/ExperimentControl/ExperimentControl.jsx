import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Button,
  Chip,
  Paper,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import PendingIcon from "@mui/icons-material/Pending";
import BlockIcon from "@mui/icons-material/Block";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import TuneIcon from "@mui/icons-material/Tune";

import {
  getExperimentData,
  initExperimentData,
  resetExperimentData,
  startRound,
  endRound,
  setWipLimits,
  logDecision,
  getRoundMetrics,
  formatSeconds,
} from "../../utils/experimentStorage";

const ROUNDS = ["baseline", "improved", "adaptive"];

const ROUND_LABELS = {
  baseline: "Baseline",
  improved: "Improved",
  adaptive: "Adaptive",
};

const ROUND_DESCRIPTIONS = {
  baseline: "Free-flow production with no WIP constraints. Establishes the performance baseline.",
  improved: "Fixed WIP limits enforced per stage. Facilitator sets limits before starting.",
  adaptive: "Participants decide their own WIP limits. Each change is logged as a decision outcome.",
};

const ROUND_COLORS = {
  baseline: "#16a34a",
  improved: "#2563eb",
  adaptive: "#7c3aed",
};

function statusChip(status) {
  if (status === "active")
    return <Chip label="Active" size="small" sx={{ fontWeight: 700, backgroundColor: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }} />;
  if (status === "completed")
    return <Chip label="Completed" size="small" sx={{ fontWeight: 700, backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }} />;
  return <Chip label="Pending" size="small" sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }} />;
}

function RoundStepperCard({ rounds, currentRound }) {
  return (
    <Card sx={{ borderRadius: 4, border: "1px solid #e8ecf3", boxShadow: "0 10px 30px rgba(15,23,42,0.05)", mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5 }}>
          Experiment Progress
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
          {ROUNDS.map((roundName, idx) => {
            const round = rounds[roundName];
            const color = ROUND_COLORS[roundName];
            const isActive = round.status === "active";
            const isDone = round.status === "completed";

            return (
              <React.Fragment key={roundName}>
                <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 100 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDone ? `${color}15` : isActive ? `${color}20` : "#f1f5f9",
                      border: `2px solid ${isDone || isActive ? color : "#e2e8f0"}`,
                      color: isDone || isActive ? color : "#94a3b8",
                    }}
                  >
                    {isDone ? <CheckCircleIcon fontSize="small" /> : isActive ? <PendingIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ color: isDone || isActive ? color : "#94a3b8" }}>
                    {ROUND_LABELS[roundName]}
                  </Typography>
                  {statusChip(round.status)}
                </Stack>
                {idx < ROUNDS.length - 1 && (
                  <Box sx={{ flexGrow: 1, height: 2, backgroundColor: isDone ? color : "#e2e8f0", borderRadius: 1, display: { xs: "none", sm: "block" } }} />
                )}
              </React.Fragment>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function WipLimitsEditor({ roundName, wipLimits, onChange, disabled }) {
  if (roundName === "baseline") {
    return (
      <Alert severity="info" sx={{ borderRadius: 3 }}>
        Baseline round has no WIP limits — items flow freely through all stages.
      </Alert>
    );
  }

  const label = roundName === "adaptive" ? "Participant Decision — WIP Limit" : "WIP Limit";

  return (
    <Stack spacing={2}>
      {[1, 2, 3].map((stage) => {
        const key = `stage${stage}`;
        const stageNames = { 1: "Stage 1 — Preparation", 2: "Stage 2 — Assembly", 3: "Stage 3 — Packing" };
        return (
          <Stack key={key} direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" sx={{ minWidth: 180, color: "#374151" }}>
              {stageNames[stage]}
            </Typography>
            <TextField
              type="number"
              size="small"
              label={label}
              value={wipLimits[key] === 999 ? "" : wipLimits[key]}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onChange(key, isNaN(val) || val < 1 ? 1 : val);
              }}
              disabled={disabled}
              inputProps={{ min: 1, max: 99 }}
              sx={{ width: 160, "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
            />
          </Stack>
        );
      })}
    </Stack>
  );
}

function MetricsCards({ metrics }) {
  if (!metrics) return null;
  const cards = [
    { label: "Throughput", value: metrics.throughput, sub: "items completed" },
    { label: "Avg Cycle Time", value: formatSeconds(metrics.avgCycleTime), sub: "per completed item" },
    { label: "Blocking Events", value: metrics.blockingCount, sub: "WIP limit hits" },
    { label: "Starving Events", value: metrics.starvingCount, sub: "empty stage events" },
  ];
  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {cards.map((c) => (
        <Grid item xs={6} sm={3} key={c.label}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
            <Typography variant="caption" color="text.secondary">{c.label}</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.3 }}>{c.value}</Typography>
            <Typography variant="caption" color="text.secondary">{c.sub}</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

function EventsTable({ blockingEvents, starvingEvents, decisions }) {
  const allEvents = [
    ...blockingEvents.map((e) => ({ ...e, kind: "Blocked", detail: `${e.itemCode} → ${e.targetStage} (${e.currentWip}/${e.wipLimit})` })),
    ...starvingEvents.map((e) => ({ ...e, kind: "Starving", detail: `${e.emptyStage} empty, ${e.upstreamStage} has ${e.upstreamCount}` })),
    ...decisions.map((e) => ({ ...e, kind: "Decision", detail: `${e.stage}: ${e.oldLimit} → ${e.newLimit}` })),
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (allEvents.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No events recorded yet.
      </Typography>
    );
  }

  const kindColor = { Blocked: "#dc2626", Starving: "#d97706", Decision: "#7c3aed" };

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Detail</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allEvents.map((ev, i) => (
            <TableRow key={i}>
              <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                {new Date(ev.timestamp).toLocaleTimeString()}
              </TableCell>
              <TableCell>
                <Chip
                  label={ev.kind}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    backgroundColor: `${kindColor[ev.kind]}15`,
                    color: kindColor[ev.kind],
                    border: `1px solid ${kindColor[ev.kind]}30`,
                  }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: "0.8rem" }}>{ev.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function ExperimentControl() {
  const [expData, setExpData] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);

  const reload = useCallback(() => {
    initExperimentData();
    setExpData(getExperimentData());
  }, []);

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener("experimentDataChanged", handler);
    return () => window.removeEventListener("experimentDataChanged", handler);
  }, [reload]);

  if (!expData) return null;

  const { currentRound, rounds } = expData;
  const activeRound = rounds[currentRound];
  const isActive = activeRound?.status === "active";
  const isPending = activeRound?.status === "pending";
  const color = ROUND_COLORS[currentRound];

  const prevRound = ROUNDS[ROUNDS.indexOf(currentRound) - 1];
  const prevCompleted = !prevRound || rounds[prevRound]?.status === "completed";
  const allDone = ROUNDS.every((r) => rounds[r].status === "completed");

  const handleWipChange = (key, val) => {
    const oldLimit = activeRound.wipLimits[key];
    const newLimits = { ...activeRound.wipLimits, [key]: val };
    setWipLimits(currentRound, newLimits);
    if (currentRound === "adaptive" && isActive) {
      logDecision(key, oldLimit, val);
    }
    reload();
  };

  const handleStart = () => {
    startRound(currentRound);
    reload();
  };

  const handleEnd = () => {
    setEndDialogOpen(false);
    endRound();
    reload();
  };

  const handleReset = () => {
    setResetDialogOpen(false);
    resetExperimentData();
    reload();
  };

  const currentEvents = activeRound
    ? {
        blockingEvents: activeRound.blockingEvents || [],
        starvingEvents: activeRound.starvingEvents || [],
        decisions: activeRound.decisions || [],
      }
    : { blockingEvents: [], starvingEvents: [], decisions: [] };

  const metrics = getRoundMetrics(currentRound);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh", background: "linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%)" }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 5,
          border: "1px solid #e8ecf3",
          boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
          background: "linear-gradient(135deg, #0f172a 0%, #3730a3 55%, #7c3aed 100%)",
          color: "#fff",
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 52, height: 52, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.15)" }}>
                <ScienceIcon sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={800}>Experiment Control</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85 }}>
                  Manage rounds, WIP limits, and track experiment events.
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              startIcon={<RestartAltIcon />}
              onClick={() => setResetDialogOpen(true)}
              sx={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, px: 2.5, "&:hover": { backgroundColor: "rgba(255,255,255,0.25)" }, border: "1px solid rgba(255,255,255,0.25)" }}
            >
              Reset Experiment
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Round Progress Stepper */}
      <RoundStepperCard rounds={rounds} currentRound={currentRound} />

      {allDone ? (
        <Alert severity="success" sx={{ borderRadius: 4, mb: 3, fontWeight: 600 }}>
          All three rounds completed! View results in the Dashboard.
        </Alert>
      ) : (
        <>
          {/* Active Round Panel */}
          <Card sx={{ borderRadius: 4, border: "1px solid #e8ecf3", boxShadow: "0 10px 30px rgba(15,23,42,0.05)", mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: color }} />
                  <Typography variant="h5" fontWeight={800}>{ROUND_LABELS[currentRound]} Round</Typography>
                  {statusChip(activeRound?.status)}
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  {isPending && (
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleStart}
                      disabled={!prevCompleted}
                      sx={{ borderRadius: 3, fontWeight: 700, textTransform: "none", backgroundColor: color, "&:hover": { backgroundColor: color, opacity: 0.9 } }}
                    >
                      Start Round
                    </Button>
                  )}
                  {isActive && (
                    <Button
                      variant="outlined"
                      startIcon={<StopIcon />}
                      onClick={() => setEndDialogOpen(true)}
                      sx={{ borderRadius: 3, fontWeight: 700, textTransform: "none", borderColor: "#dc2626", color: "#dc2626", "&:hover": { borderColor: "#dc2626", backgroundColor: "#fef2f2" } }}
                    >
                      End Round
                    </Button>
                  )}
                </Stack>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {ROUND_DESCRIPTIONS[currentRound]}
              </Typography>

              <Divider sx={{ mb: 3 }} />

              {/* WIP Limits */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <TuneIcon fontSize="small" sx={{ color: color }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  WIP Limits {currentRound === "adaptive" && isActive && <Chip label="Editable during round" size="small" sx={{ ml: 1, fontWeight: 600, backgroundColor: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", fontSize: "0.7rem" }} />}
                </Typography>
              </Stack>

              <WipLimitsEditor
                roundName={currentRound}
                wipLimits={activeRound?.wipLimits || { stage1: 2, stage2: 2, stage3: 2 }}
                onChange={handleWipChange}
                disabled={currentRound !== "adaptive" && isActive}
              />

              {activeRound?.status === "completed" && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Round Metrics</Typography>
                  <MetricsCards metrics={metrics} />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Completed round metrics (if viewing a completed round) */}
      {activeRound?.status === "completed" && !allDone && (
        <></>
      )}

      {/* All completed rounds metrics */}
      {ROUNDS.filter((r) => rounds[r].status === "completed").length > 0 && (
        <Card sx={{ borderRadius: 4, border: "1px solid #e8ecf3", boxShadow: "0 10px 30px rgba(15,23,42,0.05)", mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Completed Round Summaries</Typography>
            {ROUNDS.filter((r) => rounds[r].status === "completed").map((roundName) => {
              const m = getRoundMetrics(roundName);
              return (
                <Box key={roundName} sx={{ mb: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: ROUND_COLORS[roundName] }} />
                    <Typography variant="subtitle1" fontWeight={700}>{ROUND_LABELS[roundName]}</Typography>
                    {statusChip("completed")}
                  </Stack>
                  <MetricsCards metrics={m} />
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Event Log */}
      <Card sx={{ borderRadius: 4, border: "1px solid #e8ecf3", boxShadow: "0 10px 30px rgba(15,23,42,0.05)" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <BlockIcon fontSize="small" sx={{ color: "#dc2626" }} />
            <HourglassEmptyIcon fontSize="small" sx={{ color: "#d97706" }} />
            <Typography variant="h6" fontWeight={800}>
              {ROUND_LABELS[currentRound]} — Event Log
            </Typography>
            <Chip
              label={currentEvents.blockingEvents.length + currentEvents.starvingEvents.length + currentEvents.decisions.length}
              size="small"
              sx={{ fontWeight: 700, backgroundColor: "#f1f5f9", color: "#64748b" }}
            />
          </Stack>
          <EventsTable {...currentEvents} />
        </CardContent>
      </Card>

      {/* End Round Dialog */}
      <Dialog open={endDialogOpen} onClose={() => setEndDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>End {ROUND_LABELS[currentRound]} Round?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will snapshot all current scanned items for this round and clear the scanner for the next round. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setEndDialogOpen(false)} sx={{ borderRadius: 3, textTransform: "none" }}>Cancel</Button>
          <Button onClick={handleEnd} variant="contained" color="error" sx={{ borderRadius: 3, textTransform: "none", fontWeight: 700 }}>
            End Round
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Reset Entire Experiment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will delete all round data, scan history, and events. The experiment will restart from Baseline. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setResetDialogOpen(false)} sx={{ borderRadius: 3, textTransform: "none" }}>Cancel</Button>
          <Button onClick={handleReset} variant="contained" color="error" sx={{ borderRadius: 3, textTransform: "none", fontWeight: 700 }}>
            Reset Everything
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
