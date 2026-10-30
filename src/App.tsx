import { Renderer } from "@openuidev/react-lang";
import { useEffect, useRef, useState } from "react";
import { AskContext } from "./ask";
import { fixtures } from "./fixtures";
import { library } from "./library";
import type { Block } from "./sdui/blocks";
import { SduiMessage } from "./sdui/SduiMessage";

type Variant = "openui" | "grounded-sdui";
// ?variant=grounded-sdui (aliases: sdui, own); default openui
const variant: Variant = ["grounded-sdui", "sdui", "own"].includes(new URLSearchParams(location.search).get("variant") ?? "") ? "grounded-sdui" : "openui";

// Our own chat shell: variant decides how an assistant message is produced and rendered.
interface Message {
  role: "user" | "assistant";
  content: string; // user text, or raw OpenUI Lang (openui variant)
  blocks?: Block[]; // Grounded-SDUI variant
  ms?: { first: number; total: number }; // client-observed latency
}

const SUGGESTIONS = [
  "Show fares from Delhi to Bangalore for November",
  "Fares around 24 Nov from Delhi to Singapore",
  "Cheapest flights from Delhi to Australia in December",
  "Should I book Delhi to Singapore on 20 Nov now or wait?",
  "Find flights from Bangalore to Singapore on 25 Nov",
  "Tell me about Taj Exotica in Goa",
];

// What the server replays to the model for earlier assistant turns.
const forModel = (m: Message) =>
  m.role === "user" || !m.blocks
    ? m.content
    : m.blocks.map((b) => (b.t === "md" ? b.text : `[shown ${b.name}]`)).join("\n");

export function App() {
  if (new URLSearchParams(location.search).has("gallery")) return <Gallery />;
  return <Chat />;
}

function Gallery() {
  return (
    <AskContext.Provider value={() => {}}>
      <div className="shell"><header>Gallery <small>fixtures, no LLM</small></header>
        <main>{Object.entries(fixtures).map(([k, v]) => (
          <div key={k}><h4>{k}</h4><div className="assistant"><Renderer response={v} library={library} /></div></div>
        ))}</main></div>
    </AskContext.Provider>
  );
}

function VariantToggle() {
  const href = (v: Variant) => `?variant=${v}`;
  return (
    <nav className="variants">
      {(["openui", "grounded-sdui"] as const).map((v) => (
        <a key={v} href={href(v)} className={v === variant ? "on" : ""}>{v === "openui" ? "OpenUI" : "Grounded-SDUI"}</a>
      ))}
    </nav>
  );
}

function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const history: Message[] = [...messages, { role: "user", content: text }];
    const update = (patch: Partial<Message>) => setMessages([...history, { role: "assistant", content: "", ...patch }]);
    update({});
    setInput("");
    setStreaming(true);

    const t0 = performance.now();
    let first = 0;
    try {
      const res = await fetch(`/api/chat?variant=${variant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: forModel(m) })) }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let acc = "", buf = "";
      const blocks: Block[] = [];
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        first ||= performance.now() - t0;
        if (variant === "openui") {
          acc += value;
          update({ content: acc });
        } else {
          buf += value;
          let i: number;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (line) blocks.push(JSON.parse(line));
          }
          update({ blocks: [...blocks] });
        }
      }
      update({ content: acc, blocks: variant === "grounded-sdui" ? [...blocks] : undefined, ms: { first, total: performance.now() - t0 } });
    } catch (e) {
      update({ content: `root = Stack([Callout("Request failed", "${String(e)}", "warning")])`, blocks: [{ t: "md", text: `Request failed: ${String(e)}` }] });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <AskContext.Provider value={send}>
      <div className="shell">
        <header>Myra <small>OpenUI POC</small><VariantToggle /></header>
        <main>
          {messages.length === 0 && (
            <div className="empty">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          {messages.map((m, i) => {
            const last = i === messages.length - 1;
            if (m.role === "user") return <div key={i} className="bubble user">{m.content}</div>;
            return (
              <div key={i} className="assistant">
                {variant === "grounded-sdui" ? (
                  <SduiMessage blocks={m.blocks ?? []} />
                ) : (
                  <Renderer
                    response={m.content}
                    library={library}
                    isStreaming={streaming && last}
                    onError={(errs) => errs.length && console.warn("OpenUI", errs)}
                  />
                )}
                {m.ms && <small className="timing">{variant} · first {Math.round(m.ms.first)}ms · total {(m.ms.total / 1000).toFixed(1)}s</small>}
              </div>
            );
          })}
          <div ref={endRef} />
        </main>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything" />
          <button disabled={streaming}>Send</button>
        </form>
      </div>
    </AskContext.Provider>
  );
}
