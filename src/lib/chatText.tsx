import { Fragment, ReactNode } from "react";

/**
 * Show an assistant answer as plain text, turning the bits of Markdown models
 * often add anyway into something readable: **bold** becomes bold, "* " and
 * "- " at the start of a line become bullets, "#" headings lose their marks.
 * Nothing is inserted as HTML, so the text cannot inject markup.
 */
export function renderChatText(text: string): ReactNode {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return lines.map((rawLine, lineIndex) => {
    let line = rawLine.replace(/^\s{0,3}#{1,6}\s+/, "");
    line = line.replace(/^(\s*)[*-]\s+/, "$1• ");
    const parts = line.split(/(\*\*[^*\n]+\*\*)/g).filter(Boolean);
    return (
      <Fragment key={lineIndex}>
        {parts.map((part, i) =>
          part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            <Fragment key={i}>{part.replace(/\*\*/g, "")}</Fragment>
          ),
        )}
        {lineIndex < lines.length - 1 && "\n"}
      </Fragment>
    );
  });
}
