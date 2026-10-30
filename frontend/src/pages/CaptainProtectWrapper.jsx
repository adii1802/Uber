import React, { useContext, useEffect, useState } from 'react';
import { CaptainDataContext } from '../context/CaptainContext'; 
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CaptainProtectWrapper = ({ children }) => {
    const navigate = useNavigate();  
    const { setCaptain } = useContext(CaptainDataContext);
    const [ isLoading, setIsLoading ] = useState(true);

    useEffect(() => {
        const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL;
        axios.get(`${baseUrl}/captains/profile`)
            .then(response => {
                if (response.status === 200) {
                    setCaptain(response.data.captain || response.data);
                    setIsLoading(false);
                }
            }).catch(error => {
                console.error("Captain auth error:", error.response?.data || error.message);
                navigate('/captain-login');
            });
    }, [ navigate, setCaptain ]);

    if (isLoading) {
        return (
            <div>Loading...</div>
        );
    }

    return (
        <>
            {children}
        </>
    );
};

export default CaptainProtectWrapper;