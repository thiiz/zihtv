import React from 'react';

interface SpinnerProps {
    size?: number;
    color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
    size = 6,
    color = 'border-blue-600'
}) => {
    const sizeClass = `w-${size} h-${size}`;

    return (
        <div className={`${sizeClass} border-4 ${color} border-t-transparent rounded-full animate-spin`}></div>
    );
}; 