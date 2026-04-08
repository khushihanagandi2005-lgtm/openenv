import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend 
} from 'recharts';
import { 
  Play, RotateCcw, Pause, Zap, Thermometer, Battery, Sun, DollarSign, Brain, Code, Activity, 
  ChevronRight, LayoutDashboard, Settings, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartHomeEnv, Observation, Action } from './lib/OpenEnv';
import { cn } from './lib/utils';

// --- Components ---

const StatCard = ({ title, value, unit, icon: Icon, color }: { title: string, value: string | number, unit?: string, icon: any, color: string }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {unit && <span className="text-slate-400 text-sm font-medium">{unit}</span>}
      </div>
    </div>
    <div className={cn("p-2 rounded-xl", color)}>
      <Icon size={20} className="text-white" />
    </div>
  </div>
);

const CodeBlock = ({ code }: { code: string }) => (
  <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800 shadow-inner">
    <pre>{code}</pre>
  </div>
);

// --- Main App ---

export default function App() {
  const [env] = useState(() => new SmartHomeEnv());
  const [observation, setObservation] = useState<Observation>(env.getState());
  const [history, setHistory] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [totalReward, setTotalReward] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [agentType, setAgentType] = useState<'manual' | 'heuristic' | 'random'>('manual');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleReset = () => {
    const obs = env.reset();
    setObservation(obs);
    setHistory([]);
    setTotalReward(0);
    setTotalCost(0);
    setStepCount(0);
    setIsRunning(false);
  };

  const handleStep = useCallback((action: Action) => {
    const result = env.step(action);
    setObservation(result.observation);
    setTotalReward(prev => prev + result.reward);
    setTotalCost(prev => prev + result.info.cost);
    setStepCount(prev => prev + 1);
    
    setHistory(prev => {
      const newEntry = {
        step: prev.length,
        time: result.observation.timeOfDay,
        indoor: parseFloat(result.observation.indoorTemp.toFixed(1)),
        outdoor: parseFloat(result.observation.outdoorTemp.toFixed(1)),
        price: result.observation.energyPrice,
        battery: parseFloat((result.observation.batteryLevel * 100).toFixed(0)),
        solar: parseFloat(result.observation.solarGeneration.toFixed(1)),
        reward: parseFloat(result.reward.toFixed(2)),
        cost: parseFloat(result.info.cost.toFixed(2)),
      };
      const newHistory = [...prev, newEntry];
      return newHistory.slice(-24); // Keep last 24 steps for visualization
    });

    if (result.done) {
      setIsRunning(false);
    }
  }, [env]);

  // Simple Heuristic Agent
  const getHeuristicAction = (obs: Observation): Action => {
    // HVAC Logic: Keep temp near 21
    let hvacMode: 0 | 1 | 2 = 0;
    if (Math.abs(obs.indoorTemp - obs.targetTemp) > 1.5) {
      hvacMode = 2; // Comfort
    } else if (Math.abs(obs.indoorTemp - obs.targetTemp) > 0.5) {
      hvacMode = 1; // Eco
    }

    // Battery Logic: Charge when cheap, discharge when expensive
    let batteryMode: 0 | 1 | 2 = 0;
    if (obs.energyPrice < 0.2 && obs.batteryLevel < 0.9) {
      batteryMode = 1; // Charge
    } else if (obs.energyPrice > 0.4 && obs.batteryLevel > 0.1) {
      batteryMode = 2; // Discharge
    }

    return { hvacMode, batteryMode };
  };

  const getRandomAction = (): Action => ({
    hvacMode: Math.floor(Math.random() * 3) as any,
    batteryMode: Math.floor(Math.random() * 3) as any
  });

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        let action: Action;
        if (agentType === 'heuristic') {
          action = getHeuristicAction(observation);
        } else if (agentType === 'random') {
          action = getRandomAction();
        } else {
          // Manual mode doesn't auto-step in this loop
          return;
        }
        handleStep(action);
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, agentType, observation, handleStep]);

  const pythonCode = `
import openenv
import numpy as np

# Initialize environment
env = openenv.make("SmartHome-v1")
obs = env.reset()

# Standard RL Loop
for step in range(1000):
    # Agent logic (e.g., PPO, DQN)
    action = agent.predict(obs)
    
    # Environment interaction
    obs, reward, done, info = env.step(action)
    
    if done:
        break
  `.trim();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Brain className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">OpenEnv <span className="text-indigo-600">HEMS</span></h1>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Reinforcement Learning Sandbox</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {(['manual', 'heuristic', 'random'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setAgentType(type)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                    agentType === type 
                      ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-2" />
            
            <button 
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset Environment"
            >
              <RotateCcw size={20} />
            </button>
            
            <button 
              onClick={() => setIsRunning(!isRunning)}
              disabled={agentType === 'manual'}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95",
                isRunning 
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              {isRunning ? "Pause Agent" : "Run Agent"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Controls */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Real-time State */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              title="Indoor Temp" 
              value={observation.indoorTemp.toFixed(1)} 
              unit="°C" 
              icon={Thermometer} 
              color="bg-rose-500" 
            />
            <StatCard 
              title="Outdoor Temp" 
              value={observation.outdoorTemp.toFixed(1)} 
              unit="°C" 
              icon={Sun} 
              color="bg-amber-500" 
            />
            <StatCard 
              title="Battery" 
              value={(observation.batteryLevel * 100).toFixed(0)} 
              unit="%" 
              icon={Battery} 
              color="bg-emerald-500" 
            />
            <StatCard 
              title="Grid Price" 
              value={observation.energyPrice.toFixed(2)} 
              unit="$/kWh" 
              icon={DollarSign} 
              color="bg-indigo-500" 
            />
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-indigo-600" size={20} />
              <h2 className="font-bold text-slate-800">Agent Performance</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Total Reward</span>
                <span className={cn("font-mono font-bold", totalReward >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {totalReward.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Accumulated Cost</span>
                <span className="font-mono font-bold text-slate-800">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Environment Steps</span>
                <span className="font-mono font-bold text-slate-800">{stepCount}</span>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500 text-sm">Time of Day</span>
                  <span className="text-sm font-bold text-slate-700">{observation.timeOfDay}:00</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-indigo-500 h-full"
                    initial={false}
                    animate={{ width: `${(observation.timeOfDay / 23) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Manual Controls */}
          {agentType === 'manual' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200"
            >
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <LayoutDashboard size={18} />
                Manual Step Control
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-indigo-300 uppercase mb-3 block">HVAC Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Off', 'Eco', 'Comfort'].map((mode, i) => (
                      <button
                        key={mode}
                        onClick={() => handleStep({ hvacMode: i as any, batteryMode: 0 })}
                        className="bg-indigo-800 hover:bg-indigo-700 py-2 rounded-lg text-xs font-bold transition-colors border border-indigo-700"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-300 uppercase mb-3 block">Battery Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Idle', 'Charge', 'Discharge'].map((mode, i) => (
                      <button
                        key={mode}
                        onClick={() => handleStep({ hvacMode: 0, batteryMode: i as any })}
                        className="bg-indigo-800 hover:bg-indigo-700 py-2 rounded-lg text-xs font-bold transition-colors border border-indigo-700"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-indigo-400 italic">
                  * Clicking a button executes one step (1 hour) in the environment.
                </p>
              </div>
            </motion.div>
          )}

          {/* API Documentation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Code className="text-indigo-600" size={20} />
              <h2 className="font-bold text-slate-800">OpenEnv API</h2>
            </div>
            <CodeBlock code={pythonCode} />
          </div>
        </div>

        {/* Right Column: Charts & Visualization */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Temperature Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Thermometer className="text-rose-500" size={20} />
                <h2 className="font-bold text-slate-800">Temperature Trends</h2>
              </div>
              <div className="flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-500">Indoor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-500">Outdoor</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorIndoor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(val) => `${val}:00`}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    domain={[10, 30]}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="indoor" 
                    stroke="#f43f5e" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIndoor)" 
                    animationDuration={300}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="outdoor" 
                    stroke="#fbbf24" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="transparent"
                    animationDuration={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Energy & Price Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Battery className="text-emerald-500" size={20} />
                <h2 className="font-bold text-slate-800">Battery Level (%)</h2>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
                    <Tooltip />
                    <Line 
                      type="stepAfter" 
                      dataKey="battery" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <DollarSign className="text-indigo-500" size={20} />
                <h2 className="font-bold text-slate-800">Energy Price ($)</h2>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Line 
                      type="stepAfter" 
                      dataKey="price" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Step Log */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="text-slate-400" size={20} />
                <h2 className="font-bold text-slate-800">Environment Step Log</h2>
              </div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Last 10 entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Step</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Action (H/B)</th>
                    <th className="px-6 py-3">Reward</th>
                    <th className="px-6 py-3 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence initial={false}>
                    {history.slice(-10).reverse().map((entry, idx) => (
                      <motion.tr 
                        key={entry.step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">#{entry.step}</td>
                        <td className="px-6 py-4 font-medium">{entry.time}:00</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">H:{entry.hvac || '0'}</span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">B:{entry.batt || '0'}</span>
                          </div>
                        </td>
                        <td className={cn("px-6 py-4 font-bold", entry.reward >= 0 ? "text-emerald-600" : "text-rose-500")}>
                          {entry.reward > 0 ? '+' : ''}{entry.reward}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600">${entry.cost}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Info className="text-indigo-600" size={20} />
              <h3 className="font-bold text-slate-800">About OpenEnv</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              OpenEnv is a standardized interface for building and testing reinforcement learning environments. 
              This HEMS (Home Energy Management System) simulation provides a complex state space with 
              competing objectives: minimizing cost while maximizing comfort.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              State Space
            </h3>
            <ul className="text-sm text-slate-500 space-y-2">
              <li>• <span className="font-medium text-slate-700">Time:</span> Periodic 24h cycle</li>
              <li>• <span className="font-medium text-slate-700">Temperature:</span> Indoor vs Outdoor dynamics</li>
              <li>• <span className="font-medium text-slate-700">Solar:</span> Intermittent renewable generation</li>
              <li>• <span className="font-medium text-slate-700">Price:</span> Dynamic peak/off-peak pricing</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Brain className="text-indigo-600" size={20} />
              Reward Function
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              The agent receives a negative reward for grid electricity costs and a heavy penalty 
              for allowing the indoor temperature to deviate more than 2°C from the target (21°C).
            </p>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
            Built with Google AI Studio • 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
