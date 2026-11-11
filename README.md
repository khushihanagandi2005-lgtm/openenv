OpenEnv Smart Home HEMS
A browser-based Smart Home Energy Management System (HEMS) simulation built with React, TypeScript, and Vite. 
It demonstrates how a home energy controller can coordinate HVAC operation and battery storage while responding to 
changing electricity prices, solar generation, and indoor/outdoor temperatures.
Scope: This repository currently contains a local simulation and
rule-based/random/manual controllers. It does not connect to physical smart-home devices, train a 
reinforcement-learning model, or call the Gemini API in the current application flow. The Python RL loop shown
in the dashboard is illustrative pseudocode, not an executable component of this React app.

Features
- Simulated indoor and outdoor temperature.
- Simulated time-varying electricity prices.
- Daylight-dependent solar generation.
- Battery state-of-charge tracking.
- HVAC modes: Off, Eco, and Comfort.
- Battery modes: Idle, Charge, and Discharge.
- Three control modes:
  - Manual: choose HVAC and battery actions yourself.
  - Heuristic: use predefined rules to maintain comfort and
    shift battery use around electricity prices.
  - Random: choose actions randomly as a baseline for
    comparison.
- Dashboard metrics, charts, recent-step history, cumulative reward,
  and cumulative cost.
- Reset and run/pause controls.
How the simulation works
The environment exposes an observation containing:

  Observation         Meaning
  timeOfDay         Hour of the simulated day (0--23)
outdoorTemp       Simulated outdoor temperature in °C
indoorTemp        Simulated indoor temperature in °C
energyPrice       Simulated electricity price in $/kWh
batteryLevel      Battery state of charge, from 0 to 1
solarGeneration   Simulated solar output in kW
targetTemp        Desired indoor temperature in °C

At each step, a controller supplies two actions:
- hvacMode: 0 = Off, 1 = Eco, 2 = Comfort.
- batteryMode: 0 = Idle, 1 = Charge, 2 = Discharge.
The environment updates the simulated state, estimates grid consumption
and cost, and returns a reward. The reward is reduced by electricity
cost and by a comfort penalty when indoor temperature differs from the
target by more than 2°C.

The environment is configured for up to 168 hourly steps (one simulated
week). The dashboard retains the latest 24 history entries for
visualization.
Technology stack
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide React
- Motion
Requirements
- Node.js (use a current LTS release)
- npm
- A modern browser such as Chrome, Edge, or Firefox
Run locally
1. Extract the project ZIP file.
2. Open the extracted project folder in a terminal or in VS Code.
3. Install dependencies:
   npm install
4. Start the Vite development server:
   npm run dev
5. Open the local URL printed in the terminal. The configured Vite port
   is 3000, so the usual address is:
   http://localhost:3000
Keep the terminal running while using the application. Stop the server
with Ctrl+C.
Available scripts
  Command             Description
  npm run dev       Start the development server on port 3000
npm run build     Create a production build in dist/
npm run preview   Preview the production build locally
npm run lint      Run TypeScript type-checking (tsc --noEmit)

*Configuration and API keys*
The repository includes a .env.example file with GEMINI_API_KEY and
APP_URL placeholders for an AI Studio deployment context. The current
dashboard and simulation code do not use a Gemini API call, so a Gemini
key is not required to run the local simulation.

If you later add Gemini-powered features, create a local .env.local
file and configure secrets according to the integration you implement.
Do not commit real API keys or other secrets to source control. Never
expose a private API key in browser-side code.
Security and dependency checks
Check dependency advisories with:
npm audit
Apply compatible fixes with:
npm audit fix
Review the audit report and test the app after dependency changes. Avoid
npm audit fix --force unless you have reviewed the potentially
breaking major-version changes and are prepared to test and update the
project.
Current limitations and possible extensions
This is a simplified educational simulation, not a validated
building-energy model. Its weather, solar output, electricity prices,
HVAC behavior, battery behavior, and reward calculation use assumptions
coded in src/lib/OpenEnv.ts.

Possible future improvements:
- Integrate a trained RL algorithm such as DQN or PPO through a
  separate backend.
- Add realistic appliance-level loads, battery efficiency, and HVAC
  constraints.
- Support configurable electricity tariffs and solar/battery
  capacities.
- Persist experiment results and compare controller performance over
  repeated runs.
- Connect to real devices only through a properly secured,
  permission-based integration layer.
- Add automated tests for environment transitions, reward calculation,
  and controller behavior.
Learning objective
The project provides a visual starting point for understanding the
reinforcement-learning interaction pattern:

Observation → Action → Environment transition → Reward → Next
observation

It can be used to compare simple control strategies and as a foundation
for a more advanced energy-optimization project
