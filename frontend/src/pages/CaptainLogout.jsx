import React, { useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CaptainDataContext } from '../context/CaptainContext';

export const CaptainLogout = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('captain-token');
  const navigate = useNavigate();
  const { setCaptain } = useContext(CaptainDataContext);

  useEffect(() => {
    const performLogout = async () => {
      const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL;
      try {
        if (token) {
          await axios.get(`${baseUrl}/captains/logout`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (err) {
        console.error('Captain logout error:', err.response?.data || err.message);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('captain-token');
        setCaptain(null);
        navigate('/captain-login');
      }
    };

    performLogout();
  }, [token, navigate, setCaptain]);

  return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      Logging out Captain...
    </div>
  );
};

export default CaptainLogout;
