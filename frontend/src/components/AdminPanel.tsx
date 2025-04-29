import React, {useEffect, useRef, useState} from 'react';
import api from '../services/api';

interface Item {
    id: number;
    name: string;
    description: string;
    imagePath?: string | null;
}

interface BorrowRecord {
    id: number;
    user: { id: number; name?: string; email: string };
    item: { id: number; name: string; description: string; imagePath?: string | null };
    dueDate: string;
    returned: boolean;
}

const AdminPanel: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
    const [admins, setAdmins] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // New item form state
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newImage, setNewImage] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [itemsRes, borrowsRes, adminsRes] = await Promise.all([
                    api.get<Item[]>('/admin/items'),
                    api.get<BorrowRecord[]>('/admin/borrows'),
                    api.get<string[]>('/admin/admins'),
                ]);
                setItems(itemsRes.data);
                setBorrows(borrowsRes.data);
                setAdmins(adminsRes.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load admin data');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // Handle creating a new item
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newDesc) {
            setCreateError('Name and description are required.');
            return;
        }
        setCreating(true);
        setCreateError(null);

        try {
            const form = new FormData();
            form.append('name', newName);
            form.append('description', newDesc);
            if (newImage) form.append('image', newImage);

            const res = await api.post<Item>('/admin/items', form, {
                headers: {'Content-Type': 'multipart/form-data'},
            });

            // Update state with the new item
            setItems([res.data, ...items]);
            setNewName('');
            setNewDesc('');
            setNewImage(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error(err);
            setCreateError('Failed to create item.');
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div>Loading admin data…</div>;
    if (error) return <div style={{color: 'red'}}>{error}</div>;

    return (
        <div className="container my-4">
            <h1>Admin Panel</h1>

            {/* Items Section */}
            <section className="mb-5">
                <h2>Items ({items.length})</h2>

                {/* Add Item Form */}
                <form onSubmit={handleCreate} className="mb-4">
                    <div className="row g-2 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="form-control"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Description</label>
                            <input
                                type="text"
                                className="form-control"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Image (optional)</label>
                            <div className="input-group">
                                <input
                                    type="file"
                                    className="form-control"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={e => setNewImage(e.target.files?.[0] ?? null)}
                                />
                                {newImage && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => {
                                            setNewImage(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                    >
                                        ❌
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="col-md-2">
                            <button type="submit" className="btn btn-primary w-100" disabled={creating}>
                                {creating ? 'Adding…' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                    {createError && <div className="text-danger mt-2">{createError}</div>}
                </form>

                {/* Items Grid */}
                <div className="row">
                    {(() => {
                        // Build set of borrowed item IDs
                        const borrowedIds = new Set(borrows.map(b => b.item.id));

                        return items.map(item => {
                            const isBorrowed = borrowedIds.has(item.id);

                            return (
                                <div className="col-md-4 mb-3" key={item.id}>
                                    <div className={`card h-100 position-relative ${isBorrowed ? 'bg-light border-warning border-5' : ''}`}>
                                    {/* Borrowed badge */}
                                        {isBorrowed && (
                                            <span
                                                className="badge bg-warning text-dark position-absolute top-0 end-0 m-2">
                                                Borrowed
                                            </span>
                                        )}

                                        {item.imagePath && (
                                            <img
                                                src={`http://localhost:8080${item.imagePath}`}
                                                className="card-img-top"
                                                alt={item.name}
                                            />
                                        )}
                                        <div className="card-body">
                                            <h5 className="card-title">{item.name}</h5>
                                            <p className="card-text">{item.description}</p>

                                            {/* Only allow delete when not borrowed */}
                                            {!isBorrowed && (
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={async () => {
                                                        await api.delete(`/admin/items/${item.id}`);
                                                        setItems(items.filter(i => i.id !== item.id));
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </section>

            {/* Borrows Section */}
            <section className="mb-5">
                <h2>Current Borrows ({borrows.length})</h2>
                <pre>{JSON.stringify(borrows, null, 2)}</pre>
            </section>

            {/* Admins Section */}
            <section>
                <h2>Admins ({admins.length})</h2>
                <pre>{JSON.stringify(admins, null, 2)}</pre>
            </section>
        </div>
    );
};

export default AdminPanel;