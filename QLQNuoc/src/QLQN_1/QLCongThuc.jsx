import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "https://qlbnuoc.onrender.com/congThuc";

export default function QLCongThuc({ ingredients }) {
  const [recipes, setRecipes] = useState([]);
  const [drinkName, setDrinkName] = useState('');
  const [selectedIngId, setSelectedIngId] = useState('');
  const [amount, setAmount] = useState('');
  const [currentRecipeIngs, setCurrentRecipeIngs] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = () => {
    axios.get(API_URL)
      .then(res => setRecipes(res.data))
      .catch(err => console.log("Lỗi tải công thức:", err));
  };

  const handleAddIngToRecipe = () => {
    if (!selectedIngId || !amount) {
      alert('Vui lòng chọn nguyên liệu và nhập lượng dùng!');
      return;
    }

    const ing = ingredients.find(i => String(i.id) === String(selectedIngId));
    if (!ing) {
      alert('Không tìm thấy nguyên liệu trong kho!');
      return;
    }

    const existingIndex = currentRecipeIngs.findIndex(item => String(item.id) === String(selectedIngId));
    if (existingIndex > -1) {
      const updated = [...currentRecipeIngs];
      updated[existingIndex].amount += Number(amount);
      setCurrentRecipeIngs(updated);
    } else {
      setCurrentRecipeIngs([
        ...currentRecipeIngs,
        { id: ing.id, name: ing.name, amount: Number(amount) }
      ]);
    }
    setSelectedIngId('');
    setAmount('');
  };

  const handleRemoveIngFromDraft = (indexToRemove) => {
    setCurrentRecipeIngs(currentRecipeIngs.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveDrink = (e) => {
    e.preventDefault();
    if (!drinkName || currentRecipeIngs.length === 0) {
      alert('Vui lòng nhập tên món và ít nhất một nguyên liệu định lượng!');
      return;
    }

    const payload = {
      name: drinkName,
      ingredients: currentRecipeIngs
    };

    if (editingId) {
      axios.put(`${API_URL}/${editingId}`, payload)
        .then(() => {
          fetchRecipes();
          resetForm();
        })
        .catch(err => console.log("Lỗi cập nhật:", err));
    } else {
      axios.post(API_URL, payload)
        .then(() => {
          fetchRecipes();
          resetForm();
        })
        .catch(err => console.log("Lỗi thêm mới:", err));
    }
  };

  const resetForm = () => {
    setDrinkName('');
    setCurrentRecipeIngs([]);
    setEditingId(null);
  };

  const handleEditClick = (drink) => {
    setEditingId(drink.id);
    setDrinkName(drink.name);
    setCurrentRecipeIngs(JSON.parse(JSON.stringify(drink.ingredients || drink.nguyenLieu || [])));
  };

  const handleDelete = (id) => {
    axios.delete(`${API_URL}/${id}`)
      .then(() => fetchRecipes())
      .catch(err => console.log("Lỗi xóa:", err));
  };

  return (
    <div className="coffee-card">
      <h3 className="card-title">
        <span>🍹 Quản Lý Công Thức Món Nước</span>
        {editingId && <span className="badge-editing">Đang sửa món</span>}
      </h3>
      
      <form onSubmit={handleSaveDrink} className="coffee-form">
        <div className="form-group">
          <label className="form-label">Tên món nước:</label>
          <input 
            type="text" 
            placeholder="VD: Cà phê muối đặc biệt" 
            value={drinkName}
            onChange={(e) => setDrinkName(e.target.value)}
            className="coffee-input input-full"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Thêm thành phần nguyên liệu:</label>
          <div className="form-row">
            <select 
              value={selectedIngId} 
              onChange={(e) => setSelectedIngId(e.target.value)}
              className="coffee-select input-flex-2"
            >
              <option value="">-- Chọn nguyên liệu từ kho --</option>
              {ingredients && ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>

            <input 
              type="number" 
              placeholder="Lượng dùng" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="coffee-input input-flex-1"
            />

            <button 
              type="button" 
              onClick={handleAddIngToRecipe}
              className="btn-cyan"
            >
              Thêm
            </button>
          </div>
        </div>

        {currentRecipeIngs.length > 0 && (
          <div className="draft-box">
            <strong className="draft-title">Định lượng thành phần:</strong>
            <ul className="sub-list">
              {currentRecipeIngs.map((item, index) => (
                <li key={index} className="list-item" style={{ background: 'transparent', border: 'none', padding: '4px 0' }}>
                  <span>{item.name}: <strong className="amount-highlight">{item.amount}</strong></span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveIngFromDraft(index)}
                    className="btn-danger"
                  >
                    Xóa
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-row">
          <button type="submit" className={editingId ? "btn-warning" : "btn-success"}>
            {editingId ? 'Cập Nhật Lại Công Thức' : 'Lưu Món Mới Vào Thực Đơn'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Hủy
            </button>
          )}
        </div>
      </form>

      <h4 className="section-heading">📜 Danh Sách Công Thức Đã Lưu</h4>
      {recipes.length === 0 ? (
        <p className="empty-text">Chưa có món nào được thiết lập công thức.</p>
      ) : (
        <div className="item-list">
          {recipes.map(drink => (
            <div key={drink.id} className="list-item list-item-start">
              <div>
                <strong className="item-title-bold">{drink.name}</strong>
                <ul className="sub-list">
                  {(drink.ingredients || drink.nguyenLieu || []).map((ing, idx) => (
                    <li key={idx} className="sub-list-item">
                      {ing.name}: <span className="amount-highlight">{ing.amount || ing.soLuong}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleEditClick(drink)}
                  className="btn-info"
                >
                  Sửa
                </button>
                <button 
                  onClick={() => handleDelete(drink.id)}
                  className="btn-danger"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}