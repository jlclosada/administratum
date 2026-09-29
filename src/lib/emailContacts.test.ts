import { describe, expect, it } from "vitest";
import { parseEmails } from "./emailContacts";

describe("parseEmails", () => {
  it("splits lines, commas and semicolons, lower-cases and de-duplicates", () => {
    expect(parseEmails("Laura@Club.es\nmarcos@club.es, ana@club.es;laura@club.es")).toEqual([
      "laura@club.es",
      "marcos@club.es",
      "ana@club.es",
    ]);
  });

  it("strips names and brackets and ignores words without @", () => {
    expect(parseEmails('Laura Pérez <laura@club.es>, "marcos@club.es". (ana@club.es) nombre')).toEqual([
      "laura@club.es",
      "marcos@club.es",
      "ana@club.es",
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(parseEmails("  \n ")).toEqual([]);
  });
});
