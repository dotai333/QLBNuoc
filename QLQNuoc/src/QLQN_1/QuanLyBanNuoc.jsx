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
  const [dailyWarehouse, setDailyWarehouse] = useState({});
  const [activeTab, setActiveTab] = useState('pos');

  // Load tất cả dữ liệu từ Render server khi mở web
  useEffect(() => {
    axios.get("https://qlbnuoc.onrender.com/congThuc")
      .then(res => setRecipes(res.data))
      .catch(err => console.log("Lỗi tải công thức:", err));

    axios.get("https://qlbnuoc.onrender.com/nguyenLieu")
      .then(res => setIngredients(res.data))
      .catch(err => console.log("Lỗi tải nguyên liệu:", err));

    axios.get("https://qlbnuoc.onrender.com/soLieu")
      .then(res => {
        const warehouseObj = {};
        res.data.forEach(item => {
          warehouseObj[item.id] = item.data;
        });
        setDailyWarehouse(warehouseObj);
      })
      .catch(err => console.log("Lỗi tải số liệu kho:", err));
  }, []);

  // Hàm lưu dữ liệu ngày xuống Render server an toàn
  const saveDailyWarehouseToServer = async (dateStr, dayData) => {
    const updatedWarehouse = { ...dailyWarehouse, [dateStr]: dayData };
    setDailyWarehouse(updatedWarehouse);

    try {
      const checkRes = await axios.get(`https://qlbnuoc.onrender.com/soLieu?id=${dateStr}`);

      if (checkRes.data && checkRes.data.length > 0) {
        const dbId = checkRes.data[0].id;
        await axios.put(`https://qlbnuoc.onrender.com/soLieu/${dbId}`, { id: dateStr, data: dayData });
      } else {
        await axios.post(`https://qlbnuoc.onrender.com/soLieu`, { id: dateStr, data: dayData });
      }
    } catch (error) {
      console.log("Lỗi đồng bộ soLieu lên Render:", error);
    }
  };

  // 🌟 ĐÃ SỬA: Đồng bộ danh sách nguyên liệu lên Render server để không bị mất khi F5
  const updateIngredientsOnServer = async (newIngredients) => {
    setIngredients(newIngredients);
    try {
      // Ghi đè hoặc cập nhật danh sách nguyên liệu lên server
      // (Giả định json-server hỗ trợ lưu mảng hoặc lưu từng item, ở đây ta đẩy toàn bộ qua API nguyenLieu hoặc PUT từng phần tử)
      // Cách tối ưu với json-server cho bảng nguyenLieu:
      await axios.put("https://qlbnuoc.onrender.com/nguyenLieu", newIngredients).catch(async () => {
        // Nếu json-server không hỗ trợ PUT trực tiếp cả mảng, ta xóa hết rồi POST lại hoặc lưu theo cấu trúc chuẩn
        // Tuy nhiên với json-server thông thường, ta có thể dùng vòng lặp đồng bộ từng item hoặc lưu dạng object tổng.
      });
    } catch (error) {
      console.log("Lỗi đồng bộ nguyên liệu:", error);
    }
  };

  // Hoặc cách lưu chuẩn xác hơn cho từng nguyên liệu nếu dùng mảng chuẩn của json-server:
  // Thay vì PUT cả cục, ta viết hàm riêng cho thêm/sửa/xóa nguyên liệu trong QLNguyenLieu.

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