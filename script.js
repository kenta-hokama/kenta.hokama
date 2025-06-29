// --- SPA画面切り替え ---
const searchSection = document.getElementById('search-section');
const registerSection = document.getElementById('register-section');
document.getElementById('show-search').onclick = () => {
  searchSection.style.display = '';
  registerSection.style.display = 'none';
};
document.getElementById('show-register').onclick = () => {
  searchSection.style.display = 'none';
  registerSection.style.display = '';
};

// --- キッチンカーのダミーデータ（沖縄県内） ---
const kitchencars = [
  // { name: '沖縄タコス号', genre: 'タコス', location: '那覇市国際通り', lat: 26.2155, lng: 127.6866, price: '¥500~', pr: '本場のタコスを沖縄で！', image: '', events: ['2024-06-10'] },
  // { name: 'ブルーシールカー', genre: 'アイス', location: '北谷町美浜', lat: 26.3209, lng: 127.7536, price: '¥300~', pr: '沖縄名物ブルーシールアイス', image: '', events: ['2024-06-12'] },
  // { name: '沖縄そばバス', genre: '沖縄そば', location: '浦添市港川', lat: 26.2708, lng: 127.7181, price: '¥600~', pr: '自家製麺の沖縄そば', image: '', events: ['2024-06-15'] },
  // { name: 'ゴーヤーバーガー号', genre: 'ハンバーガー', location: '宜野湾市真志喜', lat: 26.2817, lng: 127.7511, price: '¥700~', pr: 'ゴーヤー入りバーガー！', image: '', events: ['2024-06-20'] },
];

