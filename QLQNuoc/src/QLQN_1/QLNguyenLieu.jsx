import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function QLNguyenLieu({ ingredients, setIngredients, dailyWarehouse, saveDailyWarehouseToServer }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [newIngName, setNewIngName] = useState('');
  const [newIngBase, setNewIngBase] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editBase, setEditBase] = useState('');

  // Hàm tính ngày hôm trước
  const getPreviousDateStr = (dateStr) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  // 🌟 Tự động lấy số liệu kho ngày hiện tại hoặc kế thừa "Cuối ngày" hôm trước làm "Đầu ngày" hôm nay
  let currentDayData = dailyWarehouse[selectedDate];
  if (!currentDayData) {
    const prevDateStr = getPreviousDateStr(selectedDate);
    const prevDayData = dailyWarehouse[prevDateStr];
    
    currentDayData = {};
    if (prevDayData) {
      ingredients.forEach(item => {
        const prevItemData = prevDayData[item.id] || { startAmount: 0, usedAmount: 0 };
        const prevStart = Number(prevItemData.startAmount) || 0;
        const prevUsed = Number(prevItemData.usedAmount) || 0;
        const prevEnd = prevStart - prevUsed;

        currentDayData[item.id] = {
          startAmount: prevEnd,
          usedAmount: ''
        };
      });
    }
  }

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

  const handleSaveWarehouseManual = async () => {
    await saveDailyWarehouseToServer(selectedDate, currentDayData);
    alert(`Đã lưu số liệu kho ngày ${selectedDate} thành công!`);
  };

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

  const handleDeleteIngredient = (id) => {
    if (window.confirm("Mày có chắc muốn xóa nguyên liệu này không?")) {
      const updated = ingredients.filter(item => item.id !== id);
      setIngredients(updated);
    }
  };

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

  const handleMoveItem = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= ingredients.length) return;

    const updated = [...ingredients];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    setIngredients(updated);
  };

  const handleExportExcel = () => {
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

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao Cao Kho");
    XLSX.writeFile(workbook, `Bao_Cao_Kho_${selectedDate}.xlsx`);
  };

  return (
    <div className="coffee-card">
      <h2 className="card-title">📦 Quản Lý Kho Nguyên Liệu</h2>

      <div className="coffee-form">
        <label className="form-label">📅 Chọn Ngày Kiểm Kho / Chốt Ca:</label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="date" 
            className="coffee-input"
            style={{ flex: 1 }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button className="btn-primary" onClick={handleSaveWarehouseManual} style={{ whiteSpace: 'nowrap' }}>
            💾 Lưu / Cập Nhật Kho
          </button>
        </div>
      </div>

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

      <h3 className="section-heading">📋 Bảng Cân Đối Kho Ngày: <span style={{ color: '#e6ccb2' }}>{selectedDate}</span></h3>

      {ingredients.length === 0 ? (
        <p className="empty-text">Chưa có nguyên liệu nào trong kho.</p>
      ) : (
        <div className="table-responsive">
          <div style={{ minWidth: '600px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', padding: '10px 14px', background: '#221915', borderRadius: '8px', fontWeight: 'bold', color: '#e6ccb2', marginBottom: '10px', border: '1px solid #4a3a31' }}>
              <div>Tên Nguyên Liệu</div>
              <div style={{ textAlign: 'center' }}>Đầu Ngày</div>
              <div style={{ textAlign: 'center' }}>Đã Dùng (POS)</div>
              <div style={{ textAlign: 'center' }}>Cuối Ngày</div>
              <div style={{ textAlign: 'right' }}>Thao Tác</div>
            </div>

            <div className="item-list">
              {ingredients.map((item, index) => {
                const itemData = currentDayData[item.id] || { startAmount: '', usedAmount: '' };
                const start = itemData.startAmount !== '' ? Number(itemData.startAmount) : 0;
                const used = itemData.usedAmount !== '' ? Number(itemData.usedAmount) : 0;
                const end = start - used;

                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'center', background: '#221915', border: '1px solid #4a3a31', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px' }}>
                    
                    <div>
                      <span className="item-title-bold" style={{ margin: 0, color: '#f7f3ef' }}>{item.name}</span>
                    </div>

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

                    <div style={{ textAlign: 'center' }}>
                      <input 
                        type="number"
                        className="coffee-input"
                        style={{ textAlign: 'center', padding: '6px' }}
                        value={itemData.usedAmount !== undefined ? itemData.usedAmount : ''}
                        onChange={(e) => handleAmountChange(item.id, 'usedAmount', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#52b788' }}>
                      {end}
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button className="btn-cyan" style={{ padding: '4px 6px', fontSize: '11px' }} onClick={() => handleMoveItem(index, 'up')} title="Đưa lên trên">⬆</button>
                      <button className="btn-cyan" style={{ padding: '4px 6px', fontSize: '11px' }} onClick={() => handleMoveItem(index, 'down')} title="Đưa xuống dưới">⬇</button>

                      {editingId === item.id ? (
                        <>
                          <button className="btn-cyan" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleSaveEdit(item.id)}>Lưu</button>
                          <button className="btn-danger" onClick={() => setEditingId(null)}>Hủy</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-cyan" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingId(item.id); setEditBase(item.baseStock); }}>Sửa</button>
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

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
        <button className="btn-excel" onClick={handleExportExcel}>
          📊 Gửi / Tải Báo Cáo Nguyên Liệu (Excel)
        </button>
      </div>

    </div>
  );
}