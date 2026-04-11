import React from 'react'

const WaitingForDriver = (props) => {
  return (
    <div>
       <h5 className='p-1 text-center w-[90%] absolute top-0' onClick={()=>{
          props.setWaitingForDriver(false)
        }}><i className=' text-3xl text-gray-200 ri-arrow-down-wide-line'></i></h5>
        <div className='flex items-center justify-between'>
          <img className='h-12' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8uNE6JTdWQeZyw7PajPadusxZgpEK3ENYPOCr_4wsl00DFny2eWf_sHE&s"  />
          <div className='text-right'>
            <h2 className='text-lg font-medium'>Sarthak</h2>
            <h4 className='text-xl font-semibold -mt-1 -mb-1'>MP04ad1234</h4>
            <p className='text-sm text-gray-600'>Maruti Sujuki Alto</p>
          </div>
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
        </div>   
    </div>
  )
}

export default WaitingForDriver
