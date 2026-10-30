import { builders, type Refs, type TplBlock } from "./build";

export interface SduiStats { blocks: number; templates: string[]; errors: string[]; firstTemplateMs?: number }

/**
 * Consumes the model's text stream, splits it into JSON lines, hydrates each complete line
 * and calls `emit` with a client-ready NDJSON line. Streaming granularity = one block.
 */
export class SduiStream {
  private buf = "";
  stats: SduiStats = { blocks: 0, templates: [], errors: [] };
  constructor(private refs: Refs, private emit: (line: string) => void, private t0: number) {}

  push(text: string) {
    this.buf += text;
    let i: number;
    while ((i = this.buf.indexOf("\n")) >= 0) {
      this.line(this.buf.slice(0, i));
      this.buf = this.buf.slice(i + 1);
    }
  }
  end() { if (this.buf.trim()) this.line(this.buf); this.buf = ""; }

  private line(raw: string) {
    const line = raw.trim().replace(/^```(json)?$/, "");
    if (!line) return;
    try {
      const b = JSON.parse(line);
      if (b.t in builders) { b.name = b.t; b.t = "tpl"; } // tolerate {"t":"FollowUps",...}
      if (b.t === "md" && typeof b.text === "string") return this.out({ t: "md", text: b.text });
      if (b.t === "tpl") {
        const build = builders[b.name];
        if (!build) throw new Error(`unknown template "${b.name}"`);
        const out = this.out({ t: "tpl", name: b.name, props: build(this.refs, b as TplBlock) });
        this.stats.templates.push(b.name);
        this.stats.firstTemplateMs ??= performance.now() - this.t0;
        return out;
      }
      throw new Error("bad block");
    } catch (e) {
      this.stats.errors.push(`${e instanceof Error ? e.message : e}: ${line.slice(0, 400)}`);
    }
  }
  private out(block: unknown) { this.stats.blocks++; this.emit(JSON.stringify(block) + "\n"); }
}
