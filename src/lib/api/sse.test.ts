import { describe, expect, it } from "vitest";

import { SseParser } from "./sse";

describe("SseParser", () => {
  it("reads named events with JSON data", () => {
    const parser = new SseParser();
    const events = parser.push(
      'event: status\ndata: {"phase":"reading","message":"Reading 5 moments…"}\n\n' +
        'event: result\ndata: {"answer":"Yes."}\n\n',
    );
    expect(events).toEqual([
      { event: "status", data: '{"phase":"reading","message":"Reading 5 moments…"}' },
      { event: "result", data: '{"answer":"Yes."}' },
    ]);
  });

  it("waits for the rest of an event split across chunks", () => {
    const parser = new SseParser();
    expect(parser.push('event: status\ndata: {"phase":"thin')).toEqual([]);
    expect(parser.push('king"}\n')).toEqual([]);
    expect(parser.push("\n")).toEqual([{ event: "status", data: '{"phase":"thinking"}' }]);
  });

  it("accepts CRLF line endings and joins multi-line data", () => {
    const parser = new SseParser();
    expect(parser.push("event: result\r\ndata: line one\r\ndata: line two\r\n\r\n")).toEqual([
      { event: "result", data: "line one\nline two" },
    ]);
  });

  it("defaults the event name to message and skips comments", () => {
    const parser = new SseParser();
    expect(parser.push(": keep-alive\n\ndata: hi\n\n")).toEqual([{ event: "message", data: "hi" }]);
  });
});
