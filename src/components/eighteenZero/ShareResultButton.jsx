import React, { useState } from 'react';
import { Check, Copy, Link, MessageCircle, Send, Share2, X } from 'lucide-react';
import { buildShareText, copyShareText, getOrderedDraftTeam } from '@/utils/shareResult.js';

const getShareUrl = () => (typeof window !== 'undefined' ? window.location.href : '');

const ShareResultButton = ({ team, result }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareText = buildShareText({ team, result });
  const shareUrl = getShareUrl();
  const shareTextWithUrl = `${shareText}\n\n${shareUrl}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedTextWithUrl = encodeURIComponent(shareTextWithUrl);
  const encodedUrl = encodeURIComponent(shareUrl);
  const orderedTeam = getOrderedDraftTeam(team);

  const shareOptions = [
    {
      label: 'X / Twitter',
      icon: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedTextWithUrl}`,
      className: 'bg-[#1d9bf0] text-white hover:bg-[#1688d8]',
    },
    {
      label: 'Facebook',
      icon: 'f',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      className: 'bg-[#1877f2] text-white hover:bg-[#1265cf]',
    },
    {
      label: 'Bluesky',
      icon: 'B',
      href: `https://bsky.app/intent/compose?text=${encodedTextWithUrl}`,
      className: 'bg-[#1185fe] text-white hover:bg-[#0d74de]',
    },
    {
      label: 'WhatsApp',
      icon: <MessageCircle size={19} />,
      href: `https://wa.me/?text=${encodedTextWithUrl}`,
      className: 'bg-[#25d366] text-white hover:bg-[#1fb859]',
    },
    {
      label: 'Telegram',
      icon: <Send size={19} />,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      className: 'bg-[#229ed9] text-white hover:bg-[#1b89bd]',
    },
    {
      label: 'Reddit',
      icon: 'r',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
      className: 'bg-[#ff4500] text-white hover:bg-[#dd3c00]',
    },
  ];

  const handleCopy = async () => {
    await copyShareText({ team, result });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(43_65%_52%_/_0.5)] bg-white/5 px-5 py-3 text-sm font-black uppercase text-[hsl(43_65%_52%)] transition hover:bg-[hsl(43_65%_52%_/_0.12)]"
      >
        <Share2 size={17} />
        Compartir resultado
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-[#101010] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#101010] p-3 sm:p-4">
              <h2 className="text-xl font-black text-white sm:text-2xl">Comparte tu equipo</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
                Cerrar
              </button>
            </div>

            <div className="m-3 rounded-lg border border-white/10 bg-[#07101f] p-4 sm:m-4">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">
                    Resultado proyectado
                  </p>
                  <p className="mt-1 text-4xl font-black text-white">{result.recordInfo.record}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Total</p>
                  <p className="mt-1 text-3xl font-black text-[hsl(43_65%_52%)]">{result.scores.totalScore}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {orderedTeam.map((player) => (
                  <div
                    key={player.id}
                    className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 rounded-md bg-white/7 p-2.5"
                  >
                    <span className="inline-flex min-h-8 items-center justify-center rounded bg-[hsl(43_65%_52%_/_0.2)] px-2 py-1 text-center text-[10px] font-black uppercase leading-[1.05] text-[hsl(43_65%_52%)]">
                      {player.draftPosition}
                    </span>
                    <span className="min-w-0 truncate text-sm font-black text-white">{player.name}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm font-bold text-gray-300">
                ¿Puedes hacer el 18-0 en La Comunidad del Banquillo?
              </p>
            </div>

            <p className="mx-3 mt-3 max-h-36 overflow-y-auto whitespace-pre-line rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300 sm:mx-4 sm:text-sm">
              {shareText}
            </p>

            <div className="mx-3 mt-3 grid grid-cols-2 gap-2 sm:mx-4 sm:grid-cols-3">
              {shareOptions.map((option) => (
                <a
                  key={option.label}
                  href={option.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-sm font-black transition ${option.className}`}
                >
                  <span className="flex h-5 items-center justify-center text-lg font-black">{option.icon}</span>
                  {option.label}
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="mx-4 mt-3 inline-flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-3 text-sm font-black uppercase text-white transition hover:bg-white/10"
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? 'Copiado' : 'Copiar texto'}
            </button>

            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(shareUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              }}
              className="mx-4 mb-4 mt-2 inline-flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-lg border border-[hsl(43_65%_52%_/_0.35)] bg-transparent px-4 py-3 text-sm font-black uppercase text-[hsl(43_65%_52%)] transition hover:bg-[hsl(43_65%_52%_/_0.1)]"
            >
              <Link size={17} />
              Copiar enlace
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareResultButton;
