import React, { useEffect, useState, useRef } from "react";
import Tree from "react-d3-tree";

function App() {
    const [tags, setTags] = useState([]);
    const [articles, setArticles] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]); // selected tags
    const [availableTags, setAvailableTags] = useState([]); // side panel
    const [treeKey, setTreeKey] = useState(0); // center tree
    const [selectedArticle, setSelectedArticle] = useState(null); // selected article
    const [searchText, setSearchText] = useState(""); // user's typed text
    const [searchResults, setSearchResults] = useState([]); // filtered suggestions
    const [tagCounts, setTagCounts] = useState({}); // tag counts
    const [chatHistory, setChatHistory] = useState([]); //chatbot history
    const [question, setQuestion] = useState(""); // chatbot question
    const [isTranslated, setIsTranslated] = useState(false);
    const [translatedText, setTranslatedText] = useState({
        title: null,
        summary: null,
    });
    const [loadingTranslation, setLoadingTranslation] = useState(false); // translation loading staate

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

                // tag counting
                
                const tagCountsTemp = {};
                data.forEach(article => {
                    article.tags.forEach(tag => {
                        const lower = tag.toLowerCase();
                        tagCountsTemp[lower] = (tagCountsTemp[lower] || 0) + 1;
                    });
                });
                setTagCounts(tagCountsTemp);
            });
    }, []);

    // filter tags

    useEffect(() => {
        if (!searchText) {
            setSearchResults([]);
            return;
        }

        const lowerSearch = searchText.toLowerCase();
        const filtered = Object.keys(tagCounts)
            .filter(tag => tag.toLowerCase().startsWith(lowerSearch))
            .sort((a, b) => tagCounts[b] - tagCounts[a]);
        setSearchResults(filtered);
    }, [searchText, tagCounts]);

    // tree position

    useEffect(() => {
        if (treeContainer.current) {
            const { width, height } = treeContainer.current.getBoundingClientRect();
            setTranslate({ x: width / 2, y: 50 });
        }
    }, [selectedTags]);

    // reset chatbot when changing article

    useEffect(() => {
        if (selectedArticle) {
            setChatHistory([]);
            setQuestion("");
        }
    }, [selectedArticle]);


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
                accumulatedTags,
                article: a,
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
        const isTag = !nodeDatum.article;

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
            style={{ cursor: "pointer" }}
            onClick={() => {
                if (isTag && nodeDatum.accumulatedTags) {
                    const { width } = treeContainer.current.getBoundingClientRect();
                    setTranslate({ x: width / 2, y: 50 });

                    // center tree
                    
                    setTreeKey((prev) => prev + 1);
                    setSelectedTags(nodeDatum.accumulatedTags);
                    setSelectedArticle(null);
                } else if (nodeDatum.article) {
                    setSelectedArticle(nodeDatum.article);
                    setTimeout(() => {
                        if (treeContainer.current) {
                            const { width } = treeContainer.current.getBoundingClientRect();
                            setTranslate({ x: width / 2, y: 50 });
                            setTreeKey(prev => prev + 1); // forzar re-render del árbol
                        }
                    }, 0);
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
            {/* search box */}
            <div style={{ position: "relative", marginBottom: "1rem", width: "250px" }}>
            <input
                type="text"
                placeholder="Search article..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: "100%", padding: "4px" }}
            />

            {/* search suggestions */}

            {searchText && searchResults.length > 0 && (
                <div
                style={{
                    position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        width: "100%",
                        padding: "5px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        backgroundColor: "#fff",
                        border: "1px solid #ccc",
                        zIndex: 10,
                }}
                >
                {searchResults.map((tag) => (
                    <div
                    key={tag}
                    style={{ padding: "4px", cursor: "pointer" }}
                    onClick={() => {
                        setSelectedTags([tag]);
                        setSearchText("");
                        setSearchResults([]);
                    }}
                    >
                    {tag} ({tagCounts[tag.toLowerCase()] || 0})
                    </div>
                ))}
                </div>
            )}
            </div>

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
            onClick={() => {
                setSelectedArticle(null)
                setSelectedTags([])
            }}
            style={{
                position: "absolute",
                top: "6%",
                left: "35px",
                color: "#888",
            }}
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
                    setTreeKey((prev) => prev + 1); // center tree
                    setSelectedTags([...selectedTags, tag])}
                }
                >
                {tag}
                </button>
            ))}
            </div>

            {/* tree */}

            <div style={{ flex: 1, overflow: "hidden", position: "relative" }} ref={treeContainer}>
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

            {/* right panel */}

            {selectedArticle && (
                <div
                style={{
                    width: "40%",
                    borderLeft: "1px solid #ccc",
                    padding: "1rem",
                    overflowY: "auto",
                }}
                >

                {/* translate buttons */}

                <div style={{ marginBottom: "1rem" }}>
                <button
                onClick={async () => {
                    setLoadingTranslation(true);
                    try {
                        const res = await fetch("/translate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                title: selectedArticle.title || "",
                                summary: selectedArticle.summary || "",
                            }),
                        });
                        const data = await res.json();
                        if (data.translation) {
                            setTranslatedText({
                                summary: data.translation.summary,
                                title: data.translation.title
                            });
                            setIsTranslated(true);
                        } else {
                            alert("error: " + (data.error || "no translation"));
                        }
                    } catch (err) {
                        alert("error: " + err.message);
                    } finally {
                        setLoadingTranslation(false);
                    }
                }}
                style={{
                    position: "absolute",
                    top: 125,
                    fontSize: "0.8rem",
                    color: "#888"
                }}
                disabled={loadingTranslation}
                >
                {loadingTranslation
                    ? "traduciendo..."
                    : !isTranslated
                    ? "traducir al español"
                    : "regenerar traducción"}
                </button>

                {isTranslated && (
                    <button
                    onClick={() => {
                        setIsTranslated(false);
                        setTranslatedText(null);
                    }}
                    style={{
                        position: "absolute",
                        top: 125,
                        right: 500,
                        fontSize: "0.8rem",
                        color: "#888"
                    }}
                    >
                    ver original
                    </button>
                )}
                </div>

                {/* general article information */}

                {selectedArticle.title && (
                    <h3 style={{ paddingTop: "1rem" }}>
                    {isTranslated && translatedText?.title
                            ? translatedText.title
                            : selectedArticle.title}
                    </h3>
                )}

                <button onClick={() => {
                    setSelectedArticle(null)
                    setTimeout(() => {
                        if (treeContainer.current) {
                            const { width } = treeContainer.current.getBoundingClientRect();
                            setTranslate({ x: width / 2, y: 50 });
                            setTreeKey(prev => prev + 1); // center tree
                        }
                    }, 0);
                }}
                style={{
                    position: "absolute",
                    top: 125,
                    right: 57,
                    fontSize: "0.8rem",
                    color: "#888"
                }}
                >
                close
                </button>

                <h4>
                <code>{selectedArticle.pmc_id}</code>{" "} - {" "}
                <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer">
                <code>{selectedArticle.link}</code>
                </a>
                </h4>

                {selectedArticle.journal && ( <p> <strong>Journal:</strong> {selectedArticle.journal} </p> )}

                {selectedArticle.authors && (
                    <p>
                    <strong>{isTranslated ? "Autores: " : "Authors: "}</strong>
                    {isTranslated && translatedText?.authors
                        ? translatedText.authors
                        : selectedArticle.authors.join(", ")}
                    </p>
                )}

                {selectedArticle.summary && (
                    <p>
                    <strong>{isTranslated ? "Resumen y resultados: " : "Summary and results: "}</strong>
                    {isTranslated && translatedText?.summary
                        ? translatedText.summary
                        : selectedArticle.summary}
                    </p>
                )}

                {selectedArticle.tags && (
                    <p>
                    <strong>Tags:</strong> {selectedArticle.tags.join(", ")}
                    </p>
                )}

                {/* chatbot */}

                <div style={{ marginTop: "1.5rem", borderTop: "1px solid #ccc", paddingTop: "0.5rem" }}>
                <h4>BioBERT Chatbot</h4>
                <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "1rem",
                    height: "200px",
                    overflowY: "auto",
                    marginBottom: "0.5rem",
                    backgroundColor: "#fafafa",
                    fontSize: "0.9rem",
                }}
                >
                {chatHistory.length === 0 && (
                    <p>
                    <em>
                    {isTranslated
                        ? "Haz una pregunta sobre el artículo..."
                        : "Ask a question about this article..."}
                    </em>
                    </p>
                )}

                {chatHistory.map((m, i) => (
                    <p key={i}>
                    <strong>
                    {m.role === "user" ? (isTranslated ? "Tú:" : "You:") : "BioBERT:"}
                    </strong>{" "}
                    {m.text}
                    </p>
                ))}
                </div>

                <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!question.trim()) return;

                    const q = question;
                    setChatHistory([...chatHistory, { role: "user", text: q }]);
                    setQuestion("");

                    try {
                        const res = await fetch("/ask", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                pmc_id: selectedArticle.pmc_id,
                                question: q,
                                is_translated: isTranslated
                            }),
                        });
                        const data = await res.json();
                        const answer = data.answer || data.error || (isTranslated ? "No se pudo obtener una respuesta" : "Can't get an answer");
                        setChatHistory((prev) => [...prev, { role: "bot", text: answer }]);
                    } catch (err) {
                        setChatHistory((prev) => [...prev, { role: "bot", text: isTranslated ? "Fallo al conectar con el servidor." : "Failed to connect to server." }]);
                    }
                }}
                >
                <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={isTranslated ? "Pregunta algo..." : "Ask something..."}
                style={{ width: isTranslated ? "83%" : "85%" , padding: "6px" }}
                />
                <button type="submit" style={{ marginLeft: isTranslated ? "0.7rem" : "0.45rem" }}>
                {isTranslated ? "Enviar" : "Send"}
                </button>
                </form>
                </div>
                </div>
            )}
            </div>
            </>
        )}
        </div>
    );
}

export default App;
