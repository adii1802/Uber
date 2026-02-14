import React, { useState } from 'react'
import { Link } from 'react-router-dom';

const UserSignup = () => {
   const [email, setEmail] = useState("")
   const [password, setPassword] = useState("")
   const [firstName, setFirstName] = useState("")
   const [lastName, setLastName] = useState("")
   const [userData, setUserData] = useState({})


  const submitHandler = (e) => {
    e.preventDefault();
    setUserData({ 
      fullName:{
        firstName: firstName,
        lastName: lastName  
      },
      email: email,
      password: password
    })
    setEmail('')
    setPassword('')
    setFirstName('')
    setLastName('')
  } 
  return (
      <div className='p-7 h-screen flex flex-col justify-between'>
         <div>
          <img className='w-16 mb-10' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYQy-OIkA6In0fTvVwZADPmFFibjmszu2A0g&s" alt="" />
      <form onSubmit={(e) => {submitHandler(e); }} >
        <h3 className='text-lg font-medium mb-2'>What's your name</h3>
        <div className='flex gap-4 mb-6'>
          <input
           type="text"
           required
           placeholder='First name'
           value={firstName}
           onChange={(e) => setFirstName(e.target.value)} 
           className='bg-[#eeeeee] w-1/2 rounded px-4 py-2 border text-lg placeholder:text-base' 
           />
           <input
           type="text"
           required
           placeholder='Last name'
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}  
           className='bg-[#eeeeee]  w-1/2  rounded px-4 py-2 border  text-lg placeholder:text-base' 
           />
        </div>
        <h3 className='text-lg font-medium mb-2'>What's your email</h3>
        <input
         type="email"
         required 
         placeholder='email@example.com'
         value={email}
         onChange={(e) => setEmail(e.target.value)}  
         className='bg-[#eeeeee] mb-6 rounded px-4 py-2 border w-full text-lg placeholder:text-base' 
        />

        <h3 className='text-lg font-medium mb-2'>Enter Password</h3>

        <input
         type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)} 
         required
         placeholder='Enter your password'
         className='bg-[#eeeeee] mb-6 rounded px-4 py-2 border w-full text-lg placeholder:text-base' 
        />
        <button
        className='bg-[#111] text-white font-semibold mb-3 rounded px-4 py-2  w-full text-lg placeholder:text-base' 
       >Login</button>
       <p className='text-center'>Already have a account? <Link to="/login" className='text-blue-600'>Login here</Link></p>
      </form>
         </div>
         <div>
          <p className='text-[6px] leading-tight'>This site is protected by reCAPTCHA and the <span className='underline'> Google Privacy
             Policy</span> and <span className='underline'>Terms of Service apply</span>.</p>
         </div> 
    </div>
  )
}

export default UserSignup
