import React from 'react'

const ConfirmRide = () => {
  return (
    <div>
       <h5 className='p-1 text-center w-[90%] absolute top-0' onClick={()=>{
          props.setVehiclePanel(false)
        }}><i className=' text-3xl text-gray-200 ri-arrow-down-wide-line'></i></h5>
        <h3 className='text-2xl font-semibold mb-5'>Confirm your ride</h3>
        
        <div className='flex justify-between flex-col gap-2 items-center'>
               <img className='h-20' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8uNE6JTdWQeZyw7PajPadusxZgpEK3ENYPOCr_4wsl00DFny2eWf_sHE&s"  />
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
               <button className='w-full mt-5 bg-green-600 font-semibold p-2 rounded-lg'>Confirm </button>
        </div>   
    </div>
  )
}

export default ConfirmRide
