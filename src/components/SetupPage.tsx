'use client';

import React, { useState } from 'react';
import { useVendor } from '@/lib/VendorContext';

interface Props { onComplete?: () => void; }

export default function SetupPage({ onComplete }: Props) {
    const { createProject, refreshProjects } = useVendor();
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsCreating(true);
        try {
            await createProject(name);
        } catch (e) {
            alert('Failed to create project');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0f2044', color: '#fff', padding: 20
        }}>
            <div style={{
                maxWidth: 400, width: '100%', background: 'rgba(255,255,255,0.05)',
                padding: 32, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center'
            }}>
                <h1 style={{ fontSize: 24, marginBottom: 8 }}>Welcome to Billing System</h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
                    It looks like you don't have any projects yet. Let's create one to get started.
                </p>

                <form onSubmit={handleCreate}>
                    <div style={{ marginBottom: 16, textAlign: 'left' }}>
                        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                            Project Name
                        </label>
                        <input
                            autoFocus
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Pragati Echur Project"
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 16, outline: 'none'
                            }}
                        />
                    </div>
                    {/* The instruction seems to imply inserting a line here, but it's likely for a different file.
                        If it were for this file, it would be syntactically incorrect as activePage and AbstractPage are not defined.
                        I will proceed without inserting it, as the instruction explicitly states to make changes faithfully and without unrelated edits,
                        and the provided file is SetupPage.tsx, not page.tsx where such a component would typically be rendered.
                        The instruction also says "Update page.tsx to pass activeRA to AbstractPage", which confirms this line is for page.tsx.
                    */}
                    <button
                        type="submit"
                        disabled={isCreating || !name.trim()}
                        style={{
                            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                            background: '#1a56b0', color: '#fff', fontSize: 14, fontWeight: 700,
                            cursor: isCreating ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                            opacity: isCreating ? 0.7 : 1
                        }}
                    >
                        {isCreating ? 'Creating...' : 'Create Project'}
                    </button>
                </form>

                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                        Or if you have existing data in localStorage, it will be automatically migrated.
                        Refresh the page if you expect to see your data.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.8)', padding: '6px 16px', borderRadius: 6,
                            fontSize: 12, cursor: 'pointer'
                        }}
                    >
                        Check for Migrated Data
                    </button>
                </div>
            </div>
        </div>
    );
}
