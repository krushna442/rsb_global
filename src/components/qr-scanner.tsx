"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Loader2 } from "lucide-react";

interface QRScannerProps {
    onScan: (decodedText: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
    const scannerRef = useRef<HTMLDivElement>(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (!scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 10,
                qrbox: { width: 300, height: 100 },
                aspectRatio: 1.5,
                supportedScanTypes: [0, 1] // CAMERA, FILE
            },
            false
        );

        setIsScanning(true);

        scanner.render(
            (decodedText) => {
                console.log("Scanned:", decodedText);
                if (onScan) {
                    onScan(decodedText);
                    // Automatically stop after successful scan
                    scanner.clear().catch(console.error);
                }
            },
            (error) => {
                // Ignore routine scanning errors (e.g. no QR in frame)
            }
        );

        return () => {
            scanner.clear().catch(() => {});
        };
    }, [onScan]);

    return (
        <div className="w-full max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[300px] border border-dashed border-border rounded-xl bg-muted/30">
            <h3 className="text-sm font-semibold mb-4 text-center">Scan Product QR Code</h3>
            
            <div id="qr-reader" ref={scannerRef} className="w-full overflow-hidden rounded-lg [&>div]:border-none [&_video]:w-full [&_video]:object-cover" />
            
            {!isScanning && (
                <div className="absolute flex flex-col items-center justify-center p-8 bg-background/80 rounded-xl backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    <p className="text-sm font-medium">Initializing camera...</p>
                </div>
            )}
        </div>
    );
}
