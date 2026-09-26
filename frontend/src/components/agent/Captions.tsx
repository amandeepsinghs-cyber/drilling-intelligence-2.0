/** Captions — bilingual EN / हिन्दी with word-by-word reveal for the message being spoken. */
import { useEffect, useState } from 'react';
import { useUi } from '../../state/uiStore';

function Reveal({ text, live }: { text: string; live: boolean }) {
  const words = text.split(' ');
  const [n, setN] = useState(live ? 0 : words.length);
  useEffect(() => {
    if (!live) { setN(words.length); return; }
    setN(0);
    const id = setInterval(() => setN((k) => { if (k >= words.length) { clearInterval(id); return k; } return k + 1; }), 70);
    return () => clearInterval(id);
  }, [text, live]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {words.slice(0, n).join(' ')}
      <span className="opacity-0">{words.slice(n).join(' ')}</span>
    </>
  );
}

export default function Captions({ en, hi, live }: { en: string; hi: string; live: boolean }) {
  const lang = useUi((s) => s.lang);
  return (
    <div className="space-y-1.5">
      {lang !== 'hi' && <p className="text-[14px] leading-relaxed text-fg"><Reveal text={en} live={live} /></p>}
      {lang !== 'en' && (
        <p className={`devanagari leading-relaxed ${lang === 'hi' ? 'text-[14.5px] text-fg' : 'text-[13px] text-muted'}`}>
          <Reveal text={hi} live={live} />
        </p>
      )}
    </div>
  );
}
