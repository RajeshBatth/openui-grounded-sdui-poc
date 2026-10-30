// Wire format of the Grounded-SDUI variant: newline-delimited JSON, one fully hydrated block per line.
export type Block =
  | { t: "md"; text: string }
  | { t: "tpl"; name: string; props: Record<string, any> };
