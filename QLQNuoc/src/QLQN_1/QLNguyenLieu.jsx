import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function QLNguyenLieu({ ingredients, setIngredients, dailyWarehouse, saveDailyWarehouseToServer, selectedDate, setSelectedDate }) {
  const [newIngName, setNewIngName] = useState('');
  const [newBaseStock, setNewBaseStock] = useState('');

  const getPreviousDateStr = (dateStr) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month, day);
    d.setDate(d.getDate() - 1);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  // 🌟 CƠ CHẾ KẾ THỪA TỰ ĐỘNG: Khi chọn ngày mới, tự động lấy cuối ngày hôm trước gán và LƯU THẲNG vào state ngày hiện tại
  useEffect(() => {
    if (!dailyWarehouse[selectedDate] && ingredients.length > 0) {
      const prevDateStr = getPreviousDateStr(selectedDate);
      const prevDayData = dailyWarehouse[prevDateStr];

      const autoFilledDay = {};
      ingredients.forEach(item => {
        let startVal = item.baseStock || 0;
        if (prevDayData && prevDayData[item.id]) {
          const pStart = Number(prevDayData[item.id].startAmount) || 0;
          const pUsed = Number(prevDayData[item.id].usedAmount) || 0;
          startVal = Math.max(0, pStart - pUsed);
        }
        autoFilledDay[item.id] = {
          startAmount: startVal,
          usedAmount: 0
        };
      });

      // Lưu tự động xuống state & server để ngày tiếp theo có cái mà đọc
      saveDailyWarehouseToServer(selectedDate, autoFilledDay);
    }
  }, [selectedDate, dailyWarehouse, ingredients]);

  const currentDayData = dailyWarehouse[selectedDate] || {};

  const handleUpdateDayData = (ingId, field, value) => {
    const updatedDay = {
      ...currentDayData,
      [ingId]: {
        ...(currentDayData[ingId] || { startAmount: 0, usedAmount: 0 }),
        [field]: Number(value) || 0
      }
    };
    saveDailyWarehouseToServer(selectedDate, updatedDay);
  };

  const handleSaveKho = () => {
    saveDailyWarehouseToServer(selectedDate, currentDayData);
    alert(`Đã lưu kho ngày ${selectedDate} thành công!`);
  };

  const handleExportExcel = () => {
    const dataToExport = ingredients.map(item => {
      const dayData = currentDayData[item.id] || {};
      const start = Number(dayData.startAmount) || 0;
      const used = Number(dayData.usedAmount) || 0;
      const end = start - used;

      return {
        "Tên Nguyên Liệu": item.name,
        "Đầu Ngày": start,
        "Đã Dùng (POS)": used,
        "Cuối Ngày": end
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Kho_${selectedDate}`);
    XLSX.writeFile(workbook, `Quan_Ly_Kho_${selectedDate}.xlsx`);
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!newIngName.trim()) return;

    const newItem = {
      name: newIngName.trim(),
      baseStock: Number(newBaseStock) || 0
    };

    try {
      const res = await axios.post("https://qlbnuoc.onrender.com/nguyenLieu", newItem);
      setIngredients(prev => [...prev, res.data]);
      setNewIngName('');
      setNewBaseStock('');
      alert("Thêm nguyên liệu thành công!");
    } catch (err) {
      console.log("Lỗi thêm nguyên liệu:", err);
      alert("Lỗi khi thêm nguyên liệu!");
    }
  };

  const handleDeleteDayData = async () => {
    if (window.confirm(`Mày có chắc muốn xóa sạch toàn bộ dữ liệu kho của ngày ${selectedDate} không?`)) {
      saveDailyWarehouseToServer(selectedDate, {});

      try {
        const checkRes = await axios.get(`https://qlbnuoc.onrender.com/soLieu?id=${selectedDate}`);
        if (checkRes.data && checkRes.data.length > 0) {
          const dbId = checkRes.data[0].id;
          await axios.delete(`https://qlbnuoc.onrender.com/soLieu/${dbId}`);
        }
      } catch (error) {
        console.log("Lỗi xóa dữ liệu ngày trên server:", error);
      }

      alert(`Đã xóa sạch dữ liệu ngày ${selectedDate}!`);
    }
  };

  return (
    <div className="coffee-card">
      <h2 className="card-title">📦 Quản Lý Kho Nguyên Liệu</h2>

      {/* Phần chọn ngày, nút Lưu và Xuất Excel */}
      <div className="coffee-form" style={{ background: '#221915', padding: '15px', borderRadius: '10px', border: '1px solid #4a3a31', marginBottom: '20px' }}>
        <label className="form-label" style={{ color: '#e6ccb2', marginBottom: '8px', display: 'block' }}>📅 Chọn Ngày Kiểm Kho / Chốt Ca:</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="date" 
            className="coffee-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleSaveKho} style={{ whiteSpace: 'nowrap' }}>
            💾 Lưu / Cập Nhật Kho
          </button>
          <button className="btn-excel" onClick={handleExportExcel} style={{ whiteSpace: 'nowrap' }}>
            📥 Xuất Excel
          </button>
        </div>
      </div>

      {/* Form thêm nguyên liệu mới */}
      <div className="coffee-form" style={{ background: '#221915', padding: '15px', borderRadius: '10px', border: '1px solid #4a3a31', marginBottom: '20px' }}>
        <h3 style={{ color: '#ffb703', fontSize: '15px', marginBottom: '10px' }}>➕ Thêm Nguyên Liệu Mới</h3>
        <form onSubmit={handleAddIngredient} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Tên nguyên liệu (VD: Sữa tươi)" 
            className="coffee-input"
            value={newIngName}
            onChange={(e) => setNewIngName(e.target.value)}
            style={{ flex: 2 }}
          />
          <input 
            type="number" 
            placeholder="Tồn kho cơ bản" 
            className="coffee-input"
            value={newBaseStock}
            onChange={(e) => setNewBaseStock(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Thêm</button>
        </form>
      </div>

      {/* Tiêu đề bảng và nút xóa toàn bộ ngày */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 className="section-heading" style={{ color: '#ffb703', margin: 0 }}>
          📋 Bảng Cân Đối Kho Ngày: {selectedDate}
        </h3>
        
        <button 
          onClick={handleDeleteDayData}
          style={{ 
            background: '#9b2226', 
            color: '#fff', 
            border: 'none', 
            padding: '8px 14px', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          🗑️ Xóa Toàn Bộ Dữ Liệu Ngày Này
        </button>
      </div>

      {ingredients.length === 0 ? (
        <p className="empty-text">Chưa có nguyên liệu nào trong kho.</p>
      ) : (
        <div className="table-responsive">
          <div style={{ minWidth: '700px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1.2fr', gap: '10px', padding: '10px 14px', background: '#221915', borderRadius: '8px', fontWeight: 'bold', color: '#e6ccb2', marginBottom: '10px', border: '1px solid #4a3a31' }}>
              <div>Tên Nguyên Liệu</div>
              <div style={{ textAlign: 'center' }}>Đầu Ngày</div>
              <div style={{ textAlign: 'center' }}>Đã Dùng (POS)</div>
              <div style={{ textAlign: 'center' }}>Cuối Ngày</div>
            </div>

            <div className="item-list">
              {ingredients.map(item => {
                const dayData = currentDayData[item.id] || { startAmount: item.baseStock || 0, usedAmount: 0 };
                const start = Number(dayData.startAmount) || 0;
                const used = Number(dayData.usedAmount) || 0;
                const end = start - used;

                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1.2fr 1.2fr', gap: '10px', alignItems: 'center', background: '#221915', border: '1px solid #4a3a31', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px' }}>
                    <div style={{ color: '#f7f3ef', fontWeight: '600' }}>{item.name}</div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <input 
                        type="number"
                        className="coffee-input"
                        style={{ width: '90px', textAlign: 'center', padding: '6px' }}
                        value={start}
                        onChange={(e) => handleUpdateDayData(item.id, 'startAmount', e.target.value)}
                      />
                    </div>

                    <div style={{ textAlign: 'center', color: '#ffb703', fontWeight: 'bold' }}>
                      {used}
                    </div>

                    <div style={{ textAlign: 'center', fontWeight: 'bold', color: end < 0 ? '#ff4d4d' : '#52b788', fontSize: '15px' }}>
                      {end}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}