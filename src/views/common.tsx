import Markdown from "react-markdown";
import { useAsk } from "../ask";

// "[[text]]" renders as green highlight (OpenUI variant's Intro).
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[\[.*?\]\])/g).map((part, i) =>
        part.startsWith("[[") ? <b key={i} className="hl">{part.slice(2, -2)}</b> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

export const MyraHeader = () => <div className="myra">Myra<span>✦</span></div>;

export const IntroView = ({ text }: { text: string }) => (
  <div className="intro"><MyraHeader /><p><Rich text={text} /></p></div>
);

// Grounded-SDUI variant: markdown blocks. react-markdown escapes raw HTML by default.
export const MarkdownView = ({ text, header }: { text: string; header?: boolean }) => (
  <div className="intro md">{header && <MyraHeader />}<Markdown>{text}</Markdown></div>
);

export const ThingsToConsiderView = ({ text, title }: { text: string; title?: string }) => (
  <div className="card consider">
    <div className="consider-title"><span className="spark">✦</span>{title ?? "Things to consider"}</div>
    <p>{text}</p>
  </div>
);

export function FollowUpsView({ title, questions }: { title: string; questions: string[] }) {
  const ask = useAsk();
  return (
    <div className="followups">
      <h4>{title}</h4>
      {questions.map((q) => (
        <button key={q} onClick={() => ask(q)}><span>{q}</span><i>↳</i></button>
      ))}
    </div>
  );
}

export function ViewAll({ label, message }: { label: string; message: string }) {
  const ask = useAsk();
  return <button className="cta" onClick={() => ask(message)}>{label}</button>;
}
