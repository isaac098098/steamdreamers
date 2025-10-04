// App.js
import React, { useEffect, useState, useRef } from "react";
import Tree from "react-d3-tree";

function App() {
  const [tags, setTags] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [treeKey, setTreeKey] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const treeContainer = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 50 });

  // Load JSON
  useEffect(() => {
    fetch("/json/sb.json")
      .then((res) => res.json())
      .then((data) => {
        setArticles(Array.isArray(data) ? data : []);
        const allTags = (Array.isArray(data) ? data.flatMap((a) => a.tags || []) : []);
        const uniqueTags = [...new Set(allTags)];
        const shuffled = uniqueTags.sort(() => Math.random() - 0.5);
        setTags(shuffled.slice(0, 5));
      })
      .catch((err) => {
        console.error("Error loading sb.json:", err);
        setArticles([]);
      });
  }, []);

  // safe recalc translate after layout changes (tags, article open/close, or treeKey)
  useEffect(() => {
    const recalc = () => {
      if (treeContainer.current) {
        const { width } = treeContainer.current.getBoundingClientRect();
        setTranslate({ x: Math.max(40, width / 2), y: 50 });
      }
    };
    // run after paint so DOM layout finished
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(recalc);
    } else {
      setTimeout(recalc, 0);
    }
  }, [selectedTags, selectedArticle, treeKey, articles]);

  // available tags for side panel
  useEffect(() => {
    if (!selectedTags || selectedTags.length === 0) {
      setAvailableTags([]);
      return;
    }

    const matchingArticles = articles.filter((a) =>
      selectedTags.every((t) => Array.isArray(a.tags) && a.tags.includes(t))
    );

    if (matchingArticles.length <= 1) {
      setAvailableTags([]);
      return;
    }

    const tagsSet = new Set();
    matchingArticles.forEach((a) => {
      (a.tags || []).forEach((t) => {
        if (!selectedTags.includes(t)) tagsSet.add(t);
      });
    });

    setAvailableTags(Array.from(tagsSet));
  }, [selectedTags, articles]);

  // Build tree: returns a single root object (or null)
  const buildTree = (tagsArray = [], articlesArray = []) => {
    if (!tagsArray || tagsArray.length === 0) return { name: "No selection", children: [] };

    const buildNode = (index, parentTags = []) => {
      const currentTag = tagsArray[index];
      const accumulatedTags = [...parentTags, currentTag];

      const matchingArticles = articlesArray.filter((a) =>
        accumulatedTags.every((t) => Array.isArray(a.tags) && a.tags.includes(t))
      );

      // if last tag -> article children
      if (index === tagsArray.length - 1) {
        const articleChildren = matchingArticles.map((a) => ({
          name: a.title || a.pmc_id || "Untitled",
          accumulatedTags,
          articleId: a.pmc_id || null,
          children: [], // explicit
        }));
        return {
          name: currentTag,
          accumulatedTags,
          children: articleChildren,
        };
      }

      // else chain next tag
      const nextNode = buildNode(index + 1, accumulatedTags);
      return {
        name: currentTag,
        accumulatedTags,
        children: nextNode ? [nextNode] : [],
      };
    };

    return buildNode(0, []);
  };

  // small helper: wrap text into lines of ~maxLen characters
  const wrapText = (text = "", maxLen = 30) => {
    const s = String(text || "");
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines = [words[0]];
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      const last = lines[lines.length - 1];
      if ((last + " " + w).length > maxLen) lines.push(w);
      else lines[lines.length - 1] = last + " " + w;
    }
    return lines;
  };

  // custom node renderer (safe)
  const renderNode = (rd3tProps) => {
    const { nodeDatum } = rd3tProps;
    const name = String(nodeDatum && nodeDatum.name ? nodeDatum.name : "");
    const childrenArr = Array.isArray(nodeDatum && nodeDatum.children ? nodeDatum.children : []);
    const isTag = childrenArr.length > 0;

    const lines = wrapText(name, 28);

    return (
      <g
        style={{ cursor: "pointer" }}
        onClick={(ev) => {
          ev.stopPropagation();
          try {
            if (isTag && nodeDatum.accumulatedTags) {
              // click on tag node -> drill down
              setSelectedArticle(null);
              setSelectedTags(nodeDatum.accumulatedTags);
              setTreeKey((k) => k + 1);
            } else if (nodeDatum.articleId) {
              // click on article node -> open detail
              const art = articles.find((a) => a.pmc_id === nodeDatum.articleId);
              if (art) {
                setSelectedArticle(art);
              } else {
                // fallback: if not found, clear selection
                setSelectedArticle(null);
              }
            } else {
              // neutral click
            }
          } catch (err) {
            console.error("Error handling node click:", err);
          }
        }}
      >
        <rect
          width={300}
          height={lines.length * 20 + 12}
          x={-150}
          y={-((lines.length * 20 + 12) / 2)}
          fill={isTag ? "#eef2ff" : "#ffffff"}
          stroke={isTag ? "#5b6cff" : "#999"}
          strokeWidth={isTag ? 0.6 : 0.4}
          rx={8}
          ry={8}
        />
        {lines.map((line, i) => (
          <text
            key={i}
            fill="#111"
            x={0}
            y={-((lines.length - 1) * 16) / 2 + i * 16 + 6}
            textAnchor="middle"
            style={{ fontSize: 12, pointerEvents: "none" }}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  // top-level tree data (object)
  const treeDataObject = buildTree(selectedTags, articles);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        padding: "1rem",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial",
      }}
    >
      {/* initial selection (5 tags) */}
      {selectedTags.length === 0 && (
        <>
          <h2 style={{ textAlign: "center" }}>Selecciona una etiqueta para empezar</h2>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: "0.5rem",
            }}
          >
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags([tag]);
                  setSelectedArticle(null);
                }}
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: 6,
                  border: "1px solid #bbb",
                  background: "#fff",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </>
      )}

      {/* main view */}
      {selectedTags.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <button
                onClick={() => {
                  setSelectedTags([]);
                  setSelectedArticle(null);
                }}
                style={{ marginBottom: "0.75rem" }}
              >
                ← Volver a etiquetas
              </button>
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem" }}>
              Seleccionadas: {selectedTags.join("  •  ")}
            </div>
          </div>

          <div style={{ display: "flex", height: "86%", width: "100%", gap: "0.5rem" }}>
            {/* izquierda: panel + tree */}
            <div
              style={{
                width: selectedArticle ? "50%" : "100%",
                display: "flex",
                borderRight: selectedArticle ? "1px solid #e1e1e1" : "none",
                minWidth: 320,
                overflow: "hidden",
              }}
            >
              {/* panel */}
              <div
                style={{
                  width: 260,
                  height: "100%",
                  overflowY: "auto",
                  borderRight: "1px solid #ddd",
                  padding: "1rem",
                  boxSizing: "border-box",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Available Tags</h3>
                {availableTags.length === 0 && <p style={{ color: "#666" }}>No more tags</p>}
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      width: "100%",
                      textAlign: "left",
                      padding: "0.45rem 0.6rem",
                      borderRadius: 6,
                      border: "1px solid #ddd",
                      background: "#fff",
                    }}
                    onClick={() => {
                      // guard before using bounding rect
                      setSelectedTags((prev) => [...prev, tag]);
                      setSelectedArticle(null);
                      setTreeKey((k) => k + 1);
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* árbol */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  position: "relative",
                  padding: "0.5rem",
                }}
                ref={treeContainer}
              >
                <button
                  onClick={() => {
                    if (treeContainer.current) {
                      const { width } = treeContainer.current.getBoundingClientRect();
                      setTranslate({ x: Math.max(40, width / 2), y: 50 });
                      setTreeKey((k) => k + 1);
                    }
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    fontSize: "0.8rem",
                    color: "#666",
                    zIndex: 10,
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: 6,
                    padding: "0.25rem 0.5rem",
                  }}
                >
                  center
                </button>

                {/* show tree only if there is valid data */}
                {treeDataObject && treeDataObject.name ? (
                  <Tree
                    key={treeKey}
                    data={treeDataObject}
                    orientation="vertical"
                    renderCustomNodeElement={renderNode}
                    pathFunc="diagonal"
                    separation={{ siblings: 2, nonSiblings: 2.2 }}
                    translate={translate}
                    zoomable={true}
                    initialDepth={2}
                  />
                ) : (
                  <div style={{ color: "#666" }}>No hay datos para mostrar en el árbol.</div>
                )}
              </div>
            </div>

            {/* right panel */}
            {selectedArticle && (
              <div
                style={{
                  width: "50%",
                  padding: "1rem",
                  overflowY: "auto",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <h2 style={{ marginTop: 0, marginBottom: 6 }}>
                    {selectedArticle.title || "Sin título"}
                  </h2>
                  <div>
                    <button
                      onClick={() => setSelectedArticle(null)}
                      style={{
                        background: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                <p style={{ margin: "0.25rem 0" }}>
                  <strong>PMC ID:</strong> {selectedArticle.pmc_id || "N/A"}
                </p>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Journal:</strong> {selectedArticle.journal || "N/A"}
                </p>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Authors:</strong>{" "}
                  {Array.isArray(selectedArticle.authors)
                    ? selectedArticle.authors.join(", ")
                    : selectedArticle.authors || "N/A"}
                </p>
                <p style={{ margin: "0.25rem 0 1rem 0" }}>
                  <strong>Tags:</strong>{" "}
                  {Array.isArray(selectedArticle.tags) ? selectedArticle.tags.join(", ") : "N/A"}
                </p>

                <h3>Abstract</h3>
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                  {selectedArticle.abstract || "No abstract available."}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;

