'use client';

import { useRef, useEffect, useState } from 'react';

interface Props {
    onSave: (dataUrl: string) => void;
    onClear: () => void;
}

export default function SignatureCanvas({ onSave, onClear }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        onClear();
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL());
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <canvas
                ref={canvasRef}
                width={400}
                height={150}
                style={{
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                    background: '#f8fafc',
                    cursor: 'crosshair',
                    touchAction: 'none',
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleClear} style={{
                    padding: '4px 12px', fontSize: 11, borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer',
                }}>Clear</button>
                <button onClick={handleSave} style={{
                    padding: '4px 12px', fontSize: 11, borderRadius: 4, border: 'none', background: '#0f2044', color: '#fff', cursor: 'pointer',
                }}>Save Signature</button>
            </div>
        </div>
    );
}
