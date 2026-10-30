import React from 'react'

const RidePopUp = (props) => {
  return (
    <div>
       <h5 className='p-1 text-center w-[90%] absolute top-0' onClick={()=>{
          props.setRidePopupPanel(false)
        }}><i className=' text-3xl text-gray-200 ri-arrow-down-wide-line'></i></h5>
        <h3 className='text-2xl font-semibold mb-5'>New Ride Available</h3>

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
              <div className='flex mt-5 w-full items-center justify-between'>
                   <button onClick={()=>{
                
                props.setConfirmRidePopupPanel(true)
               }} className='  bg-green-600 text-white font-semibold p-3 px-8 rounded-lg'>Accept</button>
              <button onClick={()=>{
                props.setRidePopupPanel(false)
               }} className=' mt-1 bg-gray-400 text-gray-300 font-semibold p-3 px-10 rounded-lg'>Ignore</button>
        
              </div>
               
           </div>   
    </div>
  )
}

export default RidePopUp
