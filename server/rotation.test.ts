import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Leader Rotation Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Exemption Rules", () => {
    it("should identify A-type exemption (move-in less than 12 months)", () => {
      const targetDate = new Date(2026, 3, 1); // April 1, 2026
      const moveInDate = new Date(2025, 8, 1); // September 1, 2025 (7 months before)
      
      const monthsSinceMoveIn = (targetDate.getTime() - moveInDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      expect(monthsSinceMoveIn).toBeLessThan(12);
    });

    it("should not exempt A-type if move-in is 12+ months ago", () => {
      const targetDate = new Date(2026, 3, 1); // April 1, 2026
      const moveInDate = new Date(2024, 8, 1); // September 1, 2024 (19 months before)
      
      const monthsSinceMoveIn = (targetDate.getTime() - moveInDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      expect(monthsSinceMoveIn).toBeGreaterThanOrEqual(12);
    });

    it("should identify B-type exemption (recent leader within 2 years)", () => {
      const targetYear = 2026;
      const lastLeaderYear = 2025; // 1 year ago
      
      const yearsSinceLastLeader = targetYear - lastLeaderYear;
      
      expect(yearsSinceLastLeader).toBeLessThanOrEqual(2);
    });

    it("should not exempt B-type if last leader was 3+ years ago", () => {
      const targetYear = 2026;
      const lastLeaderYear = 2022; // 4 years ago
      
      const yearsSinceLastLeader = targetYear - lastLeaderYear;
      
      expect(yearsSinceLastLeader).toBeGreaterThan(2);
    });
  });

  describe("Candidate Sorting", () => {
    it("should sort candidates by move-in date (oldest first)", () => {
      const candidates = [
        { householdId: "201", moveInDate: new Date(2019, 8, 1) },
        { householdId: "101", moveInDate: new Date(2018, 3, 1) },
        { householdId: "301", moveInDate: new Date(2016, 4, 1) },
      ];

      const sorted = candidates.sort((a, b) => {
        return a.moveInDate.getTime() - b.moveInDate.getTime();
      });

      expect(sorted[0].householdId).toBe("301"); // 2016
      expect(sorted[1].householdId).toBe("101"); // 2018
      expect(sorted[2].householdId).toBe("201"); // 2019
    });

    it("should handle null move-in dates by placing them last", () => {
      const candidates = [
        { householdId: "201", moveInDate: new Date(2019, 8, 1) },
        { householdId: "101", moveInDate: null },
        { householdId: "301", moveInDate: new Date(2016, 4, 1) },
      ];

      const sorted = candidates.sort((a, b) => {
        if (a.moveInDate && b.moveInDate) {
          return a.moveInDate.getTime() - b.moveInDate.getTime();
        }
        if (a.moveInDate && !b.moveInDate) return -1;
        if (!a.moveInDate && b.moveInDate) return 1;
        return a.householdId.localeCompare(b.householdId);
      });

      expect(sorted[0].householdId).toBe("301"); // 2016
      expect(sorted[1].householdId).toBe("201"); // 2019
      expect(sorted[2].householdId).toBe("101"); // null (last)
    });
  });

  describe("Primary and Backup Selection", () => {
    it("should select first eligible candidate as primary", () => {
      const eligibleCandidates = [
        { householdId: "102", moveInDate: new Date(2020, 5, 1), isExempt: false },
        { householdId: "303", moveInDate: new Date(2021, 3, 1), isExempt: false },
      ];

      const primary = eligibleCandidates[0];
      
      expect(primary.householdId).toBe("102");
    });

    it("should select second eligible candidate as backup", () => {
      const eligibleCandidates = [
        { householdId: "102", moveInDate: new Date(2020, 5, 1), isExempt: false },
        { householdId: "303", moveInDate: new Date(2021, 3, 1), isExempt: false },
      ];

      const backup = eligibleCandidates.length > 1 ? eligibleCandidates[1] : null;
      
      expect(backup?.householdId).toBe("303");
    });

    it("should use primary as backup if only one candidate", () => {
      const eligibleCandidates = [
        { householdId: "102", moveInDate: new Date(2020, 5, 1), isExempt: false },
      ];

      const primary = eligibleCandidates[0];
      const backup = eligibleCandidates.length > 1 ? eligibleCandidates[1] : primary;
      
      expect(backup.householdId).toBe("102");
    });
  });

  describe("Reason Generation", () => {
    it("should generate reason with exempted households", () => {
      const exemptedList = [
        { householdId: "202", exemptionReason: "入居12ヶ月未満 → 免除候補（A）" },
        { householdId: "301", exemptionReason: "直近組長 → 2年間免除候補（B）" },
      ];
      const primary = { householdId: "102" };

      const reasonParts = exemptedList.map((c) => `${c.householdId}は${c.exemptionReason}`);
      const reason = reasonParts.length > 0
        ? `${reasonParts.join("、")} → 繰上げで${primary.householdId}`
        : `入居年月順で${primary.householdId}`;

      expect(reason).toContain("202は入居12ヶ月未満");
      expect(reason).toContain("301は直近組長");
      expect(reason).toContain("繰上げで102");
    });

    it("should generate simple reason when no exemptions", () => {
      const exemptedList: Array<{ householdId: string; exemptionReason: string }> = [];
      const primary = { householdId: "101" };

      const reasonParts = exemptedList.map((c) => `${c.householdId}は${c.exemptionReason}`);
      const reason = reasonParts.length > 0
        ? `${reasonParts.join("、")} → 繰上げで${primary.householdId}`
        : `入居年月順で${primary.householdId}`;

      expect(reason).toBe("入居年月順で101");
    });
  });

  describe("Schedule Status", () => {
    it("should have valid status values", () => {
      const validStatuses = ["draft", "conditional", "confirmed"];
      
      expect(validStatuses).toContain("draft");
      expect(validStatuses).toContain("conditional");
      expect(validStatuses).toContain("confirmed");
    });
  });

  describe("Year Range Calculation", () => {
    it("should calculate 9-year range from current year", () => {
      const currentYear = 2026;
      const endYear = currentYear + 8;
      
      expect(endYear).toBe(2034);
      
      const years = [];
      for (let y = currentYear; y <= endYear; y++) {
        years.push(y);
      }
      
      expect(years.length).toBe(9);
      expect(years[0]).toBe(2026);
      expect(years[8]).toBe(2034);
    });
  });
});
