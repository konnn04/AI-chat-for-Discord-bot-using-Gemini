async function infoWeather(location) {
    let promt = '';
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search.php?q=${location}&format=jsonv2`)
        const {lat,lon} = await response.json().then(data => data[0]);
        const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,is_day,rain,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,rain_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=Asia%2FBangkok&past_days=3`);
        const data = await weather.json();
        // console.log(data);

        promt = `Thời tiết ở ${location} hiện tại có nhiệt độ là ${data.current.temperature_2m}°C và cảm giác như ${data.current.apparent_temperature}°C. Độ ẩm ${data.current.rain}%. Gió ${data.current.wind_speed_10m}km/h. Hướng gió ${data.current.wind_direction_10m}°. Hiện tại trời đang ${data.current.is_day ? 'sáng' : 'tối'} và ${data.current.rain>0 ? 'có' : 'không'} mưa. Dự báo trong ngày mai sẽ có nhiệt độ cao nhất là ${data.daily.temperature_2m_max[4]} °C và thấp nhất là ${data.daily.temperature_2m_min[4]}°C. Mặt trời mọc lúc ${data.daily.sunrise[4]} và lặn lúc ${data.daily.sunset[4]}. Thời gian chiếu sáng ${data.daily.daylight_duration[4]/3600} giờ. Thời gian nắng ${data.daily.sunshine_duration[4]/3600} giờ. Chỉ số UV ${data.daily.uv_index_max[4]}. Lượng mưa ${data.daily.rain_sum[4]}mm. Thời gian mưa ${data.daily.precipitation_hours[4]} giờ. Xác suất mưa ${data.daily.precipitation_probability_max[4]}%. Tốc độ gió lớn nhất ${data.daily.wind_speed_10m_max[4]}km/h. Hướng gió ${data.daily.wind_direction_10m_dominant[4]}°. Trong 3 ngày tới, nhiệt độ cao nhất là ${data.daily.temperature_2m_max[6]} °C và thấp nhất là ${data.daily.temperature_2m_min[6]}°C. Mặt trời mọc lúc ${data.daily.sunrise[6]} và lặn lúc ${data.daily.sunset[6]}. Thời gian chiếu sáng ${data.daily.daylight_duration[6]/3600} giờ. Thời gian nắng ${data.daily.sunshine_duration[6]/3600} giờ. Chỉ số UV ${data.daily.uv_index_max[6]}. Lượng mưa ${data.daily.rain_sum[6]}mm. Thời gian mưa ${data.daily.precipitation_hours[6]} giờ. Xác suất mưa ${data.daily.precipitation_probability_max[6]}%. Tốc độ gió lớn nhất ${data.daily.wind_speed_10m_max[6]}km/h. Hướng gió ${data.daily.wind_direction_10m_dominant[6]}°.`
    } catch (error) {
        promt = 'Không tìm thấy thông tin thời tiết hoặc lấy thông tin lỗi. Hãy thử lại sau!';
    }
    console.log(promt);
}

infoWeather('Nhà bè');