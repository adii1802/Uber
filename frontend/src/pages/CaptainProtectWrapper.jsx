import React, { useContext, useEffect, useState } from 'react';
import { CaptainDataContext } from '../context/CaptainContext'; 
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CaptainProtectWrapper = ({ children }) => {
    const token = localStorage.getItem('token');
    const navigate = useNavigate();  
    const { setCaptain } = useContext(CaptainDataContext);
    const [ isLoading, setIsLoading ] = useState(true);

    useEffect(() => {
        // 1. If no token exists, don't even bother calling the API
        if (!token) {
            navigate('/captain-login');
            return;
        }

        // 2. Call the profile endpoint to verify the token
        axios.get(`${import.meta.env.VITE_BASE_URL}/captains/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }   
        }).then(response => {
            if (response.status === 200) {
                setCaptain(response.data.captain);
                setIsLoading(false);
            }
        }).catch(error => {
            console.error("Authentication Error:", error);
            localStorage.removeItem('token');
            navigate('/captain-login');
        });
    }, [ token, navigate, setCaptain ]); // Dependencies

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