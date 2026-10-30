import React, { useContext, useEffect, useState } from 'react'
import { UserDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const UserProtectWrapper = ({
    children
}) => {
    const navigate = useNavigate()
    const { user, setUser } = useContext(UserDataContext)
    const [ isLoading, setIsLoading ] = useState(true)

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_BASE_URL}/users/profile`)
            .then(response => {
                if (response.status === 200) {
                    setUser(response.data)
                    setIsLoading(false)
                }
            })
            .catch(err => {
                console.error("User auth error:", err.response?.data || err.message)
                navigate('/login')
            })
    }, [ navigate, setUser ])

    if (isLoading) {
        return (
            <div>Loading...</div>
        )
    }

    return (
        <>
            {children}
        </>
    )
}

export default UserProtectWrapper