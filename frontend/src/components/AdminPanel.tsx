import React, {useEffect, useRef, useState} from 'react';
import api from '../services/api';
import { Nav, Tab, Row, Col } from 'react-bootstrap';

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

interface EmailPreferences {
    adminOverdueAlert: boolean;
    adminBorrowNotification: boolean;
    adminReturnNotification: boolean;
}

// Helper function to check due date status
const getDueDateStatus = (dueDateStr: string): 'overdue' | 'dueToday' | 'upcoming' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'dueToday';
    return 'upcoming';
};

const AdminPanel: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
    const [admins, setAdmins] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeKey, setActiveKey] = useState<string>("borrows");

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

    // Email preferences state
    const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
        adminOverdueAlert: true,
        adminBorrowNotification: true,
        adminReturnNotification: true
    });
    const [savingPreferences, setSavingPreferences] = useState(false);
    const [preferencesMessage, setPreferencesMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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
                
                // Fetch email preferences
                try {
                    const preferencesRes = await api.get<EmailPreferences>('/admin/email-preferences');
                    setEmailPreferences(preferencesRes.data);
                } catch (prefErr) {
                    console.error('Failed to load email preferences:', prefErr);
                    // Continue with default preferences
                }
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

    // Handle toggling email preferences
    const handleTogglePreference = (preference: keyof EmailPreferences) => {
        setEmailPreferences(prev => ({
            ...prev,
            [preference]: !prev[preference]
        }));
    };

    // Handle saving email preferences
    const handleSavePreferences = async () => {
        setSavingPreferences(true);
        setPreferencesMessage(null);
        
        try {
            const response = await api.post('/admin/email-preferences', emailPreferences);
            setPreferencesMessage({
                type: 'success',
                text: 'Email preferences saved successfully!'
            });
        } catch (err) {
            console.error('Error saving preferences:', err);
            setPreferencesMessage({
                type: 'error',
                text: 'Failed to save email preferences.'
            });
        } finally {
            setSavingPreferences(false);
            
            // Clear the message after 3 seconds
            setTimeout(() => {
                setPreferencesMessage(null);
            }, 3000);
        }
    };

    if (loading) return <div>Loading admin data…</div>;
    if (error) return <div style={{color: 'red'}}>{error}</div>;

    return (
        <Tab.Container activeKey={activeKey} onSelect={(k) => k && setActiveKey(k)}>
            <div className="container my-4">
                <h1>Admin Panel</h1>

                {/* Tab Navigation */}
                <Row className="mb-4">
                    <Col xs={12}>
                        <Nav variant="pills" className="nav-fill w-100">
                            <Nav.Item className="flex-grow-1">
                                <Nav.Link eventKey="borrows" className="text-center">Borrows ({borrows.length})</Nav.Link>
                            </Nav.Item>
                            <Nav.Item className="flex-grow-1">
                                <Nav.Link eventKey="items" className="text-center">Items ({items.length})</Nav.Link>
                            </Nav.Item>
                            <Nav.Item className="flex-grow-1">
                                <Nav.Link eventKey="admins" className="text-center">Admins ({admins.length})</Nav.Link>
                            </Nav.Item>
                            <Nav.Item className="flex-grow-1">
                                <Nav.Link eventKey="preferences" className="text-center">Email Preferences</Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </Col>
                </Row>
                
                {/* Tab Content */}
                <Tab.Content>
                    {/* Borrows Tab */}
                    <Tab.Pane eventKey="borrows">
                        <section>
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
                                            {[...borrows]
                                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                                .map(borrow => {
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

                                                    // Determine status for highlighting
                                                    const status = getDueDateStatus(borrow.dueDate);
                                                    const rowClass = 
                                                        status === 'overdue' ? 'table-danger border-danger' :
                                                        status === 'dueToday' ? 'table-warning border-warning' : '';

                                                    return (
                                                        <tr key={borrow.id} className={rowClass}>
                                                            <td>{borrow.item.name}</td>
                                                            <td>{borrowerName}</td>
                                                            <td>{borrow.user.email}</td>
                                                            <td>{borrowDate}</td>
                                                            <td>
                                                                {status === 'overdue' && <span className="badge bg-danger me-1">Overdue!</span>}
                                                                {status === 'dueToday' && <span className="badge bg-warning text-dark me-1">Due today!</span>}
                                                                {dueDate}
                                                            </td>
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
                    </Tab.Pane>

                    {/* Items Tab */}
                    <Tab.Pane eventKey="items">
                        <section>
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
                                                    X
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
                    </Tab.Pane>

                    {/* Admins Tab */}
                    <Tab.Pane eventKey="admins">
                        <section>
                            <h2>Admins Management ({admins.length})</h2>
                            
                            <div className="row">
                                <div className="col-md-6 mb-4">
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
                                
                                <div className="col-md-6 mb-4">
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
                    </Tab.Pane>

                    {/* Email Preferences Tab */}
                    <Tab.Pane eventKey="preferences">
                        <section>
                            <h2>Email Notification Preferences</h2>
                            <p className="text-muted mb-4">
                                Customize which administrator notifications you receive. As an admin, you will not receive regular user due today or overdue notices.
                            </p>

                            <div className="card">
                                <div className="card-header bg-light">
                                    <h5 className="mb-0">Administrator Notification Settings</h5>
                                </div>
                                <div className="card-body">
                                    <div className="mb-4">
                                        <div className="form-check form-switch mb-2">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                id="adminOverdueToggle"
                                                checked={emailPreferences.adminOverdueAlert}
                                                onChange={() => handleTogglePreference('adminOverdueAlert')}
                                            />
                                            <label className="form-check-label" htmlFor="adminOverdueToggle">
                                                Admin Overdue Alerts - Receive notifications when items become overdue
                                            </label>
                                        </div>
                                        <div className="form-check form-switch mb-2">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                id="adminBorrowToggle"
                                                checked={emailPreferences.adminBorrowNotification}
                                                onChange={() => handleTogglePreference('adminBorrowNotification')}
                                            />
                                            <label className="form-check-label" htmlFor="adminBorrowToggle">
                                                Borrow Notifications - Receive notifications when items are borrowed
                                            </label>
                                        </div>
                                        <div className="form-check form-switch">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                id="adminReturnToggle"
                                                checked={emailPreferences.adminReturnNotification}
                                                onChange={() => handleTogglePreference('adminReturnNotification')}
                                            />
                                            <label className="form-check-label" htmlFor="adminReturnToggle">
                                                Return Notifications - Receive notifications when items are returned
                                            </label>
                                        </div>
                                    </div>

                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleSavePreferences}
                                        disabled={savingPreferences}
                                    >
                                        {savingPreferences ? 'Saving...' : 'Save Preferences'}
                                    </button>

                                    {preferencesMessage && (
                                        <div className={`alert mt-3 ${preferencesMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                                            {preferencesMessage.text}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </Tab.Pane>
                </Tab.Content>
            </div>
            
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
        </Tab.Container>
    );
};

export default AdminPanel;

