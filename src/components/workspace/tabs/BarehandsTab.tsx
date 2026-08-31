import React, { useEffect, useState } from 'react';
import { useAssistantStore } from '../../../core/state/useAssistantStore';
import { barehandsAdapter } from '../../../barehands/barehandsAdapter';
import {
  Hand,
  Camera,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export const BarehandsTab: React.FC = () => {
  const { spatialState } = useAssistantStore();
  const [isSupported, setIsSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(barehandsAdapter.isSupported());
  }, []);

  const handleToggleTracking = async () => {
    if (spatialState.isTracking) {
      barehandsAdapter.stopTracking();
    } else {
      setErrorMsg(null);
      const success = await barehandsAdapter.startTracking();
      if (!success) {
        setErrorMsg('Camera permission was denied or camera is not available.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-stone-100 flex items-center gap-2">
          <Hand className="w-5 h-5 text-amber-400" />
          Barehands Spatial Integration
        </h3>
        <p className="text-sm text-stone-400 mt-0.5">
          Web-native spatial gestural tracking adapter for natural hand tracking, pointer gaze, and touchless control.
        </p>
      </div>

      {/* Control Card */}
      <div className="p-5 rounded-2xl bg-stone-900/50 border border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl border ${
                spatialState.isTracking
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-stone-800 border-stone-700 text-stone-400'
              }`}
            >
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-stone-200">Optical Gesture Sensor</h4>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    spatialState.isTracking
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {spatialState.isTracking ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Uses local webcam for motion centroid & spatial vector calculation.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleTracking}
            disabled={!isSupported}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all self-start sm:self-auto ${
              spatialState.isTracking
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{spatialState.isTracking ? 'Stop Tracking' : 'Enable Camera Tracking'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Spatial Telemetry & Visualizer */}
        {spatialState.isTracking && (
          <div className="pt-3 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-black/40 border border-stone-800/80">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">
                Detected Gesture
              </span>
              <span className="text-sm font-mono font-semibold text-amber-300 uppercase">
                {spatialState.gesture}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-stone-800/80">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">
                Gaze Coordinates
              </span>
              <span className="text-sm font-mono text-stone-200">
                X: {spatialState.pointer.x.toFixed(2)}, Y: {spatialState.pointer.y.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-stone-800/80">
              <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">
                Confidence
              </span>
              <span className="text-sm font-mono text-emerald-300">
                {(spatialState.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Spatial Reference Note */}
      <div className="p-4 rounded-2xl bg-stone-900/30 border border-stone-800/60 text-xs text-stone-400 space-y-2">
        <h5 className="font-medium text-stone-300 flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-amber-400" />
          Spatial Gaze Coupling
        </h5>
        <p className="leading-relaxed">
          When Barehands tracking is active, the Dot-Matrix Face's eyes dynamically follow your hand's physical coordinates in 3D space, creating an organic, direct sense of eye contact.
        </p>
      </div>
    </div>
  );
};
