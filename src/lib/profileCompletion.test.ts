import type { Profile } from "@/types";
import { describe, expect, it } from "vitest";
import { profileCompletion } from "./profileCompletion";

const base: Profile = {
  id: "u1",
  displayName: "",
  avatarUrl: null,
  bio: "",
  location: "",
  favoriteFaction: null,
  website: null,
  links: [],
  role: "user",
  createdAt: "2026-09-30T00:00:00Z",
  updatedAt: "2026-09-30T00:00:00Z",
};

describe("profileCompletion", () => {
  it("counts every field for an empty profile", () => {
    const r = profileCompletion(base);
    expect(r.percent).toBe(0);
    expect(r.missing.map((m) => m.key)).toEqual(["avatar", "name", "faction", "bio", "location"]);
  });

  it("reports what is left", () => {
    const r = profileCompletion({ ...base, displayName: "José", favoriteFaction: "Thousand Sons", bio: "Pinto Mil Hijos desde 2019." });
    expect(r.percent).toBe(60);
    expect(r.missing.map((m) => m.key)).toEqual(["avatar", "location"]);
  });

  it("does not count a one-word bio", () => {
    expect(profileCompletion({ ...base, bio: "Hola" }).missing.map((m) => m.key)).toContain("bio");
  });

  it("handles a missing profile", () => {
    expect(profileCompletion(null).percent).toBe(0);
  });
});
