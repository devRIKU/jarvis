import React, { useEffect, useRef } from 'react';
import { GradientRenderer } from './gradient/GradientRenderer';
import { FaceRenderer } from './face/FaceRenderer';
import { useAssistantStore } from '../core/state/useAssistantStore';
import { eventBus } from '../core/events/eventBus';
import confetti from 'canvas-confetti';

interface VisualEngineProps {
  className?: string;
}

export const VisualEngine: React.FC<VisualEngineProps> = ({ className = '' }) => {
  const gradientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const gradientRendererRef = useRef<GradientRenderer | null>(null);
  const faceRendererRef = useRef<FaceRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const { state, expression, settings } = useAssistantStore();

  // Initialize Renderers
  useEffect(() => {
    if (!gradientCanvasRef.current || !faceCanvasRef.current) return;

    const gCanvas = gradientCanvasRef.current;
    const fCanvas = faceCanvasRef.current;

    const gRenderer = new GradientRenderer(gCanvas);
    const fRenderer = new FaceRenderer(fCanvas);

    gradientRendererRef.current = gRenderer;
    faceRendererRef.current = fRenderer;

    // Apply initial settings
    gRenderer.setWarmth(settings.warmthLevel);
    gRenderer.setBloom(settings.bloomIntensity);
    fRenderer.setBaseDotSize(settings.dotSize);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      gRenderer.resize(w, h);
      fRenderer.resize(w, h);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Audio energy listener
    const unsubAudio = eventBus.on('audioEnergy', (energy: number) => {
      gRenderer.setAudioEnergy(energy);
      fRenderer.setAudioEnergy(energy);
    });

    // Pointer listener
    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;
      gRenderer.setPointer(nx, ny);
      fRenderer.setPointer(nx, ny, true);
    };

    const handlePointerLeave = () => {
      fRenderer.setPointer(0.5, 0.5, false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);

    // Master render loop
    const renderLoop = () => {
      gRenderer.render();
      fRenderer.render();
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      unsubAudio();
      gRenderer.destroy();
      fRenderer.destroy();
    };
  }, []);

  // Sync state & expression changes
  useEffect(() => {
    if (gradientRendererRef.current) {
      gradientRendererRef.current.setState(state);
    }
    if (faceRendererRef.current) {
      faceRendererRef.current.setExpression(expression);
    }

    if (state === 'success') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.45 },
        colors: ['#f59e0b', '#fbbf24', '#10b981', '#fde047'],
        disableForReducedMotion: true,
      });
    }
  }, [state, expression]);

  // Sync visual settings
  useEffect(() => {
    if (gradientRendererRef.current) {
      gradientRendererRef.current.setWarmth(settings.warmthLevel);
      gradientRendererRef.current.setBloom(settings.bloomIntensity);
    }
    if (faceRendererRef.current) {
      faceRendererRef.current.setBaseDotSize(settings.dotSize);
    }
  }, [settings.warmthLevel, settings.bloomIntensity, settings.dotSize]);

  return (
    <div className={`fixed inset-0 pointer-events-auto overflow-hidden select-none ${className}`}>
      {/* Background Live Gradient Canvas */}
      <canvas
        ref={gradientCanvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none' }}
      />
      {/* Foreground Pixel Dot-Matrix Face Canvas */}
      <canvas
        ref={faceCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />
    </div>
  );
};
