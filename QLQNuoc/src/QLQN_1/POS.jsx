import React, { useState } from 'react';
import axios from 'axios';

export default function POS({ recipes, ingredients }) {
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
                const recipeIngName = (recipeIng.name || recipeIng.ten || '').trim().toLowerCase();
                const totalRequired = (recipeIng.amount || recipeIng.soLuong || 0) * item.quantity;

                if (!recipeIngName) continue;

                // Khớp nguyên liệu theo TÊN trong kho
                const matchedIngredient = ingredients.find(i => 
                    (i.name || '').trim().toLowerCase() === recipeIngName ||
                    (i.name || '').trim().toLowerCase().includes(recipeIngName) ||
                    recipeIngName.includes((i.name || '').trim().toLowerCase())
                );

                if (matchedIngredient) {
                    const ingId = matchedIngredient.id;
                    consumedLog[ingId] = (consumedLog[ingId] || 0) + totalRequired;
                }
            }
        }

        const todayStr = new Date().toISOString().split('T')[0];

        try {
            // 1. Tải dữ liệu ngày hôm nay từ json-server lên trước
            const res = await axios.get(`http://localhost:5000/soLieu`);
            const list = res.data || [];
            const found = list.find(item => String(item.id) === String(todayStr) || String(item.date) === String(todayStr));

            let currentDayData = found ? (found.data || {}) : {};
            let updatedDayData = { ...currentDayData };

            // 2. Cộng dồn số lượng đã dùng (used)
            for (const [ingId, amount] of Object.entries(consumedLog)) {
                const existingIngData = updatedDayData[ingId] || {};
                updatedDayData[ingId] = {
                    ...existingIngData,
                    opening: existingIngData.opening !== undefined ? existingIngData.opening : 0,
                    used: (existingIngData.used || 0) + Number(amount)
                };
            }

            const payload = {
                id: todayStr,
                date: todayStr,
                data: updatedDayData
            };

            // 3. Ghi đè hoặc tạo mới lên json-server
            if (found) {
                await axios.put(`http://localhost:5000/soLieu/${found.id}`, payload);
            } else {
                await axios.post(`http://localhost:5000/soLieu`, payload);
            }

            setNotification('✅ Đã gửi báo cáo bán hàng & trừ kho thành công!');
            setLastSummary(soldItems);
            setDailySales({});
        } catch (error) {
            console.error("Lỗi trừ kho POS:", error);
            alert("Gửi báo cáo thất bại, kiểm tra lại json-server!");
        }
    };

    return (
        <div className="coffee-card">
            <h3 className="card-title">📊 Nhập Tổng Số Lượng Bán Trong Ngày (Chốt Ca)</h3>
            
            {notification && (
                <div className={notification.startsWith('✅') ? "notification-success" : "notification-error"}>
                    {notification}
                </div>
            )}

            {!recipes || recipes.length === 0 ? (
                <p className="empty-text">Chưa có món nào trong thực đơn. Vui lòng tạo công thức trước!</p>
            ) : (
                <div className="pos-daily-container">
                    <p className="item-title" style={{ color: '#d7ccc8', margin: 0 }}>
                        Nhập số lượng ly bán được hôm nay, hệ thống sẽ tự động tổng hợp và trừ kho:
                    </p>

                    <div>
                        {recipes.map(drink => {
                            const ingList = drink.ingredients || drink.nguyenLieu || [];
                            return (
                                <div key={drink.id} className="daily-input-row">
                                    <div>
                                        <strong className="item-title" style={{ fontSize: '16px', display: 'block' }}>{drink.name}</strong>
                                        <span className="drink-card-hint">
                                            Công thức: {ingList.length > 0 
                                                ? ingList.map(i => `${i?.name || i?.ten || 'Thành phần'} (${i?.amount || i?.soLuong || 0})`).join(', ') 
                                                : 'Chưa thiết lập nguyên liệu'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="drink-card-hint">Số lượng ly:</span>
                                        <input 
                                            type="number" 
                                            min="0"
                                            placeholder="0"
                                            value={dailySales[drink.id] || ''}
                                            onChange={(e) => handleQuantityChange(drink.id, e.target.value)}
                                            className="coffee-input daily-input"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={handleSubmitDailyReport} className="btn-success" style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
                        Gửi Báo Cáo Về Kho & Trừ Kho
                    </button>
                </div>
            )}

            {lastSummary && (
                <div className="summary-box">
                    <h4 className="summary-title">📋 Tổng Kết Tiêu Hao Hôm Nay</h4>
                    <ul className="sub-list">
                        {lastSummary.map((item, idx) => (
                            <li key={idx} className="sub-list-item" style={{ marginBottom: '8px' }}>
                                Bán <strong style={{ color: '#ff8a80' }}>{item.quantity}</strong> ly <strong style={{ color: '#f5efe6' }}>{item.drink?.name}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}