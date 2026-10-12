import { useEffect, useState } from 'react';
import { secondsText, secondsToFrames, timecode } from './model';
export default function DurationInput({ frames, fps, mode, onChange, onError }: { frames: number; fps: number; mode: 'time' | 'frames'; onChange: (frames: number) => void; onError: (message: string) => void }) {
  const formatted = mode === 'time' ? secondsText(frames, fps) : String(frames);
  const [text, setText] = useState(formatted);
  useEffect(() => setText(formatted), [formatted, mode]);
  const apply = () => {
    try {
      const n = Number(text);
      if (!text.trim()) throw new Error('Enter a duration.');
      const next = mode === 'time' ? secondsToFrames(n, fps) : n;
      if (!Number.isInteger(next) || next < 1 || next > 360000) throw new Error('Duration must be 1–360,000 whole frames.');
      onChange(next);
    } catch (e) { onError((e as Error).message); }
    setText(formatted);
  };
  return <label className="field"><span>Duration · {mode === 'time' ? 'time in seconds' : 'frames'} ({timecode(frames, fps)})</span><input aria-label={mode === 'time' ? 'Duration in seconds' : 'Duration in frames'} type="number" value={text} min={mode === 'time' ? 1 / fps : 1} max={mode === 'time' ? 360000 / fps : 360000} step={mode === 'time' ? 'any' : 1} onChange={e => setText(e.target.value)} onBlur={apply} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /><small className="duration-help">{mode === 'time' ? `Snaps to the nearest frame at ${fps} fps` : `${secondsText(frames, fps)} seconds`}</small></label>;
}
