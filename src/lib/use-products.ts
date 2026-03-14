"use client";

import { useState, useEffect } from "react";

export interface Product {
    id: number | string;
    partNumber: string;
    customer: string;
    tubeLength: string;
    tubeDiameter: string;
    partType: string;
    vendorCode: string;
    status: string;
    partWeightKg: string;
    revNo: string;
    poNumber: string;
    supplyDate: string;
    sampleStatus: string;
    sampleSupplyMode: string;
    acceptedMailDate: string;
    trsoDate: string;
    trsoModel: string;
    trsoRev: string;
    iqaDate: string;
    iqaModel: string;
    iqaVcNumber: string;
    ppapIntimateDate: string;
    ppapClosingDate: string;
    ppapStatus: string;
    drawingNumber?: string;
    drawingModel?: string;
    vehicleType?: string;
    partDescription?: string;
    series?: string;
    noiseDeadenerLength?: string;
    availableNoiseDeadener?: string;
    fepPressHStockPositions?: string;
    frontEndPieceDetails?: string;
    rearHousingLength?: string;
    longForkLength?: string;
    sfDetails?: string;
    pdcLength?: string;
    couplingFlangeOrientations?: string;
    hexBoltNutTighteningTorque?: string;
    loctiteGradeUse?: string;
    cbKitDetails?: string;
    slipDetails?: string;
    greaseableOrNonGreaseable?: string;
    mountingDetailsFlangeYoke?: string;
    mountingDetailsCouplingFlange?: string;
    iaBellowDetails?: string;
    totalLength?: string;
    balancingRpm?: string;
    unbalanceInCmg?: string;
    unbalanceInGram?: string;
    unbalanceInGram75Percent?: string;
    documents?: { id: string; name: string; type: string }[]; // For uploaded files
}

