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
import { Loader2, XCircle } from "lucide-react";

export interface QRScannerHandle {
    forceStop: () => Promise<void>;
}

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onStopped?: () => void;
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
                video.srcObject = null;
            }
        });
    } catch {
        // Swallow — best effort
    }
}

export const QRScanner = forwardRef<QRScannerHandle, QRScannerProps>(
    ({ onScan, onStopped }, ref) => {
        const html5QrRef = useRef<Html5Qrcode | null>(null);
        const onScanRef = useRef(onScan);
        const onStoppedRef = useRef(onStopped);
        const hasScannedRef = useRef(false);
        const isStoppingRef = useRef(false);
        const [isReady, setIsReady] = useState(false);
        const [error, setError] = useState<string | null>(null);

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
                        await html5QrRef.current.stop();
                    }
                    await html5QrRef.current.clear();
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

        useEffect(() => {
            let isMounted = true;
            hasScannedRef.current = false;
            isStoppingRef.current = false;

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
                // Cleanup: stop camera when component unmounts
                forceStop();
            };
        // scannerId and forceStop are both stable — this runs exactly once per mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [scannerId]);

        return (
            <div className="w-full max-w-md mx-auto p-5 flex flex-col items-center justify-center min-h-[350px] border-2 border-primary/20 rounded-2xl bg-gradient-to-br from-background to-muted/30 relative shadow-sm overflow-hidden">
                <h3 className="text-lg font-bold mb-4 text-center text-primary/90 tracking-tight">
                    Scan Product QR Code
                </h3>

                {error ? (
                    <div className="flex flex-col items-center gap-3 text-destructive text-sm text-center px-4">
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
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10">
                                <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                                <p className="text-sm font-semibold text-primary/80 tracking-wide">
                                    Initializing camera...
                                </p>
                            </div>
                        )}

                        <button
                            onClick={async () => {
                                await forceStop();
                                onStoppedRef.current?.();
                            }}
                            type="button"
                            className="mt-5 flex items-center gap-2 px-6 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 transition-all duration-200 rounded-full text-sm font-semibold shadow-sm"
                        >
                            <XCircle className="w-4 h-4" />
                            Stop Scanning
                        </button>
                    </>
                )}
            </div>
        );
    }
);

QRScanner.displayName = "QRScanner";