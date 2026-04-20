import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Stack,
  Button,
  Chip,
  Divider,
  Tab,
  Tabs,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import ScienceIcon from "@mui/icons-material/Science";
import BlockIcon from "@mui/icons-material/Block";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import * as XLSX from "xlsx";

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";

import {
  getExperimentData,
  initExperimentData,
  getRoundMetrics,
  formatSeconds,
} from "../../utils/experimentStorage";

const ROUNDS = ["baseline", "improved", "adaptive"];
const ROUND_LABELS = { baseline: "Baseline", improved: "Improved", adaptive: "Adaptive" };
const ROUND_COLORS = { baseline: "#16a34a", improved: "#2563eb", adaptive: "#7c3aed" };

function formatSecondsLong(totalSeconds) {
  const safeSeconds = Number(totalSeconds) || 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) return `${hours} hr ${minutes} min ${seconds} sec`;
  if (minutes > 0) return `${minutes} min ${seconds} sec`;
  return `${seconds} sec`;
}

function SummaryAccordion({ title, data, color }) {
  return (
    <Accordion
      disableGutters
      sx={{
        borderRadius: 3,
        boxShadow: "none",
        border: "1px solid #e8ecf3",
        overflow: "hidden",
        backgroundColor: "#fff",
        "&:before": { display: "none" },
        height: "100%",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 64, "& .MuiAccordionSummary-content": { my: 1 } }}
      >
        <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          <Chip
            label={data.count}
            size="small"
            sx={{ fontWeight: 700, color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ backgroundColor: "#f8fafc" }}>
        {data.items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No items found.</Typography>
        ) : (
          <Stack spacing={1.2}>
            {data.items.map((item) => (
              <Paper key={item.code} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#fff", borderColor: "#e8ecf3" }}>
                <Typography variant="body2" fontWeight={700}>{item.code}</Typography>
                <Typography variant="body2" color="text.secondary">{item.name}</Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

function KpiCard({ icon, label, value, accent }) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        border: "1px solid #e8ecf3",
        background: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
        height: "100%",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#0f172a" }}>{value}</Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${accent}15`,
              color: accent,
              border: `1px solid ${accent}30`,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProductHistoryAccordion({ item }) {
  return (
    <Accordion
      disableGutters
      sx={{ mt: 2, borderRadius: 3, boxShadow: "none", border: "1px solid #e8ecf3", overflow: "hidden", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: "#f8fafc" }}>
        <Typography variant="subtitle2" fontWeight={700}>Scan History</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ backgroundColor: "#ffffff" }}>
        {item.scanEvents?.length ? (
          <Stack spacing={1.5}>
            {item.scanEvents.map((scan, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 2.5, backgroundColor: "#f8fafc", borderColor: "#e8ecf3" }}>
                <Typography variant="body2" fontWeight={700}>Scan #{index + 1}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{new Date(scan.displayDateTime).toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Difference: {scan.timeGap}</Typography>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">No scan history found.</Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

function ExperimentOverview({ expData }) {
  if (!expData) return null;
  const { rounds } = expData;
  const startedRounds = ROUNDS.filter((r) => rounds[r].status !== "pending");
  if (startedRounds.length === 0) return null;

  return (
    <Card sx={{ mb: 3, borderRadius: 5, border: "1px solid #e8ecf3", boxShadow: "0 10px 30px rgba(15,23,42,0.05)" }}>
      <CardContent sx={{ p: 3.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <ScienceIcon sx={{ color: "#7c3aed" }} />
          <Typography variant="h5" fontWeight={800}>Experiment Overview</Typography>
        </Stack>

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" } }}>
                <TableCell>Round</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Throughput</TableCell>
                <TableCell>Avg Cycle Time</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <BlockIcon fontSize="small" sx={{ color: "#dc2626", fontSize: 14 }} />
                    <span>Blocking</span>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <HourglassEmptyIcon fontSize="small" sx={{ color: "#d97706", fontSize: 14 }} />
                    <span>Starving</span>
                  </Stack>
                </TableCell>
                <TableCell>WIP Limits</TableCell>
                <TableCell>Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {startedRounds.map((roundName) => {
                const m = getRoundMetrics(roundName);
                const color = ROUND_COLORS[roundName];
                const round = rounds[roundName];
                return (
                  <TableRow key={roundName} sx={{ "&:hover": { backgroundColor: "#f8fafc" } }}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                        <Typography variant="body2" fontWeight={700}>{ROUND_LABELS[roundName]}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={round.status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          backgroundColor: round.status === "completed" ? "#eff6ff" : round.status === "active" ? "#dcfce7" : "#f1f5f9",
                          color: round.status === "completed" ? "#2563eb" : round.status === "active" ? "#15803d" : "#64748b",
                          border: `1px solid ${round.status === "completed" ? "#bfdbfe" : round.status === "active" ? "#bbf7d0" : "#e2e8f0"}`,
                        }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2" fontWeight={700}>{m?.throughput ?? "—"}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{m ? formatSeconds(m.avgCycleTime) : "—"}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={m?.blockingCount ?? "—"}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: "0.7rem", backgroundColor: (m?.blockingCount || 0) > 0 ? "#fef2f2" : "#f8fafc", color: (m?.blockingCount || 0) > 0 ? "#dc2626" : "#64748b" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={m?.starvingCount ?? "—"}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: "0.7rem", backgroundColor: (m?.starvingCount || 0) > 0 ? "#fffbeb" : "#f8fafc", color: (m?.starvingCount || 0) > 0 ? "#d97706" : "#64748b" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {round.wipLimits.stage1 < 999
                          ? `${round.wipLimits.stage1}/${round.wipLimits.stage2}/${round.wipLimits.stage3}`
                          : "None"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {m?.durationSec != null ? formatSeconds(m.durationSec) : "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [expData, setExpData] = useState(null);

  const reloadExp = useCallback(() => {
    initExperimentData();
    setExpData(getExperimentData());
  }, []);

  useEffect(() => {
    reloadExp();
    const handler = () => reloadExp();
    window.addEventListener("experimentDataChanged", handler);
    return () => window.removeEventListener("experimentDataChanged", handler);
  }, [reloadExp]);

  // Derive products based on selected tab
  const products = useMemo(() => {
    if (!expData) {
      const savedItems = sessionStorage.getItem("scannedItems");
      return Object.values(savedItems ? JSON.parse(savedItems) : {});
    }

    if (activeTab === "all") {
      // Merge current scannedItems + all completed round snapshots
      const current = sessionStorage.getItem("scannedItems");
      const currentItems = current ? JSON.parse(current) : {};
      const allItems = { ...currentItems };
      ROUNDS.forEach((r) => {
        const roundItems = expData.rounds[r]?.scannedItems || {};
        Object.entries(roundItems).forEach(([key, val]) => {
          // Key by round+code to avoid collision
          allItems[`${r}_${key}`] = { ...val, _round: r };
        });
      });
      return Object.values(allItems);
    }

    if (activeTab === expData.currentRound && expData.rounds[activeTab]?.status === "active") {
      const current = sessionStorage.getItem("scannedItems");
      return Object.values(current ? JSON.parse(current) : {});
    }

    return Object.values(expData.rounds[activeTab]?.scannedItems || {});
  }, [activeTab, expData]);

  const summary = useMemo(() => {
    const initial = {
      workInProgress: { classic: { count: 0, items: [] }, spicy: { count: 0, items: [] }, veggie: { count: 0, items: [] } },
      completed: { classic: { count: 0, items: [] }, spicy: { count: 0, items: [] }, veggie: { count: 0, items: [] } },
    };

    products.forEach((item) => {
      const normalizedType = (item.type || "").toLowerCase();
      const target = (item.scanCount || 0) < 4 ? initial.workInProgress[normalizedType] : initial.completed[normalizedType];
      if (target) {
        target.count += 1;
        target.items.push({ code: item.code, name: item.name });
      }
    });

    return initial;
  }, [products]);

  const kpi = useMemo(() => {
    const completedItems = products.filter((item) => (item.scanCount || 0) >= 4);
    const totalCompleted = completedItems.length;
    if (totalCompleted === 0) return { totalCompleted: 0, avgTime: "0 sec", fastest: "0 sec", slowest: "0 sec" };

    const times = completedItems.map((item) => Number(item.totalTimeGapSeconds) || 0);
    const totalTime = times.reduce((sum, current) => sum + current, 0);
    return {
      totalCompleted,
      avgTime: formatSecondsLong(Math.floor(totalTime / totalCompleted)),
      fastest: formatSecondsLong(Math.min(...times)),
      slowest: formatSecondsLong(Math.max(...times)),
    };
  }, [products]);

  const exportSingleProductExcel = (item) => {
    const round = item._round || (expData?.currentRound ?? "");
    const productRows = item.scanEvents?.length
      ? item.scanEvents.map((scan, index) => ({
          Round: ROUND_LABELS[round] || round || "—",
          "Scan Number": index + 1,
          "Product Code": item.code,
          "Product Name": item.name,
          Type: item.type || "",
          Ingredients: item.ingredients?.join(", ") || "",
          "Total Scans": item.scanCount || 0,
          "Scanned At": new Date(scan.displayDateTime).toLocaleString(),
          "Time Difference": scan.timeGap || "0 sec",
          "Time Difference Seconds": scan.timeGapSeconds ?? 0,
          "Total Time Gap": item.totalTimeGap || "0 sec",
          "Total Time Gap Seconds": item.totalTimeGapSeconds ?? 0,
          Status: (item.scanCount || 0) >= 4 ? "Completed" : "Work In Progress",
        }))
      : [
          {
            Round: ROUND_LABELS[round] || round || "—",
            "Product Code": item.code,
            "Product Name": item.name,
            Type: item.type || "",
            Ingredients: item.ingredients?.join(", ") || "",
            "Total Scans": item.scanCount || 0,
            "Last Scan": item.lastScan ? new Date(item.lastScan).toLocaleString() : "",
            "Total Time Gap": item.totalTimeGap || "0 sec",
            "Total Time Gap Seconds": item.totalTimeGapSeconds ?? 0,
            Status: (item.scanCount || 0) >= 4 ? "Completed" : "Work In Progress",
          },
        ];

    const worksheet = XLSX.utils.json_to_sheet(productRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Product Details");
    XLSX.writeFile(workbook, `${item.code}_${item.name.replace(/\s+/g, "_")}.xlsx`);
  };

  const exportAllProductsExcel = () => {
    if (!expData) return;

    const allRows = products.flatMap((item) => {
      const round = item._round || expData.currentRound || "";
      return item.scanEvents?.length
        ? item.scanEvents.map((scan, index) => ({
            Round: ROUND_LABELS[round] || round || "—",
            "Scan Number": index + 1,
            "Product Code": item.code,
            "Product Name": item.name,
            Type: item.type || "",
            Ingredients: item.ingredients?.join(", ") || "",
            "Total Scans": item.scanCount || 0,
            "Scanned At": new Date(scan.displayDateTime).toLocaleString(),
            "Time Difference": scan.timeGap || "0 sec",
            "Time Difference Seconds": scan.timeGapSeconds ?? 0,
            "Total Time Gap": item.totalTimeGap || "0 sec",
            "Total Time Gap Seconds": item.totalTimeGapSeconds ?? 0,
            Status: (item.scanCount || 0) >= 4 ? "Completed" : "Work In Progress",
          }))
        : [
            {
              Round: ROUND_LABELS[round] || round || "—",
              "Product Code": item.code,
              "Product Name": item.name,
              Type: item.type || "",
              Ingredients: item.ingredients?.join(", ") || "",
              "Total Scans": item.scanCount || 0,
              "Last Scan": item.lastScan ? new Date(item.lastScan).toLocaleString() : "",
              "Total Time Gap": item.totalTimeGap || "0 sec",
              "Total Time Gap Seconds": item.totalTimeGapSeconds ?? 0,
              Status: (item.scanCount || 0) >= 4 ? "Completed" : "Work In Progress",
            },
          ];
    });

    // Events sheet
    const eventRows = ROUNDS.flatMap((r) => {
      const round = expData.rounds[r];
      return [
        ...(round.blockingEvents || []).map((e) => ({
          Round: ROUND_LABELS[r],
          Type: "Blocking",
          Timestamp: new Date(e.timestamp).toLocaleString(),
          Detail: `${e.itemCode} blocked at ${e.targetStage} (${e.currentWip}/${e.wipLimit})`,
        })),
        ...(round.starvingEvents || []).map((e) => ({
          Round: ROUND_LABELS[r],
          Type: "Starving",
          Timestamp: new Date(e.timestamp).toLocaleString(),
          Detail: `${e.emptyStage} empty, ${e.upstreamStage} has ${e.upstreamCount} items`,
        })),
        ...(round.decisions || []).map((e) => ({
          Round: ROUND_LABELS[r],
          Type: "Decision",
          Timestamp: new Date(e.timestamp).toLocaleString(),
          Detail: `${e.stage}: limit changed ${e.oldLimit} → ${e.newLimit}`,
        })),
      ];
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), "Products");
    if (eventRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eventRows), "Events");
    }
    XLSX.writeFile(wb, "experiment_data.xlsx");
  };

  const roundTabOptions = [
    { value: "all", label: "All Rounds" },
    ...ROUNDS.map((r) => ({
      value: r,
      label: ROUND_LABELS[r],
      disabled: expData?.rounds[r]?.status === "pending",
    })),
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh", background: "linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%)" }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 5,
          border: "1px solid #e8ecf3",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",
          color: "#fff",
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight={800}>Burger Workflow Dashboard</Typography>
              <Typography variant="body1" sx={{ mt: 1, opacity: 0.85 }}>
                Track work in progress, completed items, scan history, and experiment round comparisons.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={exportAllProductsExcel}
              disabled={products.length === 0}
              sx={{ backgroundColor: "#fff", color: "#0f172a", fontWeight: 700, px: 2.5, "&:hover": { backgroundColor: "#e2e8f0" } }}
            >
              Download Excel
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Experiment Overview */}
      <ExperimentOverview expData={expData} />

      {/* Round Tabs */}
      <Card sx={{ mb: 3, borderRadius: 4, border: "1px solid #e8ecf3", boxShadow: "0 6px 20px rgba(15,23,42,0.04)" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            "& .MuiTab-root": { fontWeight: 700, textTransform: "none", fontSize: "0.875rem", minHeight: 52 },
            "& .MuiTabs-indicator": { height: 3, borderRadius: 2 },
          }}
        >
          {roundTabOptions.map((t) => (
            <Tab
              key={t.value}
              value={t.value}
              disabled={t.disabled}
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {t.value !== "all" && (
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ROUND_COLORS[t.value] || "#94a3b8", flexShrink: 0 }} />
                  )}
                  <span>{t.label}</span>
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Card>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <KpiCard label="Total Completed" value={kpi.totalCompleted} accent="#16a34a" icon={<CheckCircleOutlineIcon />} />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard label="Average Output Cycle Time" value={kpi.avgTime} accent="#2563eb" icon={<ScheduleOutlinedIcon />} />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard label="Fastest Output Cycle Time" value={kpi.fastest} accent="#7c3aed" icon={<FlashOnOutlinedIcon />} />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard label="Slowest Output Cycle Time" value={kpi.slowest} accent="#ea580c" icon={<TrendingUpOutlinedIcon />} />
        </Grid>
      </Grid>

      {/* WIP / Completed Accordions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 5, border: "1px solid #e8ecf3", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)", height: "100%" }}>
            <CardContent sx={{ p: 3.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Inventory2OutlinedIcon sx={{ color: "#2563eb" }} />
                <Typography variant="h5" fontWeight={800}>Work In Progress</Typography>
              </Stack>
              <Grid container spacing={2}>
                {["classic", "spicy", "veggie"].map((type, i) => (
                  <Grid item xs={12} md={4} key={type}>
                    <SummaryAccordion
                      title={type.charAt(0).toUpperCase() + type.slice(1)}
                      data={summary.workInProgress[type]}
                      color={["#16a34a", "#2563eb", "#ea580c"][i]}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 5, border: "1px solid #e8ecf3", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)", height: "100%" }}>
            <CardContent sx={{ p: 3.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <CheckCircleOutlineIcon sx={{ color: "#16a34a" }} />
                <Typography variant="h5" fontWeight={800}>Completed</Typography>
              </Stack>
              <Grid container spacing={2}>
                {["classic", "spicy", "veggie"].map((type, i) => (
                  <Grid item xs={12} md={4} key={type}>
                    <SummaryAccordion
                      title={type.charAt(0).toUpperCase() + type.slice(1)}
                      data={summary.completed[type]}
                      color={["#16a34a", "#2563eb", "#ea580c"][i]}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* All Products */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>All Products</Typography>
        <Typography variant="body2" color="text.secondary">{products.length} total items</Typography>
      </Stack>

      {products.length === 0 ? (
        <Card sx={{ borderRadius: 5, border: "1px solid #e8ecf3", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)" }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="body1" color="text.secondary">No scanned product data found.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3} alignItems="stretch">
          {products.map((item, idx) => (
            <Grid item xs={12} md={6} lg={4} key={item._round ? `${item._round}_${item.code}` : item.code || idx} sx={{ display: "flex" }}>
              <Card
                sx={{
                  borderRadius: 5,
                  border: "1px solid #e8ecf3",
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
                  backgroundColor: "#fff",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ p: 3, display: "flex", flexDirection: "column", height: "100%" }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          QR Code: {item.code}
                        </Typography>
                        {item._round && (
                          <Chip
                            label={ROUND_LABELS[item._round] || item._round}
                            size="small"
                            sx={{
                              mt: 0.5,
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              backgroundColor: `${ROUND_COLORS[item._round]}15`,
                              color: ROUND_COLORS[item._round],
                              border: `1px solid ${ROUND_COLORS[item._round]}30`,
                            }}
                          />
                        )}
                      </Box>
                      <Chip
                        label={(item.scanCount || 0) >= 4 ? "Completed" : "In Progress"}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          color: (item.scanCount || 0) >= 4 ? "#15803d" : "#b45309",
                          backgroundColor: (item.scanCount || 0) >= 4 ? "#dcfce7" : "#fef3c7",
                          border: (item.scanCount || 0) >= 4 ? "1px solid #bbf7d0" : "1px solid #fde68a",
                        }}
                      />
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={1.3}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#f8fafc", borderColor: "#e8ecf3" }}>
                        <Typography variant="body2">
                          <strong>Ingredients:</strong> {item.ingredients?.join(", ") || "N/A"}
                        </Typography>
                      </Paper>

                      <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#f8fafc", borderColor: "#e8ecf3", height: "100%" }}>
                            <Typography variant="caption" color="text.secondary">Total Scans</Typography>
                            <Typography variant="subtitle1" fontWeight={800}>{item.scanCount || 0}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#f8fafc", borderColor: "#e8ecf3", height: "100%" }}>
                            <Typography variant="caption" color="text.secondary">Station Cycle Time</Typography>
                            <Typography variant="subtitle1" fontWeight={800}>{item.totalTimeGap || "0 sec"}</Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#f8fafc", borderColor: "#e8ecf3" }}>
                        <Typography variant="body2">
                          <strong>Last Scan:</strong>{" "}
                          {item.lastScan ? new Date(item.lastScan).toLocaleString() : "N/A"}
                        </Typography>
                      </Paper>
                    </Stack>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => exportSingleProductExcel(item)}
                    fullWidth
                    sx={{ mt: 2.5, borderRadius: 3, fontWeight: 700, textTransform: "none", boxShadow: "none" }}
                  >
                    Download Excel
                  </Button>

                  <ProductHistoryAccordion item={item} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
