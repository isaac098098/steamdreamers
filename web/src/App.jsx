import React, { useEffect, useState, useRef } from "react";
import Tree from "react-d3-tree";

function App() {
    const [tags, setTags] = useState([]);
    const [articles, setArticles] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]); // selected tags
    const [availableTags, setAvailableTags] = useState([]); // side panel
    const [treeKey, setTreeKey] = useState(0); // center tree

    const treeContainer = useRef(null);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });

    // load json
    
    useEffect(() => {
        fetch("/json/sb.json")
            .then((res) => res.json())
            .then((data) => {
                setArticles(data);

                const allTags = data.flatMap((a) => a.tags);
                const uniqueTags = [...new Set(allTags)];
                const shuffled = uniqueTags.sort(() => Math.random() - 0.5);
                setTags(shuffled.slice(0, 5));
            });
    }, []);

    // tree position

    useEffect(() => {
        if (treeContainer.current) {
            const { width, height } = treeContainer.current.getBoundingClientRect();

            // Centrar horizontalmente, margen superior 50px
            setTranslate({ x: width / 2, y: 50 });
        }
    }, [selectedTags]);


    // available tags
 
    useEffect(() => {
        if (selectedTags.length === 0) {
            setAvailableTags([]);
            return;
        }

        // filter articles that contain selected tags

        const matchingArticles = articles.filter((a) =>
            selectedTags.every((tag) => a.tags.includes(tag))
        );

        // disable tags when there is only one article

        if (matchingArticles.length <= 1) {
            setAvailableTags([]);
            return;
        }

        // available tags now
        const tagsSet = new Set();
        matchingArticles.forEach((a) => {
            a.tags.forEach((t) => {
                if (!selectedTags.includes(t)) tagsSet.add(t);
            });
        });

        setAvailableTags(Array.from(tagsSet));
    }, [selectedTags, articles]);

    // generate tree recursively

    const buildTree = (tagsArray, articlesArray, parentTags = []) => {
        if (!tagsArray || tagsArray.length === 0) return [];

        const currentTag = tagsArray[0];
        const accumulatedTags = [...parentTags, currentTag];

        const matchingArticles = articlesArray.filter((a) =>
            accumulatedTags.every((tag) => a.tags.includes(tag))
        );

        const nextTags = tagsArray.slice(1);
        const childrenNext =
            nextTags.length > 0
            ? buildTree(nextTags, matchingArticles, accumulatedTags)
            : [];

        const childrenArticles =
            nextTags.length === 0
            ? matchingArticles.map((a) => ({
                name: a.title,
                accumulatedTags, // <-- agregar aquí para los artículos
            }))
            : [];

        const children = [...childrenNext, ...childrenArticles];

        return [
            {
                name: currentTag,
                accumulatedTags,
                children,
            },
        ];
    };

    // clickable tag nodes

    const renderNode = ({ nodeDatum }) => {
        const isTag = nodeDatum.children && nodeDatum.children.length > 0;

        const lines = nodeDatum.name.split(" ").reduce((acc, word) => {
            const lastLine = acc[acc.length - 1];
            if ((lastLine + " " + word).length > 30) {
                acc.push(word);
            } else {
                acc[acc.length - 1] = lastLine ? lastLine + " " + word : word;
            }
            return acc;
        }, [""]);

        return (
            <g
            style={{ cursor: isTag ? "pointer" : "default" }}
            onClick={() => {
                if (isTag && nodeDatum.accumulatedTags) {
                    const { width } = treeContainer.current.getBoundingClientRect();
                    setTranslate({ x: width / 2, y: 50 });

                    // center tree
                    
                    setTreeKey((prev) => prev + 1);
                    setSelectedTags(nodeDatum.accumulatedTags);
                }
            }}
            >
            <rect
                width={280}
                height={lines.length * 22 + 12}
                x={-140}
                y={-((lines.length * 22 + 12) / 2)}
                fill={isTag ? "#eeeeee" : "#f9f9f9"}
                stroke="#646cff"
                strokeWidth={0}
                rx={10}
                ry={10}
            />
            {lines.map((line, i) => (
                <text
                    key={i}
                    fill="#000000"
                    x={0}
                    y={-((lines.length - 1) * 18) / 2 + i * 18 + 6}
                    textAnchor="middle"
                    strokeWidth={0.2}
                >
                {line}
                </text>
            ))}
            </g>
        );
    };

    return (
        <div
        style={{
            display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                width: "100vw",
                padding: "2rem",
                boxSizing: "border-box",
                overflow: "hidden",
        }}
        >

        {/* initial selection (5 tags) */}

        {selectedTags.length === 0 && (
            <>
            <h2>Select any tag to begin</h2>
            <div
            style={{
                display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    justifyContent: "center",
            }}
            >
            {tags.map((tag) => (
                <button key={tag} onClick={() => setSelectedTags([tag])}>
                {tag}
                </button>
            ))}
            </div>
            </>
        )}

        {/* show left panel and tree */}

        {selectedTags.length > 0 && (
            <>
            <button
            onClick={() => setSelectedTags([])}
            style={{ marginBottom: "1rem" }}
            >
            Back to tags
            </button>

            <div style={{ display: "flex", height: "80%", width: "100%" }}>

            {/* left panel */}

            <div
            style={{
                width: "250px",
                    height: "100%",
                    overflowY: "auto",
                    borderRight: "1px solid #ccc",
                    padding: "1rem",
            }}
            >
            <h3>Available Tags</h3>
            {availableTags.length === 0 && <p>No more tags</p>}
            {availableTags.map((tag) => (
                <button
                key={tag}
                style={{ display: "block", marginBottom: "0.5rem" }}
                onClick={() => {
                    const { width } = treeContainer.current.getBoundingClientRect();
                    setTranslate({ x: width / 2, y: 50 });
                    setTreeKey((prev) => prev + 1); // fuerza re-render del árbol
                    setSelectedTags([...selectedTags, tag])}
                }
                >
                {tag}
                </button>
            ))}
            </div>

            {/* tree */}

            <div style={{ flex: 1, overflow: "auto", position: "relative" }} ref={treeContainer}>
            <button
            onClick={() => {
                if (treeContainer.current) {
                    const { width } = treeContainer.current.getBoundingClientRect();
                    setTranslate({ x: width / 2, y: 50 });
                    setTreeKey((prev) => prev + 1); // center tree
                }
            }}
            style={{
                position: "absolute",
                    right: "10px",
                    fontSize: "0.8rem",
                    color: "#888"
            }}
            >
            center
            </button>
            <Tree
                key={treeKey}
                data={buildTree(selectedTags, articles)}
                orientation="vertical"
                renderCustomNodeElement={renderNode}
                pathFunc="diagonal"
                separation={{ siblings: 2.2, nonSiblings: 2 }}
                translate={translate}
            />
            </div>
            </div>
            </>
        )}
        </div>
    );
}

export default App;

