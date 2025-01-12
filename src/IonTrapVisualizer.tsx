import React, { useState, useEffect, useCallback } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ZAxis,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Stable presets calculated from Mathieu equation stability regions
const PRESETS = {
  "Optimal Trapping": {
    mode: "optimal",
    U: 0.4,
    V: 13.0,
    omega: 15e6,
  },
  "Pure RF": {
    mode: "pure_rf",
    U: 0,
    V: 15.0,
    omega: 15e6,
  },
  "High Frequency": {
    mode: "high_frequency",
    U: 0.2,
    V: 8.0,
    omega: 20e6,
  },
  "Edge of Stability": {
    mode: "edge",
    U: 0.5,
    V: 15.0,
    omega: 15e6,
  },
};

class IonTrapSimulator {
  private e: number = 1.60217663e-19;
  private m: number = 1.67262192e-27;
  private r0: number = 1e-2;
  public U: number;
  public V: number;
  public omega: number;
  private ax: number;
  private qx: number;
  private ay: number;
  private qy: number;
  public lastStablePosition: { x: number; y: number } | null = null;

  constructor(params: { U?: number; V?: number; omega?: number } = {}) {
    this.U = params.U || 0;
    this.V = params.V || 0;
    this.omega = params.omega || 1e6;

    this.ax = this.calculateAx();
    this.qx = this.calculateQx();
    this.ay = -this.ax;
    this.qy = -this.qx;
  }

  private calculateAx() {
    return (
      (8 * this.e * this.U) /
      (this.m * this.r0 * this.r0 * this.omega * this.omega)
    );
  }

  private calculateQx() {
    return (
      (-4 * this.e * this.V) /
      (this.m * this.r0 * this.r0 * this.omega * this.omega)
    );
  }

  private calculateForceX(x: number, t: number) {
    return (
      -((2 * this.e) / (this.r0 * this.r0)) *
      (this.U + this.V * Math.cos(this.omega * t)) *
      x
    );
  }

  private calculateForceY(y: number, t: number) {
    return (
      ((2 * this.e) / (this.r0 * this.r0)) *
      (this.U + this.V * Math.cos(this.omega * t)) *
      y
    );
  }

  public simulate(
    initialConditions: { x?: number; y?: number; vx?: number; vy?: number },
    t_max: number,
    dt: number
  ) {
    let x = initialConditions.x || 1e-3;
    let y = initialConditions.y || 1e-3;
    let vx = initialConditions.vx || 0;
    let vy = initialConditions.vy || 0;
    let t = 0;

    const trajectory: { t: number; x: number; y: number; stable: boolean }[] =
      [];
    this.lastStablePosition = null;

    while (t < t_max) {
      const fx = this.calculateForceX(x, t);
      const fy = this.calculateForceY(y, t);

      const ax = fx / this.m;
      const ay = fy / this.m;

      vx += ax * dt;
      vy += ay * dt;

      x += vx * dt;
      y += vy * dt;

      const point = {
        t: t * 1e6, // Convert to microseconds
        x: x * 1e3, // Convert to mm
        y: y * 1e3,
        stable: true,
      };

      trajectory.push(point);

      if (Math.abs(x) > this.r0 || Math.abs(y) > this.r0) {
        this.lastStablePosition =
          trajectory[Math.max(0, trajectory.length - 2)];
        // Mark the last point as unstable
        trajectory[trajectory.length - 1].stable = false;
        break;
      }

      t += dt;
    }

    return trajectory;
  }

  public isStable() {
    const stable_x = Math.abs(this.qx) < 0.908 && Math.abs(this.ax) < 0.237;
    const stable_y = Math.abs(this.qy) < 0.908 && Math.abs(this.ay) < 0.237;
    const theoreticallyStable = stable_x && stable_y;

    const practicallyStable =
      this.lastStablePosition === null ||
      (Math.abs(this.lastStablePosition.x / 1e3) < this.r0 * 0.8 &&
        Math.abs(this.lastStablePosition.y / 1e3) < this.r0 * 0.8);

    return theoreticallyStable && practicallyStable;
  }
}

