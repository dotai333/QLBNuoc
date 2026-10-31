import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import QuanLyQuanNuoc from './QLQN_1/QuanLyBanNuoc'; // Hoặc đường dẫn thư mục của mày

export default function App() {
  return (
    <BrowserRouter>
      <QuanLyQuanNuoc />
    </BrowserRouter>
  );
}