import React, { useEffect, useState, useRef, useMemo } from "react";
import Tree from "react-d3-tree";
import MostUsedTagsChart from "./MostUsedTagsChart";


function App() {
    const mainContainerRef = useRef(null);
    
    useEffect(() => {
        const updateMinHeight = () => {
            const windowHeight = window.innerHeight;
            if (mainContainerRef.current) {
                mainContainerRef.current.style.minHeight = `${windowHeight}px`;
            }
        };
        
        updateMinHeight();
        window.addEventListener('resize', updateMinHeight);
        
        return () => {
            window.removeEventListener('resize', updateMinHeight);
        };
    }, []);
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
    const [translatedText, setTranslatedText] = useState({title: null,summary: null,});
    const [loadingTranslation, setLoadingTranslation] = useState(false); // translation loading staate
    const treeContainer = useRef(null);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [tagAnimation, setTagAnimation] = useState({ scale: 1, opacity: 1 }); // for tags animation
    const [frameSize, setFrameSize] = useState({ width: 250, height: "100%", zIndex: 10 }); // frame size used for animation
    const [panelAnimation, setPanelAnimation] = useState({ visible: true }); // for right panel animation
    const [bgAnimation, setBgAnimation] = useState({ active: false, color: "#010A18" }); // for background color animation
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
                    setTagAnimation({ scale: 1.1, opacity: 0.7 });
                    // adjust frame size dynamically
                    const numTags = nodeDatum.accumulatedTags.length;
                    setFrameSize(prev => ({
                        width: Math.max(250, 250 + numTags * 15), 
                        height: prev.height
                    }));
                    
                    setTimeout(() => {
                        setTagAnimation({ scale: 1, opacity: 1 });
                        
                        //center tree
                        const { width } = treeContainer.current.getBoundingClientRect();
                        setTranslate({ x: width / 2, y: 50 });
                        setTreeKey((prev) => prev + 1);
                        setSelectedTags(nodeDatum.accumulatedTags);
                        setSelectedArticle(null);
                    }, 300);
                } else if (nodeDatum.article) {
                    setPanelAnimation({ visible: false });
                    setSelectedArticle(nodeDatum.article);
                    setTimeout(() => {
                        setPanelAnimation({ visible: true });
                        
                        setTagAnimation({ scale: 0.95, opacity: 0.9 });
                        
                        setTimeout(() => {
                            setTagAnimation({ scale: 1, opacity: 1 });
                            if (treeContainer.current) {
                                const { width } = treeContainer.current.getBoundingClientRect();
                                setTranslate({ x: width / 2, y: 50 });
                                setTreeKey(prev => prev + 1); // force re-render
                            }
                        }, 150);
                    }, 50);
                }
            }}
            >
            <rect
                width={280}
                height={lines.length * 22 + 12}
                x={-140}
                y={-((lines.length * 22 + 12) / 2)}
                fill={isTag ? "#708CCF" : "#C9D4ED"} 
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
        ref={mainContainerRef}
        style={{
            display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",  
                alignItems: "center",
                minHeight: "100vh",  
                width: "100vw",
                padding: "2rem",
                boxSizing: "border-box",
                overflow: selectedArticle ? "hidden" : "auto",
                position: "relative"
        }}
        >

            {/* Scrollbar styles */}
            <style>
            {`
                .knowledge-tree::-webkit-scrollbar {
                    width: 6px;
                    background-color: transparent;
                }
                
                .knowledge-tree::-webkit-scrollbar-thumb {
                    background-color: rgba(125, 133, 151, 0.4);
                    border-radius: 3px;
                }
                
                .knowledge-tree::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(125, 133, 151, 0.7);
                }
                
                .right-panel::-webkit-scrollbar {
                    width: 6px;
                    background-color: transparent;
                }
                
                .right-panel::-webkit-scrollbar-thumb {
                    background-color: rgba(125, 133, 151, 0.4);
                    border-radius: 3px;
                }
                
                .right-panel::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(125, 133, 151, 0.7);
                }
                
                .left-panel::-webkit-scrollbar {
                    width: 6px;
                    background-color: transparent;
                }
                
                .left-panel::-webkit-scrollbar-thumb {
                    background-color: rgba(125, 133, 151, 0.4);
                    border-radius: 3px;
                }
                
                .left-panel::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(125, 133, 151, 0.7);
                }
            `}
            </style>

                    {/* Background stars generation */}
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: -1, // Send to background
                overflow: "hidden",
                backgroundColor: bgAnimation.color,
                transition: "background-color 0.8s ease-in-out",
            }}
        >
            {useMemo(() => Array.from({ length: 70 }).map((_, index) => {
                const size = Math.random() * 25 + 5; 
                const r = Math.floor(Math.random() * 156) + 100; // Rojo entre 100 y 255
                const g = Math.floor(Math.random() * 100) + 50;  // Verde entre 50 y 150
                const b = Math.floor(Math.random() * 50);        // Azul entre 0 y 50
                const brightness = Math.random() * 0.6 + 0.4;    // Brillo aleatorio más alto
                const starColor = `rgba(${r}, ${g}, ${b}, ${brightness})`;
                const blur = Math.random() * 3 + 0.5; // Random blur 
                
                return (
                    <div
                        key={index}
                        style={{
                            position: "absolute",
                            top: `${Math.random() * 100}%`, // Random vertical position
                            left: `${Math.random() * 100}%`, // Random horizontal position
                            fontSize: `${size}px`, 
                            color: starColor, 
                            filter: `blur(${blur}px)`, // Apply blur
                            pointerEvents: "none",
                            transform: `rotate(${Math.random() * 360}deg)`, // Random rotation
                        }}
                    >
                        *
                    </div>
                );
            }), [])} {/* Empty dependency array means this will only run once */}
        </div>

        {/* initial selection (5 tags) */}

        {selectedTags.length === 0 && (
            <>
            {/* Title with icon */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                <h1 style={{ color: "#fff", margin: "0 10px 0 0" }}>Tardigrade Explorer</h1>
                <img src="/tardigradeExplorerLog.png" alt="Tardigrade Explorer" style={{ height: "40px" }} />
            </div>

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
                        borderRadius: "5px",
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
                        // animate color change
                        setBgAnimation({ active: true, color: "#fff" });
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

            <h2 style={{ color: "#fff" }}>Select any tag to begin</h2>
            <div
            style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                justifyContent: "center",
                transform: `scale(${tagAnimation.scale})`,
                opacity: tagAnimation.opacity,
                transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out"
            }}
            >
            {tags.map((tag) => (
                <button 
                key={tag} 
                onClick={() => {
                    // Animate color change
                    setBgAnimation({ active: true, color: "#fff" });
                    setTagAnimation({ scale: 1.1, opacity: 0.7 });
                    setFrameSize({ width: 250, height: "100%" });
                    setTimeout(() => {
                        setTagAnimation({ scale: 1, opacity: 1 });
                        setSelectedTags([tag]);
                        
                        //Center tree after selection
                        setTimeout(() => {
                            if (treeContainer.current) {
                                const { width } = treeContainer.current.getBoundingClientRect();
                                setTranslate({ x: width / 2, y: 50 });
                                setTreeKey((prev) => prev + 1); // Forzar re-render del árbol
                            }
                        }, 50);
                    }, 350);
                }}>
                {tag}
                </button>
            ))}
            </div>
            {/* More selected tags */}
            <h2 style={{ marginTop: "2rem", color: "#fff" }}> Most used tags:</h2>
            <div style={{ 
                height: "400px",  
                width: "90%",    
                maxWidth: "800px", 
                margin: "0 auto"  
            }}>
                <MostUsedTagsChart tagCounts={tagCounts} />
            </div>
            </>
        )}

        {/* show left panel and tree */}

        {selectedTags.length > 0 && (
            <>
            <div style={{ 
                display: "flex", 
                height: "calc(100vh - 8rem)", 
                width: "100%",
                overflow: "hidden",
                position: "relative",
                marginBottom: "2rem"
            }}>

            {/* left panel */}

            <div
            className="left-panel"
            style={{
                width: `${frameSize.width}px`,
                height: frameSize.height,
                overflowY: "auto",
                overflowX: "hidden",
                borderRight: "1px solid #ccc",
                padding: "1rem",
                transition: "width 0.3s ease-in-out",
                maxHeight: "calc(100vh - 4rem)" 
            }}
            >
            <button
            onClick={() => {
                setSelectedArticle(null)
                setTagAnimation({ scale: 0.9, opacity: 0.5 });
    
                setBgAnimation({ active: false, color: "#010A18" });
                setTimeout(() => {
                    setTagAnimation({ scale: 1, opacity: 1 });
                    setSelectedTags([]);
                    setFrameSize({ width: 250, height: "100%" });
                }, 300);
            }}
            style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 1rem",
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: "5px",
                cursor: "pointer",
                width: "100%",
                textAlign: "center",
                fontWeight: "bold",
                color: "#444",
            }}
            >
            <img src="/tardigradeExplorerLog.png" alt="Back to tags" style={{ height: "25px" }} />
            </button>
            <h3>Available Tags</h3>
            {availableTags.length === 0 && <p>No more tags</p>}
            {availableTags.map((tag) => (
                <button
                key={tag}
                style={{ display: "block", marginBottom: "0.5rem" }}
                onClick={() => {
                    // Start animation
                    setTagAnimation({ scale: 1.1, opacity: 0.7 });
                    // Adjust frame dynamically
                    setFrameSize(prev => ({
                        width: Math.max(250, 250 + selectedTags.length * 10), 
                        height: prev.height
                    }));
                    
                    setTimeout(() => {
                        setTagAnimation({ scale: 1, opacity: 1 });

                        // center tree and update tags
                        const { width } = treeContainer.current.getBoundingClientRect();
                        setTranslate({ x: width / 2, y: 50 });
                        setTreeKey((prev) => prev + 1); // center tree
                        setSelectedTags([...selectedTags, tag]);
                    }, 300);
                }}
                >
                {tag}
                </button>
            ))}
            </div>

            {/* tree */}

            <div className="knowledge-tree"
             style={{ 
                flex: 1, 
                overflow: "auto", 
                position: "relative", 
                maxHeight: "calc(100vh - 8rem)",
                height: "calc(100vh - 8rem)" 
            }} ref={treeContainer}>
            <button
            onClick={() => {
                setTagAnimation({ scale: 0.95, opacity: 0.9 });
                // Center the tree
                setTimeout(() => {
                    if (treeContainer.current) {
                        const { width } = treeContainer.current.getBoundingClientRect();
                        setTranslate({ x: width / 2, y: 50 });
                        setTreeKey((prev) => prev + 1); // force tree re-render
                        
                        // Restore animation state after rendering completes
                        setTimeout(() => {
                            setTagAnimation({ scale: 1, opacity: 1 });
                        }, 50);
                    }
                }, 100);
            }}
            style={{
                position: "absolute",
                right: "10px",
                fontSize: "0.8rem",
                color: "#888",
                zIndex: 100
            }}
            >
            center
            </button>
            <div style={{
                transform: `scale(${tagAnimation.scale})`,
                opacity: tagAnimation.opacity,
                transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
                width: "100%",
                height: "100%",
                minHeight: "500px", //min height for tree
                paddingBottom: "5rem" //Tree was cut so added padding
            }}>
                <Tree
                    key={treeKey}
                    data={buildTree(selectedTags, articles)}
                    orientation="vertical"
                    renderCustomNodeElement={renderNode}
                    pathFunc="diagonal"
                    separation={{ siblings: 2.2, nonSiblings: 2 }}
                    translate={translate}
                    transitionDuration={300}
                />
            </div>
            </div>

            {/* right panel */}

            {selectedArticle && (
                <div
                className="right-panel"
                style={{
                    width: "40%",
                    height: "100%", 
                    borderLeft: "1px solid #ccc",
                    padding: "1rem 1rem 2rem 1rem", 
                    overflowY: "auto", 
                    overflowX: "hidden", 
                    transform: `translateX(${panelAnimation.visible ? '0' : '100%'})`, 
                    opacity: panelAnimation.visible ? 1 : 0,
                    transition: "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease-out",
                    position: "relative",
                    maxHeight: "calc(100vh - 6rem)",
                    display: "flex",
                    flexDirection: "column"
                }}
                >

                {/* translate buttons */}

                <div style={{ marginBottom: "1rem" }}>
                <button
                onClick={async () => {
                    setLoadingTranslation(true);
                    try {
                        const res = await fetch("http://127.0.0.1:8000/translate", {
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
                    setPanelAnimation({ visible: false });
                    // Wait for animation to complete before clearing selection
                    setTimeout(() => {
                        setSelectedArticle(null);
                        // Restore animation state for next opening
                        setPanelAnimation({ visible: true });
                        
                        if (treeContainer.current) {
                            const { width } = treeContainer.current.getBoundingClientRect();
                            setTranslate({ x: width / 2, y: 50 });
                            setTreeKey(prev => prev + 1); // center tree
                        }
                    }, 300);
                }}
                style={{
                    position: "absolute",
                    top: 125,
                    right: 57,
                    fontSize: "0.8rem",
                    color: "#888",
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

                <div style={{ 
                  marginTop: "1.5rem", 
                  borderTop: "1px solid #ccc", 
                  paddingTop: "0.5rem", 
                  paddingBottom: "1rem", 
                  marginBottom: "1rem" 
                }}>
                <h4><img src="/IconoBot.png" alt="IconoBot" style={{height: "1.2em", marginRight: "5px", verticalAlign: "middle"}} />BioBERT Chatbot</h4>
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
                        const res = await fetch("http://127.0.0.1:8000/ask", {
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
                style={{ marginBottom: "2.5rem" }}
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
        
        {/* Footer*/}
        {selectedTags.length === 0 && !selectedArticle && (
        <footer style={{
            marginTop: "2rem",  
            paddingTop: "0.5rem", 
            paddingBottom: "0.5rem",
            borderTop: "1px solid #e0e0e0", // Border
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#010A18",
            maxWidth: "100vw",
            width: "100%",
            boxSizing: "border-box",
            position: "relative", 
            zIndex: 10
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center", //Center content
                width: "100%",
                maxWidth: "1200px",
                padding: "0 1rem"
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem" 
                }}>
                    <img 
                        src="/logo.jpeg" 
                        alt="SteamDreamers Logo" 
                        style={{
                            width: "30px", 
                            height: "30px",
                            objectFit: "cover",
                            borderRadius: "50%",
                            border: "1px solid #fff"
                        }}
                    />
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.3rem" }}>
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "#fff" }}>SteamDreamers</p>
                        <span style={{ color: "#aaa", fontSize: "0.7rem" }}>
                            © 2025
                        </span>
                    </div>
                </div>
            </div>
        </footer>
        )}
        </div>
    );
}

export default App;
