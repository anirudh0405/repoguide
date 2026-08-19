// Generates a readable ASCII directory tree from ingested file paths.

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

const MAX_TREE_NODES = 160;
const MAX_DEPTH = 6;

export function buildDirectoryTree(filePaths: string[]): string {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };

  for (const filePath of filePaths) {
    const parts = filePath.split("/");
    let node = root;
    let current = "";
    for (let i = 0; i < parts.length; i += 1) {
      current = current ? `${current}/${parts[i]}` : parts[i];
      const isLast = i === parts.length - 1;
      const existing = node.children.find((child) => child.name === parts[i]);
      if (existing) {
        node = existing;
      } else {
        const child: TreeNode = {
          name: parts[i],
          path: current,
          isDir: !isLast,
          children: [],
        };
        node.children.push(child);
        node = child;
      }
    }
  }

  const lines: string[] = [];
  let nodeCount = 0;
  let truncated = false;

  const sortChildren = (children: TreeNode[]) => {
    children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const render = (children: TreeNode[], prefix: string, depth: number) => {
    sortChildren(children);
    const visible: (TreeNode | null)[] = children;
    for (let i = 0; i < visible.length; i += 1) {
      const node = visible[i];
      if (!node) continue;
      if (nodeCount >= MAX_TREE_NODES) {
        truncated = true;
        return;
      }
      nodeCount += 1;
      const isLast = i === visible.length - 1;
      const connector = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${connector}${node.name}${node.isDir ? "/" : ""}`);
      if (node.isDir && depth < MAX_DEPTH) {
        render(node.children, `${prefix}${isLast ? "    " : "│   "}`, depth + 1);
      }
    }
  };

  sortChildren(root.children);
  // Top-level entries: do not prefix root with box-drawing.
  for (let i = 0; i < root.children.length; i += 1) {
    const node = root.children[i];
    if (nodeCount >= MAX_TREE_NODES) {
      truncated = true;
      break;
    }
    nodeCount += 1;
    lines.push(node.name + (node.isDir ? "/" : ""));
    if (node.isDir) {
      render(node.children, "", 1);
    }
  }

  if (truncated) {
    lines.push("… (truncated)");
  }

  return lines.join("\n");
}