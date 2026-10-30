import React, { useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UserDataContext } from '../context/UserContext';

export const UserLogout = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const { setUser } = useContext(UserDataContext);

  useEffect(() => {
    const performLogout = async () => {
      try {
        if (token) {
          await axios.get(`${import.meta.env.VITE_BASE_URL}/users/logout`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (err) {
        console.error('Logout error:', err.response?.data || err.message);
      } finally {
        localStorage.removeItem('token');
        setUser({ email: '', fullName: { firstName: '', lastName: '' } });
        navigate('/login');
      }
    };

    performLogout();
  }, [token, navigate, setUser]);

  return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      Logging out...
    </div>
  );
};

export default UserLogout;