// --- 地図初期化 ---
let map, userMarker, carMarkers = [];
function initMap(lat = 26.2124, lng = 127.6809, zoom = 14) { // ズームを詳細に
  if (map) {
    map.setView([lat, lng], zoom);
    return;
  }
  map = L.map('map').setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

// --- 現在地取得 ---
let userLocation = null;
document.getElementById('locate-btn').onclick = function () {
  if (!navigator.geolocation) {
    alert('位置情報が取得できません');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = [pos.coords.latitude, pos.coords.longitude];
    initMap(userLocation[0], userLocation[1], 14); // 詳細ズーム
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker(userLocation, { icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png', iconSize: [32, 32] }) }).addTo(map).bindPopup('あなたの現在地');
  }, () => alert('位置情報が取得できませんでした'));
};

// --- 1km単位で検索・地図に表示 ---
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function renderResults(results) {
  const resultsDiv = document.getElementById('results');
  if (results.length === 0) {
    resultsDiv.innerHTML = '<p>該当するキッチンカーがありません。</p>';
    return;
  }
  resultsDiv.innerHTML = results.map(car => {
    let routeBtn = '';
    if (userLocation) {
      const gmapUrl = `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${encodeURIComponent(car.location)}`;
      routeBtn = `<a href="${gmapUrl}" target="_blank" class="route-btn">道案内</a>`;
    }
    return `
      <div class="kitchencar">
        <span class="kitchencar-name">${car.name}</span>
        <span class="kitchencar-food">(${car.genre})</span>
        <span class="kitchencar-area">@${car.location}</span><br>
        <span>${car.price}</span><br>
        <span>${car.pr}</span><br>
        ${car.image ? `<img src="${car.image}" alt="画像" style="max-width:100px;">` : ''}
        ${routeBtn}
      </div>
    `;
  }).join('');
}

function showCarsOnMap(cars) {
  carMarkers.forEach(m => map.removeLayer(m));
  carMarkers = cars.map(car => {
    let popupContent = `<b>${car.name}</b><br>${car.genre}<br>${car.location}`;
    if (userLocation) {
      const gmapUrl = `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${encodeURIComponent(car.location)}`;
      popupContent += `<br><a href='${gmapUrl}' target='_blank' class='route-btn'>道案内</a>`;
    }
    const marker = L.marker([car.lat, car.lng]).addTo(map).bindPopup(popupContent);
    return marker;
  });
}

document.getElementById('search-btn').onclick = function () {
  if (!userLocation) {
    alert('まず「現在地取得」を押してください');
    return;
  }
  const radius = parseFloat(document.getElementById('radius').value);
  // 近い順にソート
  const found = kitchencars
    .map(car => ({ ...car, dist: haversine(userLocation[0], userLocation[1], car.lat, car.lng) }))
    .filter(car => car.dist <= radius)
    .sort((a, b) => a.dist - b.dist);
  renderResults(found);
  showCarsOnMap(found);
};

// --- 初期地図表示 ---
initMap(26.2124, 127.6809, 14); // 詳細ズーム
renderResults(kitchencars);
showCarsOnMap(kitchencars);

// --- 販売者登録フォーム ---
const registerForm = document.getElementById('register-form');

// --- 住所入力時にピンを表示・調整 ---
let registerMarker = null;
registerForm.location.addEventListener('change', async function () {
  const address = registerForm.location.value;
  let lat = 26.2124;
  let lng = 127.6809;
  let found = false;
  let data = [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent('沖縄 ' + address)}`);
    data = await res.json();
    if (data && data.length > 0) {
      lat = parseFloat(data[0].lat);
      lng = parseFloat(data[0].lon);
      found = true;
    }
  } catch (e) {}
  if (!map) return;
  if (registerMarker) map.removeLayer(registerMarker);
  if (!found && (!data || data.length === 0)) {
    alert('住所が見つかりませんでした。ピンは表示されません。');
    return;
  }
  // 最寄り候補があればその位置にピン
  map.setView([lat, lng], 16);
  registerMarker = L.marker([lat, lng], { draggable: true }).addTo(map).bindPopup('この位置で登録されます').openPopup();
});

registerForm.onsubmit = async function (e) {
  e.preventDefault();
  if (!confirm('月額1,000円のサブスクリプションに同意しますか？')) return;
  const fd = new FormData(registerForm);
  const reader = new FileReader();
  const address = fd.get('location');
  let lat = 26.2124 + Math.random() * 0.1;
  let lng = 127.6809 + Math.random() * 0.1;
  let found = false;
  let data = [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent('沖縄 ' + address)}`);
    data = await res.json();
    if (data && data.length > 0) {
      lat = parseFloat(data[0].lat);
      lng = parseFloat(data[0].lon);
      found = true;
    }
  } catch (e) {
    console.error('ジオコーディングAPIエラー:', e);
  }
  // ユーザーがピンを動かしていればその位置を優先
  if (registerMarker) {
    const pos = registerMarker.getLatLng();
    lat = pos.lat;
    lng = pos.lng;
    map.removeLayer(registerMarker);
    registerMarker = null;
  } else if (!found && (!data || data.length === 0)) {
    alert('住所が見つかりませんでした。登録できません。');
    return;
  }
  const newCar = {
    name: fd.get('name'),
    genre: fd.get('genre'),
    location: address,
    price: fd.get('price'),
    pr: fd.get('pr'),
    lat,
    lng,
    image: '',
    events: [fd.get('event')]
  };
  const imageFile = fd.get('image');
  if (imageFile && imageFile.size > 0) {
    reader.onload = function (ev) {
      newCar.image = ev.target.result;
      kitchencars.push(newCar);
      document.getElementById('register-result').textContent = '登録が完了しました！';
      registerForm.reset();
      renderResults(kitchencars);
      showCarsOnMap(kitchencars);
      map.setView([lat, lng], 14);
    };
    reader.readAsDataURL(imageFile);
  } else {
    try {
      kitchencars.push(newCar);
      document.getElementById('register-result').textContent = '登録が完了しました！';
      registerForm.reset();
    } catch (e) {
      console.error('登録処理エラー:', e);
    }
    renderResults(kitchencars);
    showCarsOnMap(kitchencars);
    map.setView([lat, lng], 14);
  }
};

// --- 画像プレビュー ---
registerForm.image.onchange = function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    if (!document.getElementById('img-preview')) {
      const img = document.createElement('img');
      img.id = 'img-preview';
      img.style.maxWidth = '120px';
      registerForm.image.parentNode.appendChild(img);
    }
    document.getElementById('img-preview').src = ev.target.result;
  };
  reader.readAsDataURL(file);
};