const IonTrapVisualizer: React.FC = () => {
  const [params, setParams] = useState(PRESETS["Optimal Trapping"]);
  const [trajectory, setTrajectory] = useState<
    { t: number; x: number; y: number; stable: boolean }[]
  >([]);
  const [isStable, setIsStable] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("Optimal Trapping");
  const [lastStablePoint, setLastStablePoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const runSimulation = useCallback(() => {
    const simulator = new IonTrapSimulator(params);
    const newTrajectory = simulator.simulate(
      { x: 1e-3, y: 1e-3, vx: 0, vy: 0 },
      2e-5,
      1e-8
    );
    setTrajectory(newTrajectory);
    setIsStable(simulator.isStable());
    setLastStablePoint(simulator.lastStablePosition);
  }, [params]);

  useEffect(() => {
    runSimulation();
  }, [params, runSimulation]);

  const handlePresetClick = (presetName: keyof typeof PRESETS) => {
    setSelectedPreset(presetName);
    setParams(PRESETS[presetName]);
  };

  return (
    <div className="h-full p-4">
      <Card className="h-full border-purple-500/20">
        <CardHeader className="border-b border-purple-500/20 bg-purple-500/5">
          <CardTitle className="text-2xl font-bold text-purple-300">
            Ion Trap Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-5rem)] bg-background/50">
          <div className="flex flex-col h-full space-y-6 py-4">
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((presetName) => (
                <Button
                  key={presetName}
                  variant={
                    selectedPreset === presetName ? "default" : "outline"
                  }
                  className={
                    selectedPreset === presetName
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "hover:bg-purple-500/10 border-purple-500/20"
                  }
                  onClick={() =>
                    handlePresetClick(presetName as keyof typeof PRESETS)
                  }
                >
                  {presetName}
                </Button>
              ))}
              <Button
                variant="secondary"
                disabled
                title="Automatic stability search coming soon"
                className="opacity-50"
              >
                <Search className="h-4 w-4 mr-2" />
                Find Stable Region
              </Button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-center p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <div
                className={`flex items-center gap-3 px-6 py-3 rounded-full ${
                  isStable
                    ? "bg-green-500/10 text-green-400 dark:bg-green-500/20"
                    : "bg-red-500/10 text-red-400 dark:bg-red-500/20"
                }`}
              >
                {isStable ? (
                  <Check className="h-5 w-5 animate-pulse" />
                ) : (
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                )}
                <span className="font-semibold text-base">
                  {isStable ? "Trap is stable" : "Trap is unstable"}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6 bg-purple-500/5 p-6 rounded-lg border border-purple-500/20">
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-300">
                  DC Voltage (U): {params.U.toFixed(3)} V
                </label>
                <Slider
                  value={[params.U]}
                  onValueChange={([U]) => {
                    setParams((p) => ({ ...p, U }));
                    setSelectedPreset("");
                  }}
                  min={0}
                  max={2}
                  step={0.1}
                  className="[&_.bg-primary]:bg-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-300">
                  RF Voltage (V): {params.V.toFixed(1)} V
                </label>
                <Slider
                  value={[params.V]}
                  onValueChange={([V]) => {
                    setParams((p) => ({ ...p, V }));
                    setSelectedPreset("");
                  }}
                  min={0}
                  max={20}
                  step={0.5}
                  className="[&_.bg-primary]:bg-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-300">
                  RF Frequency (Ω): {(params.omega / 1e6).toFixed(1)} MHz
                </label>
                <Slider
                  value={[params.omega / 1e6]}
                  onValueChange={([f]) => {
                    setParams((p) => ({ ...p, omega: f * 1e6 }));
                    setSelectedPreset("");
                  }}
                  min={1}
                  max={10}
                  step={0.5}
                  className="[&_.bg-primary]:bg-purple-500"
                />
              </div>
            </div>

            {/* Trajectory plot */}
            <div className="flex-grow min-h-[400px] bg-purple-500/5 p-4 rounded-lg border border-purple-500/20">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#666" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="X Position"
                    unit="mm"
                    domain={[-2, 2]}
                    stroke="#999"
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Y Position"
                    unit="mm"
                    domain={[-2, 2]}
                    stroke="#999"
                  />
                  <ZAxis range={[4]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "rgba(23, 23, 23, 0.9)",
                      border: "1px solid rgba(147, 51, 234, 0.2)",
                    }}
                    formatter={(value: number | string) =>
                      typeof value === "number" ? value.toFixed(3) : value
                    }
                  />
                  <Scatter
                    name="Ion Position (Stable)"
                    data={trajectory.filter((p) => p.stable)}
                    fill="#a855f7"
                  />
                  <Scatter
                    name="Ion Position (Unstable)"
                    data={trajectory.filter((p) => !p.stable)}
                    fill="#ef4444"
                  />
                  {lastStablePoint && (
                    <ReferenceDot
                      x={lastStablePoint.x}
                      y={lastStablePoint.y}
                      r={6}
                      fill="#ffd700"
                      stroke="none"
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IonTrapVisualizer;
