import { useEffect } from "react";

export function useAutoResizeTextArea(
  textAreaRef: React.RefObject<HTMLTextAreaElement>,
  value: string,
  options?: { minRows?: number; maxRows?: number }
) {
  const minRows = options?.minRows ?? 1;
  const maxRows = options?.maxRows ?? 3;

  useEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;

    // Reset height to auto to correctly read scrollHeight
    el.style.height = "auto";

    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight || "0");
    const paddingTop = parseFloat(computed.paddingTop || "0");
    const paddingBottom = parseFloat(computed.paddingBottom || "0");
    const borderTop = parseFloat(computed.borderTopWidth || "0");
    const borderBottom = parseFloat(computed.borderBottomWidth || "0");

    const minHeight = lineHeight * minRows + paddingTop + paddingBottom + borderTop + borderBottom;
    const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom + borderTop + borderBottom;

    // Measure content height
    const contentHeight = el.scrollHeight;

    // Clamp height between min and max
    const newHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));

    // Apply height and overflow
    el.style.height = `${newHeight}px`;
    el.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";

    // Smooth height transition
    el.style.transition = "height 150ms ease";
  }, [textAreaRef, value, minRows, maxRows]);
}

