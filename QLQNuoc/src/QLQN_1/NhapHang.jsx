import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function NhapHang({ ingredients, dailyWarehouse }) {
  // Quản lý danh sách các lịch sử gợi ý nhập hàng đã lưu
  const [restockHistory, setRestockHistory] = useState(() => {
    const saved = localStorage.getItem('coffee_restock_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Trạng thái chọn lịch sử cũ để xem (nếu rỗng thì xem bảng tính toán hiện tại dựa trên 7 ngày gần nhất)
  const [selectedHistoryId, setSelectedHistoryId] = useState('');

  // Hàm tính toán gợi ý nhập hàng tuần tới dựa trên 7 ngày gần nhất (bảng hiện tại)
  const getWeeklyRestockData = () => {
    const today = new Date();
    const past7DaysKeys = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      past7DaysKeys.push(d.toISOString().split('T')[0]);
    }

    const consumptionPerIng = {};
    past7DaysKeys.forEach(dateStr => {
      const dayData = dailyWarehouse[dateStr] || {};
      Object.entries(dayData).forEach(([ingId, data]) => {
        const used = Number(data.usedAmount) || 0;
        consumptionPerIng[ingId] = (consumptionPerIng[ingId] || 0) + used;
      });
    });

    return ingredients.map(item => {
      const totalUsedLastWeek = consumptionPerIng[item.id] || 0;
      const projectedNeed = Math.ceil(totalUsedLastWeek * 1.1); // Dự trù tăng 10%
      const currentStock = Number(item.baseStock) || 0;
      const suggestedBuy = Math.max(0, projectedNeed - currentStock);

      return {
        id: item.id,
        name: item.name,
        totalUsedLastWeek,
        projectedNeed,
        currentStock,
        suggestedBuy
      };
    });
  };

  // Xác định dữ liệu đang hiển thị: Nếu đang chọn xem lịch sử cũ thì lấy từ lịch sử, không thì tính mới
  const currentActiveData = selectedHistoryId 
    ? (restockHistory.find(h => h.id === selectedHistoryId)?.items || [])
    : getWeeklyRestockData();

  const activeTitle = selectedHistoryId 
    ? `Lịch Sử Gợi Ý Ngày: ${restockHistory.find(h => h.id === selectedHistoryId)?.title || ''}`
    : `Gợi Ý Nhập Hàng Tuần Tới (Tính từ 7 ngày qua)`;

  // Hàm chốt và lưu bảng gợi ý hiện tại vào lịch sử
  const handleSaveRestockSession = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newSession = {
      id: Date.now().toString(),
      title: todayStr,
      items: getWeeklyRestockData()
    };

    const updatedHistory = [newSession, ...restockHistory];
    setRestockHistory(updatedHistory);
    localStorage.setItem('coffee_restock_history', JSON.stringify(updatedHistory));
    setSelectedHistoryId(newSession.id);
    alert(`Đã chốt và lưu bảng gợi ý nhập hàng ngày ${todayStr} thành công!`);
  };

  // Xuất file Excel
  const handleExportRestockExcel = () => {
    const dataToExport = currentActiveData.map(item => ({
      "Tên Nguyên Liệu": item.name,
      "Tiêu Thụ (7 Ngày)": item.totalUsedLastWeek,
      "Dự Kiến Tuần Tới (+10%)": item.projectedNeed,
      "Tồn Kho Hiện Tại": item.currentStock,
      "Cần Nhập Thêm": item.suggestedBuy
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Goi Y Nhap Hang");
    XLSX.writeFile(workbook, `Goi_Y_Nhap_Hang_${selectedHistoryId ? 'Cu_' + selectedHistoryId : 'Moi_Nhat'}.xlsx`);
  };

  return (
    <div className="coffee-card">
      <h2 className="card-title">📦 Quản Lý Gợi Ý Nhập Hàng & Lịch Sử</h2>

      {/* 🌟 Phần chọn xem lịch sử cũ hoặc tạo mới */}
      <div className="coffee-form" style={{ background: '#221915', padding: '15px', borderRadius: '10px', border: '1px solid #4a3a31', marginBottom: '20px' }}>
        <label className="form-label" style={{ color: '#e6ccb2', marginBottom: '8px', display: 'block' }}>📂 Chọn Xem Lịch Sử Gợi Ý Cũ:</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            className="coffee-input"
            style={{ flex: 1 }}
            value={selectedHistoryId}
            onChange={(e) => setSelectedHistoryId(e.target.value)}
          >
            <option value="">⚡ Đang xem: Gợi ý mới nhất (Theo 7 ngày gần đây)</option>
            {restockHistory.map(hist => (
              <option key={hist.id} value={hist.id}>
                📦 Phiên chốt ngày: {hist.title}
              </option>
            ))}
          </select>

          <button 
            className="btn-primary" 
            onClick={handleSaveRestockSession}
            style={{ whiteSpace: 'nowrap' }}
          >
            💾 Chốt & Lưu Gợi Ý Tuần Này
          </button>
        </div>
      </div>

      <h3 className="section-heading" style={{ color: '#ffb703' }}>{activeTitle}</h3>
      <p style={{ color: '#b0a494', fontSize: '13px', marginBottom: '15px' }}>
        {selectedHistoryId ? 'Đang xem lại bảng dữ liệu đã lưu trữ từ các kỳ trước.' : 'Hệ thống tự động tổng hợp mức tiêu thụ từ 7 ngày gần nhất, tính hệ số an toàn 1.1 (+10% dự phòng) và trừ tồn kho:'}
      </p>

      {ingredients.length === 0 ? (
        <p className="empty-text">Chưa có nguyên liệu nào trong kho.</p>
      ) : (
        <div className="table-responsive">
          <div style={{ minWidth: '600px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', padding: '10px 14px', background: '#221915', borderRadius: '8px', fontWeight: 'bold', color: '#e6ccb2', marginBottom: '10px', border: '1px solid #4a3a31' }}>
              <div>Tên Nguyên Liệu</div>
              <div style={{ textAlign: 'center' }}>Tiêu Thụ (7 Ngày)</div>
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