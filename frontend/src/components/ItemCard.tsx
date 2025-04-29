import React from 'react';

export interface Props {
    id: number;
    name: string;
    description?: string;
    imagePath?: string;
    onAction: (id: number) => void;
    actionLabel: string;
    disabled?: boolean; // Add disabled prop
}

const ItemCard: React.FC<Props> = ({ id, name, description, imagePath, onAction, actionLabel, disabled = false }) => {
    return (
        <div className="card m-2" style={{ width: '18rem' }}>
            {imagePath && (
                <img
                    src={`http://localhost:8080${imagePath}`}
                    className="card-img-top"
                    alt={name}
                    style={{ height: '200px', objectFit: 'cover' }}
                />
            )}
            <div className="card-body">
                <h5 className="card-title">{name}</h5>
                {description && <p className="card-text">{description}</p>}
                <button
                    className="btn btn-primary"
                    onClick={() => onAction(id)}
                    disabled={disabled} // Use the disabled prop
                >
                    {actionLabel}
                </button>
            </div>
        </div>
    );
};

export default ItemCard;
