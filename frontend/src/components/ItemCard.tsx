import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

interface ItemCardProps {
    id: number;
    name: string;
    description?: string;
    imagePath?: string;
    onAction: (id: number) => void;
    actionLabel: string;
    disabled?: boolean;
}

const ItemCard: React.FC<ItemCardProps> = ({ id, name, description, imagePath, onAction, actionLabel, disabled }) => {
    const { darkMode } = useTheme();
    
    // Define the background color based on dark mode
    const imageBackgroundColor = darkMode ? '#343a40' : '#f8f9fa';
    
    return (
        <Card 
            className={`m-2 ${darkMode ? 'bg-dark text-light border-secondary' : ''}`} 
            style={{ width: '18rem', display: 'flex', flexDirection: 'column' }}
        >
            {/* Image area with consistent background color */}
            <div 
                style={{ 
                    height: '200px', 
                    backgroundColor: imageBackgroundColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center' 
                }}
            >
                {imagePath && (
                    <img 
                        src={`http://localhost:8080${imagePath}`}
                        alt={name}
                        style={{ 
                            maxHeight: '100%',
                            maxWidth: '100%',
                            objectFit: 'contain'
                        }}
                    />
                )}
            </div>
            
            <Card.Body className="d-flex flex-column">
                <Card.Title>{name}</Card.Title>
                {description && <Card.Text>{description}</Card.Text>}
                <div className="mt-auto">
                    <Button 
                        variant="primary" 
                        onClick={() => onAction(id)} 
                        className="w-100"
                        disabled={disabled}
                    >
                        {actionLabel}
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ItemCard;
