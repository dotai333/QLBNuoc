import React, { useState, useEffect } from 'react';
import axios from 'axios';
import POS from './POS';
import QLCongThuc from './QLCongThuc';
import QLNguyenLieu from './QLNguyenLieu';
import '../App.css';
import * as XLSX from 'xlsx';

export default function QuanLyQuanNuoc() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  
  // 🌟 Khởi tạo dailyWarehouse ưu tiên lấy từ localStorage trên máy trước để không bao giờ bị mất khi F5
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

  // Load dữ liệu từ Render server khi mở web
  useEffect(() => {
    axios.get("https://qlbnuoc.onrender.com/congThuc")
      .then(res => setRecipes(res.data))
      .catch(err => console.log("Lỗi tải công thức:", err));

    axios.get("https://qlbnuoc.onrender.com/nguyenLieu")
      .then(res => setIngredients(res.data))
      .catch(err => console.log("Lỗi tải nguyên liệu:", err));

    // Lấy thêm số liệu kho từ server (nếu có) và gộp vào
    axios.get("https://qlbnuoc.onrender.com/soLieu")
      .then(res => {
        if (res.data && res.data.length > 0) {
          const warehouseObj = {};
          res.data.forEach(item => {
            warehouseObj[item.id] = item.data;
          });
          // Gộp dữ liệu từ server với localStorage
          setDailyWarehouse(prev => {
            const merged = { ...warehouseObj, ...prev };
            localStorage.setItem('coffee_daily_warehouse', JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(err => console.log("Lỗi tải số liệu kho từ server:", err));
  }, []);

  // 🌟 Hàm lưu dữ liệu kho: Lưu ngay vào LocalStorage và đồng thời đẩy ngầm lên Render server
  const saveDailyWarehouseToServer = async (dateStr, dayData) => {
    const updatedWarehouse = { ...dailyWarehouse, [dateStr]: dayData };
    setDailyWarehouse(updatedWarehouse);
    
    // Lưu ngay vào LocalStorage của trình duyệt (Đảm bảo F5 không bao giờ mất)
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
      console.log("Lưu server Render chạy ngầm (không ảnh hưởng dữ liệu local):", error);
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
          />
        )}

        {activeTab === 'inventory' && (
          <QLNguyenLieu 
            ingredients={ingredients} 
            setIngredients={setIngredients}
            dailyWarehouse={dailyWarehouse}
            saveDailyWarehouseToServer={saveDailyWarehouseToServer}
          />
        )}

        {activeTab === 'recipe' && (
          <QLCongThuc ingredients={ingredients} />
        )}
      </div>
    </div>
  );
}