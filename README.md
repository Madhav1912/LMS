# Productivity Dashboard

React + Vite app for tracking and visualizing productivity.

## Setup

### Prerequisites

- **Node.js**: use an active LTS version (recommended).
- **npm**: comes with Node.

### Install dependencies

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

Then open the URL shown in your terminal (usually `http://localhost:5173`).

## Scripts

### Build for production

```bash
npm run build
```

### Preview the production build locally

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Troubleshooting

- **Port already in use**: stop the process using the port, or run Vite on a different port:

```bash
npm run dev -- --port 5174
```

- **Fresh install issues**: delete `node_modules` and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

PowerShell equivalent:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```
