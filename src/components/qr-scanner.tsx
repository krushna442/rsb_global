"use client";

import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    useImperativeHandle,
    forwardRef,
} from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, XCircle, Camera, Keyboard } from "lucide-react";

export interface QRScannerHandle {
    forceStop: () => Promise<void>;
}

interface QRScannerProps {
    onScan: (text: string) => void;
    onStopped?: () => void;
    initialMode?: "camera" | "external";   // ✅ add this
}


/**
 * Kills ALL active camera tracks on the page — the nuclear option.
 * This guarantees the camera LED turns off even if the library
 * failed to release the stream internally.
 */
function killAllCameraTracks() {
    try {
        // Walk every <video> element and stop its srcObject tracks
        document.querySelectorAll("video").forEach((video) => {
            const stream = video.srcObject as MediaStream | null;
            if (stream) {
                stream.getTracks().forEach((t) => {
                    t.stop();
                });
                
                // Fix for play() request interrupted NAT-115
                video.pause();
                video.removeAttribute('src');
                video.load();
                video.srcObject = null;
            }
        });
    } catch {
        // Swallow — best effort
    }
}

export const QRScanner = forwardRef<QRScannerHandle, QRScannerProps>(
    ({ onScan, onStopped, initialMode = "camera" }, ref) => {
        const [scanMode, setScanMode] = useState<"camera" | "external">(initialMode);

        const html5QrRef = useRef<Html5Qrcode | null>(null);
        const onScanRef = useRef(onScan);
        const onStoppedRef = useRef(onStopped);
        const hasScannedRef = useRef(false);
        const isStoppingRef = useRef(false);
        const [isReady, setIsReady] = useState(false);
        const [error, setError] = useState<string | null>(null);
        
        const externalInputRef = useRef<HTMLInputElement>(null);

        // Use a stable DOM id for this mount
        const [scannerId] = useState(
            () => `qr-${Math.random().toString(36).substring(2, 9)}`
        );

        useEffect(() => { onScanRef.current = onScan; }, [onScan]);
        useEffect(() => { onStoppedRef.current = onStopped; }, [onStopped]);

        const forceStop = useCallback(async () => {
            // Prevent concurrent stop calls
            if (isStoppingRef.current) return;
            isStoppingRef.current = true;

            try {
                if (html5QrRef.current) {
                    const state = html5QrRef.current.getState();
                    // State 2 = SCANNING, State 3 = PAUSED
                    if (state === 2 || state === 3) {
                        try {
                            await html5QrRef.current.stop();
                        } catch {
                            // ignore stop errors
                        }
                    }
                    try {
                        await html5QrRef.current.clear();
                    } catch {
                        // ignore clear errors 
                    }
                }
            } catch {
                // Library errors during stop — ignore
            } finally {
                html5QrRef.current = null;
                // Nuclear option: kill any surviving camera tracks
                killAllCameraTracks();
                isStoppingRef.current = false;
            }
        }, []);

        // Expose forceStop to the parent via ref
        useImperativeHandle(ref, () => ({ forceStop }), [forceStop]);

        // Camera Initialization Effect
        useEffect(() => {
            if (scanMode !== "camera") return;
            
            let isMounted = true;
            hasScannedRef.current = false;
            isStoppingRef.current = false;
            setIsReady(false);
            setError(null);

            // Nuke any leftover DOM from a previous (StrictMode) mount
            const container = document.getElementById(scannerId);
            if (container) container.innerHTML = "";

            const qr = new Html5Qrcode(scannerId, { verbose: false });
            html5QrRef.current = qr;

            qr.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    // Disable the file-scan panel entirely
                    disableFlip: false,
                },
                async (decodedText) => {
                    // Hard gate: only process once per mount
                    if (hasScannedRef.current || isStoppingRef.current || !isMounted) return;
                    hasScannedRef.current = true;

                    await forceStop();
                    onScanRef.current(decodedText);
                    onStoppedRef.current?.();
                },
                () => {
                    // Ignore per-frame decode failures — they are normal
                }
            )
                .then(() => {
                    if (!isMounted) {
                        // StrictMode caught us: the component unmounted while the camera was starting.
                        // We must independently kill this specific 'qr' instance.
                        const state = qr.getState();
                        if (state === 2 || state === 3) {
                            qr.stop().then(() => qr.clear()).catch(() => {});
                        }
                    } else {
                        setIsReady(true);
                    }
                })
                .catch((err) => {
                    if (isMounted) {
                        console.error("QR start error:", err);
                        setError("Camera access denied or unavailable.");
                        killAllCameraTracks();
                    }
                });

            return () => {
                isMounted = false;
                // Cleanup: stop camera when component unmounts or mode changes
                forceStop();
            };
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [scannerId, scanMode, forceStop]);

        // External scanner auto-focus
        useEffect(() => {
            if (scanMode === "external" && externalInputRef.current) {
                externalInputRef.current.focus();
            }
        }, [scanMode]);

        // Keep focus on input for external scanner
        useEffect(() => {
            const handleClickOutside = () => {
                if (scanMode === "external" && externalInputRef.current) {
                    externalInputRef.current.focus();
                }
            };
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }, [scanMode]);

        const handleExternalScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const v = e.currentTarget.value.trim();
                if (v && !hasScannedRef.current) {
                    hasScannedRef.current = true;
                    onScanRef.current(v);
                    onStoppedRef.current?.();
                }
            }
        };

        return (
            <div className="w-full max-w-md mx-auto p-5 flex flex-col min-h-[350px] border-2 border-primary/20 rounded-2xl bg-gradient-to-br from-background to-muted/30 relative shadow-sm overflow-hidden">
                <div className="flex flex-col items-center justify-center mb-4">
                    <h3 className="text-lg font-bold text-center text-primary/90 tracking-tight">
                        Scan Product
                    </h3>
                    
                    {/* Scan Method Toggle Overlay */}
                    {/* <div className="flex items-center gap-2 mt-3 p-1 bg-muted/60 rounded-lg">
                        <button
                            type="button"
                            onClick={() => {
                                if (scanMode !== "camera") setScanMode("camera");
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all outline-none ${
                                scanMode === "camera" 
                                ? "bg-background shadow-sm text-primary" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            }`}
                        >
                            <Camera className="w-4 h-4" />
                            Camera
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                if (scanMode !== "external") {
                                    await forceStop();
                                    setScanMode("external");
                                }
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all outline-none ${
                                scanMode === "external" 
                                ? "bg-background shadow-sm text-primary" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            }`}
                        >
                            <Keyboard className="w-4 h-4" />
                            External Device
                        </button>
                    </div> */}
                </div>

                <div className="flex-1 flex flex-col justify-center relative">
                    {scanMode === "external" ? (
                        <div className="flex flex-col items-center justify-center gap-4 w-full h-full pb-8">
                            <div className="bg-primary/5 p-4 rounded-full mt-4 shadow-inner ring-1 ring-primary/10">
                                <Keyboard className="w-10 h-10 text-primary/60" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                    Ready for scanner input...
                                </p>
                                <p className="text-xs font-medium text-muted-foreground">
                                    Use your USB/Bluetooth scanner directly.
                                </p>
                            </div>
                            <input 
                                ref={externalInputRef}
                                type="text"
                                autoFocus
                                placeholder="Scan item now..."
                                className="w-full max-w-[280px] border-2 border-primary/20 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 bg-background shadow-inner text-lg font-semibold tracking-wider transition-all placeholder:text-muted-foreground/50 placeholder:font-normal"
                                onKeyDown={handleExternalScan}
                            />
                        </div>
                    ) : (
                        error ? (
                            <div className="flex flex-col items-center gap-3 text-destructive text-sm text-center px-4 w-full h-full pb-8 justify-center">
                                <XCircle className="w-10 h-10" />
                                <p>{error}</p>
                            </div>
                        ) : (
                            <>
                                {/* Raw div — Html5Qrcode injects exactly ONE video here */}
                                <div
                                    id={scannerId}
                                    className="w-full overflow-hidden rounded-xl border-2 border-primary/10 shadow-inner bg-black/5"
                                />

                                {/* Loading overlay until camera stream is live */}
                                {!isReady && (
                                    <div className="absolute inset-0 top-0 bottom-0 left-0 right-0 m-auto h-[250px] max-w-[250px] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10 rounded-xl border-2 border-primary/5">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                                        <p className="text-sm font-semibold text-primary/80 tracking-wide">
                                            Starting camera...
                                        </p>
                                    </div>
                                )}
                            </>
                        )
                    )}
                </div>
                
                <div className="flex justify-center mt-auto pt-4 relative z-20">
                    <button
                        onClick={async () => {
                            await forceStop();
                            onStoppedRef.current?.();
                        }}
                        type="button"
                        className="flex items-center gap-2 px-6 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 transition-all duration-200 rounded-full text-sm font-semibold shadow-sm"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancel Scanning
                    </button>
                </div>
            </div>
        );
    }
);

QRScanner.displayName = "QRScanner";