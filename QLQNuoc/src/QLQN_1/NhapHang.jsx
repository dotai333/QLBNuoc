import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function NhapHang({ ingredients, dailyWarehouse, selectedDate }) {
  // Quản lý lịch sử các phiên đã chốt
  const [restockHistory, setRestockHistory] = useState(() => {
    const saved = localStorage.getItem('coffee_restock_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Mốc ngày bắt đầu chu kỳ (mặc định là ngày đầu tiên hoặc ngày được lưu)
  const [cycleStartDate, setCycleStartDate] = useState(() => {
    return localStorage.getItem('coffee_cycle_start_date') || '2026-11-05';
  });

  const [selectedHistoryId, setSelectedHistoryId] = useState('');

  // 🌟 Tính tổng tiêu thụ từ `cycleStartDate` đến `selectedDate` (ngày đang chọn trên kho/POS)
  const getCurrentCycleData = () => {
    const consumptionPerIng = {};

    Object.entries(dailyWarehouse).forEach(([dateStr, dayData]) => {
      // Chỉ lấy dữ liệu nằm trong khoảng từ ngày bắt đầu chu kỳ đến ngày đang chọn
      if (dateStr >= cycleStartDate && dateStr <= selectedDate) {
        Object.entries(dayData || {}).forEach(([ingId, data]) => {
          const used = Number(data.usedAmount) || 0;
          consumptionPerIng[ingId] = (consumptionPerIng[ingId] || 0) + used;
        });
      }
    });

    return ingredients.map(item => {
      const totalUsedInCycle = consumptionPerIng[item.id] || 0;
      const projectedNeed = Math.ceil(totalUsedInCycle * 1.1); // Dự trù tăng 10%
      const currentStock = Number(item.baseStock) || 0;
      const suggestedBuy = Math.max(0, projectedNeed - currentStock);

      return {
        id: item.id,
        name: item.name,
        totalUsedLastWeek: totalUsedInCycle,
        projectedNeed,
        currentStock,
        suggestedBuy
      };
    });
  };

  const currentActiveData = selectedHistoryId 
    ? (restockHistory.find(h => h.id === selectedHistoryId)?.items || [])
    : getCurrentCycleData();

  const activeTitle = selectedHistoryId 
    ? `Lịch Sử Gợi Ý Kỳ: ${restockHistory.find(h => h.id === selectedHistoryId)?.title || ''}`
    : `Gợi Ý Nhập Hàng (Chu kỳ từ ${cycleStartDate} đến ${selectedDate})`;

  // 🌟 Hàm chốt kỳ: Lưu lại, đồng thời dời mốc bắt đầu chu kỳ mới bằng đúng ngày đang chọn (`selectedDate`)
  const handleSaveRestockSession = () => {
    const newSessionId = Date.now().toString();

    const newSession = {
      id: newSessionId,
      title: `${cycleStartDate} đến ${selectedDate}`,
      items: getCurrentCycleData()
    };

    const updatedHistory = [newSession, ...restockHistory];
    setRestockHistory(updatedHistory);
    localStorage.setItem('coffee_restock_history', JSON.stringify(updatedHistory));

    // Đặt mốc chu kỳ mới bắt đầu từ ngày hiện tại đang chọn
    setCycleStartDate(selectedDate);
    localStorage.setItem('coffee_cycle_start_date', selectedDate);

    setSelectedHistoryId('');
    alert(`Đã chốt kỳ từ ${cycleStartDate} đến ${selectedDate} thành công! Bảng gợi ý đã reset về 0.`);
  };

  // Xóa phiên lịch sử
  const handleDeleteHistory = (id) => {
    if (window.confirm("Mày có chắc muốn xóa phiên lịch sử này không?")) {
      const updatedHistory = restockHistory.filter(h => h.id !== id);
      setRestockHistory(updatedHistory);
      localStorage.setItem('coffee_restock_history', JSON.stringify(updatedHistory));
      
      if (selectedHistoryId === id) {
        setSelectedHistoryId('');
      }
    }
  };

  const handleExportRestockExcel = () => {
    const dataToExport = currentActiveData.map(item => ({
      "Tên Nguyên Liệu": item.name,
      "Tiêu Thụ Trong Kỳ": item.totalUsedLastWeek,
      "Dự Kiến Tuần Tới (+10%)": item.projectedNeed,
      "Tồn Kho Hiện Tại": item.currentStock,
      "Cần Nhập Thêm": item.suggestedBuy
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Goi Y Nhap Hang");
    XLSX.writeFile(workbook, `Goi_Y_Nhap_Hang_${selectedHistoryId ? 'Cu' : 'Chu_Ky_Moi'}.xlsx`);
  };

  return (
    <div className="coffee-card">
      <h2 className="card-title">📦 Quản Lý Gợi Ý Nhập Hàng & Lịch Sử Chu Kỳ</h2>

      <div className="coffee-form" style={{ background: '#221915', padding: '15px', borderRadius: '10px', border: '1px solid #4a3a31', marginBottom: '20px' }}>
        <label className="form-label" style={{ color: '#e6ccb2', marginBottom: '8px', display: 'block' }}>📂 Chọn Xem Lịch Sử Các Kỳ Đã Chốt:</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            className="coffee-input"
            style={{ flex: 1 }}
            value={selectedHistoryId}
            onChange={(e) => setSelectedHistoryId(e.target.value)}
          >
            <option value="">⚡ Đang xem: Chu kỳ hiện tại (Từ {cycleStartDate} đến {selectedDate})</option>
            {restockHistory.map(hist => (
              <option key={hist.id} value={hist.id}>
                📦 Kỳ: {hist.title}
              </option>
            ))}
          </select>

          <button 
            className="btn-primary" 
            onClick={handleSaveRestockSession}
            style={{ whiteSpace: 'nowrap' }}
          >
            💾 Chốt Kỳ & Làm Mới Bảng Về 0
          </button>
        </div>

        {restockHistory.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#b0a494' }}>Danh sách các kỳ đã chốt (Bấm để xem hoặc xóa):</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {restockHistory.map(hist => (
                <div 
                  key={hist.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: selectedHistoryId === hist.id ? '#4a3a31' : '#1a120e', 
                    border: '1px solid #4a3a31', 
                    padding: '6px 10px', 
                    borderRadius: '6px', 
                    gap: '8px' 
                  }}
                >
                  <span 
                    style={{ color: '#f7f3ef', cursor: 'pointer', fontSize: '13px', fontWeight: selectedHistoryId === hist.id ? 'bold' : 'normal' }}
                    onClick={() => setSelectedHistoryId(hist.id)}
                  >
                    📦 Kỳ: {hist.title}
                  </span>
                  <button 
                    className="btn-danger" 
                    style={{ padding: '2px 6px', fontSize: '11px', background: '#9b2226', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }} 
                    onClick={() => handleDeleteHistory(hist.id)}
                    title="Xóa phiên này"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <h3 className="section-heading" style={{ color: '#ffb703' }}>{activeTitle}</h3>
      <p style={{ color: '#b0a494', fontSize: '13px', marginBottom: '15px' }}>
        {selectedHistoryId ? 'Đang xem lại bản tổng kết lịch sử của kỳ trước.' : `Đang tính tổng tiêu thụ từ ngày bắt đầu chu kỳ (${cycleStartDate}) đến ngày hiện tại (${selectedDate}). Khi bấm chốt, dữ liệu lưu vào lịch sử và bảng reset về 0.`}
      </p>

      {ingredients.length === 0 ? (
        <p className="empty-text">Chưa có nguyên liệu nào trong kho.</p>
      ) : (
        <div className="table-responsive">
          <div style={{ minWidth: '600px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', padding: '10px 14px', background: '#221915', borderRadius: '8px', fontWeight: 'bold', color: '#e6ccb2', marginBottom: '10px', border: '1px solid #4a3a31' }}>
              <div>Tên Nguyên Liệu</div>
              <div style={{ textAlign: 'center' }}>Tiêu Thụ (Trong Kỳ)</div>
              <div style={{ textAlign: 'center' }}>Dự Kiến Tuần Tới</div>
              <div style={{ textAlign: 'center' }}>Tồn Kho</div>
              <div style={{ textAlign: 'center', color: '#ffb703' }}>Gợi Ý Cần Nhập</div>
            </div>

            <div className="item-list">
              {currentActiveData.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'center', background: '#221915', border: '1px solid #4a3a31', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px' }}>
                  <div style={{ color: '#f7f3ef', fontWeight: '600' }}>{item.name}</div>
                  <div style={{ textAlign: 'center', color: '#d7ccc8' }}>{item.totalUsedLastWeek}</div>
                  <div style={{ textAlign: 'center', color: '#52b788', fontWeight: 'bold' }}>{item.projectedNeed}</div>
                  <div style={{ textAlign: 'center', color: '#d7ccc8' }}>{item.currentStock}</div>
                  <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#ffb703', fontSize: '16px' }}>{item.suggestedBuy}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
        <button className="btn-excel" onClick={handleExportRestockExcel}>
          📥 Tải File Bảng Này (Excel)
        </button>
      </div>
    </div>
  );
}