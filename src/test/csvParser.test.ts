import { describe, it, expect } from "vitest";
import { parseCSV, parseCSVLine } from "@/lib/scouting/csvParser";

describe("parseCSVLine", () => {
  it("splits a plain comma-separated line", () => {
    expect(parseCSVLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("preserves commas inside quoted fields", () => {
    expect(parseCSVLine('"Smith, John",42,"K, swinging"'))
      .toEqual(["Smith, John", "42", "K, swinging"]);
  });

  it('un-escapes "" inside a quoted field', () => {
    // Trackman occasionally emits embedded quotes — they must collapse cleanly.
    expect(parseCSVLine('"hello ""world""",x'))
      .toEqual(['hello "world"', "x"]);
  });

  it("handles trailing empty fields", () => {
    expect(parseCSVLine("a,b,")).toEqual(["a", "b", ""]);
  });
});

describe("parseCSV", () => {
  it("returns empty array when no data rows", () => {
    expect(parseCSV("")).toEqual([]);
    expect(parseCSV("only,a,header")).toEqual([]);
  });

  it("parses header + rows into objects, normalizing CRLF", () => {
    const csv = "Name,Velo\r\n\"Smith, J\",92.4\r\nDoe,88.1";
    expect(parseCSV(csv)).toEqual([
      { Name: "Smith, J", Velo: "92.4" },
      { Name: "Doe", Velo: "88.1" },
    ]);
  });

  it("fills missing cells with empty strings rather than dropping the row", () => {
    const csv = "A,B,C\nx,y";
    expect(parseCSV(csv)).toEqual([{ A: "x", B: "y", C: "" }]);
  });
});
