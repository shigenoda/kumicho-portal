import { useState, useEffect, type ReactNode } from "react";
import { Pencil, Check, X, Plus, Trash2, ChevronDown, GripVertical } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface EditableSectionProps {
  pageKey: string;
  icon?: ReactNode;
  /** Fallback sections if DB has no content yet */
  defaultSections?: Array<{
    sectionKey: string;
    title: string;
    items: string[];
    sortOrder: number;
    icon?: ReactNode;
  }>;
  /** Map of sectionKey -> icon for display */
  sectionIcons?: Record<string, ReactNode>;
}

export function EditableSections({
  pageKey,
  defaultSections = [],
  sectionIcons = {},
}: EditableSectionProps) {
  const utils = trpc.useUtils();
  const { data: dbSections = [], isLoading } =
    trpc.data.getPageContent.useQuery({ pageKey });
  const initMutation = trpc.data.initPageContent.useMutation();
  const upsertMutation = trpc.data.upsertPageContent.useMutation();

  // Open/closed state for collapsibles
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  // Editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editItems, setEditItems] = useState<string[]>([]);

  // Auto-init: if DB is empty and defaults exist, populate
  useEffect(() => {
    if (!isLoading && dbSections.length === 0 && defaultSections.length > 0) {
      initMutation.mutate(
        { pageKey, sections: defaultSections },
        { onSuccess: () => utils.data.getPageContent.invalidate({ pageKey }) }
      );
    }
  }, [isLoading, dbSections.length]);

  const sections = dbSections.length > 0 ? dbSections : defaultSections.map((s, i) => ({
    id: -(i + 1),
    pageKey,
    sectionKey: s.sectionKey,
    title: s.title,
    items: s.items,
    sortOrder: s.sortOrder,
    updatedAt: new Date().toISOString(),
  }));

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startEditing = (section: typeof sections[0]) => {
    setEditingKey(section.sectionKey);
    setEditTitle(section.title);
    setEditItems([...section.items]);
    // Make sure the section is open when editing
    setOpenSections((prev) => ({ ...prev, [section.sectionKey]: true }));
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditTitle("");
    setEditItems([]);
  };

  const saveEditing = async (sectionKey: string) => {
    const section = sections.find((s) => s.sectionKey === sectionKey);
    if (!section) return;

    await upsertMutation.mutateAsync({
      pageKey,
      sectionKey,
      title: editTitle,
      items: editItems.filter((item) => item.trim()),
      sortOrder: section.sortOrder,
    });

    await utils.data.getPageContent.invalidate({ pageKey });
    setEditingKey(null);
  };

  const addItem = () => {
    setEditItems([...editItems, ""]);
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...editItems];
    newItems[index] = value;
    setEditItems(newItems);
  };

  // Find the latest updatedAt across all sections
  const lastUpdated = dbSections.length > 0
    ? dbSections.reduce((latest, s) => {
        const d = new Date(s.updatedAt);
        return d > latest ? d : latest;
      }, new Date(0))
    : null;

  if (isLoading) {
    return (
      <div className="text-sm font-light text-gray-400 text-center py-8">
        読み込み中...
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-0 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {sections.map((section) => {
          const isEditing = editingKey === section.sectionKey;
          const icon = sectionIcons[section.sectionKey];

          return (
            <Collapsible
              key={section.sectionKey}
              open={!!openSections[section.sectionKey]}
              onOpenChange={() => toggleSection(section.sectionKey)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  {icon}
                  <span className="text-sm font-light text-gray-900">
                    {isEditing ? editTitle : section.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(section);
                      }}
                      className="p-1 text-gray-300 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
                      title="編集"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-300 transition-transform ${
                      openSections[section.sectionKey] ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-4 pl-12">
                  {isEditing ? (
                    /* ── Edit mode ── */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-light text-gray-400 mb-1">
                          セクションタイトル
                        </label>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-light text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-light text-gray-400 mb-2">
                          項目
                        </label>
                        <div className="space-y-2">
                          {editItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                              <input
                                value={item}
                                onChange={(e) =>
                                  updateItem(i, e.target.value)
                                }
                                placeholder={`項目 ${i + 1}`}
                                className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm font-light text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                              />
                              <button
                                onClick={() => removeItem(i)}
                                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={addItem}
                          className="flex items-center gap-1 mt-2 text-xs font-light text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          項目を追加
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => saveEditing(section.sectionKey)}
                          disabled={upsertMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-light text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {upsertMutation.isPending ? "保存中..." : "保存"}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-light text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display mode ── */
                    <ul className="space-y-2">
                      {section.items.map((item: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm font-light text-gray-500 flex items-start gap-2"
                        >
                          <span className="text-gray-300 mt-0.5 flex-shrink-0">
                            &mdash;
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Last Updated */}
      {lastUpdated && lastUpdated.getTime() > 0 && (
        <p className="text-xs font-light text-gray-300 mt-3 text-right">
          最終更新: {lastUpdated.toLocaleDateString("ja-JP")}
        </p>
      )}
    </div>
  );
}
