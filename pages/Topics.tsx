
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Topics: React.FC = () => {
    const navigate = useNavigate();
    useEffect(() => {
        navigate('../syllabus-library', { replace: true });
    }, []);
    return null;
};

export default Topics;
