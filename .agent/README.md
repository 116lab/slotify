# Slotify Agent 🧠

This is the central intelligence and governance directory for the **Slotify** theme project. It follows the **Antigravity Native Protocol** for Agent-Native **Guideline-Driven Development (GDD)**.

## 🏛️ Directory Structure
- `skills/`: Cognitive boundaries, architecture standards, and "Ground Truth" rules (supplementing the KI system).
- `workflows/`: Standard Operating Procedures (SOPs) and executable task paths.
- `scripts/`: Implementation scripts used by workflows to enforce architecture health.

## ⚖️ Governance Mandate
Any AI agent interacting with this repository MUST:
1.  Load and read the **Knowledge Items (KIs)** from the AppData `<appDataDir>/knowledge/` directory before proposing any architectural changes.
2.  Consult `.agent/skills/` for strict coding patterns (e.g., SOLID, SSOTs).
3.  Use `.agent/workflows/` to execute standard tasks (e.g., vendor sync, audits).
4.  Ensure all text output adheres to the **Linux-First (LF)** line ending policy defined in this project.

## 🛡️ Protection Boundary
This directory is isolated from the main theme logic. It exists solely to provide instructions and automation for the agent. Humans SHOULD NOT manually edit files in `scripts/` or `workflows/` without updating the corresponding `implementation_plan.md`.
