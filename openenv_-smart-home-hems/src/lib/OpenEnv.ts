/**
 * OpenEnv Interface for Reinforcement Learning
 */

export interface Observation {
  timeOfDay: number; // 0-23
  outdoorTemp: number; // Celsius
  indoorTemp: number; // Celsius
  energyPrice: number; // $/kWh
  batteryLevel: number; // 0-1 (percentage)
  solarGeneration: number; // kW
  targetTemp: number; // Celsius
}

export interface Action {
  hvacMode: 0 | 1 | 2; // 0: Off, 1: Eco, 2: Comfort
  batteryMode: 0 | 1 | 2; // 0: Idle, 1: Charge, 2: Discharge
}

export interface StepResult {
  observation: Observation;
  reward: number;
  done: boolean;
  info: any;
}

export class SmartHomeEnv {
  private state: Observation;
  private steps: number = 0;
  private maxSteps: number = 24 * 7; // One week of hourly steps

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): Observation {
    return {
      timeOfDay: 0,
      outdoorTemp: 15,
      indoorTemp: 20,
      energyPrice: 0.12,
      batteryLevel: 0.5,
      solarGeneration: 0,
      targetTemp: 21,
    };
  }

  public reset(): Observation {
    this.state = this.getInitialState();
    this.steps = 0;
    return { ...this.state };
  }

  public getState(): Observation {
    return { ...this.state };
  }

  public step(action: Action): StepResult {
    this.steps++;
    
    // 1. Update Time
    const nextTime = (this.state.timeOfDay + 1) % 24;
    
    // 2. Update Outdoor Temp (Sinusoidal approximation)
    const outdoorTemp = 15 + 10 * Math.sin((nextTime - 8) * Math.PI / 12);
    
    // 3. Update Solar Generation (Daylight only)
    const solarGeneration = nextTime > 6 && nextTime < 18 
      ? 3 * Math.sin((nextTime - 6) * Math.PI / 12) 
      : 0;
      
    // 4. Update Energy Price (Peak hours 16-21)
    const energyPrice = (nextTime >= 16 && nextTime <= 21) ? 0.45 : 0.15;

    // 5. HVAC Logic
    let hvacConsumption = 0;
    let tempChange = (outdoorTemp - this.state.indoorTemp) * 0.05; // Natural heat transfer
    
    if (action.hvacMode === 1) { // Eco
      hvacConsumption = 1.5;
      tempChange += (this.state.indoorTemp < this.state.targetTemp ? 0.5 : -0.5);
    } else if (action.hvacMode === 2) { // Comfort
      hvacConsumption = 3.0;
      tempChange += (this.state.indoorTemp < this.state.targetTemp ? 1.2 : -1.2);
    }

    const nextIndoorTemp = this.state.indoorTemp + tempChange;

    // 6. Battery Logic
    let batteryFlow = 0; // Positive is charging, negative is discharging
    const batteryCapacity = 10; // kWh
    const chargeRate = 2.0; // kW
    
    if (action.batteryMode === 1 && this.state.batteryLevel < 1) { // Charge
      batteryFlow = Math.min(chargeRate, (1 - this.state.batteryLevel) * batteryCapacity);
    } else if (action.batteryMode === 2 && this.state.batteryLevel > 0) { // Discharge
      batteryFlow = -Math.min(chargeRate, this.state.batteryLevel * batteryCapacity);
    }

    const nextBatteryLevel = Math.max(0, Math.min(1, this.state.batteryLevel + (batteryFlow / batteryCapacity)));

    // 7. Calculate Net Grid Consumption
    const baseLoad = 0.5; // Constant home load
    const netConsumption = baseLoad + hvacConsumption + (batteryFlow > 0 ? batteryFlow : 0) - solarGeneration + (batteryFlow < 0 ? batteryFlow : 0);
    const gridPower = Math.max(0, netConsumption);
    const cost = gridPower * energyPrice;

    // 8. Calculate Reward
    // Penalize cost
    let reward = -cost;
    
    // Penalize comfort deviation
    const tempDiff = Math.abs(nextIndoorTemp - this.state.targetTemp);
    if (tempDiff > 2) {
      reward -= (tempDiff - 2) * 5; // Heavy penalty for discomfort
    }

    this.state = {
      timeOfDay: nextTime,
      outdoorTemp,
      indoorTemp: nextIndoorTemp,
      energyPrice,
      batteryLevel: nextBatteryLevel,
      solarGeneration,
      targetTemp: 21,
    };

    const done = this.steps >= this.maxSteps;

    return {
      observation: { ...this.state },
      reward,
      done,
      info: {
        cost,
        gridPower,
        hvacConsumption,
        tempDiff
      }
    };
  }
}
