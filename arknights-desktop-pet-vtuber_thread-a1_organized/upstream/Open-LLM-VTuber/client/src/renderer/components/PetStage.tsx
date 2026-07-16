import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Live2DRenderer, type Live2DRenderStatus } from "../live2d/Live2DRenderer";
import type { CharacterPresentation } from "../types/character";

interface PetStageProps {
  modelPath: string;
  scale: number;
  presentation: CharacterPresentation;
}

export function PetStage({ modelPath, scale, presentation }: PetStageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Live2DRenderer | null>(null);
  const [status, setStatus] = useState<Live2DRenderStatus | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    rendererRef.current = new Live2DRenderer(rootRef.current, { modelPath, scale });
    void rendererRef.current.load(modelPath).then(setStatus);
  }, []);

  useEffect(() => {
    rendererRef.current?.setScale(scale);
  }, [scale]);

  useEffect(() => {
    void rendererRef.current?.load(modelPath).then(setStatus);
  }, [modelPath]);

  useEffect(() => {
    rendererRef.current?.update(presentation);
  }, [presentation]);

  return (
    <section className="pet-stage drag-region" aria-label="桌宠显示区域">
      <div ref={rootRef} className="operator" data-state={presentation.state}>
        <div className="operator-shadow" />
        <div className="operator-body">
          <div className="operator-halo" />
          <div className="operator-head">
            <div className="operator-face">
              <span className="eye left" />
              <span className="eye right" />
              <span className="mouth" />
            </div>
          </div>
          <div className="operator-coat" />
          <div className="operator-arm left" />
          <div className="operator-arm right" />
        </div>
      </div>
      <div className="status-strip no-drag">
        <span>{presentation.state}</span>
        <span>{presentation.expression}</span>
        <span>{presentation.motion}</span>
      </div>
      {status?.error ? (
        <div className="model-warning no-drag">
          <AlertTriangle size={14} />
          <span>{status.error}</span>
        </div>
      ) : null}
    </section>
  );
}
