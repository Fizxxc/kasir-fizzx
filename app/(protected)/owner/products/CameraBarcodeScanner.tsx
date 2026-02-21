"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type Props = {
    open: boolean;
    onClose: () => void;
    onDetected: (code: string) => void;
};

type Cam = { deviceId: string; label: string };

function pickDefaultCamera(devices: Cam[]) {
    const back = devices.find((d) => /back|rear|environment/i.test(d.label));
    return back ?? devices[devices.length - 1] ?? null;
}

function isNormalNotFoundError(e: any) {
    const msg = String(e?.message ?? e ?? "");
    // zxing often throws messages like:
    // "No MultiFormat Readers were able to detect the code."
    // "NotFoundException" word sometimes appears in message
    return /notfound|not found|no multiformat readers|no readers|no code/i.test(msg);
}

export default function CameraBarcodeScanner({ open, onClose, onDetected }: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);

    const [err, setErr] = useState<string | null>(null);

    const [devices, setDevices] = useState<Cam[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);

    const [zoomSupported, setZoomSupported] = useState(false);
    const [zoom, setZoom] = useState<number>(1);
    const [zoomMin, setZoomMin] = useState<number>(1);
    const [zoomMax, setZoomMax] = useState<number>(1);

    const beepRef = useRef<HTMLAudioElement | null>(null);

    const reader = useMemo(() => {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
            BarcodeFormat.ITF,
            BarcodeFormat.CODE_39,
            BarcodeFormat.QR_CODE,
        ]);

        return new BrowserMultiFormatReader(hints, {
            delayBetweenScanAttempts: 120,
            delayBetweenScanSuccess: 800,
        });
    }, []);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        async function initDevices() {
            try {
                setErr(null);
                const list = await BrowserMultiFormatReader.listVideoInputDevices();
                const cams: Cam[] = list.map((d) => ({
                    deviceId: d.deviceId,
                    label: d.label || `Camera ${d.deviceId.slice(0, 4)}...`,
                }));

                if (cancelled) return;

                setDevices(cams);
                const def = pickDefaultCamera(cams);
                setSelectedDeviceId(def?.deviceId ?? (cams[0]?.deviceId ?? ""));
            } catch (e: any) {
                setErr(e?.message ?? "Gagal mendapatkan daftar kamera.");
            }
        }

        initDevices();
        return () => {
            cancelled = true;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (!selectedDeviceId) return;

        let cancelled = false;

        async function start() {
            setErr(null);
            setTorchSupported(false);
            setTorchOn(false);
            setZoomSupported(false);
            setZoom(1);
            setZoomMin(1);
            setZoomMax(1);

            try {
                if (!videoRef.current) return;

                await reader.decodeFromVideoDevice(
                    selectedDeviceId,
                    videoRef.current,
                    (res, error, controls) => {
                        controlsRef.current = controls;
                        if (cancelled) return;

                        if (res?.getText()) {
                            const text = res.getText();

                            // beep + vibrate
                            try {
                                beepRef.current?.play().catch(() => { });
                            } catch { }
                            try {
                                if (navigator.vibrate) navigator.vibrate(120);
                            } catch { }

                            controls.stop();
                            onDetected(text);
                            onClose();
                            return;
                        }

                        // error happens frequently when "not found" -> ignore
                        if (error && !isNormalNotFoundError(error)) {
                            // show only real errors occasionally
                            // setErr(String(error?.message ?? error));
                        }
                    }
                );

                // read stream caps for torch/zoom
                setTimeout(() => {
                    try {
                        const stream = (videoRef.current as any)?.srcObject as MediaStream | null;
                        const track = stream?.getVideoTracks()?.[0];
                        const caps = (track as any)?.getCapabilities?.();

                        if (caps?.torch) setTorchSupported(true);

                        if (caps?.zoom) {
                            setZoomSupported(true);
                            const min = Number(caps.zoom.min ?? 1);
                            const max = Number(caps.zoom.max ?? 1);
                            setZoomMin(min);
                            setZoomMax(max);

                            const initial = Math.min(max, Math.max(min, 1.6));
                            setZoom(initial);
                            (track as any)
                                .applyConstraints({ advanced: [{ zoom: initial }] })
                                .catch(() => { });
                        }
                    } catch { }
                }, 250);
            } catch (e: any) {
                setErr(e?.message ?? "Gagal akses kamera. Pastikan izin kamera diaktifkan.");
            }
        }

        start();

        return () => {
            cancelled = true;
            try {
                controlsRef.current?.stop();
            } catch { }
            controlsRef.current = null;

            try {
                const stream = ((videoRef.current as any)?.srcObject as MediaStream | null) ?? null;
                stream?.getTracks()?.forEach((t) => t.stop());
                if (videoRef.current) (videoRef.current as any).srcObject = null;
            } catch { }
        };
    }, [open, selectedDeviceId, reader, onClose, onDetected]);

    async function toggleTorch() {
        try {
            const stream = ((videoRef.current as any)?.srcObject as MediaStream | null) ?? null;
            const track = stream?.getVideoTracks()?.[0];
            if (!track) return;
            const next = !torchOn;
            await (track as any).applyConstraints({ advanced: [{ torch: next }] });
            setTorchOn(next);
        } catch (e: any) {
            setErr(e?.message ?? "Flash tidak didukung di device ini.");
        }
    }

    async function setZoomValue(v: number) {
        try {
            const stream = ((videoRef.current as any)?.srcObject as MediaStream | null) ?? null;
            const track = stream?.getVideoTracks()?.[0];
            if (!track) return;

            const clamped = Math.min(zoomMax, Math.max(zoomMin, v));
            setZoom(clamped);
            await (track as any).applyConstraints({ advanced: [{ zoom: clamped }] });
        } catch {
            // ignore
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            {/* beep */}
            <audio
                ref={beepRef}
                preload="auto"
                src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAABAAgAZgAAAGYAAABmAAAAZgAAAGYAAABmAAAAZgAAAGYAAABmAAAA"
            />

            <div className="w-full max-w-lg rounded-2xl bg-white overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div>
                        <div className="font-semibold">Scan Barcode</div>
                        <div className="text-xs text-gray-500">Arahkan barcode ke kotak</div>
                    </div>
                    <button className="rounded-xl border px-3 py-2 text-sm" onClick={onClose}>
                        Tutup
                    </button>
                </div>

                <div className="px-4 py-3 border-b flex flex-wrap gap-2 items-center">
                    <div className="text-sm text-gray-600">Kamera:</div>
                    <select
                        className="border rounded-xl px-3 py-2 text-sm flex-1 min-w-[220px]"
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                    >
                        {devices.map((d, i) => (
                            <option key={`${d.deviceId}-${i}`} value={d.deviceId}>
                                {d.label || `Camera ${i + 1}`}
                            </option>
                        ))}
                    </select>

                    <button
                        className="rounded-xl border px-3 py-2 text-sm"
                        onClick={() => {
                            if (devices.length <= 1) return;
                            const idx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
                            const next = idx === 0 ? devices[devices.length - 1] : devices[0];
                            setSelectedDeviceId(next.deviceId);
                        }}
                    >
                        Flip
                    </button>
                </div>

                <div className="relative bg-black">
                    <video ref={videoRef} className="w-full aspect-[3/4] object-cover" muted playsInline autoPlay />

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative w-[78%] max-w-[320px] aspect-[4/3]">
                            <div className="absolute inset-0 rounded-2xl border-2 border-white/70" />
                            <div className="absolute -top-1 -left-1 h-8 w-8 border-l-4 border-t-4 border-white rounded-tl-2xl" />
                            <div className="absolute -top-1 -right-1 h-8 w-8 border-r-4 border-t-4 border-white rounded-tr-2xl" />
                            <div className="absolute -bottom-1 -left-1 h-8 w-8 border-l-4 border-b-4 border-white rounded-bl-2xl" />
                            <div className="absolute -bottom-1 -right-1 h-8 w-8 border-r-4 border-b-4 border-white rounded-br-2xl" />
                            <div className="absolute left-2 right-2 top-2 h-[2px] bg-green-400/90 animate-scanline shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                        </div>
                    </div>

                    <div className="absolute bottom-3 left-0 right-0 text-center text-white/90 text-sm">
                        Pastikan barcode fokus & tidak blur
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    {err ? <div className="text-sm text-red-600">{err}</div> : null}

                    <div className="flex gap-2">
                        <button
                            className={`flex-1 rounded-xl px-4 py-3 ${torchSupported ? "bg-black text-white" : "border text-gray-600"
                                }`}
                            onClick={torchSupported ? toggleTorch : undefined}
                            disabled={!torchSupported}
                        >
                            {torchSupported ? (torchOn ? "Matikan Flash" : "Nyalakan Flash") : "Flash tidak tersedia"}
                        </button>

                        <button className="flex-1 rounded-xl border px-4 py-3" onClick={onClose}>
                            Batal
                        </button>
                    </div>

                    <div className="rounded-xl border p-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Zoom</span>
                            <span className="font-mono text-gray-700">{zoom.toFixed(1)}x</span>
                        </div>
                        <input
                            className="w-full mt-2"
                            type="range"
                            min={zoomMin}
                            max={zoomMax}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoomValue(Number(e.target.value))}
                            disabled={!zoomSupported}
                        />
                        {!zoomSupported ? <div className="text-xs text-gray-500 mt-1">Zoom tidak didukung.</div> : null}
                    </div>

                    <div className="text-xs text-gray-500">Beep + getar aktif saat barcode terdeteksi.</div>
                </div>
            </div>

            <style>{`
        @keyframes scanline {
          0% { transform: translateY(0); opacity: .9; }
          50% { transform: translateY(calc(100% - 10px)); opacity: 1; }
          100% { transform: translateY(0); opacity: .9; }
        }
        .animate-scanline { animation: scanline 1.6s ease-in-out infinite; }
      `}</style>
        </div>
    );
}