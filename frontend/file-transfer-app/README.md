# File Transfer — Frontend

Angular frontend for **File Transfer**, a peer-to-peer application for
transferring files between devices on a local network (with WebRTC support
planned for internet transfers in later phases).

This is the client-side of the project. The Spring Boot backend lives in
[`../../backend/`](../../backend/).

---

## 🧱 Tech Stack

| Layer            | Technology                     | Version   |
| ---------------- | ------------------------------ | --------- |
| Framework        | [Angular](https://angular.dev) | 22.1.x    |
| CLI              | Angular CLI                    | 22.1.4    |
| Language         | TypeScript                     | 6.0.x     |
| UI Components    | Angular Material               | 22.1.x    |
| Styling          | Tailwind CSS                   | 4.3.x     |
| Runtime          | Node.js                        | 24 LTS    |
| Package Manager  | npm                            | 11.x      |

> Standalone components, Signals, and the new control flow syntax
> (`@if`, `@for`) are used throughout the codebase.

---

## 📋 Prerequisites

Before you start, make sure you have:

- **Node.js 24 LTS** (or any recent LTS)
  → Install via [nvm](https://github.com/nvm-sh/nvm): `nvm install --lts`
- **npm 10+** (bundled with Node)
- **Git**
- An IDE — we recommend **IntelliJ IDEA** or **VS Code**
> ⚠️ For the app to work end-to-end, the **backend must be running on
> `http://localhost:8080`**. See [`../../backend/README.md`](../../backend/README.md).
---

## 🚀 Getting Started

```bash
# 1. Clone the mono-repo (if not already done)
git clone <repo-url>
cd File-Transfer/frontend/file-transfer-app

# 2. Install dependencies
npm install

# 3. Start the dev server
npx ng serve
```

The app will be available at **[http://localhost:4200](http://localhost:4200)**.

Hot-reload is enabled — save any file and the browser refreshes automatically.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── core/         # Singleton services, HTTP interceptors, guards
│   │                 # → loaded once at app startup (auth, config, etc.)
│   │
│   ├── shared/       # Reusable dumb components, pipes, directives
│   │                 # → building blocks used across features
│   │
│   ├── features/     # Business features, one folder per feature
│   │                 # → upload/, download/, pairing/ (phase 2)
│   │
│   ├── app.ts        # Root component
│   ├── app.config.ts # App-wide providers
│   └── app.routes.ts # Route definitions
│
├── environments/     # Environment-specific configuration
│   ├── environment.ts             # Production values
│   └── environment.development.ts # Development values
│
└── styles.scss       # Global styles (Tailwind + Material theme)
```
---

## 🌍 Environment Configuration

The app uses **two environment files**:

| File                          | Used when             | API URL                          |
| ----------------------------- | --------------------- | -------------------------------- |
| `environment.ts`              | Production build      | `https://TODO-prod-url.com/api`  |
| `environment.development.ts`  | `ng serve` / dev mode | `http://localhost:8080/api`      |

## 🎨 UI Guidelines

This project uses **both** Angular Material and Tailwind CSS. 

## 🛠️ Available Scripts

| Script            | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm start`       | Start the dev server on port 4200                |
| `npm run build`   | Build for production (output in `dist/`)         |
| `npm run watch`   | Build in dev mode, rebuild on changes            |
| `npm test`        | Run unit tests (Vitest)                          |

---

## 🗺️ Roadmap

This frontend supports a phased delivery plan:

- **Phase 1 — MVP**
  File upload/download over HTTP multipart, small files only.
- **Phase 2 — Real-time & chunking**
  WebSocket signaling, room-based pairing, QR codes, chunked uploads.
- **Phase 3 — WebRTC** *(stretch goal)*
  Peer-to-peer transfer over the internet via WebRTC DataChannels.
- 
---

## 🤝 Contributing

- Sprint cadence: **1 week**
- Branch naming: `FT-<ticket-id>-<short-description>`
- Definition of done: code merged, manually tested, documented

---

## 📄 License
See [`../../LICENSE`](../../LICENSE) at the repo root.
