import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";
import { FollowUpsView, IntroView, ThingsToConsiderView } from "../views/common";

// OpenUI variant: schemas + prompts live here; visuals live in src/views (shared with the Grounded-SDUI variant).

export const Intro = defineComponent({
  name: "Intro",
  description: "Myra's lead-in message. Wrap key figures in [[double brackets]] to highlight them in green.",
  props: z.object({ text: z.string() }),
  component: ({ props }) => <IntroView {...props} />,
});

export const ThingsToConsider = defineComponent({
  name: "ThingsToConsider",
  description: "A short practical tip or caveat the traveller should know.",
  props: z.object({ text: z.string(), title: z.string().optional() }),
  component: ({ props }) => <ThingsToConsiderView {...props} />,
});

export const FollowUps = defineComponent({
  name: "FollowUps",
  description: "Tappable suggested next questions. Tapping sends the question as the user's next message. Always the last block.",
  props: z.object({ title: z.string(), questions: z.array(z.string()) }),
  component: ({ props }) => <FollowUpsView {...props} />,
});
