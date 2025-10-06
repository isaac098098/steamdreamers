import React, { useState } from 'react';

const MostUsedTagsChart = ({ tagCounts }) => {
    const [hoveredTag, setHoveredTag] = useState(null);
    
    if (!tagCounts || Object.keys(tagCounts).length === 0) {
        return <div style={{ height: 200 }}>Loading tag data...</div>;
    }

    // Convert data for visualization
    const chartData = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
        
    const maxValue = chartData.length > 0 ? chartData[0][1] : 0;

    return (
        <div style={{ 
            width: "100%", 
            height: "100%", 
            display: "flex", 
            flexDirection: "column",
            gap: "8px",  /* Reducido de 10px para acomodar más barras verticalmente */
            padding: "5px 0" /* Añadido padding para mejor distribución */
        }}>
            {chartData.map(([tag, count], index) => {
                const barWidth = maxValue > 0 ? (count / maxValue) * 100 : 0;
                
                return (
                    <div key={tag} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        width: "100%",
                        gap: "8px"
                    }}>
                        <div style={{ 
                            flex: 1,
                            background: "#e0e1e6", 
                            height: "28px",  
                            borderRadius: "4px",
                            position: "relative",
                            overflow: "hidden",
                            margin: "1px 0"  
                        }}>
                            <div 
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: `${barWidth}%`,
                                    height: "100%",
                                    background: index % 4 === 0 ? '#1E1A39' : 
                                              index % 4 === 1 ? '#3B2A8D' : 
                                              index % 4 === 2 ? '#7E7A9A' : 
                                              '#A3AEBE',
                                    borderRadius: "4px",
                                    transition: "width 0.5s ease, background 0.2s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    textShadow: "0px 0px 2px rgba(0,0,0,0.7)",
                                    fontWeight: "bold",
                                    fontSize: barWidth < 25 ? "11px" : "14px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    padding: "0 10px",
                                    boxSizing: "border-box",
                                    cursor: "default"
                                }}
                                onMouseEnter={() => setHoveredTag(tag)}
                                onMouseLeave={() => setHoveredTag(null)}
                                title={tag}
                            >
                                {barWidth > 15 ? tag : ""}
                                {hoveredTag === tag && barWidth <= 15 && (
                                    <div style={{
                                        position: "absolute",
                                        top: "-30px",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        background: "#333",
                                        color: "white",
                                        padding: "3px 8px",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        whiteSpace: "nowrap",
                                        zIndex: 10
                                    }}>
                                        {tag}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ 
                            width: "35px", 
                            textAlign: "right",
                            fontSize: "0.8rem",
                            color: "#fff"
                        }}>
                            {count}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MostUsedTagsChart;