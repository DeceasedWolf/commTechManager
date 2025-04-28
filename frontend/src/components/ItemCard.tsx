import React from 'react';
import { Card, Button } from 'react-bootstrap';

type Props = {
    id: number;
    name: string;
    description?: string;
    imagePath?: string;
    onAction: (id: number) => void;
    actionLabel: string;
};

const ItemCard: React.FC<Props> = ({ id, name, description, imagePath, onAction, actionLabel }) => (
    <Card style={{ width: '18rem', margin: '0.5rem' }}>
        {imagePath && <Card.Img variant="top" src={`http://localhost:8080${imagePath}`} />}
        <Card.Body>
            <Card.Title>{name}</Card.Title>
            <Card.Text>{description}</Card.Text>
            <Button onClick={() => onAction(id)}>{actionLabel}</Button>
        </Card.Body>
    </Card>
);

export default ItemCard;