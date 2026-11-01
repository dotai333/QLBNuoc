import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function QLNguyenLieu({ ingredients, setIngredients, dailyWarehouse, saveDailyWarehouseToServer }) {
  // Lấy ngày hiện tại định dạng YYYY-MM-DD làm mặc định
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [newIngName, setNewIngName] = useState('');
  const [newIngBase, setNewIngBase] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editBase, setEditBase] = useState('');

  // Lấy dữ liệu kho của ngày đang chọn
  const currentDayData = dailyWarehouse[selectedDate] || {};

  // Hàm thay đổi số lượng ly bán/nhập trong ngày
  const handleAmountChange = (ingId, field, value) => {
    const currentData = currentDayData[ingId] || { startAmount: '', usedAmount: '' };
    const updatedIngData = {
      ...currentData,
      [field]: value === '' ? '' : Number(value)
    };

    const updatedDayData = {
      ...currentDayData,
      [ingId]: updatedIngData
    };

    saveDailyWarehouseToServer(selectedDate, updatedDayData);
  };

  // Thêm nguyên liệu mới vào danh sách chung
  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (!newIngName.trim()) return;

    const newObj = {
      id: Date.now().toString(),
      name: newIngName.trim(),
      baseStock: Number(newIngBase) || 0
    };

    const updated = [...ingredients, newObj];
    setIngredients(updated);
    setNewIngName('');
    setNewIngBase('');
  };

  // Xóa nguyên liệu
  const handleDeleteIngredient = (id) => {
    if (window.confirm("Mày có chắc muốn xóa nguyên liệu này không?")) {
      const updated = ingredients.filter(item => item.id !== id);
      setIngredients(updated);
    }
  };

  // Lưu chỉnh sửa cơ bản nguyên liệu
  const handleSaveEdit = (id) => {
    const updated = ingredients.map(item => {
      if (item.id === id) {
        return { ...item, baseStock: Number(editBase) || 0 };
      }
      return item;
    });
    setIngredients(updated);
    setEditingId(null);
  };

  // =========================================================
  // --- TÍNH NĂNG XUẤT BÁO CÁO KHO RA FILE EXCEL (.XLSX) ---
  // =========================================================
  const handleExportExcel = () => {
    // Chuẩn bị dữ liệu từ bảng kho ngày hiện tại
    const dataToExport = ingredients.map((item) => {
      const itemData = currentDayData[item.id] || { startAmount: 0, usedAmount: 0 };
      const start = Number(itemData.startAmount) || 0;
      const used = Number(itemData.usedAmount) || 0;
      const end = start - used;

      return {
        "Tên Nguyên Liệu": item.name,
        "Đầu Ngày": start,
        "Đã Dùng (POS)": used,
        "Cuối Ngày": end,
      };
    });

    // Tạo file excel qua thư viện xlsx
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao Cao Kho");

    // Tên file tải về theo đúng ngày chọn (VD: Bao_Cao_Kho_2026-11-01.xlsx)
    const fileName = `Bao_Cao_Kho_${selectedDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="coffee-card">
      <h2 className="card-title">📦 Quản Lý Kho Nguyên Liệu</h2>

      {/* Chọn ngày kiểm kho */}
      <div className="coffee-form">
        <label className="form-label">📅 Chọn Ngày Kiểm Kho / Chốt Ca:</label>
        <input 
          type="date" 
          className="coffee-input input-full"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Thêm nguyên liệu mới */}
      <form onSubmit={handleAddIngredient} className="coffee-form">
        <label className="form-label">➕ Thêm Nguyên Liệu Mới</label>
        <div className="form-row">
          <input 
            type="text" 
            placeholder="Tên nguyên liệu (VD: Sữa tươi)"
            className="coffee-input input-flex-2"
            value={newIngName}
            onChange={(e) => setNewIngName(e.target.value)}
          />
          <input 
            type="number" 
            placeholder="Tồn kho cơ bản"
            className="coffee-input input-flex-1"
            value={newIngBase}
            onChange={(e) => setNewIngBase(e.target.value)}
          />
          <button type="submit" className="btn-primary">Thêm</button>
        </div>
      </form>

      {/* Bảng cân đối kho ngày */}
      <h3 className="section-heading">📋 Bảng Cân Đối Kho Ngày: <span style={{ color: '#ffb74d' }}>{selectedDate}</span></h3>

      {ingredients.length === 0 ? (
        <p className="empty-text">Chưa có nguyên liệu nào trong kho.</p>
      ) : (
        <div className="table-responsive">
          <div style={{ minWidth: '600px' }}>
            {/* Header bảng */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', padding: '10px 14px', background: '#1e1816', borderRadius: '8px', fontWeight: 'bold', color: '#d7ccc8', marginBottom: '10px' }}>
              <div>Tên Nguyên Liệu</div>
              <div style={{ textAlign: 'center' }}>Đầu Ngày</div>
              <div style={{ textAlign: 'center' }}>Đã Dùng (POS)</div>
              <div style={{ textAlign: 'center' }}>Cuối Ngày</div>
              <div style={{ textAlign: 'right' }}>Thao Tác</div>
            </div>

            {/* Danh sách nguyên liệu trong bảng */}
            <div className="item-list">
              {ingredients.map((item) => {
                const itemData = currentDayData[item.id] || { startAmount: '', usedAmount: '' };
                const start = itemData.startAmount !== '' ? Number(itemData.startAmount) : 0;
                const used = itemData.usedAmount !== '' ? Number(itemData.usedAmount) : 0;
                const end = start - used;

                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'center', background: '#1e1816', border: '1px solid #382e2a', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px' }}>
                    
                    {/* Tên nguyên liệu */}
                    <div>
                      <span className="item-title-bold" style={{ margin: 0 }}>{item.name}</span>
                    </div>

                    {/* Ô nhập Đầu Ngày */}
                    <div style={{ textAlign: 'center' }}>
                      <input 
                        type="number"
                        className="coffee-input"
                        style={{ textAlign: 'center', padding: '6px' }}
                        value={itemData.startAmount !== undefined ? itemData.startAmount : ''}
                        onChange={(e) => handleAmountChange(item.id, 'startAmount', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    {/* Đã Dùng (POS) - Tự động tính từ bán hàng */}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#ff8a80' }}>
                      {used}
                    </div>

                    {/* Cuối Ngày (Đầu ngày - Đã dùng) */}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#69f0ae' }}>
                      {end}
                    </div>

                    {/* Nút thao tác xóa / sửa */}
                    <div style={{ textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {editingId === item.id ? (
                        <>
                          <button className="btn-cyan" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleSaveEdit(item.id)}>Lưu</button>
                          <button className="btn-danger" onClick={() => setEditingId(null)}>Hủy</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-info" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingId(item.id); setEditBase(item.baseStock); }}>Sửa</button>
                          <button className="btn-danger" onClick={() => handleDeleteIngredient(item.id)}>Xóa</button>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- NÚT XUẤT BÁO CÁO EXCEL ĐẶT Ở DƯỚI CÙNG BẢNG --- */}
      <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-excel" onClick={handleExportExcel}>
          📊 Gửi / Tải Báo Cáo Nguyên Liệu (Excel)
        </button>
      </div>

    </div>
  );
}