import React, { useState } from 'react';

export default function POS({ recipes, ingredients, dailyWarehouse, saveDailyWarehouseToServer, selectedDate, setSelectedDate }) {
    const [dailySales, setDailySales] = useState({});
    const [notification, setNotification] = useState('');
    const [lastSummary, setLastSummary] = useState(null);

    const handleQuantityChange = (drinkId, qty) => {
        setDailySales({
            ...dailySales,
            [drinkId]: Math.max(0, Number(qty))
        });
        setNotification('');
        setLastSummary(null);
    };

    const handleSubmitDailyReport = async () => {
        const soldItems = Object.entries(dailySales)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => ({
                drink: recipes.find(r => String(r.id) === String(id)),
                quantity: Number(qty)
            }))
            .filter(item => item.drink);

        if (soldItems.length === 0) {
            alert('Vui lòng nhập số lượng ly bán được cho ít nhất một món!');
            return;
        }

        let consumedLog = {}; 

        for (const item of soldItems) {
            const ingList = item.drink.ingredients || item.drink.nguyenLieu || [];
            
            for (const recipeIng of ingList) {
                const recipeIngId = String(recipeIng.ingredientId || recipeIng.id || '');
                const recipeIngName = (recipeIng.name || recipeIng.ten || '').trim().toLowerCase();
                const totalRequired = (recipeIng.amount || recipeIng.soLuong || 0) * item.quantity;

                const matchedIngredient = ingredients.find(i => {
                    const iId = String(i.id || '');
                    const iName = (i.name || '').trim().toLowerCase();
                    return (recipeIngId && iId === recipeIngId) || 
                           (recipeIngName && (iName === recipeIngName || iName.includes(recipeIngName) || recipeIngName.includes(iName)));
                });

                if (matchedIngredient) {
                    const ingId = matchedIngredient.id;
                    consumedLog[ingId] = (consumedLog[ingId] || 0) + totalRequired;
                }
            }
        }

        const currentDayData = dailyWarehouse[selectedDate] || {};
        let updatedDayData = { ...currentDayData };

        for (const [ingId, amount] of Object.entries(consumedLog)) {
            const existingIngData = updatedDayData[ingId] || { startAmount: 0, usedAmount: 0 };
            updatedDayData[ingId] = {
                ...existingIngData,
                startAmount: existingIngData.startAmount !== undefined ? existingIngData.startAmount : 0,
                usedAmount: (Number(existingIngData.usedAmount) || 0) + Number(amount)
            };
        }

        await saveDailyWarehouseToServer(selectedDate, updatedDayData);

        setNotification(`✅ Đã gửi báo cáo bán hàng & trừ kho cho ngày ${selectedDate} thành công!`);
        setLastSummary(soldItems);
        setDailySales({});
    };

    return (
        <div className="coffee-card">
            <h3 className="card-title">📊 Nhập Tổng Số Lượng Bán Trong Ngày (Chốt Ca)</h3>
            
            <div className="coffee-form" style={{ marginBottom: '20px' }}>
                <label className="form-label">📅 Ngày Bán Hàng / Chốt Ca:</label>
                <input 
                    type="date" 
                    className="coffee-input"
                    style={{ width: '100%' }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>

            {notification && (
                <div style={{ background: '#1b6b39', color: '#fff', padding: '10px 14px', borderRadius: '8px', marginBottom: '15px', fontWeight: '600', textAlign: 'center' }}>
                    {notification}
                </div>
            )}

            {!recipes || recipes.length === 0 ? (
                <p className="empty-text">Chưa có món nào trong thực đơn. Vui lòng tạo công thức trước!</p>
            ) : (
                <div className="pos-daily-container">
                    <p className="item-title" style={{ color: '#d7ccc8', margin: '0 0 15px 0' }}>
                        Nhập số lượng ly bán được ngày <b style={{ color: '#ffb703' }}>{selectedDate}</b>:
                    </p>

                    <div>
                        {recipes.map(drink => {
                            const ingList = drink.ingredients || drink.nguyenLieu || [];
                            return (
                                <div key={drink.id} className="daily-input-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#221915', border: '1px solid #4a3a31', padding: '14px', borderRadius: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <strong className="item-title" style={{ fontSize: '16px', display: 'block', color: '#f7f3ef' }}>{drink.name}</strong>
                                        <span className="drink-card-hint" style={{ color: '#d8c3a5', fontSize: '13px' }}>
                                            Công thức: {ingList.length > 0 
                                                ? ingList.map(i => `${i?.name || i?.ten || 'Thành phần'} (${i?.amount || i?.soLuong || 0})`).join(', ') 
                                                : 'Chưa thiết lập nguyên liệu'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="drink-card-hint" style={{ color: '#d8c3a5' }}>Số lượng ly:</span>
                                        <input 
                                            type="number" 
                                            min="0"
                                            placeholder="0"
                                            value={dailySales[drink.id] || ''}
                                            onChange={(e) => handleQuantityChange(drink.id, e.target.value)}
                                            className="coffee-input daily-input"
                                            style={{ width: '80px', textAlign: 'center', padding: '8px' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={handleSubmitDailyReport} className="btn-success" style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '10px', background: '#1b6b39', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Gửi Báo Cáo Về Kho & Trừ Kho Ngày {selectedDate}
                    </button>
                </div>
            )}

            {lastSummary && (
                <div className="summary-box" style={{ marginTop: '20px', background: '#221915', padding: '15px', borderRadius: '10px', border: '1px solid #4a3a31' }}>
                    <h4 className="summary-title" style={{ color: '#e6ccb2', margin: '0 0 10px 0' }}>📋 Tổng Kết Tiêu Hao Ngày {selectedDate}</h4>
                    <ul className="sub-list" style={{ paddingLeft: '20px', margin: 0 }}>
                        {lastSummary.map((item, idx) => (
                            <li key={idx} className="sub-list-item" style={{ marginBottom: '6px', color: '#f7f3ef' }}>
                                Bán <strong style={{ color: '#ffb703' }}>{item.quantity}</strong> ly <strong style={{ color: '#e6ccb2' }}>{item.drink?.name}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}