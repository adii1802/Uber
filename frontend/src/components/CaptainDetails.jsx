import React from 'react'

const CaptainDetails = () => {
  return (
    <div>
         <div className='flex items-center justify-between'>
          <div className='flex items-center justify-start gap-3'>
            <img className='h-10 w-10 rounded-full object-cover' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdlMd7stpWUCmjpfRjUsQ72xSWikidbgaI1w&s" alt="" />
            <h4 className='text-lg font-medium'>Harsh Patel</h4>
          </div> 
           <div>
             <h4 className='text-xl font-semibold'>₹295.20</h4>
             <p className='text-sm  text-gray-600'>Earned</p>
           </div>
        </div> 
        <div className='flex mt-6 p-3 bg-gray-100  rounded-xl justify-center gap-5 items-start'>
          <div className='text-center'>
            <i className='ri-timer-2-line mb-2 text-3xl font-thin'></i>
            <h5 className='text-lg font-medium'>10.2</h5>
            <p className='text-sm text-gray-600'>Hours Online</p>
          </div>
          <div className='text-center'>
              <i className='ri-speed-up-line mb-2 text-3xl font-thin'></i>
              <h5 className='text-lg font-medium'>10.2</h5>
              <p className='text-sm text-gray-600'>Hours Online</p>
          </div>
          <div className='text-center'>
            <i className='ri-booklet-line mb-2 text-3xl font-thin'></i>
            <h5 className='text-lg font-medium'>10.2</h5>
            <p className='text-sm text-gray-600'>Hours Online</p>
          </div>
        </div>
    </div>
  )
}

export default CaptainDetails
