# Workspace Rules & Autonomous Execution Protocol

## Highest Authorization & Full Autonomy Grant
* **Scope**: Entire project folder `F:\order_workflow` and all its subdirectories.
* **Permissions**:
  - The user has explicitly granted **highest execution authority (FULL AUTONOMOUS PERMISSION)** to the agent.
  - **No interactive confirmation prompts, approval modals, or confirmation questions** (`ask_question`, manual confirmation dialogs) should be requested for creating, modifying, editing, deleting, or refactoring any code files, configuration files, scripts, or assets within `F:\order_workflow`.
  - **Terminal / Shell Commands**: Proactively execute necessary commands (npm, node, python, git, powershell) without pausing or asking for permission.
  - **Single Turn Complete Resolution**: Implement, test, build, and verify changes end-to-end autonomously.

## Authoritative System Specification & AI Alignment Guide
* **Single Source of Truth**: All future AI agents interacting with this project MUST read and strictly adhere to:
  - [`SYSTEM_SPECIFICATION.md`](file:///F:/order_workflow/SYSTEM_SPECIFICATION.md)
* **Functional Alignment & Test Generation**:
  - Whenever implementing features, refactoring logic, or debugging, the rules in `SYSTEM_SPECIFICATION.md` (specifically Section 3: Core Engines, Section 4: 7-Sheet Standards, Section 5: API Protocols, and Section 9: 8 Core Red Lines) govern system behavior.
  - When writing test cases (Unit, Integration, IDOR Security, PDF Visual, or E2E), refer directly to **Section 8: Future AI Test Suite Design Blueprint** in `SYSTEM_SPECIFICATION.md`.
