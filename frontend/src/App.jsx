import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Riding from './pages/Riding'
import Start from './pages/Start';
import Userlogin from './pages/UserLogin'
import CaptainLogin from './pages/CaptainLogin'
import CaptainSignup from './pages/CaptainSignup'
import UserSignup from './pages/UserSignup'
import UserProtectWrapper from './pages/UserProtectWrapper';
import UserLogout from './pages/UserLogout';
import CaptainHome from './pages/CaptainHome';
import CaptainProtectWrapper from './pages/CaptainProtectWrapper';
import CaptainRiding from './pages/CaptainRiding';
import CaptainLogout from './pages/CaptainLogout';
import FleetManagement from './pages/FleetManagement';
import BookCargo from './pages/BookCargo';
import MyBookings from './pages/MyBookings';
import 'remixicon/fonts/remixicon.css';

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/login" element={<Userlogin />} />
        <Route path="/riding" element={<Riding />} />
        <Route path="/signup" element={<UserSignup />} />
        <Route path="/captain-riding" element={<CaptainRiding />} />
        <Route path="/captain-login" element={<CaptainLogin />} />
        <Route path="/captain-signup" element={<CaptainSignup />} />
        <Route
          path="/home"
          element={
            <UserProtectWrapper>
              <Home />
            </UserProtectWrapper>
          }
        />
        <Route
          path="/book-cargo"
          element={
            <UserProtectWrapper>
              <BookCargo />
            </UserProtectWrapper>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <UserProtectWrapper>
              <MyBookings />
            </UserProtectWrapper>
          }
        />
        <Route
          path="/user/logout"
          element={
            <UserProtectWrapper>
              <UserLogout />
            </UserProtectWrapper>
          }
        />
        <Route
          path="/captain-home"
          element={
            <CaptainProtectWrapper>
              <CaptainHome />
            </CaptainProtectWrapper>
          }
        />
        <Route
          path="/captain/fleet"
          element={
            <CaptainProtectWrapper>
              <FleetManagement />
            </CaptainProtectWrapper>
          }
        />
        <Route
          path="/captain/logout"
          element={
            <CaptainProtectWrapper>
              <CaptainLogout />
            </CaptainProtectWrapper>
          }
        />
      </Routes>
    </div>
  );
};


export default App
