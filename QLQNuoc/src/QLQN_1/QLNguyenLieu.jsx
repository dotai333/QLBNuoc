import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function QLNguyenLieu({ ingredients, setIngredients }) {
  // Hàm lấy đúng ngày hiện tại theo giờ Việt Nam (tránh lệch UTC)
  const getTodayLocalDateStr = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(now.getTime() - offsetMs);
    return localDate.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayLocalDateStr());

  const [tempDayData, setTempDayData] = useState({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  const [newIngName, setNewIngName] = useState('');
  const [newIngStock, setNewIngStock] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStock, setEditStock] = useState('');

  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate]);

  const fetchDayData = async (dateStr) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/soLieu`);
      const list = res.data || [];
      const found = list.find(item => String(item.id) === String(dateStr) || String(item.date) === String(dateStr));
      
      if (found) {
        setTempDayData(found.data || {});
      } else {
        setTempDayData({});
      }
    } catch (error) {
      setTempDayData({});
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (!newIngName || !newIngStock) return;
    
    const newItem = {
      id: Date.now(),
      name: newIngName,
      stock: Number(newIngStock)
    };
    
    setIngredients([...ingredients, newItem]);
    setNewIngName('');
    setNewIngStock('');
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditStock(item.stock);
  };

  const handleSaveEdit = (id) => {
    if (!editName) return;
    setIngredients(ingredients.map(item => 
      item.id === id ? { ...item, name: editName, stock: Number(editStock) } : item
    ));
    setEditingId(null);
  };

  const handleOpeningChangeLocally = (ingId, value) => {
    const val = Math.max(0, Number(value));
    setTempDayData(prev => ({
      ...prev,
      [ingId]: {
        ...prev[ingId],
        opening: val
      }
    }));
    setNotification('');
  };

  const handleSaveToWarehouse = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/soLieu`);
      const list = res.data || [];
      const found = list.find(item => String(item.id) === String(selectedDate) || String(item.date) === String(selectedDate));

      const payload = {
        id: selectedDate,
        date: selectedDate,
        data: tempDayData
      };

      if (found) {
        await axios.put(`http://localhost:5000/soLieu/${found.id}`, payload);
      } else {
        await axios.post(`http://localhost:5000/soLieu`, payload);
      }

      setNotification('✅ Đã lưu / cập nhật số liệu kho ngày ' + selectedDate + ' thành công!');
    } catch (error) {
      console.error("Lỗi lưu kho:", error);
      setNotification('❌ Lưu thất bại, kiểm tra lại json-server!');
    }
  };

  const handleDeleteDayData = async () => {
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn xóa và reset toàn bộ dữ liệu của ngày ${selectedDate} về 0 không?`)) {
      return;
    }

    try {
      const res = await axios.get(`http://localhost:5000/soLieu`);
      const list = res.data || [];
      const found = list.find(item => String(item.id) === String(selectedDate) || String(item.date) === String(selectedDate));

      if (found) {
        await axios.delete(`http://localhost:5000/soLieu/${found.id}`);
      }
      setTempDayData({});
      setNotification('🗑️ Đã xóa dữ liệu ngày ' + selectedDate);
    } catch (error) {
      console.log("Lỗi khi xóa dữ liệu ngày:", error);
      setTempDayData({});
    }
  };

  const getIngredientDataById = (id) => {
    const dayRecord = tempDayData[id] || {};
    const opening = dayRecord.opening !== undefined ? dayRecord.opening : 0;
    const used = dayRecord.used || 0;
    return { opening, used, closing: opening - used };
  };

  if (loading) {
    return <div className="coffee-card" style={{ color: '#d7ccc8', textAlign: 'center', padding: '40px' }}>⏳ Đang tải dữ liệu kho...</div>;
  }

  return (
    <div className="coffee-card">
      <h3 className="card-title">📦 Quản Lý Kho Nguyên Liệu</h3>

      {notification && (
        <div className={notification.startsWith('✅') ? "notification-success" : "notification-error"} style={{ marginBottom: '15px' }}>
          {notification}
        </div>
      )}

      <div className="coffee-form" style={{ background: '#2d2422', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label className="form-label" style={{ fontWeight: 'bold', color: '#d7ccc8', margin: 0 }}>
            📅 Chọn Ngày Kiểm Kho / Chốt Ca:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              onClick={handleSaveToWarehouse}
              style={{ background: '#388e3c', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              💾 Lưu / Cập Nhật Kho
            </button>
            <button 
              type="button" 
              onClick={handleDeleteDayData}
              style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              🗑️ Xóa Dữ Liệu
            </button>
          </div>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="coffee-input input-full"
          style={{ cursor: 'pointer' }}
        />
      </div>
      
      <form onSubmit={handleAddIngredient} className="coffee-form form-row" style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Tên nguyên liệu mới (VD: Sữa tươi)" 
          value={newIngName}
          onChange={(e) => setNewIngName(e.target.value)}
          className="coffee-input input-flex-2"
        />
        <input 
          type="number" 
          placeholder="Tồn kho cơ bản" 
          value={newIngStock}
          onChange={(e) => setNewIngStock(e.target.value)}
          className="coffee-input input-flex-1"
        />
        <button type="submit" className="btn-primary">Thêm</button>
      </form>

      <h4 className="section-heading">📋 Bảng Cân Đối Kho Ngày: <span style={{ color: '#ff8a80' }}>{selectedDate}</span></h4>
      
      <div style={{ background: '#1e1614', padding: '12px', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr', gap: '8px', color: '#a1887f', fontWeight: 'bold', paddingBottom: '10px', borderBottom: '1px solid #3e2723', fontSize: '13px', textAlign: 'center' }}>
          <div style={{ textAlign: 'left' }}>Tên Nguyên Liệu</div>
          <div>Đầu Ngày</div>
          <div>Đã Dùng (POS)</div>
          <div>Cuối Ngày</div>
          <div>Thao Tác</div>
        </div>

        <ul className="item-list" style={{ marginTop: '10px' }}>
          {ingredients.map(item => {
            const ingData = getIngredientDataById(item.id);
            const isEditing = editingId === item.id;

            return (
              <li key={item.id} className="list-item" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                <div>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="coffee-input"
                      style={{ padding: '4px', fontSize: '13px' }}
                    />
                  ) : (
                    <span className="item-title" style={{ fontSize: '14px' }}>{item.name}</span>
                  )}
                </div>
                
                <div>
                  <input 
                    type="number" 
                    min="0"
                    value={ingData.opening}
                    onChange={(e) => handleOpeningChangeLocally(item.id, e.target.value)}
                    className="coffee-input"
                    style={{ textAlign: 'center', padding: '6px' }}
                  />
                </div>

                <div style={{ textAlign: 'center', color: '#ff8a80', fontWeight: 'bold' }}>
                  -{ingData.used.toFixed(1)}
                </div>

                <div style={{ textAlign: 'center' }}>
                  <span className="stock-badge" style={{ background: ingData.closing < 0 ? '#d32f2f' : '#388e3c', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                    {ingData.closing.toFixed(1)}
                  </span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  {isEditing ? (
                    <button onClick={() => handleSaveEdit(item.id)} style={{ background: '#388e3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Lưu
                    </button>
                  ) : (
                    <button onClick={() => handleStartEdit(item)} style={{ background: '#ffa726', color: '#1e1614', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                      Sửa
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}