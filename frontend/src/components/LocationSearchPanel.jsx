import React from 'react'

const LocationSearchPanel = (props) => {
  const locations = [
   "24B,Near Kapoor's Cafe , Sheryians Coding School",
   "24C,Near Singhania's Cafe , Sheryians Coding School",
   "24B,Near Malhotra's Cafe , Sheryians Coding School",
   "18A,Near Sharma's Cafe , Sheryians Coding School",
  ]
  return (
    <div>
      {
        locations.map( function(elem ,idx){
          return <div key={idx} onClick={()=>{
            props.setVehiclePanel(true)
            props.setPanelOpen(false)
          }} className='flex gap-4 border-2 border-gray-50 active:border-black p-3 rounded-xl items-center my-2 justify-start'>
             <h2 className=' bg-[#eee] h-8 flex items-center justify-center w-12 rounded-full'><i className="ri-map-pin-fill "></i></h2>
             <h4 className='font-medium'>{elem} </h4>
          </div>
        }
        )
      }
    </div>
  )
}

export default LocationSearchPanel

