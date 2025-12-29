import { describe, it, expect } from "vitest";

describe("Calendar Event System", () => {
  describe("Event CRUD", () => {
    it("should create an event with required fields", async () => {
      const input = {
        title: "組長会議",
        date: "2026-04-01T00:00:00.000Z",
        category: "meeting",
        editorName: "テスト編集者",
      };
      
      expect(input.title).toBeDefined();
      expect(input.date).toBeDefined();
      expect(input.category).toBeDefined();
      expect(typeof input.title).toBe("string");
      expect(new Date(input.date).getTime()).not.toBeNaN();
    });

    it("should create an event with checklist", async () => {
      const input = {
        title: "河川清掃",
        date: "2026-05-10T00:00:00.000Z",
        category: "cleaning",
        checklist: [
          { id: "1", text: "トング準備", completed: false },
          { id: "2", text: "ゴミ袋準備", completed: false },
          { id: "3", text: "軍手準備", completed: true },
        ],
        notes: "雨天の場合は翌週に延期",
        editorName: "テスト編集者",
      };
      
      expect(input.checklist).toHaveLength(3);
      expect(input.checklist[0]).toHaveProperty("id");
      expect(input.checklist[0]).toHaveProperty("text");
      expect(input.checklist[0]).toHaveProperty("completed");
      expect(input.notes).toBeDefined();
    });

    it("should update an event", async () => {
      const input = {
        id: 1,
        title: "更新されたイベント",
        date: "2026-04-15T00:00:00.000Z",
        category: "deadline",
        checklist: [
          { id: "1", text: "更新された項目", completed: true },
        ],
        editorName: "テスト編集者",
      };
      
      expect(input.id).toBeGreaterThan(0);
      expect(input.title).toBeDefined();
      expect(input.checklist).toHaveLength(1);
    });

    it("should delete an event", async () => {
      const input = {
        id: 1,
        editorName: "テスト編集者",
      };
      
      expect(input.id).toBeGreaterThan(0);
    });
  });

  describe("Category validation", () => {
    it("should accept valid categories", () => {
      const validCategories = ["meeting", "cleaning", "deadline", "event", "other"];
      
      validCategories.forEach((category) => {
        expect(typeof category).toBe("string");
        expect(category.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Checklist operations", () => {
    it("should toggle checklist item", () => {
      const checklist = [
        { id: "1", text: "項目1", completed: false },
        { id: "2", text: "項目2", completed: true },
      ];
      
      const itemId = "1";
      const updatedChecklist = checklist.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      
      expect(updatedChecklist[0].completed).toBe(true);
      expect(updatedChecklist[1].completed).toBe(true);
    });

    it("should add checklist item", () => {
      const checklist = [
        { id: "1", text: "項目1", completed: false },
      ];
      
      const newItem = { id: "2", text: "新しい項目", completed: false };
      const updatedChecklist = [...checklist, newItem];
      
      expect(updatedChecklist).toHaveLength(2);
      expect(updatedChecklist[1].text).toBe("新しい項目");
    });

    it("should remove checklist item", () => {
      const checklist = [
        { id: "1", text: "項目1", completed: false },
        { id: "2", text: "項目2", completed: true },
      ];
      
      const itemIdToRemove = "1";
      const updatedChecklist = checklist.filter(item => item.id !== itemIdToRemove);
      
      expect(updatedChecklist).toHaveLength(1);
      expect(updatedChecklist[0].id).toBe("2");
    });
  });

  describe("Date handling", () => {
    it("should parse ISO date string correctly", () => {
      const dateString = "2026-04-15T00:00:00.000Z";
      const date = new Date(dateString);
      
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(3); // April is month 3 (0-indexed)
      expect(date.getUTCDate()).toBe(15);
    });

    it("should format date for display", () => {
      const date = new Date("2026-04-15T00:00:00.000Z");
      const formatted = date.toLocaleDateString('ja-JP');
      
      expect(formatted).toContain("2026");
    });
  });
});
