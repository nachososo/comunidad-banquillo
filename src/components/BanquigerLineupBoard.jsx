import React, { useRef, useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { BANQUIGER_SLOT_LABELS } from '@/utils/banquigerPositions.js';

// Pointer capture handles mouse, pen and touch without native HTML drag/drop.
export default function BanquigerLineupBoard({ slots, players, disabled, onMove, renderPlayer }) {
  const board = useRef(null);
  const pointer = useRef(null);
  const suppressClick = useRef(false);
  const [chosen, setChosen] = useState(null);
  const [drag, setDrag] = useState(null);
  const [notice, setNotice] = useState('');
  const dragging = Boolean(drag);
  const dragY = drag?.y;
  useEffect(() => {
    if (!dragging || disabled) return undefined;
    const direction = dragY < 72 ? -1 : dragY > window.innerHeight - 72 ? 1 : 0;
    if (!direction) return undefined;
    const timer = window.setInterval(() => window.scrollBy(0, direction * 12), 50);
    return () => window.clearInterval(timer);
  }, [dragY, dragging, disabled]);
  const byId = new Map(players.map(player => [String(player.id), player]));
  const destination = (event) => {
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-lineup-slot]');
    return element && board.current?.contains(element) ? Number(element.dataset.lineupSlot) : null;
  };
  const move = (from, to) => {
    if (disabled || from == null || to == null || from === to) return;
    onMove(from, to);
    setNotice(`${byId.get(slots[from])?.name || 'Jugador'} colocado en ${BANQUIGER_SLOT_LABELS[to]}.`);
  };
  const token = (index) => {
    const player = byId.get(slots[index]) || null;
    const label = BANQUIGER_SLOT_LABELS[index];
    return (
      <div key={label} onContextMenu={event => { if (!disabled) event.preventDefault(); }} data-lineup-slot={index} className={`relative select-none ${disabled ? 'touch-auto' : 'touch-none'} rounded-lg ${drag?.to === index || chosen === index ? 'ring-2 ring-[hsl(43_65%_52%)]' : ''}`}
          onPointerDown={(event) => {
            suppressClick.current = false;
            if (disabled || !player || event.button !== 0) return;
            (event.target.closest('button') || event.currentTarget).setPointerCapture(event.pointerId);
            pointer.current = { from: index, x: event.clientX, y: event.clientY, id: event.pointerId, moving: false };
          }}
          onPointerMove={(event) => {
            const active = pointer.current;
            if (!active || active.id !== event.pointerId) return;
            if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 8) active.moving = true;
            if (active.moving) setDrag({ from: active.from, to: destination(event), x: event.clientX, y: event.clientY });
          }}
          onPointerUp={(event) => {
            const active = pointer.current;
            pointer.current = null;
            setDrag(null);
            if (active?.moving) {
              suppressClick.current = true;
              move(active.from, destination(event));
              setChosen(null);
            }
          }}
          onPointerCancel={() => { pointer.current = null; setDrag(null); }}
>
        {renderPlayer(player, index, label)}
        <button type="button" disabled={disabled || (!player && chosen == null)}
          aria-label={chosen != null ? `Colocar jugador en ${label}` : `Mover ${player?.name || 'jugador'} desde ${label}`}
          aria-pressed={chosen === index}
          className="mt-1 flex min-h-9 w-full touch-none items-center justify-center gap-1 rounded bg-black/65 px-1 text-[10px] font-bold text-white disabled:opacity-40"
          onClick={() => {
            if (suppressClick.current) { suppressClick.current = false; return; }
            if (chosen == null) setChosen(index);
            else { move(chosen, index); setChosen(null); }
          }}
          onKeyDown={(event) => { if (event.key === 'Escape') setChosen(null); }}>
          <GripVertical size={14} /> {chosen != null ? 'Colocar aquí' : 'Mover'}
        </button>
      </div>
    );
  };
  return (
    <div ref={board} className="space-y-3">
      <p className="text-xs leading-relaxed text-gray-400">{disabled ? 'Alineación cerrada para esta jornada.' : 'Arrastra la tarjeta, o pulsa Mover y después el puesto de destino.'}</p>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#c9a66b] p-3">
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/65" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/65" />
          <div className="absolute inset-5 rounded-[2rem] border-2 border-white/60" />
        </div>
        <div className="relative grid grid-cols-3 gap-3"><div />{token(4)}<div /></div>
        <div className="relative mt-3 grid grid-cols-2 gap-3">{token(2)}{token(3)}</div>
        <div className="relative mt-3 grid grid-cols-2 gap-3">{token(0)}{token(1)}</div>
      </div>
      <p className="text-center text-xs font-bold uppercase text-gray-500">Banquillo</p>
      <div className="grid grid-cols-2 gap-3">{token(5)}{token(6)}</div>
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-[hsl(43_65%_52%)]">{notice}</p>
      {drag && <div className="pointer-events-none fixed z-[100] rounded-lg bg-black/90 px-3 py-2 text-xs font-bold text-white shadow-lg" style={{ left: drag.x + 12, top: drag.y + 12 }}>{byId.get(slots[drag.from])?.name}</div>}
    </div>
  );
}
