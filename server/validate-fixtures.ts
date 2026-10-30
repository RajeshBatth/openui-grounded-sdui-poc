// Parses every gallery fixture against the library and prints parser errors.
import { createParser } from "@openuidev/react-lang";
import { fixtures } from "../src/fixtures";
import { library } from "../src/library";

const parser = createParser(library.toJSONSchema(), library.root);
for (const [name, src] of Object.entries(fixtures)) {
  const { meta } = parser.parse(src);
  console.log(meta.errors.length ? "✗" : "✓", name, meta.errors.length ? JSON.stringify(meta.errors) : "");
}
