# State management in React e-commerce applications: test applications and benchmark harness

Supplementary material for the paper *Combining Zustand and MobX for State Management in React E-Commerce Web Applications: A Comparative Evaluation* (ADCAIJ, revised submission).

## Contents

| Path | Description |
|---|---|
| `apps/redux` | Test application, Redux Toolkit version |
| `apps/zustand` | Zustand version |
| `apps/useContext` | React Context API version |
| `apps/mobX` | MobX version |
| `apps/xState` | XState version |
| `apps/zustand-mobx` | Combined version: Zustand for the global state and the cart, MobX for the catalog model |
| `bench/shared/benchCore.js` | Measurement module; the same file is copied to `src/bench/` of every version |
| `bench/adapters/` | One adapter per version that maps the cart operations onto its state manager |
| `bench/bench-server.js` | Local server: serves the production builds, returns the catalog from the snapshot in `bench/cache/`, schedules the runs and writes `*.jsonl` results |
| `bench/run-headless.js` | Runs a series in a separate headless Chrome instance without user interaction |
| `bench/analyze.js` | Processing of the raw results (medians, quartiles, Mann–Whitney tests with the Holm correction, integrated score) |

The catalog page components are identical in all versions; the versions differ only in their stores and in the binding module that connects the components to the state manager.

## Reproducing the measurements

Requirements: Node.js 18+, Google Chrome.

1. Build every version against the local catalog snapshot (PowerShell):

       cd apps/<version>
       npm ci
       $env:REACT_APP_API_URL='/'; $env:GENERATE_SOURCEMAP='false'; npm run build

   and copy the `build/` folder to `bench/builds/<version>/`.
2. Run a series: `node bench/run-headless.js` (see `bench/README.md` for the options, e.g. `--cpu`, `--catalog`, `--out`).
3. Process the results: `node bench/analyze.js <results folder>`.

The raw results are not included in the repository; running the harness produces them in the folder given by `--out`.

Further details of the protocol (in Russian) are given in `bench/README.md`.
