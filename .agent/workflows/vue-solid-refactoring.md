---
description: [Vue CDN No-Build Enterprise SOLID Refactoring]
---

# Vue CDN Enterprise SOLID & DRY Refactoring

This workflow is designed to refactor monolithic "No-Build" Vue.js components (using CDN and ES Modules) into a clean, enterprise-grade architecture adhering to SOLID and DRY principles.

## Workflow Execution Steps

// turbo-all
0. **Pre-computation Cognitive Boundary**
   **CRITICAL**: Before executing this workflow, you MUST read the central architecture standard to understand the required ES6 module patterns and prohibited build tools:
   `view_file` -> `.agent/skills/slotify-architecture-standards/SKILL.md`

1. **Directory Setup**
   Run commands to ensure the following directory structure exists in the project:
   - `static/js/components/` (For UI elements)
   - `static/js/composables/` (For Vue 3 reactive state logic)
   - `static/js/services/` (For data fetching and API logic)
   - `static/js/utils/` (For pure functions)

2. **Analyze Fat Views**: MUST use `view_file` to thoroughly read large View components.

3. **Extract Deep Components (UI Layer)**
   - Identify independent UI blocks (e.g., cards, lightboxes, tag clouds, feedback states).
   - Use `write_to_file` to create new Vue components in `static/js/components/`.
   - Ensure components use the standard ES Module export format (`export default { name: '...', template: '...', setup() { ... } }`).
   - Replace the raw HTML in the Views with the new component tags.

4. **Extract Pure Utilities (DRY Principle)**
   - Identify duplicated string manipulation, math, or regex logic across files.
   - Use `write_to_file` to abstract this logic into pure functions within `static/js/utils/` (e.g., `slugify.js`).
   - Refactor components to import and use these utilities.

5. **Extract Composables (Shared State logic)**
   - Identify duplicated reactive logic (e.g., pagination, window resizing, theme toggling).
   - Use `write_to_file` to create Vue Composition API hooks in `static/js/composables/` (e.g., `usePagination.js`).
   - Refactor Views to import and use these composables.

6. **Extract Services (API Layer)**
   - Identify all native `fetch()` calls, error handling (`try...catch`), and fallback data generation inside the Views.
   - Use `write_to_file` to move this logic into dedicated service files within `static/js/services/` (e.g., `api.js`).
   - Ensure services return standardized objects (e.g., `{ data, error }`).
   - Refactor Views to call these services instead of fetching directly.

7. **Standardize Code Formatting**
   - Execute a Node.js formatting script via `run_command` to enforce a strict **2-space indentation** across all JavaScript files and HTML `template` strings in the `static/js/` directory to align with Vue community standards.
   ```bash
   node -e "const fs=require('fs');const p=require('path');const scan=d=>{if(!fs.existsSync(d))return;fs.readdirSync(d,{withFileTypes:true}).forEach(f=>{const pf=p.join(d,f.name);if(f.isDirectory())scan(pf);else if(pf.endsWith('.js')){let c=fs.readFileSync(pf,'utf8');let nc=c.split('\n').map(l=>{const m=l.match(/^(    )+/);if(m)return l.replace(/    /g,'  ');return l;}).join('\n');fs.writeFileSync(pf,nc);}})};scan('static/js');"
   ```

8. **Verify Compilation and Functionality**
   - Run the local build server (e.g., `hugo server` or `npm run dev`) via `run_command` to ensure all ES Module imports are resolving correctly and no syntax errors exist.
