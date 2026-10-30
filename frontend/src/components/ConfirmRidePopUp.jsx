import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const ConfirmRidePopUp = (props) => {
  const [otp, setOtp] = useState('')
   const submitHandler = (e)=>{
    e.preventDefault()
  
   }


  return (
     <div>
       <h5 className='p-1 text-center w-[90%] absolute top-0' onClick={()=>{
          props.setRidePopupPanel(false)
        }}><i className=' text-3xl text-gray-200 ri-arrow-down-wide-line'></i></h5>
        <h3 className='text-2xl font-semibold mb-5'>Confirm This Ride To Start</h3>

    <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg bg-yellow-400 mt-4'>
         <div className='flex items-center gap-3 '>
            <img className='h-12 rounded-full object-cover  w-12' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUqHasJCEmW_Gb1fNOqoiSX1QwhuhKVml5lQ&s" alt="" />
            <h2 className='text-lg font-medium'>Harsh Patel</h2>
        </div>
        <h5 className='text-lg font-semibold'>
          2.2 km 
        </h5>
    </div> 


        <div className='flex justify-between flex-col gap-2 items-center'>
                <div className='w-full mt-5'>
                  <div className='flex items-center gap-5 p-3 border-b-2'>
                    <i className='ri-map-pin-2-fill text-lg'></i>
                    <div>
                      <h3 className='text-lg font-medium'>562/11-A</h3>
                      <p className=' text-sm -mt-1 text-gray-600'>Kankariya Talab, Bhopal</p>
                    </div>
                  </div>

                  <div className='flex items-center gap-5 p-3 border-b-2'>
                     <i className='ri-map-pin-user-fill text-lg'></i>
                    <div>
                      <h3 className='text-lg font-medium'>562/11-A</h3>
                      <p className=' text-sm -mt-1 text-gray-600'>Kankariya Talab, Bhopal</p>
                    </div>
                  </div>

                  <div className='flex items-center gap-5 p-3 '>
                    <i className='ri-currency-line text-lg'></i>
                    <div>
                      <h3 className='text-lg font-medium'>₹193.76</h3>
                      <p className=' text-sm -mt-1 text-gray-600'>Cash Cash</p>
                    </div>
                  </div>
               </div>
                  <form action=""></form>
                <div className='mt-6 w-full'>
                    <form onSubmit={(e)=>{
                        submitHandler(e)
                    }}>
                        <input value={otp} onChange={(e)=>setOtp(e.target.value)} className='bg-[#eee] px-6 py-4 font-mono text-lg rounded-lg w-full' type="text" placeholder='Enter OTP' />

                       <Link to="/captain-riding" className='w-full flex text-lg justify-center mt-5 bg-green-600 text-white font-semibold p-3 rounded-lg'>Confirm </Link>
                      <button onClick={()=>{
                      props.setConfirmRidePopupPanel(false)
                      props.setRidePopupPanel(false)
                    }} className='w-full mt-2 bg-red-600 text-white text-lg font-semibold p-3 rounded-lg'>Cancle</button>
         
                    </form>
                </div>
             </div>   
    </div>
  )
}

export default ConfirmRidePopUp
