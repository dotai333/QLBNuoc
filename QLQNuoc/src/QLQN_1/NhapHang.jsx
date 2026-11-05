import React from 'react';
import * as XLSX from 'xlsx';

export default function NhapHang({ ingredients, dailyWarehouse }) {
  // Hàm tính toán gợi ý nhập hàng tuần tới dựa trên 7 ngày gần nhất
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

  const restockList = getWeeklyRestockData();

  // Xuất file Excel gợi ý nhập hàng
  const handleExportRestockExcel = () => {
    const dataToExport = restockList.map(item => ({
      "Tên Nguyên Liệu": item.name,
      "Tiêu Thụ 7 Ngày Qua": item.totalUsedLastWeek,
      "Dự Kiến Tuần Tới (+10%)": item.projectedNeed,
      "Tồn Kho Hiện Tại": item.currentStock,
      "Cần Nhập Thêm": item.suggestedBuy
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nhap Hang");
    XLSX.writeFile(workbook, `Goi_Y_Nhap_Hang_Tuan_Toi.xlsx`);
  };

  return (
    <div className="coffee-card">
      <h2 className="card-title">📦 Gợi Ý Nhập Nguyên Liệu Cho Tuần Tới</h2>
      <p style={{ color: '#b0a494', fontSize: '14px', marginBottom: '20px' }}>
        Hệ thống tự động tổng hợp mức tiêu thụ từ 7 ngày gần nhất, tính hệ số an toàn 1.1 (+10% dự phòng) và trừ đi tồn kho cơ bản để đưa ra số lượng cần gọi nhà cung cấp:
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
              {restockList.map(item => (
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
          📥 Tải File Gợi Ý Nhập Hàng (Excel)
        </button>
      </div>
    </div>
  );
}