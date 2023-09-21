import React, { useState, useEffect } from "react";

export default function Tooltip({ children, state }) {
    const [tooltipState, setTooltipState] = useState({ display: "none" });

    useEffect(() => {
        setTooltipState(state);
    }, [state]);

    return (
        <div
            style={{
                display: tooltipState.display,
                position: "absolute",
                pointerEvents: "none",
                left: tooltipState.left,
                top: tooltipState.top,
                fontSize: 15,
                width: 120,
                textAlign: "center",
                lineHeight: 1,
                padding: 6,
                background: "white",
                fontFamily: "sans-serif",
                zIndex: 1,
                backgroundColor: "darkgrey",
                color: "white",
            }}
        >
            {children}
        </div>
    );
}
