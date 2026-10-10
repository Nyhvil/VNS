type RichTextTag = "h2" | "h3" | "p" | "div";

export default function RichText({
  tag,
  className,
  html,
}: {
  tag: RichTextTag;
  className: string;
  html: string;
}) {
  const merged = `rich-text ${className}`;
  if (tag === "h2") return <h2 className={merged} dangerouslySetInnerHTML={{ __html: html }} />;
  if (tag === "h3") return <h3 className={merged} dangerouslySetInnerHTML={{ __html: html }} />;
  if (tag === "div") return <div className={merged} dangerouslySetInnerHTML={{ __html: html }} />;
  return <p className={merged} dangerouslySetInnerHTML={{ __html: html }} />;
}
