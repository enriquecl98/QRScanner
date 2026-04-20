import React from "react";
import { NavLink } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ScienceIcon from "@mui/icons-material/Science";
import "./Sidebar.scss";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardIcon />,
  },
  {
    label: "QR Scanner",
    path: "/scanner",
    icon: <QrCodeScannerIcon />,
  },
  {
    label: "Experiment",
    path: "/experiment",
    icon: <ScienceIcon />,
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <Box className="sidebar__top">
        <Box className="sidebar__logo">QR</Box>

        <Box>
          <Typography className="sidebar__brand-text">QR Tracker</Typography>
          <Typography className="sidebar__brand-subtext">
            Scan Management
          </Typography>
        </Box>
      </Box>

      <nav className="sidebar__nav">
        <Typography className="sidebar__section-title">
          Main Menu
        </Typography>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <Box className="sidebar__bottom">
        <Typography className="sidebar__footer-text">
          Track scans easily
        </Typography>
      </Box>
    </aside>
  );
}