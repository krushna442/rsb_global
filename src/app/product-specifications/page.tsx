"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useProducts } from "@/lib/use-products";

export default function ProductSpecificationsPage() {
    const { products, isLoaded } = useProducts();
    const [searchTerm, setSearchTerm] = useState("");
    const [partInfo, setPartInfo] = useState<any>(null);

    const handleSearch = () => {
        if (!searchTerm.trim()) return;
        const matched = products.find(
            (p) => p.partNumber.toLowerCase() === searchTerm.toLowerCase()
        );
        if (matched) {
            setPartInfo(matched);
        } else {
            setPartInfo(null);
            alert("Part Number not found");
        }
    };

    const handleReset = () => {
        setSearchTerm("");
        setPartInfo(null);
    };

    if (!isLoaded)
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
            </DashboardLayout>
        );

    const specs = [
        [
            { label: "Tube Length", value: partInfo?.tubeLength },
            { label: "Tube Dia & Thickness", value: partInfo?.tubeDiameter },
            { label: "Series", value: partInfo?.series },
            { label: "Part Type", value: partInfo?.partType },
        ],
        [
            { label: "Available Noise Deadener", value: partInfo?.availableNoiseDeadener },
            { label: "Fep Press H. Stock Positions", value: partInfo?.fepPressHStockPositions },
            { label: "Rear Housing length", value: partInfo?.rearHousingLength },
            { label: "Long Fork Length", value: partInfo?.longForkLength },
        ],
        [
            { label: "S.F Details", value: partInfo?.sfDetails },
            { label: "PDC Length", value: partInfo?.pdcLength },
            { label: "Front End Piece Details", value: partInfo?.frontEndPieceDetails },
            { label: "Flange yoke Details", value: partInfo?.mountingDetailsFlangeYoke },
        ],
        [
            { label: "Greaseable or Non Greasable", value: partInfo?.greaseableOrNonGreaseable },
            { label: "Coupling Flange Details", value: partInfo?.mountingDetailsCouplingFlange },
            { label: "Coupling Flange Orientation", value: partInfo?.couplingFlangeOrientations },
            { label: "CB Kit Details", value: partInfo?.cbKitDetails },
        ],
        [
            { label: "Loctite Grade Use", value: partInfo?.loctiteGradeUse },
            { label: "Hex bolt/Hex nut Tightening", value: partInfo?.hexBoltNutTighteningTorque },
            { label: "Balancing RPM", value: partInfo?.balancingRpm },
            { label: "Unbalance Value CMG", value: partInfo?.unbalanceInCmg },
        ],
        [
            { label: "Unbalance Value GM", value: partInfo?.unbalanceInGram },
            { label: "I/A Bellow Details", value: partInfo?.iaBellowDetails },
            { label: "Total Length", value: partInfo?.totalLength },
            { label: "RearSlip", value: partInfo?.slipDetails },
        ],
        [
            { label: "Mod No", value: partInfo?.drawingModel },
            { label: "Vendor code", value: partInfo?.vendorCode },
            { label: "Customer Name", value: partInfo?.customer },
            { label: "DWG Weight/Mod Date", value: partInfo?.partWeight },
        ],
    ];

    return (
        <DashboardLayout>
            <div
                style={{
                    fontFamily: "'Arial Black', 'Arial', sans-serif",
                    backgroundColor: "#d0ece7",
                    minHeight: "100vh",
                    padding: "0",
                }}
            >
                {/* ── TOP BAR ── */}
                <div
                    style={{
                        backgroundColor: "#007a6e",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 14px",
                        flexWrap: "wrap",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                >
                    {/* Part Number Input */}
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Enter Part Number"
                        style={{
                            flex: "0 0 260px",
                            height: "48px",
                            border: "3px solid #e53935",
                            borderRadius: "5px",
                            padding: "0 14px",
                            fontSize: "20px",
                            fontWeight: "900",
                            color: "#c62828",
                            background: "#fffde7",
                            outline: "none",
                            letterSpacing: "1px",
                        }}
                    />

                    {/* Description Box */}
                    <div
                        style={{
                            flex: "1",
                            height: "48px",
                            border: "3px solid #e53935",
                            borderRadius: "5px",
                            padding: "0 16px",
                            fontSize: "20px",
                            fontWeight: "900",
                            color: "#c62828",
                            background: "#fffde7",
                            display: "flex",
                            alignItems: "center",
                            minWidth: "240px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        {partInfo?.partDescription || "ASSY PROP SHAFT"}
                    </div>

                    {/* Show Button */}
                    <button
                        onClick={handleSearch}
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#26a69a",
                            color: "#fff",
                            border: "2px solid #80cbc4",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        🔍 Show
                    </button>

                    {/* Reset Button */}
                    <button
                        onClick={handleReset}
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#b2dfdb",
                            color: "#004d40",
                            border: "2px solid #80cbc4",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                        }}
                    >
                        Reset
                    </button>

                    {/* Quality Button */}
                    <button
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#2e7d32",
                            color: "#fff",
                            border: "none",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        ✔ Quality
                    </button>

                    {/* Production Button */}
                    <button
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#1565c0",
                            color: "#fff",
                            border: "none",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        ✔ Production
                    </button>
                </div>

                {/* ── SPEC GRID ── */}
                <div style={{ padding: "12px 14px 24px" }}>

                    {/* First label row manually */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "8px",
                            marginBottom: "4px",
                        }}
                    >
                        {specs[0].map((cell, colIdx) => (
                            <div
                                key={colIdx}
                                style={{
                                    fontSize: "17px",
                                    fontWeight: "700",
                                    color: "#111",
                                    paddingLeft: "4px",
                                    letterSpacing: "0.2px",
                                }}
                            >
                                {cell.label}
                            </div>
                        ))}
                    </div>

                    {/* All rows */}
                    {specs.map((row, rowIdx) => (
                        <div key={rowIdx}>
                            {/* Value row */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(4, 1fr)",
                                    gap: "8px",
                                    marginBottom: "4px",
                                }}
                            >
                                {row.map((cell, colIdx) => (
                                    <div
                                        key={colIdx}
                                        style={{
                                            background: "#ffff33",
                                            border: "2px solid #c8b800",
                                            borderRadius: "5px",
                                            padding: "10px 16px",
                                            fontSize: "26px",
                                            fontWeight: "900",
                                            color: "#0d1b8e",
                                            minHeight: "52px",
                                            display: "flex",
                                            alignItems: "center",
                                            letterSpacing: "0.5px",
                                            textShadow: "0 1px 0 rgba(255,255,255,0.4)",
                                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {cell.value || "NA"}
                                    </div>
                                ))}
                            </div>

                            {/* Label row for NEXT row */}
                            {rowIdx < specs.length - 1 && (
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(4, 1fr)",
                                        gap: "8px",
                                        marginBottom: "4px",
                                        marginTop: "2px",
                                    }}
                                >
                                    {specs[rowIdx + 1].map((cell, colIdx) => (
                                        <div
                                            key={colIdx}
                                            style={{
                                                fontSize: "17px",
                                                fontWeight: "700",
                                                color: "#111",
                                                paddingLeft: "4px",
                                                letterSpacing: "0.2px",
                                            }}
                                        >
                                            {cell.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}