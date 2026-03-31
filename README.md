# System Design & Architecture Playground

An interactive, extensible playground for visualizing and exploring system design and architecture concepts.

This project is designed to be a hands-on platform for understanding how distributed systems, infrastructure patterns, and architectural components work. Each demo is a step-by-step interactive visualization that you can walk through and experiment with.

## Vision

Demystify system design by providing tangible, animated demos where you can observe patterns in action — from load balancing to caching, message queues, and beyond.

## Features

- **Extensible Plugin Architecture**: Add new system design demos through a modular plugin system.
- **Interactive Visualizations**: Step-by-step walkthroughs of system behavior.
- **Current Demos**:
    - **Load Balancer**: See how Round Robin, Least Connections, and Random strategies distribute requests across servers.

## Tech Stack

- **Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/)
- **Styling**: SCSS

## Getting Started

1. **Clone the repository**

    ```bash
    git clone git@github.com:ChipiKaf/system-design-architecture-playground.git
    cd system-design-architecture-playground
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Run the development server**

    ```bash
    npm run dev
    ```

4. **Open in Browser**

    Visit `http://localhost:5173`

## Adding a New Demo

Use the plugin generator to scaffold a new demo:

```bash
npm run generate <plugin-name>
```

For example:
```bash
npm run generate caching
```

This creates a new plugin under `src/plugins/<plugin-name>/` with all the boilerplate wired up.


    Navigate to `http://localhost:5173` (or the URL shown in your terminal) to view the application.

## Contributing

We welcome contributions! If you want to add a visualization for a new model type (e.g., Genetic Algorithms, SVMs, LLMs), please check out the plugin development guide (coming soon).

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run preview`: Previews the production build locally.
