import React, { useState, useEffect, useRef } from 'react';
import liff from '@line/liff';
import { Download, MapPin, Share2, Copy, Calendar, Clock, Users } from 'lucide-react';
import './CalendarGenerator.css';

const CalendarGenerator = () => {
  const [formData, setFormData] = useState({ 
    date: '', 
    time: '', 
    name: '', 
    address: '',
    participants: ''
  });
  const [userProfile, setUserProfile] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [countdownClass, setCountdownClass] = useState('countdown-red');
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState([]);
  const [showNameResults, setShowNameResults] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const nameSearchBoxRef = useRef(null);

  // 初始化 LIFF
  useEffect(() => {
    liff.init({ liffId: process.env.REACT_APP_LIFF_ID }).then(async () => {
      setIsLiffReady(true);
      if (!liff.isLoggedIn()) {
        liff.login();
      } else {
        try {
          const profile = await liff.getProfile();
          setUserProfile(profile);
        } catch (error) {
          console.error('獲取用戶資料失敗:', error);
        }
      }
    }).catch(error => {
      console.error('LIFF 初始化失敗:', error);
      setIsLiffReady(true); // 即使失敗也設為 true，讓用戶可以使用基本功能
    });
  }, []);

  // 初始化地圖
  useEffect(() => {
    if (!window.google || !window.google.maps) return;
    
    const initializeMap = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          initMap({ 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
          });
        },
        (error) => {
          console.log('無法獲取當前位置:', error);
          // 預設台北101位置
          initMap({ lat: 25.0478, lng: 121.5319 });
        }
      );
    };

    function initMap(center) {
      if (!document.getElementById('map')) return;
      
      mapRef.current = new window.google.maps.Map(document.getElementById('map'), {
        center,
        zoom: 15,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      });

      // 地圖點擊事件
      mapRef.current.addListener('click', (event) => {
        const latLng = event.latLng;
        
        // 清除之前的標記
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }
        
        // 添加新標記
        markerRef.current = new window.google.maps.Marker({
          position: latLng,
          map: mapRef.current,
          animation: window.google.maps.Animation.DROP
        });

        // 反向地理編碼
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const result = results[0];
            const address = result.formatted_address;
            const placeName = result.address_components?.[0]?.long_name || '';
            
            setFormData(prev => ({
              ...prev,
              address: address,
              name: prev.name || placeName
            }));
          }
        });
      });

      // 搜索框功能
      const searchBox = new window.google.maps.places.SearchBox(
        document.getElementById('map-search')
      );
      searchBoxRef.current = searchBox;
      
      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces();
        if (places.length === 0) return;

        // 顯示搜尋結果
        setSearchResults(places.slice(0, 5)); // 限制顯示 5 個結果
        setShowResults(true);

        // 調整地圖視野以包含所有結果
        const bounds = new window.google.maps.LatLngBounds();
        places.forEach(place => {
          if (place.geometry && place.geometry.location) {
            bounds.extend(place.geometry.location);
          }
        });
        mapRef.current.fitBounds(bounds);
      });

      // 點擊地圖時隱藏搜尋結果
      mapRef.current.addListener('click', () => {
        setShowResults(false);
      });
    }

    // 延遲初始化以確保 DOM 元素存在
    setTimeout(initializeMap, 100);
  }, []);

  // 集合名稱搜尋功能
  const searchPlacesForName = (query) => {
    if (!query.trim() || !window.google?.maps?.places) return;

    const service = new window.google.maps.places.PlacesService(mapRef.current);
    const request = {
      query: query,
      fields: ['name', 'formatted_address', 'geometry', 'place_id', 'types', 'rating', 'user_ratings_total', 'opening_hours'],
    };

    service.textSearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setNameSearchResults(results.slice(0, 5));
        setShowNameResults(true);
      }
    });
  };

  // 選擇集合名稱搜尋結果
  const selectNamePlace = (place) => {
    if (!place.geometry || !place.geometry.location) return;

    // 清除之前的標記
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // 添加標記
    markerRef.current = new window.google.maps.Marker({
      position: place.geometry.location,
      map: mapRef.current,
      animation: window.google.maps.Animation.DROP
    });

    // 設置地圖中心和縮放
    mapRef.current.setCenter(place.geometry.location);
    mapRef.current.setZoom(17);

    // 更新表單數據 - 集合名稱用 place.name，地址用精確地址
    setFormData(prev => ({
      ...prev,
      name: place.name,
      address: place.formatted_address
    }));

    // 隱藏搜尋結果
    setShowNameResults(false);
  };

  // 處理集合名稱輸入變化
  const handleNameInputChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, name: value });
    
    if (value.length > 2) {
      searchPlacesForName(value);
    } else {
      setShowNameResults(false);
    }
  };

  // 隱藏集合名稱搜尋結果
  const hideNameResults = () => {
    setTimeout(() => setShowNameResults(false), 200);
  };

    // 延遲初始化以確保 DOM 元素存在
    setTimeout(initializeMap, 100);
  }, []);

  // 倒數計時器
  useEffect(() => {
    const timer = setInterval(() => {
      const { date, time } = formData;
      if (!date || !time) {
        setCountdown('');
        setCountdownClass('countdown-red');
        return;
      }

      const target = new Date(`${date}T${time}`);
      const now = new Date();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown('⏰ 已過期');
        setCountdownClass('countdown-expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      let countdownText = '';
      if (days > 0) {
        countdownText = `⏳ 還有 ${days} 天 ${hours} 小時`;
        setCountdownClass('countdown-safe');
      } else if (hours > 1) {
        countdownText = `⏳ 還有 ${hours} 小時 ${minutes} 分鐘`;
        setCountdownClass('countdown-normal');
      } else if (hours === 1) {
        countdownText = `⏳ 還有 1 小時 ${minutes} 分鐘`;
        setCountdownClass('countdown-warn');
      } else if (minutes > 5) {
        countdownText = `⏳ 還有 ${minutes} 分鐘 ${seconds} 秒`;
        setCountdownClass('countdown-danger');
      } else {
        countdownText = `🚨 最後 ${minutes} 分 ${seconds} 秒！`;
        setCountdownClass('countdown-critical');
      }

      setCountdown(countdownText);
    }, 1000);

    return () => clearInterval(timer);
  }, [formData]);

  // 生成 ICS 檔案內容
  const generateICS = (date, time, name, address) => {
    const dateObj = new Date(`${date}T${time}`);
    const start = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(dateObj.getTime() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `${Date.now()}@calendar-generator.com`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    
    const eventDescription = [
      '集合活動',
      '',
      `地圖連結：${mapUrl}`,
      `地址：${address}`
    ].join('\\n');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TourHub Calendar Generator//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${name || '集合活動'}`,
      `LOCATION:${address}`,
      `DESCRIPTION:${eventDescription}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  };

  // 下載 ICS 檔案
  const downloadICS = () => {
    const { date, time, name, address } = formData;
    if (!date || !time || !address) {
      alert('請填寫日期、時間和地址');
      return;
    }

    const icsContent = generateICS(date, time, name, address);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${name || '集合活動'}_${date.replace(/-/g, '')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // 加入 Google Calendar
  const addToGoogleCalendar = () => {
    const { date, time, name, address } = formData;
    if (!date || !time || !address) {
      alert('請填寫日期、時間和地址');
      return;
    }

    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + 3600000); // 預設 1 小時
    
    const start = startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: name || '集合活動',
      dates: `${start}/${end}`,
      details: '集合通知',
      location: address,
      sf: 'true',
      output: 'xml'
    });

    const calendarUrl = `https://www.google.com/calendar/render?${params.toString()}`;
    window.open(calendarUrl, '_blank');
  };

  // 複製活動資訊
  const copyInfo = async () => {
    const { date, time, name, address, participants } = formData;
    if (!date || !time || !address) {
      alert('請填寫日期、時間和地址');
      return;
    }

    const info = [
      `📍 ${name || '集合活動'}`,
      `📅 ${new Date(`${date}T${time}`).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      })}`,
      `🕒 ${time}`,
      `📍 ${address}`,
      participants ? `👥 參加者：${participants}` : '',
      `🗺️ 地圖：https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(info);
      alert('資訊已複製到剪貼簿！');
    } catch (error) {
      console.error('複製失敗:', error);
      alert('複製失敗，請手動複製');
    }
  };

  // 分享到 LINE
  const shareInfo = async () => {
    const { date, time, name, address, participants } = formData;
    if (!date || !time || !address) {
      alert('請填寫日期、時間和地址');
      return;
    }

    if (!isLiffReady) {
      alert('LINE 功能尚未準備就緒');
      return;
    }

    const target = new Date(`${date}T${time}`);
    const now = new Date();
    const diff = target - now;
    
    let countdownText = '';
    let countdownColor = '#dc2626';
    
    if (diff <= 0) {
      countdownText = '⏰ 已過期';
      countdownColor = '#6b7280';
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      
      if (days > 0) {
        countdownText = `⏳ 還有 ${days} 天 ${hours} 小時`;
        countdownColor = '#059669';
      } else if (hours > 1) {
        countdownText = `⏳ 還有 ${hours} 小時 ${minutes} 分鐘`;
        countdownColor = '#0891b2';
      } else if (hours === 1) {
        countdownText = `⏳ 還有 1 小時 ${minutes} 分鐘`;
        countdownColor = '#ea580c';
      } else if (minutes > 5) {
        countdownText = `⏳ 還有 ${minutes} 分鐘 ${seconds} 秒`;
        countdownColor = '#dc2626';
      } else {
        countdownText = `🚨 最後 ${minutes} 分 ${seconds} 秒！`;
        countdownColor = '#dc2626';
      }
    }

    const flexMessage = {
      type: 'flex',
      altText: `集合通知 - ${name || '未命名地點'}`,
      contents: {
        type: 'bubble',
        styles: {
          body: {
            backgroundColor: '#f8fafc'
          }
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: 'lg',
          contents: [
            // 標題區域
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '📍 集合通知',
                  weight: 'bold',
                  size: 'xl',
                  color: '#1f2937'
                },
                {
                  type: 'text',
                  text: name || '未命名地點',
                  weight: 'bold',
                  size: 'lg',
                  color: '#374151',
                  wrap: true
                }
              ]
            },
            
            // 分隔線
            {
              type: 'separator',
              margin: 'md'
            },
            
            // 資訊區域
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              margin: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '📅',
                      size: 'sm',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: new Date(`${date}T${time}`).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      }),
                      size: 'sm',
                      color: '#111827',
                      flex: 4,
                      margin: 'sm'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '🕒',
                      size: 'sm',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: time,
                      size: 'sm',
                      color: '#111827',
                      flex: 4,
                      margin: 'sm'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '📍',
                      size: 'sm',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: address,
                      size: 'sm',
                      color: '#111827',
                      wrap: true,
                      flex: 4,
                      margin: 'sm'
                    }
                  ]
                },
                ...(participants ? [{
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '👥',
                      size: 'sm',
                      flex: 0
                    },
                    {
                      type: 'text',
                      text: `參加者：${participants}`,
                      size: 'sm',
                      color: '#111827',
                      wrap: true,
                      flex: 4,
                      margin: 'sm'
                    }
                  ]
                }] : [])
              ]
            },
            
            // 倒數計時區域
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: countdownColor === '#6b7280' ? '#f3f4f6' : '#fef2f2',
              cornerRadius: 'md',
              paddingAll: 'md',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: countdownText,
                  weight: 'bold',
                  size: 'md',
                  color: countdownColor,
                  align: 'center',
                  wrap: true
                }
              ]
            },
            
            // 提醒文字
            ...(diff > 0 && diff < 24 * 60 * 60 * 1000 ? [{
              type: 'text',
              text: '💡 建議提前 10-15 分鐘出發',
              size: 'xs',
              color: '#6b7280',
              wrap: true,
              margin: 'sm',
              align: 'center'
            }] : [])
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              color: '#4f46e5',
              action: {
                type: 'uri',
                label: '🗺️ 查看地圖',
                uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
              }
            }
          ]
        }
      }
    };

    try {
      if (liff.isApiAvailable('shareTargetPicker')) {
        await liff.shareTargetPicker([flexMessage]);
      } else {
        alert('此環境不支援 LINE 分享功能');
      }
    } catch (error) {
      console.error('分享失敗:', error);
      alert('分享失敗：' + error.message);
    }
  };

  // 開啟地圖
  const openMap = () => {
    if (!formData.address) {
      alert('請先設定地址');
      return;
    }
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address)}`;
    window.open(mapUrl, '_blank');
  };

  return (
    <div className="container">
      {userProfile && (
        <div className="user-card">
          <img src={userProfile.pictureUrl} alt="用戶頭像" className="user-avatar" />
          <span>Hi, {userProfile.displayName}</span>
        </div>
      )}

      <div className="content-wrapper">
        <div className="form-card">
          <h2>📅 集合活動設定</h2>
          
          <div className="form-group">
            <label htmlFor="name">集合名稱</label>
            <div className="search-container">
              <input 
                id="name"
                type="text"
                value={formData.name} 
                onChange={handleNameInputChange}
                onBlur={hideNameResults}
                onFocus={() => nameSearchResults.length > 0 && setShowNameResults(true)}
                placeholder="搜尋地點名稱
              />
              {showNameResults && nameSearchResults.length > 0 && (
                <div className="search-results">
                  {nameSearchResults.map((place, index) => (
                    <div 
                      key={`${place.place_id}-${index}`}
                      className="search-result-item"
                      onClick={() => selectNamePlace(place)}
                    >
                      <div className="result-icon">
                        {place.types?.includes('restaurant') ? '🍽️' :
                         place.types?.includes('subway_station') ? '🚇' :
                         place.types?.includes('bus_station') ? '🚌' :
                         place.types?.includes('train_station') ? '🚆' :
                         place.types?.includes('school') ? '🏫' :
                         place.types?.includes('hospital') ? '🏥' :
                         place.types?.includes('shopping_mall') ? '🛍️' :
                         place.types?.includes('park') ? '🌳' :
                         place.types?.includes('gas_station') ? '⛽' :
                         place.types?.includes('bank') ? '🏦' :
                         place.types?.includes('pharmacy') ? '💊' :
                         place.types?.includes('convenience_store') ? '🏪' :
                         '📍'}
                      </div>
                      <div className="result-info">
                        <div className="result-name">{place.name}</div>
                        <div className="result-address">{place.formatted_address}</div>
                        {place.rating && (
                          <div className="result-rating">
                            ⭐ {place.rating} 
                            {place.user_ratings_total && ` (${place.user_ratings_total})`}
                          </div>
                        )}
                        {place.opening_hours?.open_now !== undefined && (
                          <div className={`result-status ${place.opening_hours.open_now ? 'open' : 'closed'}`}>
                            {place.opening_hours.open_now ? '🟢 營業中' : '🔴 已休息'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">集合日期</label>
              <input 
                id="date"
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label htmlFor="time">集合時間</label>
              <input 
                id="time"
                type="time" 
                value={formData.time} 
                onChange={e => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">集合地址</label>
            <input 
              id="address"
              type="text"
              value={formData.address} 
              onChange={e => setFormData({ ...formData, address: e.target.value })} 
              placeholder="請點選地圖或手動輸入精確地址"
              readOnly
            />
            <p className="address-hint">💡 請點選地圖上的位置來獲得精確地址</p>
          </div>

          <div className="form-group">
            <label htmlFor="participants">參加者（選填）</label>
            <input 
              id="participants"
              type="text"
              value={formData.participants} 
              onChange={e => setFormData({ ...formData, participants: e.target.value })} 
              placeholder="輸入人名"
            />
          </div>

          {countdown && (
            <div className={`countdown ${countdownClass}`}>
              <Clock size={16} />
              {countdown}
            </div>
          )}

          <div className="button-grid">
            <button className="btn btn-download" onClick={downloadICS}>
              <Download size={16} />
              下載 .ics
            </button>
            <button className="btn btn-calendar" onClick={addToGoogleCalendar}>
              <Calendar size={16} />
              Google Calendar
            </button>
            <button className="btn btn-map" onClick={openMap}>
              <MapPin size={16} />
              查看地圖
            </button>
            <button className="btn btn-copy" onClick={copyInfo}>
              <Copy size={16} />
              複製資訊
            </button>
            <button className="btn btn-share" onClick={shareInfo} disabled={!isLiffReady}>
              <Share2 size={16} />
              分享到LINE
            </button>
          </div>
        </div>

        <div className="map-box">
          <h3>🗺️ 地圖選擇精確位置</h3>
          <div id="map" className="map" />
          <p className="map-hint">💡 點擊地圖來選擇精確的集合位置</p>
        </div>
      </div>
    </div>
  );
};

export default CalendarGenerator;
