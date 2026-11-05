import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function NhapHang({ ingredients, dailyWarehouse }) {
  // Quản lý danh sách lịch sử gợi ý nhập hàng
  const [restockHistory, setRestockHistory] = useState(() => {
    const saved = localStorage.getItem('coffee_restock_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Lưu mốc thời gian (hoặc ID phiên) của lần chốt gần nhất để làm mốc reset
  const [lastResetTimestamp, setLastResetTimestamp] = useState(() => {
    return localStorage.getItem('coffee_last_reset_timestamp') || '0';
  });

  const [selectedHistoryId, setSelectedHistoryId] = useState('');

  // Hàm tính toán gợi ý nhập hàng: Chỉ tính tiêu thụ từ sau thời điểm chốt gần nhất trở đi
  const getWeeklyRestockData = () => {
    const consumptionPerIng = {};
    
    // Duyệt qua tất cả các ngày có trong kho, chỉ lấy những ngày có timestamp >= lastResetTimestamp
    Object.entries(dailyWarehouse).forEach(([dateStr, dayData]) => {
      // Chuyển ngày thành timestamp để so sánh mốc chốt
      const dayTime = new Date(dateStr).getTime();
      if (dayTime > Number(lastResetTimestamp)) {
        Object.entries(dayData || {}).forEach(([ingId, data]) => {
          const used = Number(data.usedAmount) || 0;
          consumptionPerIng[ingId] = (consumptionPerIng[ingId] || 0) + used;
        });
      }
    });

    return ingredients.map(item => {
      const totalUsedSinceReset = consumptionPerIng[item.id] || 0;
      const projectedNeed = Math.ceil(totalUsedSinceReset * 1.1); // Dự trù tăng 10%
      const currentStock = Number(item.baseStock) || 0;
      const suggestedBuy = Math.max(0, projectedNeed - currentStock);

      return {
        id: item.id,
        name: item.name,
        totalUsedLastWeek: totalUsedSinceReset,
        projectedNeed,
        currentStock,
        suggestedBuy
      };
    });
  };

  const currentActiveData = selectedHistoryId 
    ? (restockHistory.find(h => h.id === selectedHistoryId)?.items || [])
    : getWeeklyRestockData();

  const activeTitle = selectedHistoryId 
    ? `Lịch Sử Gợi Ý Ngày: ${restockHistory.find(h => h.id === selectedHistoryId)?.title || ''}`
    : `Gợi Ý Nhập Hàng Chu kỳ Mới (Tính từ sau lần chốt gần nhất)`;

  // Hàm chốt và lưu phiên, đồng thời thiết lập mốc thời gian mới để reset bảng chính về 0
  const handleSaveRestockSession = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTime = Date.now();

    const newSession = {
      id: nowTime.toString(),
      title: todayStr,
      items: getWeeklyRestockData()
    };

    const updatedHistory = [newSession, ...restockHistory];
    setRestockHistory(updatedHistory);
    localStorage.setItem('coffee_restock_history', JSON.stringify(updatedHistory));

    // Cập nhật mốc reset là thời điểm hiện tại -> Các số liệu cũ sẽ được ẩn đi, bảng mới tính từ 0
    setLastResetTimestamp(nowTime.toString());
    localStorage.setItem('coffee_last_reset_timestamp', nowTime.toString());

    setSelectedHistoryId('');
    alert(`Đã chốt phiên ${todayStr} thành công! Bảng gợi ý mới đã được làm sạch và bắt đầu tính chu kỳ mới.`);
  };

  const handleExportRestockExcel = () => {
    const dataToExport = currentActiveData.map(item => ({
      "Tên Nguyên Liệu": item.name,
      "Tiêu Thụ Kỳ Này": item.totalUsedLastWeek,
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

      <div className="coffee-form" style={{ background: '#221915', padding: '15px', borderRadius: '10px', border: '1px solid #4a3a31', marginBottom: '20px' }}>
        <label className="form-label" style={{ color: '#e6ccb2', marginBottom: '8px', display: 'block' }}>📂 Chọn Xem Lịch Sử Gợi Ý Cũ:</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            className="coffee-input"
            style={{ flex: 1 }}
            value={selectedHistoryId}
            onChange={(e) => setSelectedHistoryId(e.target.value)}
          >
            <option value="">⚡ Đang xem: Gợi ý chu kỳ mới (Đang chạy)</option>
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
            💾 Chốt & Làm Mới Chu Kỳ Mới
          </button>
        </div>
      </div>

      <h3 className="section-heading" style={{ color: '#ffb703' }}>{activeTitle}</h3>
      <p style={{ color: '#b0a494', fontSize: '13px', marginBottom: '15px' }}>
        {selectedHistoryId ? 'Đang xem lại bản ghi lịch sử đã chốt.' : 'Bảng này tự động tích lũy lượng tiêu thụ phát sinh từ sau lần chốt gần nhất để chuẩn bị cho kỳ nhập hàng tiếp theo.'}
      </p>

      {ingredients.length === 0 ? (
        <p className="empty-text">Chưa có nguyên liệu nào trong kho.</p>
      ) : (
        <div className="table-responsive">
          <div style={{ minWidth: '600px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', padding: '10px 14px', background: '#221915', borderRadius: '8px', fontWeight: 'bold', color: '#e6ccb2', marginBottom: '10px', border: '1px solid #4a3a31' }}>
              <div>Tên Nguyên Liệu</div>
              <div style={{ textAlign: 'center' }}>Tiêu Thụ (Kỳ Này)</div>
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