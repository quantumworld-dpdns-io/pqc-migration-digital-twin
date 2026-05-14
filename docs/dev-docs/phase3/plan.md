# Phase 3: Immersive Digital Twin & Full API Integration

## 1. Objective
Transform the current static dashboard into a fully functional "Digital Twin" of the cryptographic landscape. This involves integrating immersive 3D visualizations using React Three Fiber (R3F) and ensuring every gateway API endpoint is represented with a dedicated UI and interactive controls.

## 2. Technical Stack Expansion
The following dependencies will be added to `src/web`:
- `three`: Core 3D engine.
- `@react-three/fiber`: React bridge for Three.js.
- `@react-three/drei`: Useful helpers for R3F.
- `lucide-react`: For consistent iconography across 2D/3D overlays.
- `framer-motion`: For smooth transitions between 2D panels and 3D scenes.

> **Note on Dependencies:** To resolve peer dependency conflicts between React 18 and newer versions of `@react-three/fiber`/@`drei`, a `.npmrc` file has been added with `legacy-peer-deps=true`. This ensures stable builds on Vercel and local environments.

## 3. Digital Twin 3D Visualization Strategy
### 3.1 Network Topology Explorer
- **Component:** `src/web/components/three/NetworkScene.tsx`
- **Feature:** A force-directed 3D graph representing discovered assets.
- **Visuals:** 
  - **Nodes:** Spheres or cubes representing systems (IP:Port).
  - **Color Coding:** Red (Vulnerable), Green (Secure/PQC), Amber (In Transition).
  - **Edges:** Lines representing communication paths or dependency chains.
  - **Animation:** Pulse effects on "vulnerable" nodes; data particles flowing along edges.

### 3.2 Immersive Risk Heatmap
- **Component:** `src/web/components/three/RiskTerrain.tsx`
- **Feature:** A 3D landscape where the height (Y-axis) represents the "HNDL" risk score intensity across different business units or subnets.

### 3.3 Asset Inspection
- **Feature:** Clicking a 3D node opens a 2D side-panel with detailed metadata (Cipher suite, TLS version, Owner) fetched via `/api/v1/assets`.

## 4. API Integration & Page Expansion
We will move beyond a single-page dashboard to a multi-view application.

### 4.1 Discovery Management (`/discovery`)
- **Backend:** `POST /api/v1/discovery`
- **UI:** A form to trigger scans (Address/Port) and a real-time progress tracker.
- **Visuals:** 3D radar or scanning effect in the background while discovery is active.

### 4.2 Asset Inventory & Backlog (`/inventory`)
- **Backend:** `GET /api/v1/assets`, `POST /api/v1/risk/backlog`
- **UI:** Advanced data table with filtering/sorting.
- **Feature:** "Export Migration Backlog" button which calls the backend and generates a ranked CSV/JSON.

### 4.3 Governance & Compliance (`/governance`)
- **Backend:** `GET /api/v1/governance/exceptions`, `GET /api/v1/governance/verifier-drift`
- **UI:** 
  - Exception Register with "Create Exception" modal.
  - Verifier Version Status dashboard.
  - Audit event stream (`GET /api/v1/audit/events`).

### 4.4 Quantum Playground (`/playground`)
- **Backend:** `POST /api/v1/qasm`, `POST /api/v1/proof`
- **UI:** 
  - **QASM Explorer:** Editor to view and "run" quantum circuits (visualized in 3D).
  - **ZK Proof Gen:** Form to generate PQC-safe proofs for financial statements (Credit Score, etc.).

## 5. Architectural Improvements
### 5.1 API Client Alignment
- Update `src/web/lib/api.ts` to strictly follow `docs/api/gateway-openapi.json`.
- Correct `getAssets` to handle the `{ count, assets }` wrapper.
- Correct `runDiscovery` to handle `{ target, findings }`.

### 5.2 Layout & Navigation
- Implement a persistent Sidebar for navigation.
- Use Next.js App Router layouts to manage shared state (e.g., current scan status).
- Ensure the 3D Canvas is persistent across route transitions (shared `layout.tsx`).

## 6. Implementation Milestones

### Milestone 1: Dependencies & Environment
- Install `three`, `@react-three/fiber`, `@react-three/drei`.
- Configure `next.config.mjs` for optimized 3D rendering.
- Setup basic `Scene` component.

### Milestone 2: The "Twin" Visualization
- Implement `AssetNode` and `NetworkGraph` 3D components.
- Connect 3D nodes to live data from `getAssets`.
- Add basic camera controls (OrbitControls).

### Milestone 3: Functional Page Overhaul
- Create `/discovery`, `/inventory`, `/governance`, and `/playground` routes.
- Implement the "Backlog Export" logic.
- Implement the "Governance Exception" creation flow.

### Milestone 4: Polish & Performance
- Add GLSL shaders for "Cyber" aesthetic.
- Optimize R3F rendering (instanced meshes for nodes).
- Finalize mobile responsiveness for 2D overlays.

## 7. Success Criteria
- [ ] Users can trigger a discovery scan and see new nodes appear in 3D in real-time.
- [ ] Every field in the OpenAPI spec is represented in the UI.
- [ ] The app maintains >60 FPS during 3D interactions.
- [ ] The "Digital Twin" feel is achieved through interactive spatial data representation.
