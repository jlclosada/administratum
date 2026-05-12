import { mergeAttributes, Node } from "@tiptap/react";

export interface PaintChipAttributes {
  paintId: string;
  paintName: string;
  hexColor: string | null;
  brand: string;
  range: string;
}

/**
 * TipTap inline node that renders a paint chip (colored dot + name) within text.
 */
export const PaintChip = Node.create({
  name: "paintChip",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      paintId: { default: null },
      paintName: { default: "" },
      hexColor: { default: null },
      brand: { default: "" },
      range: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-paint-chip]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const hex = HTMLAttributes.hexColor as string | null;
    const name = HTMLAttributes.paintName as string;
    const brand = HTMLAttributes.brand as string;

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-paint-chip": "",
        class: "paint-chip",
        style: `--paint-color: ${hex ?? "#888"}`,
        title: `${brand} - ${name}`,
      }),
      [
        "span",
        {
          class: "paint-chip-dot",
          style: `background-color: ${hex ?? "#888"}`,
        },
      ],
      ["span", { class: "paint-chip-label" }, name],
    ];
  },
});
