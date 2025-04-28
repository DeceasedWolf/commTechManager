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

    useEffect(() => {
        api.get<Item[]>('/borrow/items').then(res => setAvailable(res.data));
        api.get<Borrow[]>('/borrow/my').then(res => setBorrowed(res.data));
    }, []);

    const handleBorrow = (id: number) => {
        const due = prompt('Enter due date (YYYY-MM-DD)');
        if (due) {
            api.post('/borrow', { itemId: id, dueDate: due }).then(() =>
                setAvailable(v => v.filter(i => i.id !== id))
            );
        }
    };

    const handleReturn = (id: number) => {
        api.post(`/borrow/return/${id}`).then(() =>
            setBorrowed(b => b.filter(r => r.id !== id))
        );
    };

    return (
        <Tab.Container defaultActiveKey="available">
            <Row>
                <Col sm={3}>
                    <Nav variant="pills" className="flex-column">
                        <Nav.Item><Nav.Link eventKey="available">Available</Nav.Link></Nav.Item>
                        <Nav.Item><Nav.Link eventKey="borrowed">Borrowed</Nav.Link></Nav.Item>
                    </Nav>
                </Col>
                <Col sm={9}>
                    <Tab.Content>
                        <Tab.Pane eventKey="available">
                            <div className="d-flex flex-wrap">
                                {available.map(item => (
                                    <ItemCard
                                        key={item.id}
                                        {...item}
                                        onAction={handleBorrow}
                                        actionLabel="Borrow"
                                    />
                                ))}
                            </div>
                        </Tab.Pane>
                        <Tab.Pane eventKey="borrowed">
                            <div className="d-flex flex-wrap">
                                {borrowed.map(br => (
                                    <ItemCard
                                        key={br.id}
                                        id={br.id}
                                        name={br.item.name}
                                        description={`Due: ${formatDate(br.dueDate)}`}
                                        imagePath={br.item.imagePath}
                                        onAction={() => handleReturn(br.id)}
                                        actionLabel="Return"
                                    />
                                ))}
                            </div>
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
    );
};

export default BorrowPanel;