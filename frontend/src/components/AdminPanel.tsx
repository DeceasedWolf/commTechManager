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
    borrowedAt: string;
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

    // New admin form state
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [addingAdmin, setAddingAdmin] = useState(false);
    const [adminError, setAdminError] = useState<string | null>(null);

    // Admin removal state
    const [adminToRemove, setAdminToRemove] = useState<string | null>(null);
    const [removingAdmin, setRemovingAdmin] = useState(false);

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
        if (!newName) {
            setCreateError('Name is required.');
            return;
        }
        setCreating(true);
        setCreateError(null);

        try {
            const form = new FormData();
            form.append('name', newName);
            if (newDesc) form.append('description', newDesc);
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

    // Handle adding a new admin
    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAdminEmail) {
            setAdminError('Email is required.');
            return;
        }
        if (!newAdminEmail.endsWith('@crescentschool.org')) {
            setAdminError('Email must be from the crescentschool.org domain.');
            return;
        }
        
        setAddingAdmin(true);
        setAdminError(null);

        try {
            const res = await api.post('/admin/admins', { email: newAdminEmail });
            setAdmins(res.data.admins);
            setNewAdminEmail('');
        } catch (err) {
            console.error(err);
            setAdminError('Failed to add admin.');
        } finally {
            setAddingAdmin(false);
        }
    };

    // Handle removing an admin
    const handleRemoveAdmin = async () => {
        if (!adminToRemove) return;
        
        setRemovingAdmin(true);
        try {
            const res = await api.delete('/admin/admins', { 
                data: { email: adminToRemove } 
            });
            setAdmins(res.data.admins);
            setAdminToRemove(null); // Close the confirmation modal
        } catch (err) {
            console.error(err);
            setAdminError('Failed to remove admin.');
        } finally {
            setRemovingAdmin(false);
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
                            <label className="form-label">Description (optional)</label>
                            <input
                                type="text"
                                className="form-control"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
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

                {borrows.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Borrower</th>
                                    <th>Email</th>
                                    <th>Borrowed On (DD/MM/YYYY)</th>
                                    <th>Due Date (DD/MM/YYYY)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {borrows.map(borrow => {
                                    // Format dates with error handling
                                    const dueDate = new Date(borrow.dueDate).toLocaleDateString();
                                    
                                    // Handle potential missing or invalid borrowedAt date
                                    let borrowDate = "Unknown";
                                    try {
                                        if (borrow.borrowedAt) {
                                            const date = new Date(borrow.borrowedAt);
                                            if (!isNaN(date.getTime())) {
                                                borrowDate = date.toLocaleDateString();
                                            }
                                        }
                                    } catch (err) {
                                        console.error("Error formatting borrow date:", err);
                                    }

                                    // Use name if available, otherwise use email
                                    const borrowerName = borrow.user.name || borrow.user.email.split('@')[0];

                                    return (
                                        <tr key={borrow.id}>
                                            <td>{borrow.item.name}</td>
                                            <td>{borrowerName}</td>
                                            <td>{borrow.user.email}</td>
                                            <td>{borrowDate}</td>
                                            <td>{dueDate}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-muted">No active borrows at this time.</p>
                )}
            </section>

            {/* Admins Section */}
            <section>
                <h2>Admins ({admins.length})</h2>
                
                <div className="row mb-4">
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header">
                                Current Administrators
                            </div>
                            <div className="card-body">
                                {admins.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {admins.map(email => {
                                                    // Extract name from email (part before @)
                                                    const name = email.split('@')[0];
                                                    const formattedName = name.replace(/\./g, ' ')
                                                        .split(' ')
                                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                        .join(' ');
                                                    
                                                    return (
                                                        <tr key={email}>
                                                            <td>{formattedName}</td>
                                                            <td>{email}</td>
                                                            <td>
                                                                <button 
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() => setAdminToRemove(email)}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-muted">No administrators configured.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header">
                                Add New Administrator
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleAddAdmin}>
                                    <div className="mb-3">
                                        <label htmlFor="newAdminEmail" className="form-label">Email Address</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="newAdminEmail"
                                            value={newAdminEmail}
                                            onChange={e => setNewAdminEmail(e.target.value)}
                                            placeholder="user@crescentschool.org"
                                            required
                                        />
                                        <div className="form-text">
                                            Must be a crescentschool.org email address.
                                        </div>
                                    </div>
                                    
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        disabled={addingAdmin}
                                    >
                                        {addingAdmin ? 'Adding...' : 'Add Admin'}
                                    </button>
                                    
                                    {adminError && (
                                        <div className="alert alert-danger mt-3">
                                            {adminError}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Admin Removal Confirmation Modal */}
            {adminToRemove && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm Administrator Removal</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setAdminToRemove(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to remove <strong>{adminToRemove}</strong> as an administrator?</p>
                                <p className="text-danger">This action cannot be undone. The user will lose all administrative privileges.</p>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => setAdminToRemove(null)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-danger" 
                                    onClick={handleRemoveAdmin}
                                    disabled={removingAdmin}
                                >
                                    {removingAdmin ? 'Removing...' : 'Remove Administrator'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;

