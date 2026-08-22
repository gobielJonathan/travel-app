export type AiGenerationTopic = "instructions" | "translation" | "else";

type TokenUsage = {
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  input_tokens?: unknown;
  output_tokens?: unknown;
};

function tokenAmount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roomCodeLabel(value: unknown) {
  if (typeof value !== "string") return "unknown-room";
  const code = value.trim().toUpperCase();
  if (!/^ROAM-[A-Z2-9]{6}$/.test(code)) return "unknown-room";
  return `${code.slice(0, 5)}…${code.slice(-4)}`;
}

export function logAiUsage(roomCode: unknown, topic: AiGenerationTopic, usage: unknown) {
  const tokens = (usage && typeof usage === "object" ? usage : {}) as TokenUsage;
  const inputTokens = tokenAmount(tokens.prompt_tokens ?? tokens.input_tokens);
  const outputTokens = tokenAmount(tokens.completion_tokens ?? tokens.output_tokens);
  console.info(
    `${roomCodeLabel(roomCode)}: ${topic}, input token: ${inputTokens}, output token: ${outputTokens}`,
  );
}
