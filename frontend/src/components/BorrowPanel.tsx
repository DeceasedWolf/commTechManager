import React, { useEffect, useState } from 'react';
import { Nav, Tab, Row, Col } from 'react-bootstrap';
import api from '../services/api';
import ItemCard from './ItemCard';
import { formatDate } from '../utils/dateUtils';
import Navbar from './Navbar';

type Item = { id: number; name: string; description?: string; imagePath?: string };
type Borrow = { id: number; item: Item; dueDate: string };

const BorrowPanel: React.FC = () => {
    const [available, setAvailable] = useState<Item[]>([]);
    const [borrowed, setBorrowed] = useState<Borrow[]>([]);
    const [dueDate, setDueDate] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [activeKey, setActiveKey] = useState<string>("available");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Function to fetch all data
    const fetchData = async () => {
        try {
            const [availableRes, borrowedRes] = await Promise.all([
                api.get<Item[]>('/borrow/items'),
                api.get<Borrow[]>('/borrow/my')
            ]);
            setAvailable(availableRes.data);
            setBorrowed(borrowedRes.data);
        } catch (err) {
            console.error("Failed to fetch items:", err);
            setError("Failed to load items. Please try again.");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Function to validate the date format before submitting
    const validateForm = (): boolean => {
        // Clear previous errors
        setError('');
        
        // Check if due date is provided
        if (!dueDate.trim()) {
            setError('Please enter a due date.');
            return false;
        }
        
        // Validate date format (DD/MM/YYYY)
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(dueDate)) {
            setError('Due date must be in DD/MM/YYYY format.');
            return false;
        }
        
        // Validate if it's a valid date
        const [day, month, year] = dueDate.split('/').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        if (isNaN(dateObj.getTime())) {
            setError('Invalid date. Please enter a valid date.');
            return false;
        }
        
        // All validation passed
        return true;
    };

    const handleBorrow = async (id: number) => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccessMessage("");
        
        try {
            // Add a timeout similar to return operation
            const borrowPromise = api.post('/borrow', { itemId: id, dueDate });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 1000));

            await Promise.race([borrowPromise, timeoutPromise])
                .catch(err => {
                    if (err.message === 'Request timeout') {
                        console.log('Borrow operation taking longer than expected...');
                        // Continue with the operation
                    } else {
                        throw err;
                    }
                });
            
            // Then refresh both available and borrowed lists
            await fetchData();
            
            // Check if the item is now in borrowed and no longer in available
            const itemBorrowed = !available.find(item => item.id === id);
            
            if (itemBorrowed) {
                // Successful borrow!
                setSuccessMessage(`Item borrowed successfully! Due date: ${dueDate}`);
                // Switch to borrowed tab
                setActiveKey("borrowed");
            }
        } catch (err: any) {
            console.error("Failed to borrow item:", err);
            // Don't show error if item actually was borrowed
            const refreshedAvailable = await api.get<Item[]>('/borrow/items');
            const itemBorrowed = !refreshedAvailable.data.find(item => item.id === id);
            
            if (!itemBorrowed) {
                setError(err.response?.data?.error || "Failed to borrow item. Please try again.");
            } else {
                setSuccessMessage(`Item borrowed successfully! Due date: ${dueDate}`);
                setActiveKey("borrowed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleReturn = async (id: number) => {
        setIsLoading(true);
        setError("");
        setSuccessMessage("");
        
        try {
            // Add a timeout to detect slow responses
            const returnPromise = api.post(`/borrow/return/${id}`);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 1000));

            await Promise.race([returnPromise, timeoutPromise])
                .catch(err => {
                    if (err.message === 'Request timeout') {
                        console.log('Return operation taking longer than expected...');
                        // Continue with the operation
                    } else {
                        throw err;
                    }
                });

            // Fetch data after return completes
            await fetchData();
            setSuccessMessage("Item returned successfully!");
        } catch (err) {
            console.error("Failed to return item:", err);
            setError("Failed to return item. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <Tab.Container activeKey={activeKey} onSelect={(k) => k && setActiveKey(k)}>
                <div className="container my-3">
                    {/* Horizontal Navigation - Each button takes half width */}
                    <Row className="mb-4">
                        <Col xs={12}>
                            <Nav variant="pills" className="w-100">
                                <Nav.Item className="w-50">
                                    <Nav.Link eventKey="available" className="text-center">Available</Nav.Link>
                                </Nav.Item>
                                <Nav.Item className="w-50">
                                    <Nav.Link eventKey="borrowed" className="text-center">Borrowed</Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </Col>
                    </Row>
                    
                    {/* Content Section */}
                    <Row>
                        <Col xs={12}>
                            {isLoading && <div className="alert alert-info">Processing your request...</div>}
                            {error && <div className="alert alert-danger">{error}</div>}
                            {successMessage && <div className="alert alert-success">{successMessage}</div>}
                            
                            <Tab.Content>
                                <Tab.Pane eventKey="available">
                                    <div className="mb-3">
                                        <label htmlFor="dueDate" className="form-label">Return By</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            id="dueDate" 
                                            value={dueDate} 
                                            onChange={e => setDueDate(e.target.value)}
                                            placeholder="DD/MM/YYYY"
                                            required
                                        />
                                        <div className="form-text">
                                            Enter the date you will return this item (format: DD/MM/YYYY).
                                            Must be at least tomorrow and within one year.
                                        </div>
                                    </div>
                                    
                                    <div className="d-flex flex-wrap">
                                        {available.length > 0 ? (
                                            available.map(item => (
                                                <ItemCard
                                                    key={item.id}
                                                    {...item}
                                                    onAction={handleBorrow}
                                                    actionLabel="Borrow"
                                                    disabled={isLoading}
                                                />
                                            ))
                                        ) : (
                                            <p className="text-muted">No items available for borrowing right now.</p>
                                        )}
                                    </div>
                                </Tab.Pane>
                                
                                <Tab.Pane eventKey="borrowed">
                                    <div className="d-flex flex-wrap">
                                        {borrowed.length > 0 ? (
                                            // Sort borrowed items by due date (earliest first) before rendering
                                            [...borrowed]
                                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                                                .map(br => (
                                                    <ItemCard
                                                        key={br.id}
                                                        id={br.id}
                                                        name={br.item.name}
                                                        description={`Due: ${formatDate(br.dueDate)}`}
                                                        imagePath={br.item.imagePath}
                                                        onAction={handleReturn}
                                                        actionLabel="Return"
                                                        disabled={isLoading}
                                                    />
                                                ))
                                        ) : (
                                            <p className="text-muted">You haven't borrowed any items yet.</p>
                                        )}
                                    </div>
                                </Tab.Pane>
                            </Tab.Content>
                        </Col>
                    </Row>
                </div>
            </Tab.Container>
        </>
    );
};

export default BorrowPanel;

