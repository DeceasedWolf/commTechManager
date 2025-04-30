import React, { useEffect, useState } from 'react';
import { Nav, Tab, Row, Col } from 'react-bootstrap';
import api from '../services/api';
import ItemCard from './ItemCard';
import { formatDate } from '../utils/dateUtils';

type Item = { id: number; name: string; description?: string; imagePath?: string };
type Borrow = { id: number; item: Item; dueDate: string };

const BorrowPanel: React.FC = () => {
    const [available, setAvailable] = useState<Item[]>([]);
    const [borrowed, setBorrowed] = useState<Borrow[]>([]);
    const [dueDate, setDueDate] = useState<string>('');
    const [error, setError] = useState<string>('');
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

    const handleBorrow = async (id: number) => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError("");
        
        try {
            // First borrow the item
            await api.post('/borrow', { itemId: id, dueDate });
            
            // Then refresh both available and borrowed lists
            await fetchData();
            
            // Don't reset due date field or switch tabs
            // Success message
            setError(""); // Clear any previous errors
        } catch (err: any) {
            console.error("Failed to borrow item:", err);
            setError(err.response?.data?.error || "Failed to borrow item. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReturn = async (id: number) => {
        setIsLoading(true);
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
        } catch (err) {
            console.error("Failed to return item:", err);
            setError("Failed to return item. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = () => {
        // Check if date is in correct format DD/MM/YYYY
        const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!datePattern.test(dueDate)) {
            setError('Please enter a valid date in DD/MM/YYYY format.');
            return false;
        }
        
        // Extract day, month, year and validate date is real
        const [_, day, month, year] = dueDate.match(datePattern) || [];
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (
            isNaN(dateObj.getTime()) || 
            dateObj.getDate() !== parseInt(day) ||
            dateObj.getMonth() !== parseInt(month) - 1 ||
            dateObj.getFullYear() !== parseInt(year)
        ) {
            setError('Please enter a valid date.');
            return false;
        }
        
        // Get today and tomorrow dates for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get one year from today
        const oneYearFromToday = new Date(today);
        oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);
        
        // Ensure due date is at least tomorrow
        if (dateObj < tomorrow) {
            setError('Due date must be at least tomorrow.');
            return false;
        }
        
        // Ensure due date is not more than one year in the future
        if (dateObj > oneYearFromToday) {
            setError('Due date cannot be more than one year in the future.');
            return false;
        }
        
        return true;
    };

    return (
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
                                                    onAction={() => handleReturn(br.id)}
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
    );
};

export default BorrowPanel;

