import React, { useState, useEffect } from 'react';
import axios from 'axios';
import POS from './POS';
import QLCongThuc from './QLCongThuc';
import QLNguyenLieu from './QLNguyenLieu';
import NhapHang from './NhapHang';
import '../App.css';
import * as XLSX from 'xlsx';

export default function QuanLyQuanNuoc() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [dailyWarehouse, setDailyWarehouse] = useState(() => {
    const savedLocal = localStorage.getItem('coffee_daily_warehouse');
    if (savedLocal) {
      try {
        return JSON.parse(savedLocal);
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const [activeTab, setActiveTab] = useState('pos');

  useEffect(() => {
    axios.get("https://qlbnuoc.onrender.com/congThuc")
      .then(res => setRecipes(res.data))
      .catch(err => console.log("Lỗi tải công thức:", err));

    axios.get("https://qlbnuoc.onrender.com/nguyenLieu")
      .then(res => setIngredients(res.data))
      .catch(err => console.log("Lỗi tải nguyên liệu:", err));

    axios.get("https://qlbnuoc.onrender.com/soLieu")
      .then(res => {
        if (res.data && res.data.length > 0) {
          const warehouseObj = {};
          res.data.forEach(item => {
            warehouseObj[item.id] = item.data;
          });
          setDailyWarehouse(prev => {
            const merged = { ...warehouseObj, ...prev };
            localStorage.setItem('coffee_daily_warehouse', JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(err => console.log("Lỗi tải số liệu kho từ server:", err));
  }, []);

  const saveDailyWarehouseToServer = async (dateStr, dayData) => {
    const updatedWarehouse = { ...dailyWarehouse, [dateStr]: dayData };
    setDailyWarehouse(updatedWarehouse);
    localStorage.setItem('coffee_daily_warehouse', JSON.stringify(updatedWarehouse));

    try {
      const checkRes = await axios.get(`https://qlbnuoc.onrender.com/soLieu?id=${dateStr}`);
      if (checkRes.data && checkRes.data.length > 0) {
        const dbId = checkRes.data[0].id;
        await axios.put(`https://qlbnuoc.onrender.com/soLieu/${dbId}`, { id: dateStr, data: dayData });
      } else {
        await axios.post(`https://qlbnuoc.onrender.com/soLieu`, { id: dateStr, data: dayData });
      }
    } catch (error) {
      console.log("Lỗi sync server:", error);
    }
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-brand">☕ Coffee Management</div>
        <div className="navbar-menu">
          <button onClick={() => setActiveTab('pos')} className={`nav-btn ${activeTab === 'pos' ? 'active' : ''}`}>
            ⚡ Bán Hàng (POS)
          </button>
          <button onClick={() => setActiveTab('inventory')} className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}>
            📦 Quản Lý Kho
          </button>
          <button onClick={() => setActiveTab('restock')} className={`nav-btn ${activeTab === 'restock' ? 'active' : ''}`}>
            📈 Gợi Ý Nhập Hàng
          </button>
          <button onClick={() => setActiveTab('recipe')} className={`nav-btn ${activeTab === 'recipe' ? 'active' : ''}`}>
            🍹 Công Thức Món
          </button>
        </div>
      </nav>

      <div className="main-content" style={{ padding: '20px' }}>
        {activeTab === 'pos' && (
          <POS 
            recipes={recipes} 
            ingredients={ingredients} 
            setIngredients={setIngredients}
            dailyWarehouse={dailyWarehouse}
            saveDailyWarehouseToServer={saveDailyWarehouseToServer}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}

        {activeTab === 'inventory' && (
          <QLNguyenLieu 
            ingredients={ingredients} 
            setIngredients={setIngredients}
            dailyWarehouse={dailyWarehouse}
            saveDailyWarehouseToServer={saveDailyWarehouseToServer}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}

        {activeTab === 'restock' && (
          <NhapHang 
            ingredients={ingredients} 
            dailyWarehouse={dailyWarehouse} 
          />
        )}

        {activeTab === 'recipe' && (
          <QLCongThuc ingredients={ingredients} />
        )}
      </div>
    </div>
  );
}