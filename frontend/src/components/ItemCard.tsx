import React from 'react';

export interface Props {
    id: number;
    name: string;
    description?: string;
    imagePath?: string;
    onAction: (id: number) => void;
    actionLabel: string;
    disabled?: boolean;
}

const ItemCard: React.FC<Props> = ({ id, name, description, imagePath, onAction, actionLabel, disabled = false }) => {
    return (
        <div className="card m-2" style={{ width: '18rem', display: 'flex', flexDirection: 'column', height: '400px' }}>
            {/* Image container with fixed height */}
            <div style={{ height: '200px', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
                {imagePath ? (
                    <img
                        src={`http://localhost:8080${imagePath}`}
                        className="card-img-top"
                        alt={name}
                        style={{
                            height: '100%',
                            width: '100%',
                            objectFit: 'contain',
                            objectPosition: 'center'
                        }}
                    />
                ) : (
                    <div className="bg-light" style={{ height: '100%', width: '100%' }}></div>
                )}
            </div>

            {/* Content area that pushes to the bottom with flex */}
            <div className="card-body d-flex flex-column" style={{ flex: 1 }}>
                <div style={{ flex: 1 }}>
                    <h5 className="card-title">{name}</h5>
                    {description && <p className="card-text">{description}</p>}
                </div>
                <div className="mt-auto">
                    <button
                        className="btn btn-primary w-100"
                        onClick={() => onAction(id)}
                        disabled={disabled}
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemCard;
