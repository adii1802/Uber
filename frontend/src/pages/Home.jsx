import React, {  useRef, useState } from 'react'
import {useGSAP} from '@gsap/react'
import gsap from 'gsap'
import 'remixicon/fonts/remixicon.css'
import LocationSearchPanel from '../components/LocationSearchPanel'
import ConfirmRide from '../components/ConfirmRide'
import VehiclePanel from '../components/VehiclePanel'
import LookingForDriver from '../components/LookingForDriver'
import WaitingForDriver from '../components/WaitingForDriver'


const Home = () => {
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const vehiclePanelRef=useRef(null);
  const confirmRidePanelRef=useRef(null);
  const vehicleFoundRef=useRef(null);
  const waitingForDriverRef=useRef(null);


  const panelRef = useRef(null);
  const panelCloseRef=useRef(null)
  const [vehiclePanel, setVehiclePanel] = useState(false)
  const [confirmRidePanel, setConfirmRidePanel] = useState(false)


  const [vehicleFound, setVehicleFound] = useState(false)
  const [waitingForDriver, setWaitingForDriver] = useState(false)



  const submitHandler=(e)=>{
   e.preventDefault();
  }
   
useGSAP(function (){ 
  if(panelOpen){
    gsap.to(panelRef.current, {height:'70%',padding:24, })
    gsap.to(panelCloseRef.current,{
      opacity:1,
    })
  } else{
    gsap.to(panelRef.current, {height:'0%',padding:0 })
    gsap.to(panelCloseRef.current,{
      opacity:0,
    })
  } 
}, [panelOpen])

useGSAP(function(){ 
  if(vehiclePanel){
   gsap.to(vehiclePanelRef.current,{ 
    transform:'translateY(0)'
   })
  }else{
    gsap.to(vehiclePanelRef.current,{
      transform:'translateY(100%)'
  })
}
},[vehiclePanel])

useGSAP(function(){ 
  if(confirmRidePanel){
   gsap.to(confirmRidePanelRef.current,{ 
    transform:'translateY(0)'
   })
  }else{
    gsap.to(confirmRidePanelRef.current,{
      transform:'translateY(100%)'
  })
}
},[confirmRidePanel])

useGSAP(function(){ 
  if(vehicleFound){
   gsap.to(vehicleFoundRef.current,{ 
    transform:'translateY(0)'
   })
  }else{
    gsap.to(vehicleFoundRef.current,{
      transform:'translateY(100%)'
  })
}
},[vehicleFound])

useGSAP(function(){ 
  if(waitingForDriver){
   gsap.to(waitingForDriverRef.current,{ 
    transform:'translateY(0)'
   })
  }else{
    gsap.to(waitingForDriverRef.current,{
      transform:'translateY(100%)'
  })
}
},[waitingForDriver])


  return (
    <div className='h-screen relative overflow-hidden'>
      <img className='w-16 z-10 absolute left-5 top-5 ' src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" alt="" />
      <div onClick={()=>{
        setVehiclePanel(false)
      }} className='h-screen w-screen'>
        <img  className='w-full  h-full object-cover' src="https://miro.medium.com/v2/resize:fit:1400/0*gwMx05pqII5hbfmX.gif" alt="" />
      </div>
      <div className=' flex flex-col justify-end h-screen absolute top-0 w-full '>
       <div className='h-[30%] p-6 bg-white relative'>
        <h5 ref={panelCloseRef} onClick={()=>{
          setPanelOpen(false)
        }} className='absolute opacity-0 top-6 right-6 text-xl'>
           <i className='ri-arrow-down-wide-line text-black'></i>
        </h5>
       
         <h4 className='text-2xl font-semibold '>Find a trip</h4>
        <form onSubmit={(e)=>{
          submitHandler(e);
        }}>
          <div className="line absolute h-16 w-1 top-[45%] left-10 bg-grey-900 rounded-full"></div>
          <input
           onClick={()=>{
             console.log('clicked')
             setPanelOpen(true)
           }} 
           value={pickup}
           onChange={ (e)=> {
             setPickup(e.target.value)
           }}
           className='bg-[#eeeeee] mt-5 rounded-lg px-12 py-2 border w-full text-lg placeholder:text-base' 
           type="text" 
           placeholder='Add a pick-up location' 
          />
          <input
           onClick={()=>{
             setPanelOpen(true)
           }}  
           value={destination}
           onChange={(e)=>{
            setDestination(e.target.value)
           }}
          className='bg-[#eeeeee] mt-3 rounded px-12 py-2 border w-full text-lg placeholder:text-base' 
          type="text" 
          placeholder='enter your destination' 
          />
        </form>
       </div>
       <div ref={panelRef} className=' bg-white h-0'>
         <LocationSearchPanel  setPanelOpen={setPanelOpen} setVehiclePanel={setVehiclePanel} />
       </div>
      </div>

      <div ref={vehiclePanelRef} className='fixed w-full z-10 translate-y-full bottom-0 bg-white py-10 px-3 pt-12'>
      <VehiclePanel 
        setConfirmRidePanel={setConfirmRidePanel} 
        setVehiclePanel={setVehiclePanel} 
      />
      </div>

      <div ref={confirmRidePanelRef} className='fixed w-full z-10 translate-y-full bottom-0 bg-white py-6 px-3 pt-12'>
        <ConfirmRide setConfirmRidePanel={setConfirmRidePanel} setVehicleFound={setVehicleFound} />
      </div>
       <div ref={vehicleFoundRef}  className='fixed w-full z-10 translate-y-full bottom-0 bg-white py-6 px-3 pt-12'>
         <LookingForDriver setVehicleFound={setVehicleFound} />
      </div>
      <div ref={waitingForDriverRef} className='fixed w-full z-10 bottom-0 bg-white py-6 px-3 pt-12'>
         <WaitingForDriver waitingForDriver={waitingForDriver} />
      </div>
    </div>
  )
}

export default Home 