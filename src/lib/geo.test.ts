import { describe, expect, it } from "vitest";
import { formatDistance, haversineKm } from "./geo";
import { matchDay, matchPlace, matchTime, spotsLeft } from "./matches";

describe("geo", () => {
  it("measures distances between cities", () => {
    const madrid = { lat: 40.4168, lng: -3.7038 };
    const barcelona = { lat: 41.3874, lng: 2.1686 };
    expect(Math.round(haversineKm(madrid, barcelona))).toBe(505);
    expect(haversineKm(madrid, madrid)).toBe(0);
  });

  it("formats distances", () => {
    expect(formatDistance(0.4)).toBe("a menos de 1 km");
    expect(formatDistance(3.26)).toBe("a 3,3 km");
    expect(formatDistance(42.7)).toBe("a 43 km");
    expect(formatDistance(null)).toBeNull();
  });
});

describe("match labels", () => {
  const today = new Date(2026, 9, 3); // sáb 3 oct 2026
  it("names the day", () => {
    expect(matchDay("2026-10-03", today)).toBe("Hoy");
    expect(matchDay("2026-10-04", today)).toBe("Mañana");
    expect(matchDay("2026-10-10", today)).toMatch(/sáb.*10.*oct/);
  });

  it("describes the time", () => {
    expect(matchTime({ timeMode: "fixed", startTime: "18:00:00", endTime: null, timeNote: "" })).toBe("18:00");
    expect(matchTime({ timeMode: "fixed", startTime: "17:00:00", endTime: "21:00:00", timeNote: "" })).toBe("17:00–21:00");
    expect(matchTime({ timeMode: "flexible", startTime: null, endTime: null, timeNote: "por la tarde" })).toBe("Horario flexible · por la tarde");
  });

  it("describes the place without exposing home addresses", () => {
    expect(matchPlace({ venueType: "casa", venueName: "Calle Falsa 123", city: "Madrid" })).toBe("En casa · Madrid");
    expect(matchPlace({ venueType: "tienda", venueName: "Dungeon Marvels", city: "Barcelona" })).toBe("Dungeon Marvels · Barcelona");
    expect(matchPlace({ venueType: "online", venueName: "Tabletop Simulator", city: "" })).toBe("Online · Tabletop Simulator");
    expect(spotsLeft({ maxPlayers: 2, playerCount: 1 })).toBe(1);
  });
});
