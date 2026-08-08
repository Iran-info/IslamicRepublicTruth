export function ArticleBody({ body }: { body:string }) {
  const blocks = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <div className="article-body">
    {blocks.map((block, index) => {
      if (block.startsWith("### ")) return <h3 key={index}>{block.slice(4)}</h3>;
      if (block.startsWith("## ")) return <h2 key={index}>{block.slice(3)}</h2>;
      if (block.startsWith("> ")) return <blockquote key={index}>{block.slice(2)}</blockquote>;
      const lines = block.split("\n");
      if (lines.every((line) => line.startsWith("- "))) return <ul key={index}>{lines.map((line) => <li key={line}>{line.slice(2)}</li>)}</ul>;
      return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < lines.length - 1 ? <br /> : null}</span>)}</p>;
    })}
  </div>;
}
