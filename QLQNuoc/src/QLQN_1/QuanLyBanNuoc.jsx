import React, { useState, useEffect } from 'react';
import axios from 'axios';
import POS from './POS';
import QLCongThuc from './QLCongThuc';
import QLNguyenLieu from './QLNguyenLieu';
import '../App.css';

export default function QuanLyQuanNuoc() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [dailyWarehouse, setDailyWarehouse] = useState({});
  const [activeTab, setActiveTab] = useState('pos');

  // Load tất cả dữ liệu từ Render server (bao gồm cả soLieu)
  useEffect(() => {
    axios.get("https://qlbnuoc.onrender.com/congThuc")
      .then(res => setRecipes(res.data))
      .catch(err => console.log("Lỗi tải công thức:", err));

    axios.get("https://qlbnuoc.onrender.com/nguyenLieu")
      .then(res => setIngredients(res.data))
      .catch(err => console.log("Lỗi tải nguyên liệu:", err));

    axios.get("https://qlbnuoc.onrender.com/soLieu")
      .then(res => {
        // Chuyển mảng soLieu từ db.json thành object dailyWarehouse để React dễ dùng
        const warehouseObj = {};
        res.data.forEach(item => {
          warehouseObj[item.id] = item.data;
        });
        setDailyWarehouse(warehouseObj);
      })
      .catch(err => console.log("Lỗi tải số liệu kho:", err));
  }, []);

  // Hàm lưu dữ liệu ngày xuống Render server an toàn, tránh lỗi 404
  const saveDailyWarehouseToServer = async (dateStr, dayData) => {
    const updatedWarehouse = { ...dailyWarehouse, [dateStr]: dayData };
    setDailyWarehouse(updatedWarehouse);

    try {
      // 1. Kiểm tra xem ngày này đã tồn tại trên Render server chưa
      const checkRes = await axios.get(`https://qlbnuoc.onrender.com/soLieu?id=${dateStr}`);

      if (checkRes.data && checkRes.data.length > 0) {
        // Nếu đã có -> Dùng PUT cập nhật đúng bản ghi
        const dbId = checkRes.data[0].id;
        await axios.put(`https://qlbnuoc.onrender.com/soLieu/${dbId}`, { id: dateStr, data: dayData });
      } else {
        // Nếu chưa có -> Dùng POST tạo mới bản ghi cho ngày đó
        await axios.post(`https://qlbnuoc.onrender.com/soLieu`, { id: dateStr, data: dayData });
      }
    } catch (error) {
      console.log("Lỗi đồng bộ soLieu lên Render:", error);
    }
  };

  const updateIngredientsOnServer = async (newIngredients) => {
    setIngredients(newIngredients);
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
            setIngredients={updateIngredientsOnServer}
            dailyWarehouse={dailyWarehouse}
            saveDailyWarehouseToServer={saveDailyWarehouseToServer}
          />
        )}

        {activeTab === 'inventory' && (
          <QLNguyenLieu 
            ingredients={ingredients} 
            setIngredients={updateIngredientsOnServer}
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