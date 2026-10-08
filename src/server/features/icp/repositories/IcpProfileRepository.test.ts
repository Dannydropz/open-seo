import { describe, expect, it } from "vitest";
import { chunkIcpStatements } from "./icpStatementBatches";

describe("chunkIcpStatements", () => {
  it("keeps D1 multi-row inserts within its 100-bound-value limit", () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ index }));

    expect(chunkIcpStatements(rows)).toEqual([
      rows.slice(0, 20),
      rows.slice(20),
    ]);
  });

  it("does not emit an empty insert for an ICP with no statements", () => {
    expect(chunkIcpStatements([])).toEqual([]);
  });
});
