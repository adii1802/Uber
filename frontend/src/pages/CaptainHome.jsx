import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CaptainDetails from '../components/CaptainDetails'
import RidePopUp from '../components/RidePopUp'
import { useGSAP } from '@gsap/react'
import ConfirmRidePopUp from '../components/ConfirmRidePopUp'
import gsap from 'gsap'

const CaptainHome = () => {

 const [ridePopupPanel, setRidePopupPanel] = useState(true)
 const [confirmRidePopupPanel, setConfirmRidePopupPanel] = useState(false)



 const ridePopupPanelRef = useRef(null)
 const confirmRidePopupPanelRef = useRef(null)


 useGSAP(function(){ 
  if(ridePopupPanel){
   gsap.to(ridePopupPanelRef.current,{ 
    transform:'translateY(0)'
   })
  }else{
    gsap.to(ridePopupPanelRef.current,{
      transform:'translateY(100%)'
  })
}
},[ridePopupPanel])

useGSAP(function(){ 
  if(confirmRidePopupPanel){
   gsap.to(confirmRidePopupPanelRef.current,{ 
    transform:'translateY(0)'
   })
  }else{
    gsap.to(confirmRidePopupPanelRef.current,{
      transform:'translateY(100%)'
  })
}
},[confirmRidePopupPanel])


  return (
      <div className='h-screen'>
      <div className='fixed p-6 top-0 flex items-center justify-between w-screen'>
        <img className='w-16' src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" />
         <Link to="/home" className=' h-10 w-10 bg-white flex items-center justify-center rounded-full'>
         <i className='ri-logout-box-r-line text-lg font-medium'></i>
       </Link>
      </div>

      <div className='h-1/2'>
         <img  className='w-full  h-full object-cover' src="https://miro.medium.com/v2/resize:fit:1400/0*gwMx05pqII5hbfmX.gif" alt="" />
         
      </div>
      <div className='h-2/5  p-6'>
        <CaptainDetails />
      </div>
      <div ref={ridePopupPanelRef} className='fixed w-full z-10 translate-y-full bottom-0 bg-white py-10 px-3 pt-12'>
          <RidePopUp setRidePopupPanel={setRidePopupPanel} setConfirmRidePopupPanel={setConfirmRidePopupPanel} />
       </div>
       <div ref={confirmRidePopupPanelRef} className='fixed h-screen w-full z-10 translate-y-full bottom-0 bg-white py-10 px-3 pt-12'>
          <ConfirmRidePopUp setConfirmRidePopupPanel={setConfirmRidePopupPanel} setRidePopupPanel={setRidePopupPanel} />
       </div>
    </div>
  )
}

export default CaptainHome