export const initialProducts: Product[] = [
    { id: 1, partNumber: "DS-1045-A", customer: "Tata Motors", tubeLength: "450mm", tubeDiameter: "38mm", partType: "Drive Shaft", vendorCode: "VM-201", status: "Approved", partWeightKg: "12.5", revNo: "01", poNumber: "PO-2023-001", supplyDate: "2023-10-15", sampleStatus: "Approved", sampleSupplyMode: "Air", acceptedMailDate: "2023-10-20", trsoDate: "2023-11-01", trsoModel: "Model-X", trsoRev: "02", iqaDate: "2023-11-05", iqaModel: "IQA-M1", iqaVcNumber: "VC-1001", ppapIntimateDate: "2023-11-10", ppapClosingDate: "2023-11-20", ppapStatus: "Closed", drawingNumber: "DRW-100", drawingModel: "MOD-A", vehicleType: "Truck", partDescription: "Front Drive Shaft Assembly", series: "1000", noiseDeadenerLength: "150mm", availableNoiseDeadener: "Yes", fepPressHStockPositions: "Pos-A", frontEndPieceDetails: "Standard FEP", rearHousingLength: "200mm", longForkLength: "120mm", sfDetails: "SF-1", pdcLength: "300mm", couplingFlangeOrientations: "0 deg", hexBoltNutTighteningTorque: "120 Nm", loctiteGradeUse: "242", cbKitDetails: "CBK-1", slipDetails: "SLP-A", greaseableOrNonGreaseable: "Greaseable", mountingDetailsFlangeYoke: "4-Bolt", mountingDetailsCouplingFlange: "4-Bolt", iaBellowDetails: "I/A-B1", totalLength: "980mm", balancingRpm: "3000", unbalanceInCmg: "15", unbalanceInGram: "12", unbalanceInGram75Percent: "9" },
    { id: 2, partNumber: "TL-2089-C", customer: "Mahindra & Mahindra", tubeLength: "520mm", tubeDiameter: "42mm", partType: "Propeller Shaft", vendorCode: "VM-305", status: "Pending", partWeightKg: "15.2", revNo: "00", poNumber: "PO-2023-089", supplyDate: "2023-11-12", sampleStatus: "Pending", sampleSupplyMode: "Road", acceptedMailDate: "-", trsoDate: "-", trsoModel: "Model-Y", trsoRev: "01", iqaDate: "-", iqaModel: "IQA-M2", iqaVcNumber: "VC-1025", ppapIntimateDate: "-", ppapClosingDate: "-", ppapStatus: "Initiated", drawingNumber: "DRW-101", drawingModel: "MOD-B", vehicleType: "SUV", partDescription: "Rear Propeller Shaft", series: "2000", noiseDeadenerLength: "-", availableNoiseDeadener: "No", fepPressHStockPositions: "-", frontEndPieceDetails: "-", rearHousingLength: "-", longForkLength: "-", sfDetails: "-", pdcLength: "-", couplingFlangeOrientations: "-", hexBoltNutTighteningTorque: "-", loctiteGradeUse: "-", cbKitDetails: "-", slipDetails: "-", greaseableOrNonGreaseable: "Non Greaseable", mountingDetailsFlangeYoke: "-", mountingDetailsCouplingFlange: "-", iaBellowDetails: "-", totalLength: "1100mm", balancingRpm: "3500", unbalanceInCmg: "20", unbalanceInGram: "18", unbalanceInGram75Percent: "13.5" },
    { id: 3, partNumber: "FL-3021-B", customer: "Ashok Leyland", tubeLength: "380mm", tubeDiameter: "35mm", partType: "Coupling Shaft", vendorCode: "VM-108", status: "Rejected", partWeightKg: "8.4", revNo: "02", poNumber: "PO-2023-115", supplyDate: "2023-09-05", sampleStatus: "Rejected", sampleSupplyMode: "Sea", acceptedMailDate: "-", trsoDate: "2023-09-15", trsoModel: "Model-Z", trsoRev: "01", iqaDate: "2023-09-20", iqaModel: "IQA-M1", iqaVcNumber: "VC-1042", ppapIntimateDate: "2023-10-01", ppapClosingDate: "-", ppapStatus: "On Hold", drawingNumber: "DRW-102", drawingModel: "MOD-C", vehicleType: "Bus", partDescription: "Inter Axle Shaft", series: "3000", noiseDeadenerLength: "100mm", availableNoiseDeadener: "Yes", fepPressHStockPositions: "Pos-B", frontEndPieceDetails: "Custom FEP", rearHousingLength: "180mm", longForkLength: "110mm", sfDetails: "SF-2", pdcLength: "280mm", couplingFlangeOrientations: "90 deg", hexBoltNutTighteningTorque: "150 Nm", loctiteGradeUse: "262", cbKitDetails: "CBK-2", slipDetails: "SLP-B", greaseableOrNonGreaseable: "Greaseable", mountingDetailsFlangeYoke: "8-Bolt", mountingDetailsCouplingFlange: "8-Bolt", iaBellowDetails: "I/A-B2", totalLength: "850mm", balancingRpm: "2500", unbalanceInCmg: "25", unbalanceInGram: "22", unbalanceInGram75Percent: "16.5" },
    { id: 4, partNumber: "CP-5067-D", customer: "Maruti Suzuki", tubeLength: "490mm", tubeDiameter: "40mm", partType: "Drive Shaft", vendorCode: "VM-412", status: "Approved", partWeightKg: "14.1", revNo: "03", poNumber: "PO-2023-241", supplyDate: "2023-08-22", sampleStatus: "Approved", sampleSupplyMode: "Road", acceptedMailDate: "2023-08-28", trsoDate: "2023-09-10", trsoModel: "Model-X", trsoRev: "04", iqaDate: "2023-09-18", iqaModel: "IQA-M3", iqaVcNumber: "VC-1089", ppapIntimateDate: "2023-09-25", ppapClosingDate: "2023-10-15", ppapStatus: "Closed", drawingNumber: "DRW-103", drawingModel: "MOD-D", vehicleType: "Car", partDescription: "Front Drive Shaft Assembly", series: "4000", noiseDeadenerLength: "200mm", availableNoiseDeadener: "Yes", fepPressHStockPositions: "Pos-C", frontEndPieceDetails: "Standard FEP", rearHousingLength: "220mm", longForkLength: "130mm", sfDetails: "SF-3", pdcLength: "320mm", couplingFlangeOrientations: "180 deg", hexBoltNutTighteningTorque: "100 Nm", loctiteGradeUse: "242", cbKitDetails: "CBK-3", slipDetails: "SLP-C", greaseableOrNonGreaseable: "Non Greaseable", mountingDetailsFlangeYoke: "4-Bolt", mountingDetailsCouplingFlange: "4-Bolt", iaBellowDetails: "I/A-B3", totalLength: "1050mm", balancingRpm: "4000", unbalanceInCmg: "10", unbalanceInGram: "8", unbalanceInGram75Percent: "6" },
    { id: 5, partNumber: "BL-7012-E", customer: "Hyundai Motors", tubeLength: "410mm", tubeDiameter: "36mm", partType: "Prop Shaft", vendorCode: "VM-220", status: "Pending", partWeightKg: "10.8", revNo: "00", poNumber: "PO-2023-310", supplyDate: "2023-12-01", sampleStatus: "Under Review", sampleSupplyMode: "Air", acceptedMailDate: "-", trsoDate: "-", trsoModel: "Model-A", trsoRev: "01", iqaDate: "-", iqaModel: "IQA-M2", iqaVcNumber: "VC-1102", ppapIntimateDate: "-", ppapClosingDate: "-", ppapStatus: "Pending", drawingNumber: "DRW-104", drawingModel: "MOD-E", vehicleType: "Car", partDescription: "Rear Propeller Shaft", series: "5000", noiseDeadenerLength: "-", availableNoiseDeadener: "No", fepPressHStockPositions: "-", frontEndPieceDetails: "-", rearHousingLength: "-", longForkLength: "-", sfDetails: "-", pdcLength: "-", couplingFlangeOrientations: "-", hexBoltNutTighteningTorque: "-", loctiteGradeUse: "-", cbKitDetails: "-", slipDetails: "-", greaseableOrNonGreaseable: "Non Greaseable", mountingDetailsFlangeYoke: "-", mountingDetailsCouplingFlange: "-", iaBellowDetails: "-", totalLength: "900mm", balancingRpm: "3800", unbalanceInCmg: "12", unbalanceInGram: "10", unbalanceInGram75Percent: "7.5" },
    { id: 6, partNumber: "SH-8034-F", customer: "Toyota Kirloskar", tubeLength: "530mm", tubeDiameter: "44mm", partType: "Drive Shaft", vendorCode: "VM-315", status: "Approved", partWeightKg: "16.5", revNo: "01", poNumber: "PO-2023-405", supplyDate: "2023-07-10", sampleStatus: "Approved", sampleSupplyMode: "Road", acceptedMailDate: "2023-07-15", trsoDate: "2023-08-01", trsoModel: "Model-B", trsoRev: "02", iqaDate: "2023-08-10", iqaModel: "IQA-M1", iqaVcNumber: "VC-1150", ppapIntimateDate: "2023-08-20", ppapClosingDate: "2023-09-05", ppapStatus: "Closed", drawingNumber: "DRW-105", drawingModel: "MOD-F", vehicleType: "SUV", partDescription: "Front Drive Shaft Assembly", series: "6000", noiseDeadenerLength: "250mm", availableNoiseDeadener: "Yes", fepPressHStockPositions: "Pos-D", frontEndPieceDetails: "Heavy Duty FEP", rearHousingLength: "250mm", longForkLength: "150mm", sfDetails: "SF-4", pdcLength: "350mm", couplingFlangeOrientations: "0 deg", hexBoltNutTighteningTorque: "140 Nm", loctiteGradeUse: "271", cbKitDetails: "CBK-4", slipDetails: "SLP-D", greaseableOrNonGreaseable: "Greaseable", mountingDetailsFlangeYoke: "6-Bolt", mountingDetailsCouplingFlange: "6-Bolt", iaBellowDetails: "I/A-B4", totalLength: "1150mm", balancingRpm: "3200", unbalanceInCmg: "18", unbalanceInGram: "15", unbalanceInGram75Percent: "11.25" },
    { id: 7, partNumber: "RP-9045-G", customer: "Honda Cars", tubeLength: "460mm", tubeDiameter: "39mm", partType: "Coupling Shaft", vendorCode: "VM-118", status: "Approved", partWeightKg: "11.2", revNo: "02", poNumber: "PO-2023-442", supplyDate: "2023-06-18", sampleStatus: "Approved", sampleSupplyMode: "Air", acceptedMailDate: "2023-06-25", trsoDate: "2023-07-05", trsoModel: "Model-C", trsoRev: "03", iqaDate: "2023-07-12", iqaModel: "IQA-M3", iqaVcNumber: "VC-1198", ppapIntimateDate: "2023-07-25", ppapClosingDate: "2023-08-15", ppapStatus: "Closed", drawingNumber: "DRW-106", drawingModel: "MOD-G", vehicleType: "Car", partDescription: "Inter Axle Shaft", series: "7000", noiseDeadenerLength: "120mm", availableNoiseDeadener: "Yes", fepPressHStockPositions: "Pos-E", frontEndPieceDetails: "Standard FEP", rearHousingLength: "190mm", longForkLength: "115mm", sfDetails: "SF-5", pdcLength: "290mm", couplingFlangeOrientations: "270 deg", hexBoltNutTighteningTorque: "110 Nm", loctiteGradeUse: "242", cbKitDetails: "CBK-5", slipDetails: "SLP-E", greaseableOrNonGreaseable: "Non Greaseable", mountingDetailsFlangeYoke: "4-Bolt", mountingDetailsCouplingFlange: "4-Bolt", iaBellowDetails: "I/A-B5", totalLength: "950mm", balancingRpm: "3600", unbalanceInCmg: "14", unbalanceInGram: "11", unbalanceInGram75Percent: "8.25" },
    { id: 8, partNumber: "KL-1078-H", customer: "Kia India", tubeLength: "475mm", tubeDiameter: "41mm", partType: "Propeller Shaft", vendorCode: "VM-423", status: "Pending", partWeightKg: "13.6", revNo: "01", poNumber: "PO-2023-510", supplyDate: "2023-11-25", sampleStatus: "Pending", sampleSupplyMode: "Road", acceptedMailDate: "-", trsoDate: "-", trsoModel: "Model-D", trsoRev: "01", iqaDate: "-", iqaModel: "IQA-M1", iqaVcNumber: "VC-1225", ppapIntimateDate: "-", ppapClosingDate: "-", ppapStatus: "Initiated", drawingNumber: "DRW-107", drawingModel: "MOD-H", vehicleType: "SUV", partDescription: "Rear Propeller Shaft", series: "8000", noiseDeadenerLength: "-", availableNoiseDeadener: "No", fepPressHStockPositions: "-", frontEndPieceDetails: "-", rearHousingLength: "-", longForkLength: "-", sfDetails: "-", pdcLength: "-", couplingFlangeOrientations: "-", hexBoltNutTighteningTorque: "-", loctiteGradeUse: "-", cbKitDetails: "-", slipDetails: "-", greaseableOrNonGreaseable: "Greaseable", mountingDetailsFlangeYoke: "-", mountingDetailsCouplingFlange: "-", iaBellowDetails: "-", totalLength: "1000mm", balancingRpm: "3400", unbalanceInCmg: "16", unbalanceInGram: "14", unbalanceInGram75Percent: "10.5" },
];

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("dashboard_products");
        if (stored) {
            try {
                setProducts(JSON.parse(stored));
            } catch {
                setProducts(initialProducts);
            }
        } else {
            setProducts(initialProducts);
            localStorage.setItem("dashboard_products", JSON.stringify(initialProducts));
        }
        setIsLoaded(true);
    }, []);

    const saveProducts = (newProducts: Product[]) => {
        setProducts(newProducts);
        localStorage.setItem("dashboard_products", JSON.stringify(newProducts));
    };

    const addProduct = (product: Omit<Product, "id">) => {
        const newProduct = { ...product, id: Date.now() };
        saveProducts([newProduct as Product, ...products]);
        return newProduct;
    };

    const updateProduct = (id: number | string, data: Partial<Product>) => {
        saveProducts(
            products.map((p) => (p.id.toString() === id.toString() ? { ...p, ...data } : p))
        );
    };

    const deleteProduct = (id: number | string) => {
        saveProducts(products.filter((p) => p.id.toString() !== id.toString()));
    };

    const importProducts = (newProducts: Product[]) => {
        // Simple prepend
        const withIds = newProducts.map((p, i) => ({ ...p, id: Date.now() + i }));
        saveProducts([...withIds, ...products]);
    };

    return {
        products,
        isLoaded,
        addProduct,
        updateProduct,
        deleteProduct,
        importProducts,
        getProduct: (id: string | number) => products.find(p => p.id.toString() === id.toString()),
    };
}
