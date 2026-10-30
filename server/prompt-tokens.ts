// Token cost of the OpenUI part of every request: the library-generated system prompt.
import { countTokens } from "gpt-tokenizer/encoding/o200k_base";
import { library } from "../src/library";
import { systemPrompt } from "./prompt";
import { tools } from "./tools";

const libraryOnly = library.prompt({});
const toolDefs = JSON.stringify(tools.map((t) => t.def));
console.log(`OpenUI library prompt (no rules/examples): ${countTokens(libraryOnly)} tokens`);
console.log(`Full system prompt (library + our rules/examples): ${countTokens(systemPrompt)} tokens`);
console.log(`Tool definitions: ${countTokens(toolDefs)} tokens`);
console.log(`Fixed per-request overhead: ~${countTokens(systemPrompt) + countTokens(toolDefs)} tokens (o200k estimate)`);
